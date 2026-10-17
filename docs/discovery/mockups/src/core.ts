/* MentorHub clickable prototype — core: state, mock API client, router, actions, UI kit, validation.
   All files are plain scripts compiled by tsc into one bundle (dist/app.js), so the prototype opens from file://. */

type Role = 'guest' | 'mentee' | 'mentor' | 'admin';
type Scenario = 'live' | 'loading' | 'empty' | 'error';
type Params = Record<string, string>;
type Handler = (el: HTMLElement, ev: Event) => void;

interface ScreenDef {
  id: string;            // screen ID used in the concept docs, e.g. "P2"
  path: string;          // hash route, e.g. "/mentors/:id"
  title: string;
  group: string;         // Public / Mentee / Shared / Mentor / Admin
  roles: Role[] | null;  // null = available to everyone
  render: (root: HTMLElement, p: Params, q: URLSearchParams) => void;
}

interface ApiLogEntry { at: string; method: string; url: string; status: number; ms: number; note: string; }

class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const ROLE_LABEL: Record<Role, string> = { guest: 'Guest', mentee: 'Mentee', mentor: 'Mentor', admin: 'Admin' };
const SCENARIO_LABEL: Record<Scenario, string> = {
  live: 'Live (success)', loading: 'Loading (pending)', empty: 'Empty (no data)', error: 'Error (API 503)',
};

const S = {
  role: 'guest' as Role,
  scenario: 'live' as Scenario,
  log: [] as ApiLogEntry[],
  cart: null as Cart | null,
  screen: null as ScreenDef | null,
  renderToken: 0,
};

/* ---------------- storage (per-viewer convenience only) ---------------- */
function storeGet(key: string): string | null {
  try { return localStorage.getItem('mh:' + key); } catch { return null; }
}
function storeSet(key: string, v: string): void {
  try { localStorage.setItem('mh:' + key, v); } catch { /* private mode — ignore */ }
}

/* ---------------- small utils ---------------- */
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const clone = <T>(d: T): T => (d === undefined ? d : JSON.parse(JSON.stringify(d)));
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T | null;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
function money(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDT(iso: string): string { return `${fmtDate(iso)}, ${fmtTime(iso)}`; }
function fmtLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function timeNow(): string { return new Date().toLocaleTimeString('en-GB'); }
function hoursUntil(iso: string): number { return (new Date(iso).getTime() - Date.now()) / 36e5; }
function relTime(iso: string): string {
  const h = hoursUntil(iso);
  const a = Math.abs(h);
  const s = a < 1 ? `${Math.max(1, Math.round(a * 60))} min` : a < 48 ? `${Math.round(a)} h` : `${Math.round(a / 24)} days`;
  return h >= 0 ? `in ${s}` : `${s} ago`;
}
function tzName(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'local time'; }
}
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function plural(n: number, w: string): string { return `${n} ${w}${n === 1 ? '' : 's'}`; }

/* ---------------- mock API ---------------- */
interface MockCtx { params: Params; query: URLSearchParams; body: any; }
interface MockRoute { method: string; re: RegExp; keys: string[]; handler: (c: MockCtx) => any; }
const MOCK: MockRoute[] = [];

function compilePath(pattern: string): { re: RegExp; keys: string[] } {
  const keys: string[] = [];
  const re = new RegExp('^' + pattern.replace(/\//g, '\\/').replace(/:(\w+)/g, (_m, k) => { keys.push(k); return '([^\\/]+)'; }) + '$');
  return { re, keys };
}
function mock(method: string, pattern: string, handler: (c: MockCtx) => any): void {
  const { re, keys } = compilePath(pattern);
  MOCK.push({ method, re, keys, handler });
}
/** "Empty" scenario: every top-level list in the response comes back empty. */
function emptify(d: any): any {
  if (Array.isArray(d)) return [];
  if (d && typeof d === 'object') {
    const o: any = { ...d };
    for (const k of Object.keys(o)) if (Array.isArray(o[k])) o[k] = [];
    if ('total' in o) o.total = 0;
    return o;
  }
  return d;
}

async function apiCall<T>(method: string, url: string, body?: unknown): Promise<T> {
  const [path, qs] = url.split('?');
  const isRead = method === 'GET';
  const sc = S.scenario;
  const ms = sc === 'loading' ? 2500 : 220 + Math.round(Math.random() * 380);
  const entry: ApiLogEntry = { at: timeNow(), method, url, status: 0, ms, note: '' };
  S.log.unshift(entry);
  if (S.log.length > 200) S.log.pop();
  refreshLog();
  if (sc === 'loading' && isRead) {
    entry.note = 'pending forever — "Loading" scenario';
    refreshLog();
    return new Promise<T>(() => { /* never resolves */ });
  }
  await sleep(ms);
  try {
    if (sc === 'error') throw new ApiError(503, 'The service is temporarily unavailable. Please try again in a moment.');
    const route = MOCK.find(r => r.method === method && r.re.test(path));
    if (!route) throw new ApiError(404, 'Not found.');
    const m = path.match(route.re) as RegExpMatchArray;
    const params: Params = {};
    route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    let data = route.handler({ params, query: new URLSearchParams(qs || ''), body: clone(body) });
    if (sc === 'empty' && isRead) { data = emptify(data); entry.note = 'lists emptied — "Empty" scenario'; }
    entry.status = method === 'POST' ? 201 : 200;
    return clone(data) as T;
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError(500, 'Unexpected error.');
    entry.status = err.status;
    entry.note = err.message;
    throw err;
  } finally {
    refreshLog();
  }
}
const api = {
  get: <T>(u: string) => apiCall<T>('GET', u),
  post: <T>(u: string, b?: unknown) => apiCall<T>('POST', u, b ?? {}),
  put: <T>(u: string, b?: unknown) => apiCall<T>('PUT', u, b ?? {}),
  patch: <T>(u: string, b?: unknown) => apiCall<T>('PATCH', u, b ?? {}),
  del: <T>(u: string) => apiCall<T>('DELETE', u),
};

/* ---------------- router & actions ---------------- */
const SCREENS: ScreenDef[] = [];
function defineScreen(s: ScreenDef): void { SCREENS.push(s); }

let ACT: Record<string, Handler> = {};
const GLOBAL_ACT: Record<string, Handler> = {};
let actSeq = 0;
/** Registers a one-off handler for the current screen and returns its name for data-act / data-form. */
function act(fn: Handler): string { const n = 'a' + ++actSeq; ACT[n] = fn; return n; }
/** Registers a named handler for the current screen (reset on every route change). */
function on(name: string, fn: Handler): void { ACT[name] = fn; }

function parseHash(): { path: string; q: URLSearchParams } {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path: path || '/', q: new URLSearchParams(qs || '') };
}
function go(path: string): void {
  if (location.hash === '#' + path) renderRoute();
  else location.hash = path;
}
function withQuery(path: string, q: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '') u.set(k, v);
  const s = u.toString();
  return s ? `${path}?${s}` : path;
}

function renderRoute(): void {
  const { path, q } = parseHash();
  let match: ScreenDef | null = null;
  let params: Params = {};
  for (const s of SCREENS) {
    const { re, keys } = compilePath(s.path);
    const m = path.match(re);
    if (m) { match = s; params = {}; keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); break; }
  }
  ACT = {};
  S.renderToken++;
  closeModal();
  S.screen = match;
  renderShell();
  const root = $('#view') as HTMLElement;
  window.scrollTo(0, 0);
  if (!match) {
    root.innerHTML = `<div class="container">${stateBox('🧭', 'Page not found', 'This address does not exist in the prototype.', `<a class="btn btn-primary" href="#/">Go to home page</a>`)}</div>`;
    return;
  }
  document.title = `${match.id} ${match.title} · MentorHub prototype`;
  if (match.roles && !match.roles.includes(S.role)) { root.innerHTML = roleGate(match, path); return; }
  root.innerHTML = '';
  match.render(root, params, q);
}

function roleGate(s: ScreenDef, path: string): string {
  const roles = s.roles as Role[];
  if (S.role === 'guest') {
    return `<div class="container">${stateBox('🔒', 'Please log in to continue',
      `“${esc(s.title)}” is available to ${roles.map(r => ROLE_LABEL[r]).join(' / ')} accounts.`,
      `<a class="btn btn-primary" href="#${withQuery('/auth', { mode: 'login', next: path })}">Log in</a>
       <a class="btn" href="#${withQuery('/auth', { mode: 'signup', next: path })}">Create account</a>`)}</div>`;
  }
  return `<div class="container">${stateBox('🚧', `This screen is for ${roles.map(r => ROLE_LABEL[r]).join(' / ')}s`,
    `You are signed in as ${ROLE_LABEL[S.role]}. In the real product this route would redirect to your home screen (403).`,
    roles.map(r => `<button class="btn btn-primary" data-act="proto-switch" data-role="${r}">Prototype: switch to ${ROLE_LABEL[r]}</button>`).join(' '))}</div>`;
}

function setRole(r: Role): void {
  S.role = r;
  storeSet('role', r);
}

/* ---------------- shell ---------------- */
const NAV: Record<Role, [string, string][]> = {
  guest: [['Find a mentor', '/mentors'], ['Become a mentor', '/apply'], ['How it works', '/#how']],
  mentee: [['Home', '/home'], ['Find a mentor', '/mentors'], ['My sessions', '/sessions'], ['Messages', '/messages'], ['Billing', '/billing']],
  mentor: [['Dashboard', '/mentor'], ['Calendar', '/mentor/calendar'], ['Mentees', '/mentor/mentees'], ['Messages', '/messages'], ['Earnings', '/mentor/earnings'], ['Profile', '/mentor/profile']],
  admin: [['Overview', '/admin'], ['Applications', '/admin/applications'], ['Disputes', '/admin/disputes']],
};
const USER_NAME: Record<Role, string> = { guest: '', mentee: 'Kasia Nowak', mentor: 'Anna Wiśniewska', admin: 'Ops Admin' };
let unreadCount = 0;

function renderShell(): void {
  const { path } = parseHash();
  const nav = NAV[S.role]
    .map(([label, href]) => {
      const active = href !== '/' && (path === href || (path.startsWith(href + '/') && href !== '/mentor')) || (href === '/mentor' && path === '/mentor');
      return `<a href="#${href}" class="${active ? 'active' : ''}">${label}</a>`;
    }).join('');
  const right = S.role === 'guest'
    ? `<a class="btn btn-ghost" href="#/auth?mode=login">Log in</a><a class="btn btn-primary" href="#/auth?mode=signup">Sign up</a>`
    : `<a class="btn btn-ghost icon-btn bell" href="#/notifications" title="Notifications" aria-label="Notifications">🔔${unreadCount ? `<b>${unreadCount}</b>` : ''}</a>
       <a class="btn btn-ghost" href="#/settings" title="Account settings">${avatar(USER_NAME[S.role], '#5b5fe0', 'sm')}<span class="hide-sm">${esc(USER_NAME[S.role].split(' ')[0])}</span></a>
       <button class="btn btn-sm" data-act="logout">Log out</button>`;
  ($('#top') as HTMLElement).innerHTML = `
    <div class="container">
      <a class="logo" href="#${S.role === 'mentor' ? '/mentor' : S.role === 'admin' ? '/admin' : S.role === 'mentee' ? '/home' : '/'}"><i>M</i>MentorHub</a>
      <nav class="nav" aria-label="Main">${nav}</nav>
      <div class="top-actions">${right}</div>
    </div>`;
  const s = S.screen;
  ($('#proto') as HTMLElement).innerHTML = `
    <div class="container">
      <span class="tag">PROTOTYPE</span>
      <span class="sid">${s ? `${esc(s.id)} · ${esc(s.title)}` : '—'}</span>
      <label>Role <select data-change="proto-role" aria-label="Prototype role">${(Object.keys(ROLE_LABEL) as Role[]).map(r => `<option value="${r}" ${r === S.role ? 'selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}</select></label>
      <label>Data state <select data-change="proto-scenario" aria-label="Prototype data state">${(Object.keys(SCENARIO_LABEL) as Scenario[]).map(r => `<option value="${r}" ${r === S.scenario ? 'selected' : ''}>${SCENARIO_LABEL[r]}</option>`).join('')}</select></label>
      <a href="#/map">Screen map</a>
      <button data-act="proto-log">API log (<span id="logCount">${S.log.length}</span>)</button>
      <button data-act="proto-reset" title="Restore demo data and start again">Reset demo</button>
    </div>`;
}

/* ---------------- API log drawer ---------------- */
let logOpen = false;
function refreshLog(): void {
  const c = document.getElementById('logCount');
  if (c) c.textContent = String(S.log.length);
  if (logOpen) renderLog();
}
function renderLog(): void {
  const host = $('#drawer') as HTMLElement;
  host.innerHTML = `
    <aside class="drawer" role="dialog" aria-label="API log">
      <div class="drawer-head"><div><h3 style="margin:0">API log</h3><small>Calls made by the prototype to the mock backend (newest first)</small></div>
        <button class="btn btn-sm" data-act="proto-log-close">Close</button></div>
      <div class="drawer-body">
        ${S.log.length ? S.log.map(e => `
          <div class="log-row"><span class="m-${e.method}">${e.method}</span>
            <div><code>${esc(e.url)}</code><br><small>${esc(e.at)} · ${e.ms} ms${e.note ? ' · ' + esc(e.note) : ''}</small></div>
            <span class="${e.status === 0 ? 'code-wait' : e.status < 400 ? 'code-ok' : 'code-bad'}">${e.status || '…'}</span></div>`).join('')
        : `<p class="muted">No calls yet. Open any screen.</p>`}
      </div>
    </aside>`;
}

/* ---------------- UI kit ---------------- */
function initials(name: string): string {
  return name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}
function avatar(name: string, color: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string {
  return `<span class="avatar av-${size}" style="background:${esc(color)}" aria-hidden="true">${esc(initials(name))}</span>`;
}
function stars(r: number): string {
  const full = Math.round(r);
  return `<span class="stars" aria-label="${r.toFixed(1)} out of 5">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
}
function chip(text: string, kind = ''): string { return `<span class="chip ${kind ? 'chip-' + kind : ''}">${esc(text)}</span>`; }
function pageHead(title: string, sub = '', actions = ''): string {
  return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
}
function tabs(items: [string, string][], activeHref: string): string {
  return `<nav class="tabs">${items.map(([l, h]) => `<a href="#${h}" class="${h === activeHref ? 'active' : ''}">${esc(l)}</a>`).join('')}</nav>`;
}
function stateBox(icon: string, title: string, text: string, cta = '', kind = ''): string {
  return `<div class="state ${kind}" role="${kind === 'state-error' ? 'alert' : 'status'}"><div class="ico">${icon}</div><h3>${esc(title)}</h3><p>${text}</p>${cta ? `<div class="row" style="justify-content:center">${cta}</div>` : ''}</div>`;
}
function emptyState(title: string, text: string, cta = ''): string { return stateBox('🌱', title, text, cta); }
function errorState(msg: string, retryAct: string): string {
  return stateBox('⚠️', 'Something went wrong', esc(msg), `<button class="btn btn-primary" data-act="${retryAct}">Try again</button>`, 'state-error');
}
function successState(title: string, text: string, cta = ''): string { return stateBox('✅', title, text, cta, 'state-success'); }
function skelLines(n = 4): string {
  return `<div aria-busy="true" aria-label="Loading">${Array.from({ length: n }, (_, i) => `<div class="skel skel-line" style="width:${90 - (i % 3) * 18}%"></div>`).join('')}</div>`;
}
function skelCards(n = 3, cls = 'grid g3'): string {
  return `<div class="${cls}" aria-busy="true" aria-label="Loading">${Array.from({ length: n }, () => `<div class="skel skel-card"></div>`).join('')}</div>`;
}

let toastSeq = 0;
function toast(msg: string, kind: 'ok' | 'err' | 'info' = 'ok'): void {
  const host = $('#toasts') as HTMLElement;
  const id = 't' + ++toastSeq;
  host.insertAdjacentHTML('beforeend', `<div class="toast ${kind}" id="${id}" role="status">${esc(msg)}</div>`);
  setTimeout(() => document.getElementById(id)?.remove(), 3800);
}

function openModal(title: string, body: string, foot = '', wide = false): void {
  ($('#modal') as HTMLElement).innerHTML = `
    <div class="overlay" data-act="modal-bg">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="${wide ? 'width:min(760px,100%)' : ''}">
        <div class="modal-head"><h2 style="margin:0">${esc(title)}</h2><button class="btn btn-ghost btn-sm" data-act="modal-close" aria-label="Close">✕</button></div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>
    </div>`;
  ($('#modal .modal input, #modal .modal textarea, #modal .modal select') as HTMLElement | null)?.focus();
}
function closeModal(): void { const m = $('#modal'); if (m) m.innerHTML = ''; }

function busy(btn: Element | null, on: boolean): void {
  if (!btn) return;
  btn.classList.toggle('is-busy', on);
  (btn as HTMLButtonElement).disabled = on;
}

/** Async view loader with skeleton → error(retry) / empty / content states, stale-render safe. */
function load<T>(el: HTMLElement, fetcher: () => Promise<T>, o: {
  skeleton?: string; isEmpty?: (d: T) => boolean; empty?: (d: T) => string; ok: (d: T) => string; after?: (d: T) => void;
}): void {
  const token = S.renderToken;
  const run = () => {
    el.innerHTML = o.skeleton ?? skelLines(4);
    fetcher()
      .then(d => {
        if (token !== S.renderToken) return;
        if (o.isEmpty && o.isEmpty(d)) { el.innerHTML = o.empty ? o.empty(d) : emptyState('Nothing here yet', ''); return; }
        el.innerHTML = o.ok(d);
        o.after?.(d);
      })
      .catch((e: ApiError) => {
        if (token !== S.renderToken) return;
        el.innerHTML = errorState(e.message, act(run));
      });
  };
  run();
}

/* ---------------- forms & validation ---------------- */
type Rule = (v: string, f: HTMLFormElement) => string | null;
const V = {
  req: (m = 'This field is required.'): Rule => v => (v.trim() ? null : m),
  email: (): Rule => v => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Enter a valid email address, e.g. name@company.com.'),
  min: (n: number, m?: string): Rule => v => (!v || v.trim().length >= n ? null : m ?? `Use at least ${n} characters (now ${v.trim().length}).`),
  max: (n: number): Rule => v => (v.length <= n ? null : `Use at most ${n} characters (now ${v.length}).`),
  num: (min: number, max: number, m?: string): Rule => v => {
    if (!v) return null;
    const x = Number(v);
    return Number.isFinite(x) && x >= min && x <= max ? null : m ?? `Enter a number from ${min} to ${max}.`;
  },
  re: (re: RegExp, m: string): Rule => v => (!v || re.test(v.trim()) ? null : m),
  same: (other: string, m: string): Rule => (v, f) => (v === (formValues(f)[other] ?? '') ? null : m),
  checked: (m: string): Rule => v => (v ? null : m),
  count: (min: number, max: number, what: string): Rule => v => {
    const n = v ? v.split(',').filter(Boolean).length : 0;
    return n < min ? `Select at least ${plural(min, what)}.` : n > max ? `Select at most ${plural(max, what)}.` : null;
  },
};

function formValues(f: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  const fd = new FormData(f);
  for (const [k, v] of fd.entries()) out[k] = out[k] ? `${out[k]},${v}` : String(v);
  return out;
}
function clearErrors(f: HTMLFormElement): void {
  $$('[data-err]', f).forEach(e => (e.textContent = ''));
  $$('[aria-invalid]', f).forEach(e => e.removeAttribute('aria-invalid'));
}
function showErr(f: HTMLFormElement, name: string, msg: string): void {
  const box = $(`[data-err="${name}"]`, f);
  if (box) box.textContent = msg;
  $$(`[name="${name}"]`, f).forEach(i => i.setAttribute('aria-invalid', 'true'));
}
function validate(f: HTMLFormElement, rules: Record<string, Rule[]>): Record<string, string> | null {
  clearErrors(f);
  const vals = formValues(f);
  let first: string | null = null;
  for (const [name, rs] of Object.entries(rules)) {
    for (const r of rs) {
      const msg = r(vals[name] ?? '', f);
      if (msg) { showErr(f, name, msg); first = first ?? name; break; }
    }
  }
  if (first) { ($(`[name="${first}"]`, f) as HTMLElement | null)?.focus(); return null; }
  return vals;
}
/** Maps an API error (422 with fields, 409, 503 …) onto the form. */
function apiErrToForm(f: HTMLFormElement, e: ApiError): void {
  const fields = Object.entries(e.fields || {});
  fields.forEach(([k, m]) => showErr(f, k, m));
  if (!fields.length) { const a = $('[data-err="_form"]', f); if (a) a.textContent = e.message; else toast(e.message, 'err'); }
}

interface FieldOpt {
  name: string; label: string; type?: string; value?: string; placeholder?: string; hint?: string;
  options?: [string, string][]; rows?: number; attrs?: string; counter?: number; optional?: boolean;
}
function field(o: FieldOpt): string {
  const id = 'f_' + o.name + '_' + ++actSeq;
  const common = `id="${id}" name="${o.name}" class="input" ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''} ${o.attrs ?? ''} ${o.counter ? `data-counter="${o.counter}"` : ''}`;
  let control: string;
  if (o.type === 'textarea') control = `<textarea ${common} rows="${o.rows ?? 4}">${esc(o.value ?? '')}</textarea>`;
  else if (o.type === 'select') control = `<select ${common}>${(o.options ?? []).map(([v, l]) => `<option value="${esc(v)}" ${v === o.value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  else control = `<input ${common} type="${o.type ?? 'text'}" value="${esc(o.value ?? '')}">`;
  const count = o.counter ? `<span data-count-for="${id}">${(o.value ?? '').length} / ${o.counter}</span>` : '';
  return `<label class="field" for="${id}"><span>${esc(o.label)}${o.optional ? ' <small>(optional)</small>' : ''}</span>${control}
    ${o.hint || count ? `<div class="hint"><span>${o.hint ?? ''}</span>${count}</div>` : ''}<div class="err" data-err="${o.name}"></div></label>`;
}
function formAlert(): string { return `<div class="form-alert" data-err="_form" role="alert"></div>`; }

/* ---------------- shared domain widgets ---------------- */
function mentorMini(m: { name: string; color: string; headline: string }, extra = ''): string {
  return `<div class="row" style="flex-wrap:nowrap">${avatar(m.name, m.color, 'md')}<div style="min-width:0"><b>${esc(m.name)}</b><br><small>${esc(m.headline)}</small>${extra}</div></div>`;
}
function statusChip(status: string): string {
  const map: Record<string, [string, string]> = {
    scheduled: ['Scheduled', 'brand'], completed: ['Completed', 'ok'], cancelled: ['Cancelled', ''], no_show: ['No-show', 'err'],
    pending: ['Pending review', 'warn'], changes: ['Changes requested', 'accent'], approved: ['Approved', 'ok'], rejected: ['Rejected', 'err'],
    open: ['Open', 'warn'], resolved: ['Resolved', 'ok'], active: ['Active', 'ok'], paused: ['Paused', 'warn'], ended: ['Ended', ''],
    paid: ['Paid', 'ok'], processing: ['Processing', 'warn'], draft: ['Draft', ''], submitted: ['Under review', 'warn'],
  };
  const [l, k] = map[status] ?? [status, ''];
  return chip(l, k);
}

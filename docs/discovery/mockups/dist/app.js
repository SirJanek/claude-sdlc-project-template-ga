"use strict";
/* MentorHub clickable prototype — core: state, mock API client, router, actions, UI kit, validation.
   All files are plain scripts compiled by tsc into one bundle (dist/app.js), so the prototype opens from file://. */
class ApiError extends Error {
    constructor(status, message, fields = {}) {
        super(message);
        this.status = status;
        this.fields = fields;
    }
}
const ROLE_LABEL = { guest: 'Guest', mentee: 'Mentee', mentor: 'Mentor', admin: 'Admin' };
const SCENARIO_LABEL = {
    live: 'Live (success)', loading: 'Loading (pending)', empty: 'Empty (no data)', error: 'Error (API 503)',
};
const S = {
    role: 'guest',
    scenario: 'live',
    log: [],
    cart: null,
    screen: null,
    renderToken: 0,
};
/* ---------------- storage (per-viewer convenience only) ---------------- */
function storeGet(key) {
    try {
        return localStorage.getItem('mh:' + key);
    }
    catch {
        return null;
    }
}
function storeSet(key, v) {
    try {
        localStorage.setItem('mh:' + key, v);
    }
    catch { /* private mode — ignore */ }
}
/* ---------------- small utils ---------------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clone = (d) => (d === undefined ? d : JSON.parse(JSON.stringify(d)));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function money(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
}
function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDT(iso) { return `${fmtDate(iso)}, ${fmtTime(iso)}`; }
function fmtLongDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function timeNow() { return new Date().toLocaleTimeString('en-GB'); }
function hoursUntil(iso) { return (new Date(iso).getTime() - Date.now()) / 36e5; }
function relTime(iso) {
    const h = hoursUntil(iso);
    const a = Math.abs(h);
    const s = a < 1 ? `${Math.max(1, Math.round(a * 60))} min` : a < 48 ? `${Math.round(a)} h` : `${Math.round(a / 24)} days`;
    return h >= 0 ? `in ${s}` : `${s} ago`;
}
function tzName() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    catch {
        return 'local time';
    }
}
function isoDay(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function plural(n, w) { return `${n} ${w}${n === 1 ? '' : 's'}`; }
const MOCK = [];
function compilePath(pattern) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\//g, '\\/').replace(/:(\w+)/g, (_m, k) => { keys.push(k); return '([^\\/]+)'; }) + '$');
    return { re, keys };
}
function mock(method, pattern, handler) {
    const { re, keys } = compilePath(pattern);
    MOCK.push({ method, re, keys, handler });
}
/** "Empty" scenario: every top-level list in the response comes back empty. */
function emptify(d) {
    if (Array.isArray(d))
        return [];
    if (d && typeof d === 'object') {
        const o = { ...d };
        for (const k of Object.keys(o))
            if (Array.isArray(o[k]))
                o[k] = [];
        if ('total' in o)
            o.total = 0;
        return o;
    }
    return d;
}
async function apiCall(method, url, body) {
    const [path, qs] = url.split('?');
    const isRead = method === 'GET';
    const sc = S.scenario;
    const ms = sc === 'loading' ? 2500 : 220 + Math.round(Math.random() * 380);
    const entry = { at: timeNow(), method, url, status: 0, ms, note: '' };
    S.log.unshift(entry);
    if (S.log.length > 200)
        S.log.pop();
    refreshLog();
    if (sc === 'loading' && isRead) {
        entry.note = 'pending forever — "Loading" scenario';
        refreshLog();
        return new Promise(() => { });
    }
    await sleep(ms);
    try {
        if (sc === 'error')
            throw new ApiError(503, 'The service is temporarily unavailable. Please try again in a moment.');
        const route = MOCK.find(r => r.method === method && r.re.test(path));
        if (!route)
            throw new ApiError(404, 'Not found.');
        const m = path.match(route.re);
        const params = {};
        route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        let data = route.handler({ params, query: new URLSearchParams(qs || ''), body: clone(body) });
        if (sc === 'empty' && isRead) {
            data = emptify(data);
            entry.note = 'lists emptied — "Empty" scenario';
        }
        entry.status = method === 'POST' ? 201 : 200;
        return clone(data);
    }
    catch (e) {
        const err = e instanceof ApiError ? e : new ApiError(500, 'Unexpected error.');
        entry.status = err.status;
        entry.note = err.message;
        throw err;
    }
    finally {
        refreshLog();
    }
}
const api = {
    get: (u) => apiCall('GET', u),
    post: (u, b) => apiCall('POST', u, b ?? {}),
    put: (u, b) => apiCall('PUT', u, b ?? {}),
    patch: (u, b) => apiCall('PATCH', u, b ?? {}),
    del: (u) => apiCall('DELETE', u),
};
/* ---------------- router & actions ---------------- */
const SCREENS = [];
function defineScreen(s) { SCREENS.push(s); }
let ACT = {};
const GLOBAL_ACT = {};
let actSeq = 0;
/** Registers a one-off handler for the current screen and returns its name for data-act / data-form. */
function act(fn) { const n = 'a' + ++actSeq; ACT[n] = fn; return n; }
/** Registers a named handler for the current screen (reset on every route change). */
function on(name, fn) { ACT[name] = fn; }
function parseHash() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    return { path: path || '/', q: new URLSearchParams(qs || '') };
}
function go(path) {
    if (location.hash === '#' + path)
        renderRoute();
    else
        location.hash = path;
}
function withQuery(path, q) {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(q))
        if (v !== undefined && v !== '')
            u.set(k, v);
    const s = u.toString();
    return s ? `${path}?${s}` : path;
}
function renderRoute() {
    const { path, q } = parseHash();
    let match = null;
    let params = {};
    for (const s of SCREENS) {
        const { re, keys } = compilePath(s.path);
        const m = path.match(re);
        if (m) {
            match = s;
            params = {};
            keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
            break;
        }
    }
    ACT = {};
    S.renderToken++;
    closeModal();
    S.screen = match;
    renderShell();
    const root = $('#view');
    window.scrollTo(0, 0);
    if (!match) {
        root.innerHTML = `<div class="container">${stateBox('🧭', 'Page not found', 'This address does not exist in the prototype.', `<a class="btn btn-primary" href="#/">Go to home page</a>`)}</div>`;
        return;
    }
    document.title = `${match.id} ${match.title} · MentorHub prototype`;
    if (match.roles && !match.roles.includes(S.role)) {
        root.innerHTML = roleGate(match, path);
        return;
    }
    root.innerHTML = '';
    match.render(root, params, q);
}
function roleGate(s, path) {
    const roles = s.roles;
    if (S.role === 'guest') {
        return `<div class="container">${stateBox('🔒', 'Please log in to continue', `“${esc(s.title)}” is available to ${roles.map(r => ROLE_LABEL[r]).join(' / ')} accounts.`, `<a class="btn btn-primary" href="#${withQuery('/auth', { mode: 'login', next: path })}">Log in</a>
       <a class="btn" href="#${withQuery('/auth', { mode: 'signup', next: path })}">Create account</a>`)}</div>`;
    }
    return `<div class="container">${stateBox('🚧', `This screen is for ${roles.map(r => ROLE_LABEL[r]).join(' / ')}s`, `You are signed in as ${ROLE_LABEL[S.role]}. In the real product this route would redirect to your home screen (403).`, roles.map(r => `<button class="btn btn-primary" data-act="proto-switch" data-role="${r}">Prototype: switch to ${ROLE_LABEL[r]}</button>`).join(' '))}</div>`;
}
function setRole(r) {
    S.role = r;
    storeSet('role', r);
}
/* ---------------- shell ---------------- */
const NAV = {
    guest: [['Find a mentor', '/mentors'], ['Become a mentor', '/apply'], ['How it works', '/#how']],
    mentee: [['Home', '/home'], ['Find a mentor', '/mentors'], ['My sessions', '/sessions'], ['Messages', '/messages'], ['Billing', '/billing']],
    mentor: [['Dashboard', '/mentor'], ['Calendar', '/mentor/calendar'], ['Mentees', '/mentor/mentees'], ['Messages', '/messages'], ['Earnings', '/mentor/earnings'], ['Profile', '/mentor/profile']],
    admin: [['Overview', '/admin'], ['Applications', '/admin/applications'], ['Disputes', '/admin/disputes']],
};
const USER_NAME = { guest: '', mentee: 'Kasia Nowak', mentor: 'Anna Wiśniewska', admin: 'Ops Admin' };
let unreadCount = 0;
function renderShell() {
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
    $('#top').innerHTML = `
    <div class="container">
      <a class="logo" href="#${S.role === 'mentor' ? '/mentor' : S.role === 'admin' ? '/admin' : S.role === 'mentee' ? '/home' : '/'}"><i>M</i>MentorHub</a>
      <nav class="nav" aria-label="Main">${nav}</nav>
      <div class="top-actions">${right}</div>
    </div>`;
    const s = S.screen;
    $('#proto').innerHTML = `
    <div class="container">
      <span class="tag">PROTOTYPE</span>
      <span class="sid">${s ? `${esc(s.id)} · ${esc(s.title)}` : '—'}</span>
      <label>Role <select data-change="proto-role" aria-label="Prototype role">${Object.keys(ROLE_LABEL).map(r => `<option value="${r}" ${r === S.role ? 'selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}</select></label>
      <label>Data state <select data-change="proto-scenario" aria-label="Prototype data state">${Object.keys(SCENARIO_LABEL).map(r => `<option value="${r}" ${r === S.scenario ? 'selected' : ''}>${SCENARIO_LABEL[r]}</option>`).join('')}</select></label>
      <a href="#/map">Screen map</a>
      <button data-act="proto-log">API log (<span id="logCount">${S.log.length}</span>)</button>
      <button data-act="proto-reset" title="Restore demo data and start again">Reset demo</button>
    </div>`;
}
/* ---------------- API log drawer ---------------- */
let logOpen = false;
function refreshLog() {
    const c = document.getElementById('logCount');
    if (c)
        c.textContent = String(S.log.length);
    if (logOpen)
        renderLog();
}
function renderLog() {
    const host = $('#drawer');
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
function initials(name) {
    return name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}
function avatar(name, color, size = 'md') {
    return `<span class="avatar av-${size}" style="background:${esc(color)}" aria-hidden="true">${esc(initials(name))}</span>`;
}
function stars(r) {
    const full = Math.round(r);
    return `<span class="stars" aria-label="${r.toFixed(1)} out of 5">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
}
function chip(text, kind = '') { return `<span class="chip ${kind ? 'chip-' + kind : ''}">${esc(text)}</span>`; }
function pageHead(title, sub = '', actions = '') {
    return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
}
function tabs(items, activeHref) {
    return `<nav class="tabs">${items.map(([l, h]) => `<a href="#${h}" class="${h === activeHref ? 'active' : ''}">${esc(l)}</a>`).join('')}</nav>`;
}
function stateBox(icon, title, text, cta = '', kind = '') {
    return `<div class="state ${kind}" role="${kind === 'state-error' ? 'alert' : 'status'}"><div class="ico">${icon}</div><h3>${esc(title)}</h3><p>${text}</p>${cta ? `<div class="row" style="justify-content:center">${cta}</div>` : ''}</div>`;
}
function emptyState(title, text, cta = '') { return stateBox('🌱', title, text, cta); }
function errorState(msg, retryAct) {
    return stateBox('⚠️', 'Something went wrong', esc(msg), `<button class="btn btn-primary" data-act="${retryAct}">Try again</button>`, 'state-error');
}
function successState(title, text, cta = '') { return stateBox('✅', title, text, cta, 'state-success'); }
function skelLines(n = 4) {
    return `<div aria-busy="true" aria-label="Loading">${Array.from({ length: n }, (_, i) => `<div class="skel skel-line" style="width:${90 - (i % 3) * 18}%"></div>`).join('')}</div>`;
}
function skelCards(n = 3, cls = 'grid g3') {
    return `<div class="${cls}" aria-busy="true" aria-label="Loading">${Array.from({ length: n }, () => `<div class="skel skel-card"></div>`).join('')}</div>`;
}
let toastSeq = 0;
function toast(msg, kind = 'ok') {
    const host = $('#toasts');
    const id = 't' + ++toastSeq;
    host.insertAdjacentHTML('beforeend', `<div class="toast ${kind}" id="${id}" role="status">${esc(msg)}</div>`);
    setTimeout(() => document.getElementById(id)?.remove(), 3800);
}
function openModal(title, body, foot = '', wide = false) {
    $('#modal').innerHTML = `
    <div class="overlay" data-act="modal-bg">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}" style="${wide ? 'width:min(760px,100%)' : ''}">
        <div class="modal-head"><h2 style="margin:0">${esc(title)}</h2><button class="btn btn-ghost btn-sm" data-act="modal-close" aria-label="Close">✕</button></div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>
    </div>`;
    $('#modal .modal input, #modal .modal textarea, #modal .modal select')?.focus();
}
function closeModal() { const m = $('#modal'); if (m)
    m.innerHTML = ''; }
function busy(btn, on) {
    if (!btn)
        return;
    btn.classList.toggle('is-busy', on);
    btn.disabled = on;
}
/** Async view loader with skeleton → error(retry) / empty / content states, stale-render safe. */
function load(el, fetcher, o) {
    const token = S.renderToken;
    const run = () => {
        el.innerHTML = o.skeleton ?? skelLines(4);
        fetcher()
            .then(d => {
            if (token !== S.renderToken)
                return;
            if (o.isEmpty && o.isEmpty(d)) {
                el.innerHTML = o.empty ? o.empty(d) : emptyState('Nothing here yet', '');
                return;
            }
            el.innerHTML = o.ok(d);
            o.after?.(d);
        })
            .catch((e) => {
            if (token !== S.renderToken)
                return;
            el.innerHTML = errorState(e.message, act(run));
        });
    };
    run();
}
const V = {
    req: (m = 'This field is required.') => v => (v.trim() ? null : m),
    email: () => v => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Enter a valid email address, e.g. name@company.com.'),
    min: (n, m) => v => (!v || v.trim().length >= n ? null : m ?? `Use at least ${n} characters (now ${v.trim().length}).`),
    max: (n) => v => (v.length <= n ? null : `Use at most ${n} characters (now ${v.length}).`),
    num: (min, max, m) => v => {
        if (!v)
            return null;
        const x = Number(v);
        return Number.isFinite(x) && x >= min && x <= max ? null : m ?? `Enter a number from ${min} to ${max}.`;
    },
    re: (re, m) => v => (!v || re.test(v.trim()) ? null : m),
    same: (other, m) => (v, f) => (v === (formValues(f)[other] ?? '') ? null : m),
    checked: (m) => v => (v ? null : m),
    count: (min, max, what) => v => {
        const n = v ? v.split(',').filter(Boolean).length : 0;
        return n < min ? `Select at least ${plural(min, what)}.` : n > max ? `Select at most ${plural(max, what)}.` : null;
    },
};
function formValues(f) {
    const out = {};
    const fd = new FormData(f);
    for (const [k, v] of fd.entries())
        out[k] = out[k] ? `${out[k]},${v}` : String(v);
    return out;
}
function clearErrors(f) {
    $$('[data-err]', f).forEach(e => (e.textContent = ''));
    $$('[aria-invalid]', f).forEach(e => e.removeAttribute('aria-invalid'));
}
function showErr(f, name, msg) {
    const box = $(`[data-err="${name}"]`, f);
    if (box)
        box.textContent = msg;
    $$(`[name="${name}"]`, f).forEach(i => i.setAttribute('aria-invalid', 'true'));
}
function validate(f, rules) {
    clearErrors(f);
    const vals = formValues(f);
    let first = null;
    for (const [name, rs] of Object.entries(rules)) {
        for (const r of rs) {
            const msg = r(vals[name] ?? '', f);
            if (msg) {
                showErr(f, name, msg);
                first = first ?? name;
                break;
            }
        }
    }
    if (first) {
        $(`[name="${first}"]`, f)?.focus();
        return null;
    }
    return vals;
}
/** Maps an API error (422 with fields, 409, 503 …) onto the form. */
function apiErrToForm(f, e) {
    const fields = Object.entries(e.fields || {});
    fields.forEach(([k, m]) => showErr(f, k, m));
    if (!fields.length) {
        const a = $('[data-err="_form"]', f);
        if (a)
            a.textContent = e.message;
        else
            toast(e.message, 'err');
    }
}
function field(o) {
    const id = 'f_' + o.name + '_' + ++actSeq;
    const common = `id="${id}" name="${o.name}" class="input" ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''} ${o.attrs ?? ''} ${o.counter ? `data-counter="${o.counter}"` : ''}`;
    let control;
    if (o.type === 'textarea')
        control = `<textarea ${common} rows="${o.rows ?? 4}">${esc(o.value ?? '')}</textarea>`;
    else if (o.type === 'select')
        control = `<select ${common}>${(o.options ?? []).map(([v, l]) => `<option value="${esc(v)}" ${v === o.value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    else
        control = `<input ${common} type="${o.type ?? 'text'}" value="${esc(o.value ?? '')}">`;
    const count = o.counter ? `<span data-count-for="${id}">${(o.value ?? '').length} / ${o.counter}</span>` : '';
    return `<label class="field" for="${id}"><span>${esc(o.label)}${o.optional ? ' <small>(optional)</small>' : ''}</span>${control}
    ${o.hint || count ? `<div class="hint"><span>${o.hint ?? ''}</span>${count}</div>` : ''}<div class="err" data-err="${o.name}"></div></label>`;
}
function formAlert() { return `<div class="form-alert" data-err="_form" role="alert"></div>`; }
/* ---------------- shared domain widgets ---------------- */
function mentorMini(m, extra = '') {
    return `<div class="row" style="flex-wrap:nowrap">${avatar(m.name, m.color, 'md')}<div style="min-width:0"><b>${esc(m.name)}</b><br><small>${esc(m.headline)}</small>${extra}</div></div>`;
}
function statusChip(status) {
    const map = {
        scheduled: ['Scheduled', 'brand'], completed: ['Completed', 'ok'], cancelled: ['Cancelled', ''], no_show: ['No-show', 'err'],
        pending: ['Pending review', 'warn'], changes: ['Changes requested', 'accent'], approved: ['Approved', 'ok'], rejected: ['Rejected', 'err'],
        open: ['Open', 'warn'], resolved: ['Resolved', 'ok'], active: ['Active', 'ok'], paused: ['Paused', 'warn'], ended: ['Ended', ''],
        paid: ['Paid', 'ok'], processing: ['Processing', 'warn'], draft: ['Draft', ''], submitted: ['Under review', 'warn'],
    };
    const [l, k] = map[status] ?? [status, ''];
    return chip(l, k);
}
/* MentorHub clickable prototype — in-memory demo database and mock REST endpoints.
   Endpoint paths match 05-Katalog-API.md one to one. */
/* ---------- time helpers for relative demo data ---------- */
function at(dayOffset, hour, min = 0) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
}
function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000) / 1000;
}
/* ---------- business rules (configurable parameters, see 02-Use-case-i-przeplywy.md §Reguły) ---------- */
const RULES = {
    introMinutes: 30, introPriceFactor: 0.5, minNoticeHours: 4, freeCancelHours: 12, holdMinutes: 10,
    serviceFee: 1.5, roomOpensMinutesBefore: 10, payoutMin: 50, platformFeeTiers: [[0, 25], [50, 20], [200, 15]],
};
const PROMO = { WELCOME10: 0.1 };
function freshDb() {
    const topics = [
        { id: 'product', name: 'Product management', icon: '🧭', mentors: 128 },
        { id: 'eng-lead', name: 'Engineering leadership', icon: '🛠️', mentors: 96 },
        { id: 'ai', name: 'AI engineering', icon: '🤖', mentors: 74 },
        { id: 'career', name: 'Career change into tech', icon: '🚀', mentors: 141 },
        { id: 'ux', name: 'UX & product design', icon: '🎨', mentors: 63 },
        { id: 'data', name: 'Data & analytics', icon: '📊', mentors: 58 },
        { id: 'startup', name: 'Startups & fundraising', icon: '💡', mentors: 41 },
        { id: 'speaking', name: 'Public speaking', icon: '🎤', mentors: 37 },
    ];
    const mentors = [
        { id: 'm1', name: 'Anna Wiśniewska', headline: 'Head of Product · ex-fintech scale-up · helps PMs move to senior', topics: ['product', 'career'], languages: ['English', 'Polish'], country: 'Poland', rate: 80, rating: 4.9, reviews: 132, sessions: 812, mentees: 96, years: 12, role: 'Head of Product', company: 'Fintech scale-up', color: '#7a4fd8', superMentor: true, responseHrs: 2, intro: true, featured: true,
            bio: 'I have spent 12 years building B2B and consumer products, the last five leading product teams of up to 30 people. I help product managers grow into senior and lead roles: discovery, prioritisation, stakeholder management and preparing for interviews. Sessions are practical — we work on your real roadmap, PRD or case study.',
            experience: [{ period: '2021 – now', title: 'Head of Product', org: 'Fintech scale-up' }, { period: '2016 – 2021', title: 'Senior Product Manager', org: 'E-commerce platform' }, { period: '2013 – 2016', title: 'Business Analyst', org: 'Consulting firm' }],
            days: [1, 2, 3, 4], hours: [8, 9, 17, 18, 19] },
        { id: 'm2', name: 'Marek Zając', headline: 'Engineering Manager · 3 teams, 25 engineers · first-time managers', topics: ['eng-lead', 'career'], languages: ['English', 'Polish'], country: 'Poland', rate: 95, rating: 4.8, reviews: 87, sessions: 540, mentees: 61, years: 15, role: 'Engineering Manager', company: 'SaaS company', color: '#1f8a70', superMentor: true, responseHrs: 4, intro: true, featured: true,
            bio: 'Former staff engineer turned engineering manager. I mentor new managers and tech leads: 1:1s, feedback, hiring, delivery under pressure and building trust with product. Expect homework between sessions.',
            experience: [{ period: '2019 – now', title: 'Engineering Manager', org: 'SaaS company' }, { period: '2012 – 2019', title: 'Staff Engineer', org: 'Telecom' }],
            days: [1, 3, 5, 6], hours: [7, 12, 18, 19, 20] },
        { id: 'm3', name: 'Tomasz Lis', headline: 'AI Engineer · LLM apps in production · RAG, evals, agents', topics: ['ai', 'data'], languages: ['English', 'Polish'], country: 'Poland', rate: 120, rating: 4.7, reviews: 41, sessions: 190, mentees: 33, years: 9, role: 'Principal AI Engineer', company: 'AI consultancy', color: '#d0563b', superMentor: false, responseHrs: 6, intro: true, featured: true,
            bio: 'I build LLM-based products for enterprise clients: retrieval, evaluation pipelines, agent workflows and cost control. I can review your architecture, help you plan an AI feature or prepare for an AI engineering role.',
            experience: [{ period: '2022 – now', title: 'Principal AI Engineer', org: 'AI consultancy' }, { period: '2016 – 2022', title: 'ML Engineer', org: 'Retail analytics' }],
            days: [2, 4, 6], hours: [9, 10, 11, 16, 17] },
        { id: 'm4', name: 'Sofia Martins', headline: 'Product Designer · design systems · portfolio reviews', topics: ['ux', 'career'], languages: ['English', 'Portuguese', 'Spanish'], country: 'Portugal', rate: 60, rating: 4.9, reviews: 203, sessions: 1310, mentees: 150, years: 10, role: 'Lead Product Designer', company: 'Travel marketplace', color: '#c2417a', superMentor: true, responseHrs: 1, intro: true, featured: true,
            bio: 'Portfolio reviews, design critiques and career strategy for designers. I lead a design system used by 40 designers and love helping juniors land their first role.',
            experience: [{ period: '2020 – now', title: 'Lead Product Designer', org: 'Travel marketplace' }],
            days: [1, 2, 3, 4, 5], hours: [10, 11, 14, 15] },
        { id: 'm5', name: 'James Carter', headline: 'Data Science Manager · analytics careers · SQL to ML', topics: ['data', 'ai'], languages: ['English'], country: 'United Kingdom', rate: 110, rating: 4.6, reviews: 29, sessions: 150, mentees: 25, years: 11, role: 'Data Science Manager', company: 'Insurance group', color: '#2f6fd0', superMentor: false, responseHrs: 12, intro: false,
            bio: 'I help analysts grow into data scientists and data scientists into leads. Mock interviews, project reviews and learning plans.',
            experience: [{ period: '2018 – now', title: 'Data Science Manager', org: 'Insurance group' }],
            days: [2, 3, 4], hours: [18, 19, 20] },
        { id: 'm6', name: 'Olga Nowicka', headline: 'Startup founder (exit 2023) · fundraising · go-to-market', topics: ['startup', 'product'], languages: ['English', 'Polish', 'German'], country: 'Germany', rate: 150, rating: 5.0, reviews: 18, sessions: 70, mentees: 15, years: 14, role: 'Founder & angel investor', company: 'Independent', color: '#a8762a', superMentor: false, responseHrs: 24, intro: true,
            bio: 'Founded and sold a B2B SaaS. Now an angel investor. I help early-stage founders with pitch decks, investor pipelines and first sales.',
            experience: [{ period: '2015 – 2023', title: 'Founder & CEO', org: 'B2B SaaS (acquired)' }],
            days: [5, 6], hours: [10, 11, 12] },
        { id: 'm7', name: 'Piotr Kamiński', headline: 'Conference speaker · TEDx coach · presenting to executives', topics: ['speaking', 'career'], languages: ['Polish', 'English'], country: 'Poland', rate: 45, rating: 4.8, reviews: 66, sessions: 420, mentees: 80, years: 8, role: 'Communication coach', company: 'Own practice', color: '#5c6b7a', superMentor: false, responseHrs: 3, intro: true,
            bio: 'I coach engineers and managers to present with clarity: structure, storytelling, slides and handling tough questions.',
            experience: [{ period: '2017 – now', title: 'Communication coach', org: 'Own practice' }],
            days: [1, 2, 3, 4, 5], hours: [8, 13, 19] },
        { id: 'm8', name: 'Lena Fischer', headline: 'VP Engineering · scaling orgs 20 → 200 · tech strategy', topics: ['eng-lead', 'startup'], languages: ['English', 'German'], country: 'Germany', rate: 180, rating: 4.9, reviews: 22, sessions: 95, mentees: 19, years: 18, role: 'VP Engineering', company: 'Mobility unicorn', color: '#3b3fd6', superMentor: true, responseHrs: 8, intro: false,
            bio: 'For directors and VPs: org design, engineering strategy, working with the board and hiring leaders.',
            experience: [{ period: '2019 – now', title: 'VP Engineering', org: 'Mobility unicorn' }],
            days: [3, 5], hours: [17, 18] },
    ];
    const reviewPool = [
        ['Clear, structured and honest feedback. I left with three concrete actions.', ['Actionable advice', 'Clear communication']],
        ['Helped me prepare for a senior interview — got the offer two weeks later!', ['Career impact', 'Well prepared']],
        ['Great listener, asked the right questions instead of lecturing.', ['Good listener']],
        ['Very practical. We reviewed my real roadmap line by line.', ['Actionable advice', 'Expert knowledge']],
        ['Good session, though we ran out of time on the second topic.', ['Expert knowledge']],
    ];
    const names = ['Ola K.', 'Michał P.', 'Jan W.', 'Eva S.', 'Daniel R.', 'Marta G.'];
    const reviews = [];
    mentors.forEach((m, i) => {
        for (let k = 0; k < 5; k++) {
            const [text, tags] = reviewPool[(i + k) % reviewPool.length];
            reviews.push({ id: `r${m.id}${k}`, mentorId: m.id, author: names[(i + k) % names.length], rating: k === 4 ? 4 : 5, date: at(-(k * 9 + i + 3), 12), text, tags,
                reply: k === 0 ? 'Thank you — great work between sessions!' : undefined });
        }
    });
    const sessions = [
        { id: 's1', mentorId: 'm2', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(1, 18), minutes: 60, type: 'regular', status: 'scheduled', price: 95, reviewed: false, goal: 'Prepare my first performance review cycle as a new manager.', subscriptionId: 'sub1' },
        { id: 's2', mentorId: 'm1', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(2, 17), minutes: 60, type: 'regular', status: 'scheduled', price: 80, reviewed: false, goal: 'Understand what a move to Senior PM requires.' },
        { id: 's3', mentorId: 'm2', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(-6, 18), minutes: 60, type: 'regular', status: 'completed', price: 95, reviewed: true, subscriptionId: 'sub1', notes: '- Agreed 1:1 template\n- Homework: write feedback for 2 people' },
        { id: 's4', mentorId: 'm3', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(-2, 10), minutes: 30, type: 'intro', status: 'completed', price: 30, reviewed: false },
        { id: 's5', mentorId: 'm5', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(-10, 19), minutes: 60, type: 'regular', status: 'cancelled', price: 110, reviewed: false, cancelReason: 'Schedule conflict' },
        // Mentor-side (Anna, m1) sessions with other mentees
        { id: 's6', mentorId: 'm1', menteeId: 'u2', menteeName: 'Piotr Bąk', start: at(0, 17), minutes: 60, type: 'regular', status: 'scheduled', price: 80, reviewed: false, goal: 'Roadmap review for Q1', subscriptionId: 'sub9' },
        { id: 's7', mentorId: 'm1', menteeId: 'u3', menteeName: 'Ola Mazur', start: at(0, 19), minutes: 30, type: 'intro', status: 'scheduled', price: 20, reviewed: false, goal: 'Switching from QA to product' },
        { id: 's8', mentorId: 'm1', menteeId: 'u2', menteeName: 'Piotr Bąk', start: at(3, 8), minutes: 60, type: 'regular', status: 'scheduled', price: 80, reviewed: false, subscriptionId: 'sub9' },
        { id: 's9', mentorId: 'm1', menteeId: 'u4', menteeName: 'Jan Wróbel', start: at(-3, 18), minutes: 60, type: 'regular', status: 'completed', price: 80, reviewed: true },
        { id: 's10', mentorId: 'm1', menteeId: 'u2', menteeName: 'Piotr Bąk', start: at(-4, 8), minutes: 60, type: 'regular', status: 'completed', price: 80, reviewed: true },
    ];
    const subscriptions = [
        { id: 'sub1', mentorId: 'm2', perWeek: 1, minutes: 60, credits: 2, pricePerCycle: 380, renewsOn: at(12, 9), status: 'active' },
    ];
    const paymentMethods = [{ id: 'pm1', brand: 'Visa', last4: '4242', exp: '08/28', default: true }];
    const invoices = [
        { id: 'INV-2026-0141', date: at(-16, 9), desc: 'Marek Zając · 4 weeks · 1×60 min', amount: 381.5, status: 'paid' },
        { id: 'INV-2026-0157', date: at(-5, 9), desc: 'Tomasz Lis · intro session 30 min', amount: 31.5, status: 'paid' },
        { id: 'INV-2026-0163', date: at(-1, 9), desc: 'Anna Wiśniewska · session 60 min', amount: 81.5, status: 'paid' },
    ];
    const threads = [
        { id: 't1', withName: 'Marek Zając', withColor: '#1f8a70', mentorId: 'm2', paidSession: true, unread: 1, messages: [
                { from: 'them', text: 'Hi Kasia, before tomorrow could you send me the draft of your review template?', at: at(0, 9, 12) },
                { from: 'me', text: 'Sure, I will share it tonight.', at: at(0, 9, 40) },
                { from: 'them', text: 'Great. Also think about one person who is underperforming — we will role-play that conversation.', at: at(0, 10, 2) },
            ] },
        { id: 't2', withName: 'Anna Wiśniewska', withColor: '#7a4fd8', mentorId: 'm1', paidSession: false, unread: 0, messages: [
                { from: 'sys', text: 'Session booked for ' + fmtDT(at(2, 17)), at: at(-1, 9) },
                { from: 'them', text: 'Looking forward to our first session! Feel free to share your CV or a recent PRD beforehand.', at: at(-1, 11) },
            ] },
        { id: 't3', withName: 'Tomasz Lis', withColor: '#d0563b', mentorId: 'm3', paidSession: true, unread: 0, messages: [
                { from: 'them', text: 'Thanks for the session! Here is the evaluation checklist we discussed.', at: at(-2, 12) },
            ] },
    ];
    const mentorThreads = [
        { id: 't11', withName: 'Ola Mazur', withColor: '#2f6fd0', paidSession: false, unread: 2, messages: [
                { from: 'them', text: 'Hi Anna, I booked an intro for today. Should I prepare anything?', at: at(0, 8) },
                { from: 'them', text: 'I currently work as a QA engineer.', at: at(0, 8, 2) },
            ] },
        { id: 't12', withName: 'Piotr Bąk', withColor: '#1f8a70', paidSession: true, unread: 0, messages: [
                { from: 'me', text: 'Please bring the Q1 roadmap draft today.', at: at(-1, 18) },
                { from: 'them', text: 'Will do!', at: at(-1, 18, 30) },
            ] },
        { id: 't2', withName: 'Kasia Nowak', withColor: '#5b5fe0', paidSession: false, unread: 0, messages: [
                { from: 'sys', text: 'Session booked for ' + fmtDT(at(2, 17)), at: at(-1, 9) },
                { from: 'me', text: 'Looking forward to our first session! Feel free to share your CV or a recent PRD beforehand.', at: at(-1, 11) },
            ] },
    ];
    const notifications = {
        guest: [],
        mentee: [
            { id: 'n1', kind: 'message', text: 'Marek Zając sent you a message', at: at(0, 10, 2), read: false, href: '/messages/t1' },
            { id: 'n2', kind: 'session', text: 'Reminder: session with Marek Zając tomorrow at 18:00', at: at(0, 8), read: false, href: '/sessions' },
            { id: 'n3', kind: 'session', text: 'How was your intro with Tomasz Lis? Leave a review', at: at(-2, 11), read: false, href: '/sessions/s4/review' },
            { id: 'n4', kind: 'payment', text: 'Payment received: $81.50 for a session with Anna Wiśniewska', at: at(-1, 9), read: true, href: '/billing' },
            { id: 'n5', kind: 'system', text: 'Welcome to MentorHub! Complete your profile to get better matches.', at: at(-20, 9), read: true, href: '/settings' },
        ],
        mentor: [
            { id: 'n11', kind: 'session', text: 'New intro booking: Ola Mazur, today at 19:00', at: at(0, 7, 50), read: false, href: '/mentor/calendar' },
            { id: 'n12', kind: 'message', text: 'Ola Mazur sent you 2 messages', at: at(0, 8, 2), read: false, href: '/messages/t11' },
            { id: 'n13', kind: 'payment', text: 'Payout of $520.00 sent to your bank account', at: at(-3, 9), read: true, href: '/mentor/earnings' },
            { id: 'n14', kind: 'system', text: 'New review from Jan W. (5★)', at: at(-3, 20), read: true, href: '/mentor/profile' },
        ],
        admin: [
            { id: 'n21', kind: 'system', text: '2 new mentor applications waiting', at: at(0, 7), read: false, href: '/admin/applications' },
            { id: 'n22', kind: 'system', text: 'Dispute D-104 opened: mentor no-show', at: at(-1, 15), read: false, href: '/admin/disputes' },
        ],
    };
    const mentees = [
        { id: 'u2', name: 'Piotr Bąk', color: '#1f8a70', plan: '2× / week · 60 min', status: 'active', done: 14, credits: 5, next: at(0, 17), goals: ['Own Q1 roadmap end to end', 'Promotion to Senior PM by June'], notes: ['Strong in delivery, needs work on saying no to stakeholders.'] },
        { id: 'u3', name: 'Ola Mazur', color: '#2f6fd0', plan: 'Intro booked', status: 'active', done: 0, credits: 0, next: at(0, 19), goals: ['Switch from QA to product'], notes: [] },
        { id: 'u1', name: 'Kasia Nowak', color: '#5b5fe0', plan: 'Single session', status: 'active', done: 0, credits: 0, next: at(2, 17), goals: ['Move to Senior PM'], notes: [] },
        { id: 'u4', name: 'Jan Wróbel', color: '#a8762a', plan: '1× / week · 60 min', status: 'paused', done: 9, credits: 1, next: '', goals: ['Prepare for PM interviews'], notes: ['Paused for holidays until next month.'] },
        { id: 'u5', name: 'Marta Gil', color: '#c2417a', plan: 'Plan ended', status: 'ended', done: 22, credits: 0, next: '', goals: ['First PM job'], notes: ['Landed the job 🎉'] },
    ];
    const availability = {
        timezone: tzName(), minNoticeHours: 4, horizonWeeks: 6, bufferMinutes: 15,
        weekly: { 1: [8, 9, 17, 18, 19], 2: [8, 9, 17, 18, 19], 3: [8, 9, 17, 18, 19], 4: [8, 9, 17, 18, 19] },
        timeOff: [{ id: 'to1', from: isoDay(new Date(Date.now() + 20 * 864e5)), to: isoDay(new Date(Date.now() + 27 * 864e5)), reason: 'Holiday' }],
    };
    const earnings = {
        weeks: [310, 420, 380, 515, 460, 600, 545, 320].map((v, i) => ({ label: `W${i + 1}`, net: v })),
        available: 640, pending: 315, lifetime: 41860, tier: 15, hoursTaught: 812,
        payoutMethod: null,
        transactions: [
            { date: at(-3, 19), desc: 'Session · Jan Wróbel · 60 min', gross: 80, fee: 12, net: 68, status: 'pending' },
            { date: at(-4, 9), desc: 'Session · Piotr Bąk · 60 min', gross: 80, fee: 12, net: 68, status: 'pending' },
            { date: at(-6, 9), desc: 'Intro · Marta Gil · 30 min', gross: 20, fee: 20, net: 0, status: 'paid' },
            { date: at(-8, 18), desc: 'Session · Piotr Bąk · 60 min', gross: 80, fee: 12, net: 68, status: 'paid' },
        ],
        payouts: [
            { id: 'po-31', date: at(-3, 9), amount: 520, status: 'paid' },
            { id: 'po-30', date: at(-10, 9), amount: 488, status: 'paid' },
        ],
    };
    const applications = [
        { id: 'ap1', name: 'Karolina Duda', email: 'karolina@example.com', country: 'Poland', topics: ['product', 'career'], years: 7, headline: 'Senior PM · marketplaces · PM interviews', bio: 'Seven years in product at two marketplaces. I want to help juniors prepare for interviews and their first 90 days.', linkedin: 'https://linkedin.com/in/karolina-duda', video: 'https://youtu.be/demo1', rate: 55, hoursPerWeek: 6, submitted: at(-1, 14), status: 'pending', checks: { identity: true, linkedin: true, video: false } },
        { id: 'ap2', name: 'Rafael Gomez', email: 'rafael@example.com', country: 'Spain', topics: ['ai'], years: 4, headline: 'ML engineer · computer vision', bio: 'ML engineer working on computer vision for retail.', linkedin: 'https://linkedin.com/in/rgomez', video: '', rate: 70, hoursPerWeek: 5, submitted: at(-2, 10), status: 'pending', checks: { identity: true, linkedin: false, video: false } },
        { id: 'ap3', name: 'Igor Nowak', email: 'igor@example.com', country: 'Poland', topics: ['eng-lead'], years: 12, headline: 'CTO at a 40-person software house', bio: 'CTO and co-founder. I mentor tech leads on architecture decisions and team growth.', linkedin: 'https://linkedin.com/in/igornowak', video: 'https://vimeo.com/demo', rate: 130, hoursPerWeek: 4, submitted: at(-5, 9), status: 'changes', checks: { identity: true, linkedin: true, video: true }, note: 'Please add a short intro video (max 2 min).' },
        { id: 'ap4', name: 'Emily Chen', email: 'emily@example.com', country: 'Ireland', topics: ['ux'], years: 9, headline: 'Design manager · accessibility', bio: 'Design manager focused on accessibility.', linkedin: 'https://linkedin.com/in/emilychen', video: 'https://youtu.be/demo4', rate: 75, hoursPerWeek: 8, submitted: at(-9, 9), status: 'approved', checks: { identity: true, linkedin: true, video: true } },
    ];
    const disputes = [
        { id: 'D-104', sessionId: 's-x1', kind: 'mentor_no_show', opened: at(-1, 15), by: 'Michał P. (mentee)', against: 'James Carter (mentor)', amount: 110, status: 'open',
            description: 'The mentor did not join the session. I waited 20 minutes.', timeline: ['18:58 Mentee joined the room', '19:00 Session start time', '19:20 Mentee left the room', 'Mentor never joined (no room token issued)'] },
        { id: 'D-103', sessionId: 's-x2', kind: 'quality', opened: at(-2, 11), by: 'Eva S. (mentee)', against: 'Piotr Kamiński (mentor)', amount: 45, status: 'open',
            description: 'Session ended after 25 of 60 minutes due to connection problems on the mentor side.', timeline: ['10:00 Both joined', '10:25 Mentor disconnected', '10:31 Session ended by system'] },
        { id: 'D-101', sessionId: 's-x3', kind: 'payment', opened: at(-8, 9), by: 'Daniel R. (mentee)', against: 'Platform', amount: 61.5, status: 'resolved',
            description: 'Charged twice for one intro session.', timeline: ['Two payment intents captured 2 s apart'], resolution: 'Duplicate charge refunded in full.' },
    ];
    return {
        topics, mentors, reviews, sessions, subscriptions, paymentMethods, invoices, threads, mentorThreads, notifications, mentees,
        availability, earnings, applications, disputes, favorites: ['m4'], introUsed: ['m3', 'm2'],
        myApplication: null,
        profile: { name: 'Kasia Nowak', email: 'kasia@example.com', timezone: tzName(), language: 'English', goals: 'Grow into a Senior PM role' },
        prefs: { session_email: true, session_push: true, message_email: true, message_push: true, payment_email: true, marketing_email: false },
    };
}
let DB = freshDb();
/* ---------- helpers on the demo DB ---------- */
const mentorById = (id) => DB.mentors.find(m => m.id === id);
const ME_MENTOR_ID = 'm1';
function introPrice(m) { return Math.round(((m.rate * RULES.introMinutes) / 60) * RULES.introPriceFactor); }
function sessionPrice(m, type, minutes) {
    return type === 'intro' ? introPrice(m) : Math.round((m.rate * minutes) / 60);
}
function mentorPublic(m) {
    return { ...m, introPrice: introPrice(m), favorite: DB.favorites.includes(m.id), introAvailable: m.intro && (S.role !== 'mentee' || !DB.introUsed.includes(m.id)) };
}
function generateSlots(m, from, days, minutes) {
    const out = [];
    const weekly = m.id === ME_MENTOR_ID ? DB.availability.weekly : null;
    for (let d = 0; d < days; d++) {
        const day = new Date(from);
        day.setDate(day.getDate() + d);
        day.setHours(0, 0, 0, 0);
        const dow = day.getDay();
        const hours = weekly ? weekly[dow] ?? [] : m.days.includes(dow) ? m.hours : [];
        const slots = [];
        for (const h of hours) {
            const mins = minutes <= 30 ? [0, 30] : [0];
            for (const mm of mins) {
                const t = new Date(day);
                t.setHours(h, mm, 0, 0);
                if (t.getTime() < Date.now())
                    continue;
                const iso = t.toISOString();
                const booked = DB.sessions.some(s => s.mentorId === m.id && s.status === 'scheduled' && Math.abs(new Date(s.start).getTime() - t.getTime()) < 36e5)
                    || hash(m.id + iso) < 0.28;
                const notice = t.getTime() < Date.now() + RULES.minNoticeHours * 36e5;
                slots.push({ start: iso, available: !booked && !notice, reason: booked ? 'booked' : notice ? 'notice' : '' });
            }
        }
        out.push({ date: isoDay(day), slots });
    }
    return out;
}
function cycleDate(days) { return at(days, 9); }
function pushNotification(role, n) {
    DB.notifications[role].unshift({ ...n, id: 'n' + Date.now(), at: new Date().toISOString(), read: false });
}
const CONTACT_RE = /([^\s@]+@[^\s@]+\.[a-z]{2,})|(\+?\d[\d\s-]{7,}\d)|(https?:\/\/|www\.)|(whatsapp|telegram|skype)/i;
/* =====================================================================
   MOCK ENDPOINTS (method + path = contract in 05-Katalog-API.md)
   ===================================================================== */
/* --- Auth & account --- */
mock('POST', '/api/auth/register', ({ body }) => {
    if (String(body.email).toLowerCase() === 'taken@example.com')
        throw new ApiError(409, 'Email already registered.', { email: 'An account with this email already exists. Log in instead.' });
    return { user: { id: 'u1', name: body.name, email: body.email }, role: body.intent === 'mentor' ? 'mentee' : 'mentee', next: body.intent === 'mentor' ? '/apply' : '/home' };
});
mock('POST', '/api/auth/login', ({ body }) => {
    if (body.password === 'wrong')
        throw new ApiError(401, 'Email or password is incorrect.');
    const email = String(body.email).toLowerCase();
    const role = email.includes('admin') ? 'admin' : email.includes('mentor') ? 'mentor' : 'mentee';
    return { user: { id: 'u1', email }, role };
});
mock('POST', '/api/auth/logout', () => ({ ok: true }));
mock('POST', '/api/auth/password-reset', () => ({ ok: true }));
mock('GET', '/api/me', () => ({ ...DB.profile, role: S.role }));
mock('PATCH', '/api/me', ({ body }) => { Object.assign(DB.profile, body); return DB.profile; });
mock('PUT', '/api/me/password', ({ body }) => {
    if (body.current === 'wrong')
        throw new ApiError(422, 'Current password is incorrect.', { current: 'Current password is incorrect.' });
    return { ok: true };
});
mock('GET', '/api/me/notification-preferences', () => DB.prefs);
mock('PUT', '/api/me/notification-preferences', ({ body }) => { DB.prefs = body; return DB.prefs; });
mock('POST', '/api/me/data-export', () => ({ ok: true, eta: '24 h' }));
mock('DELETE', '/api/me', () => ({ ok: true }));
/* --- Catalogue --- */
mock('GET', '/api/topics', () => DB.topics);
mock('GET', '/api/mentors', ({ query }) => {
    let list = DB.mentors.slice();
    const q = (query.get('q') || '').toLowerCase();
    const topic = query.get('topic');
    const pmin = Number(query.get('priceMin') || 0);
    const pmax = Number(query.get('priceMax') || 1e9);
    const lang = query.get('language');
    const tod = query.get('time');
    if (query.get('featured'))
        list = list.filter(m => m.featured);
    if (q)
        list = list.filter(m => (m.name + m.headline + m.bio).toLowerCase().includes(q));
    if (topic)
        list = list.filter(m => m.topics.includes(topic));
    list = list.filter(m => m.rate >= pmin && m.rate <= pmax);
    if (lang)
        list = list.filter(m => m.languages.includes(lang));
    if (query.get('super') === '1')
        list = list.filter(m => m.superMentor);
    if (tod === 'morning')
        list = list.filter(m => m.hours.some(h => h < 12));
    if (tod === 'afternoon')
        list = list.filter(m => m.hours.some(h => h >= 12 && h < 17));
    if (tod === 'evening')
        list = list.filter(m => m.hours.some(h => h >= 17));
    const sort = query.get('sort') || 'recommended';
    if (sort === 'price_asc')
        list.sort((a, b) => a.rate - b.rate);
    if (sort === 'price_desc')
        list.sort((a, b) => b.rate - a.rate);
    if (sort === 'rating')
        list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    if (sort === 'sessions')
        list.sort((a, b) => b.sessions - a.sessions);
    if (sort === 'recommended')
        list.sort((a, b) => Number(b.superMentor) - Number(a.superMentor) || b.rating - a.rating);
    const limit = Number(query.get('limit') || 6);
    const page = Number(query.get('page') || 1);
    return { items: list.slice(0, page * limit).map(mentorPublic), total: list.length, page };
});
mock('GET', '/api/mentors/:id', ({ params }) => {
    const m = mentorById(params.id);
    if (!m)
        throw new ApiError(404, 'This mentor profile does not exist or is no longer active.');
    return mentorPublic(m);
});
mock('GET', '/api/mentors/:id/reviews', ({ params, query }) => {
    const all = DB.reviews.filter(r => r.mentorId === params.id);
    const page = Number(query.get('page') || 1);
    return { items: all.slice(0, page * 3), total: all.length };
});
mock('GET', '/api/mentors/:id/availability', ({ params, query }) => {
    const m = mentorById(params.id);
    if (!m)
        throw new ApiError(404, 'Mentor not found.');
    const from = query.get('from') ? new Date(query.get('from') + 'T00:00:00') : new Date();
    return { timezone: tzName(), days: generateSlots(m, from, Number(query.get('days') || 7), Number(query.get('minutes') || 60)) };
});
mock('PUT', '/api/me/favorites/:mentorId', ({ params }) => { if (!DB.favorites.includes(params.mentorId))
    DB.favorites.push(params.mentorId); return { favorite: true }; });
mock('DELETE', '/api/me/favorites/:mentorId', ({ params }) => { DB.favorites = DB.favorites.filter(f => f !== params.mentorId); return { favorite: false }; });
mock('GET', '/api/mentors/:id/plans', ({ params }) => {
    const m = mentorById(params.id);
    if (!m)
        throw new ApiError(404, 'Mentor not found.');
    return { mentor: mentorPublic(m), items: [1, 2, 3, 5].map(n => ({ perWeek: n, minutes: 60, sessionsPerCycle: n * 4, pricePerCycle: m.rate * n * 4, popular: n === 1 })) };
});
/* --- Booking & checkout --- */
mock('POST', '/api/bookings/hold', ({ body }) => {
    const m = mentorById(body.mentorId);
    if (!m)
        throw new ApiError(404, 'Mentor not found.');
    if (body.type === 'intro' && DB.introUsed.includes(m.id))
        throw new ApiError(422, 'You already had an intro session with this mentor.');
    if (hoursUntil(body.start) < RULES.minNoticeHours)
        throw new ApiError(422, `Sessions must be booked at least ${RULES.minNoticeHours} hours in advance.`);
    if (hash('race' + m.id + body.start) < 0.12)
        throw new ApiError(409, 'Someone has just booked this time. Please pick another slot.');
    return { holdId: 'hold_' + Date.now(), expiresAt: Date.now() + RULES.holdMinutes * 60000 };
});
mock('POST', '/api/checkout/quote', ({ body }) => {
    const subtotal = Number(body.price);
    let discount = 0;
    if (body.promo) {
        const p = PROMO[String(body.promo).trim().toUpperCase()];
        if (!p)
            throw new ApiError(422, 'Invalid code.', { promo: 'This code is not valid or has expired.' });
        discount = Math.round(subtotal * p * 100) / 100;
    }
    return { subtotal, discount, fee: RULES.serviceFee, total: Math.round((subtotal - discount + RULES.serviceFee) * 100) / 100 };
});
mock('GET', '/api/me/payment-methods', () => DB.paymentMethods);
mock('POST', '/api/me/payment-methods', ({ body }) => {
    const pm = { id: 'pm' + Date.now(), brand: 'Card', last4: String(body.number).slice(-4), exp: body.exp, default: false };
    DB.paymentMethods.push(pm);
    return pm;
});
mock('DELETE', '/api/me/payment-methods/:id', ({ params }) => {
    const pm = DB.paymentMethods.find(p => p.id === params.id);
    if (pm?.default && DB.subscriptions.some(s => s.status === 'active'))
        throw new ApiError(409, 'This card pays for an active plan. Add another card and make it default first.');
    DB.paymentMethods = DB.paymentMethods.filter(p => p.id !== params.id);
    return { ok: true };
});
mock('POST', '/api/payments/intents', ({ body }) => {
    if (body.method === 'card' && String(body.number || '').replace(/\s/g, '').endsWith('0002'))
        throw new ApiError(402, 'Your card was declined. Try another card or payment method.');
    if (body.method === 'blik' && body.blik === '000000')
        throw new ApiError(402, 'The BLIK code has expired. Generate a new code in your banking app.');
    return { id: 'pi_' + Date.now(), status: 'succeeded' };
});
mock('POST', '/api/bookings', ({ body }) => {
    const m = mentorById(body.mentorId);
    const s = { id: 's' + Date.now(), mentorId: m.id, menteeId: 'u1', menteeName: 'Kasia Nowak', start: body.start, minutes: body.minutes, type: body.type, status: 'scheduled', price: body.price, reviewed: false, goal: body.goal };
    DB.sessions.push(s);
    if (body.type === 'intro')
        DB.introUsed.push(m.id);
    DB.invoices.unshift({ id: 'INV-2026-0' + (170 + DB.invoices.length), date: new Date().toISOString(), desc: `${m.name} · ${body.type === 'intro' ? 'intro session' : 'session'} ${body.minutes} min`, amount: body.total, status: 'paid' });
    pushNotification('mentee', { kind: 'payment', text: `Payment received: ${money(body.total)} — session with ${m.name}`, href: '/billing' });
    if (!DB.threads.some(t => t.mentorId === m.id))
        DB.threads.unshift({ id: 't' + Date.now(), withName: m.name, withColor: m.color, mentorId: m.id, paidSession: false, unread: 0, messages: [{ from: 'sys', text: `Session booked for ${fmtDT(body.start)}`, at: new Date().toISOString() }] });
    return { id: s.id };
});
mock('GET', '/api/bookings/:id', ({ params }) => {
    const s = DB.sessions.find(x => x.id === params.id);
    if (!s)
        throw new ApiError(404, 'Booking not found.');
    return { ...s, mentor: mentorPublic(mentorById(s.mentorId)) };
});
mock('POST', '/api/subscriptions', ({ body }) => {
    const m = mentorById(body.mentorId);
    const sub = { id: 'sub' + Date.now(), mentorId: m.id, perWeek: body.perWeek, minutes: 60, credits: body.perWeek * 4, pricePerCycle: m.rate * body.perWeek * 4, renewsOn: cycleDate(28), status: 'active' };
    DB.subscriptions.push(sub);
    DB.invoices.unshift({ id: 'INV-2026-0' + (170 + DB.invoices.length), date: new Date().toISOString(), desc: `${m.name} · 4 weeks · ${body.perWeek}×60 min`, amount: body.total, status: 'paid' });
    return sub;
});
/* --- Sessions (mentee) --- */
mock('GET', '/api/me/sessions', ({ query }) => {
    const st = query.get('status') || 'upcoming';
    let list = DB.sessions.filter(s => s.menteeId === 'u1');
    if (st === 'upcoming')
        list = list.filter(s => s.status === 'scheduled').sort((a, b) => a.start.localeCompare(b.start));
    if (st === 'past')
        list = list.filter(s => s.status === 'completed' || s.status === 'no_show').sort((a, b) => b.start.localeCompare(a.start));
    if (st === 'cancelled')
        list = list.filter(s => s.status === 'cancelled');
    return { items: list.map(s => ({ ...s, mentor: mentorPublic(mentorById(s.mentorId)) })) };
});
mock('GET', '/api/me/home', () => {
    const upcoming = DB.sessions.filter(s => s.menteeId === 'u1' && s.status === 'scheduled').sort((a, b) => a.start.localeCompare(b.start));
    const toReview = DB.sessions.filter(s => s.menteeId === 'u1' && s.status === 'completed' && !s.reviewed);
    const trialsNoPlan = DB.sessions.filter(s => s.menteeId === 'u1' && s.type === 'intro' && s.status === 'completed' && !DB.subscriptions.some(x => x.mentorId === s.mentorId && x.status === 'active'));
    const wrap = (s) => ({ ...s, mentor: mentorPublic(mentorById(s.mentorId)) });
    return {
        upcoming: upcoming.map(wrap), toReview: toReview.map(wrap), trialsNoPlan: trialsNoPlan.map(wrap),
        subscriptions: DB.subscriptions.filter(s => s.status === 'active').map(s => ({ ...s, mentor: mentorPublic(mentorById(s.mentorId)) })),
        recommended: DB.mentors.filter(m => m.topics.includes('product') || m.topics.includes('career')).slice(0, 3).map(mentorPublic),
        stats: { sessionsDone: DB.sessions.filter(s => s.menteeId === 'u1' && s.status === 'completed').length, hours: 3.5, streakWeeks: 3 },
    };
});
mock('POST', '/api/sessions/:id/reschedule', ({ params, body }) => {
    const s = DB.sessions.find(x => x.id === params.id);
    if (!s)
        throw new ApiError(404, 'Session not found.');
    if (hoursUntil(s.start) < RULES.freeCancelHours)
        throw new ApiError(422, `Sessions can be rescheduled up to ${RULES.freeCancelHours} hours before the start.`);
    if (!body.start)
        throw new ApiError(422, 'Pick a new time.', { start: 'Pick a new time.' });
    s.start = body.start;
    pushNotification('mentor', { kind: 'session', text: `${s.menteeName} moved a session to ${fmtDT(body.start)}`, href: '/mentor/calendar' });
    return s;
});
mock('POST', '/api/sessions/:id/cancel', ({ params, body }) => {
    const s = DB.sessions.find(x => x.id === params.id);
    if (!s)
        throw new ApiError(404, 'Session not found.');
    const refund = hoursUntil(s.start) >= RULES.freeCancelHours || body.by === 'mentor';
    s.status = 'cancelled';
    s.cancelReason = body.reason;
    if (s.subscriptionId && refund) {
        const sub = DB.subscriptions.find(x => x.id === s.subscriptionId);
        if (sub)
            sub.credits++;
    }
    return { refunded: refund, refundTo: s.subscriptionId ? 'credit' : 'original payment method' };
});
mock('GET', '/api/sessions/:id', ({ params }) => {
    const s = DB.sessions.find(x => x.id === params.id);
    if (!s)
        throw new ApiError(404, 'Session not found.');
    return { ...s, mentor: mentorPublic(mentorById(s.mentorId)) };
});
mock('POST', '/api/sessions/:id/room-token', ({ params }) => {
    const s = DB.sessions.find(x => x.id === params.id);
    if (!s)
        throw new ApiError(404, 'Session not found.');
    if (s.status !== 'scheduled')
        throw new ApiError(410, 'This session is no longer active.');
    return { token: 'rtc_' + params.id, iceServers: 2, expiresIn: 7200 };
});
mock('PUT', '/api/sessions/:id/notes', ({ params, body }) => {
    const s = DB.sessions.find(x => x.id === params.id);
    if (s)
        s.notes = body.notes;
    return { savedAt: new Date().toISOString() };
});
mock('POST', '/api/sessions/:id/complete', ({ params }) => {
    const s = DB.sessions.find(x => x.id === params.id);
    if (s)
        s.status = 'completed';
    return { ok: true };
});
mock('POST', '/api/sessions/:id/review', ({ params, body }) => {
    const s = DB.sessions.find(x => x.id === params.id);
    if (!s)
        throw new ApiError(404, 'Session not found.');
    if (s.status !== 'completed')
        throw new ApiError(422, 'You can review a session only after it has taken place.');
    if (s.reviewed)
        throw new ApiError(409, 'You have already reviewed this session.');
    s.reviewed = true;
    DB.reviews.unshift({ id: 'r' + Date.now(), mentorId: s.mentorId, author: 'Kasia N.', rating: Number(body.rating), date: new Date().toISOString(), text: body.comment || '', tags: body.tags ? String(body.tags).split(',') : [] });
    return { ok: true };
});
mock('POST', '/api/sessions/:id/report', ({ params, body }) => {
    DB.disputes.unshift({ id: 'D-' + (105 + DB.disputes.length), sessionId: params.id, kind: body.kind, opened: new Date().toISOString(), by: 'Kasia Nowak (mentee)', against: 'Mentor', amount: 0, status: 'open', description: body.description, timeline: ['Reported from My sessions'] });
    return { id: DB.disputes[0].id };
});
/* --- Billing & subscriptions --- */
mock('GET', '/api/me/billing', () => ({
    subscriptions: DB.subscriptions.map(s => ({ ...s, mentor: mentorPublic(mentorById(s.mentorId)) })),
    paymentMethods: DB.paymentMethods, invoices: DB.invoices,
}));
mock('PATCH', '/api/subscriptions/:id', ({ params, body }) => {
    const s = DB.subscriptions.find(x => x.id === params.id);
    if (!s)
        throw new ApiError(404, 'Plan not found.');
    const m = mentorById(s.mentorId);
    if (body.perWeek) {
        s.perWeek = Number(body.perWeek);
        s.pricePerCycle = m.rate * s.perWeek * 4;
    }
    if (body.status)
        s.status = body.status;
    return s;
});
mock('POST', '/api/subscriptions/:id/cancel', ({ params }) => {
    const s = DB.subscriptions.find(x => x.id === params.id);
    if (s)
        s.status = 'ended';
    return { ok: true, creditsValidUntil: s?.renewsOn };
});
mock('POST', '/api/subscriptions/:id/transfer', ({ params, body }) => {
    const s = DB.subscriptions.find(x => x.id === params.id);
    if (!s)
        throw new ApiError(404, 'Plan not found.');
    if (Number(body.credits) > s.credits)
        throw new ApiError(422, 'Not enough credits.', { credits: `You have only ${s.credits} credits on this plan.` });
    s.credits -= Number(body.credits);
    const to = mentorById(body.toMentorId);
    DB.subscriptions.push({ id: 'sub' + Date.now(), mentorId: to.id, perWeek: 1, minutes: 60, credits: Number(body.credits), pricePerCycle: to.rate * 4, renewsOn: s.renewsOn, status: 'active' });
    return { ok: true };
});
mock('GET', '/api/invoices/:id/pdf', () => ({ url: 'blob:invoice.pdf' }));
/* --- Messages & notifications --- */
const myThreads = () => (S.role === 'mentor' ? DB.mentorThreads : DB.threads);
mock('GET', '/api/threads', () => myThreads().map(t => ({ ...t, last: t.messages[t.messages.length - 1] })));
mock('GET', '/api/threads/:id/messages', ({ params }) => {
    const t = myThreads().find(x => x.id === params.id);
    if (!t)
        throw new ApiError(404, 'Conversation not found.');
    return t;
});
mock('POST', '/api/threads/:id/messages', ({ params, body }) => {
    const t = myThreads().find(x => x.id === params.id);
    if (!t)
        throw new ApiError(404, 'Conversation not found.');
    if (!t.paidSession && CONTACT_RE.test(body.text))
        throw new ApiError(422, 'Contact details blocked.', { text: 'For your safety, sharing emails, phone numbers or links is not allowed before your first completed session.' });
    t.messages.push({ from: 'me', text: body.text, at: new Date().toISOString() });
    return t;
});
mock('POST', '/api/threads', ({ body }) => {
    const m = mentorById(body.mentorId);
    let t = DB.threads.find(x => x.mentorId === m.id);
    if (!t) {
        t = { id: 't' + Date.now(), withName: m.name, withColor: m.color, mentorId: m.id, paidSession: false, unread: 0, messages: [] };
        DB.threads.unshift(t);
    }
    return t;
});
mock('POST', '/api/threads/:id/read', ({ params }) => { const t = myThreads().find(x => x.id === params.id); if (t)
    t.unread = 0; return { ok: true }; });
mock('GET', '/api/notifications', ({ query }) => {
    const kind = query.get('kind');
    const list = DB.notifications[S.role].filter(n => !kind || kind === 'all' || n.kind === kind);
    return { items: list, unread: DB.notifications[S.role].filter(n => !n.read).length };
});
mock('POST', '/api/notifications/read-all', () => { DB.notifications[S.role].forEach(n => (n.read = true)); return { ok: true }; });
/* --- Mentor application & profile --- */
mock('POST', '/api/mentor-applications', ({ body }) => {
    DB.myApplication = { id: 'apX', name: body.name || 'Kasia Nowak', email: 'kasia@example.com', country: '', topics: [], years: 0, headline: '', bio: '', linkedin: '', video: '', rate: 50, hoursPerWeek: 0, submitted: '', status: 'draft', checks: { identity: false, linkedin: false, video: false } };
    return DB.myApplication;
});
mock('GET', '/api/mentor-applications/me', () => DB.myApplication);
mock('PATCH', '/api/mentor-applications/:id', ({ body }) => { if (DB.myApplication)
    Object.assign(DB.myApplication, body); return DB.myApplication; });
mock('POST', '/api/uploads', ({ body }) => ({ id: 'up_' + Date.now(), url: 'https://cdn.example/' + body.kind, kind: body.kind }));
mock('POST', '/api/mentor-applications/:id/submit', () => {
    if (!DB.myApplication)
        throw new ApiError(404, 'Application not found.');
    DB.myApplication.status = 'submitted';
    DB.myApplication.submitted = new Date().toISOString();
    DB.applications.unshift({ ...DB.myApplication, id: 'ap' + Date.now(), status: 'pending' });
    pushNotification('admin', { kind: 'system', text: `New mentor application: ${DB.myApplication.name}`, href: '/admin/applications' });
    return DB.myApplication;
});
mock('GET', '/api/mentor/dashboard', () => {
    const mine = DB.sessions.filter(s => s.mentorId === ME_MENTOR_ID);
    const today = mine.filter(s => s.status === 'scheduled' && isoDay(new Date(s.start)) === isoDay(new Date())).sort((a, b) => a.start.localeCompare(b.start));
    return {
        kpis: { sessionsThisWeek: 6, earningsMonth: 2140, rating: 4.9, conversion: 62, profileViews: 318 },
        today, next7: mine.filter(s => s.status === 'scheduled' && hoursUntil(s.start) > 0 && hoursUntil(s.start) < 168).length,
        tasks: [
            { text: 'Reply to Ola Mazur (2 unread messages)', href: '/messages/t11', kind: 'message' },
            { text: 'Add notes after the session with Jan Wróbel', href: '/mentor/mentees?id=u4', kind: 'notes' },
            { text: 'Set up a payout method to withdraw $640', href: '/mentor/earnings', kind: 'payout' },
        ],
        profileCompleteness: 85, missing: ['Intro video subtitles', 'Second language certificate'],
    };
});
mock('GET', '/api/mentor/sessions', ({ query }) => {
    const from = new Date(query.get('from') + 'T00:00:00');
    const to = new Date(from.getTime() + 7 * 864e5);
    return { items: DB.sessions.filter(s => s.mentorId === ME_MENTOR_ID && s.status !== 'cancelled' && new Date(s.start) >= from && new Date(s.start) < to) };
});
mock('POST', '/api/mentor/sessions/:id/cancel', ({ params, body }) => {
    const s = DB.sessions.find(x => x.id === params.id);
    if (!s)
        throw new ApiError(404, 'Session not found.');
    s.status = 'cancelled';
    s.cancelReason = body.reason;
    return { refunded: true, reliabilityImpact: hoursUntil(s.start) < 24 };
});
mock('GET', '/api/mentor/availability', () => DB.availability);
mock('PUT', '/api/mentor/availability', ({ body }) => {
    const hours = Object.values(body.weekly).reduce((a, h) => a + h.length, 0);
    if (hours < 2)
        throw new ApiError(422, 'Too little availability.', { _form: 'Keep at least 2 hours per week open, or pause your profile instead.' });
    Object.assign(DB.availability, body);
    return DB.availability;
});
mock('POST', '/api/mentor/time-off', ({ body }) => {
    const conflicts = DB.sessions.filter(s => s.mentorId === ME_MENTOR_ID && s.status === 'scheduled' && isoDay(new Date(s.start)) >= body.from && isoDay(new Date(s.start)) <= body.to);
    if (conflicts.length && !body.force)
        throw new ApiError(409, 'Conflicts with booked sessions.', { _form: `${plural(conflicts.length, 'booked session')} fall into this period: ${conflicts.map(c => `${c.menteeName} (${fmtDT(c.start)})`).join(', ')}. Reschedule or cancel them first.` });
    DB.availability.timeOff.push({ id: 'to' + Date.now(), from: body.from, to: body.to, reason: body.reason });
    return DB.availability;
});
mock('DELETE', '/api/mentor/time-off/:id', ({ params }) => { DB.availability.timeOff = DB.availability.timeOff.filter(t => t.id !== params.id); return DB.availability; });
mock('GET', '/api/mentor/mentees', ({ query }) => {
    const st = query.get('status');
    return { items: DB.mentees.filter(m => !st || st === 'all' || m.status === st) };
});
mock('POST', '/api/mentor/mentees/:id/notes', ({ params, body }) => {
    const m = DB.mentees.find(x => x.id === params.id);
    if (!m)
        throw new ApiError(404, 'Mentee not found.');
    m.notes.unshift(body.text);
    return m;
});
mock('GET', '/api/mentor/earnings', () => DB.earnings);
mock('PUT', '/api/mentor/payout-method', ({ body }) => { DB.earnings.payoutMethod = { iban: body.iban, holder: body.holder }; return DB.earnings.payoutMethod; });
mock('POST', '/api/mentor/payouts', ({ body }) => {
    const amt = Number(body.amount);
    if (!DB.earnings.payoutMethod)
        throw new ApiError(422, 'Add a payout method first.');
    if (amt > DB.earnings.available)
        throw new ApiError(422, 'Amount too high.', { amount: `You can withdraw up to ${money(DB.earnings.available)}.` });
    DB.earnings.available -= amt;
    DB.earnings.payouts.unshift({ id: 'po-' + (32 + DB.earnings.payouts.length), date: new Date().toISOString(), amount: amt, status: 'processing' });
    return { ok: true };
});
mock('GET', '/api/mentor/profile', () => mentorPublic(mentorById(ME_MENTOR_ID)));
mock('PATCH', '/api/mentor/profile', ({ body }) => {
    const m = mentorById(ME_MENTOR_ID);
    const moderated = body.bio !== m.bio || body.headline !== m.headline;
    Object.assign(m, { headline: body.headline, bio: body.bio, rate: Number(body.rate), topics: String(body.topics).split(','), intro: body.intro === 'on' });
    return { ...mentorPublic(m), moderation: moderated ? 'pending' : 'none' };
});
/* --- Admin --- */
mock('GET', '/api/admin/metrics', () => ({
    gmv30: 184250, sessions30: 2310, newMentees30: 412, trialToPlan: 41, activeMentors: 318, nps: 62,
    pendingApplications: DB.applications.filter(a => a.status === 'pending').length,
    openDisputes: DB.disputes.filter(d => d.status === 'open').length,
    weekly: [118, 131, 142, 139, 155, 162, 171, 168],
    activity: [
        { at: at(0, 9, 30), text: 'Karolina Duda submitted a mentor application' },
        { at: at(-1, 15), text: 'Dispute D-104 opened (mentor no-show)' },
        { at: at(-1, 11), text: 'Emily Chen approved as mentor' },
    ],
}));
mock('GET', '/api/admin/mentor-applications', ({ query }) => {
    const st = query.get('status') || 'pending';
    return { items: DB.applications.filter(a => a.status === st), counts: { pending: DB.applications.filter(a => a.status === 'pending').length, changes: DB.applications.filter(a => a.status === 'changes').length, approved: DB.applications.filter(a => a.status === 'approved').length, rejected: DB.applications.filter(a => a.status === 'rejected').length } };
});
mock('GET', '/api/admin/mentor-applications/:id', ({ params }) => {
    const a = DB.applications.find(x => x.id === params.id);
    if (!a)
        throw new ApiError(404, 'Application not found.');
    return a;
});
function decide(id, status, note) {
    const a = DB.applications.find(x => x.id === id);
    if (!a)
        throw new ApiError(404, 'Application not found.');
    if (a.status === 'approved' || a.status === 'rejected')
        throw new ApiError(409, 'This application has already been decided by another admin.');
    a.status = status;
    a.note = note;
    return a;
}
mock('POST', '/api/admin/mentor-applications/:id/approve', ({ params }) => decide(params.id, 'approved'));
mock('POST', '/api/admin/mentor-applications/:id/request-changes', ({ params, body }) => decide(params.id, 'changes', body.message));
mock('POST', '/api/admin/mentor-applications/:id/reject', ({ params, body }) => decide(params.id, 'rejected', `${body.reason}: ${body.note}`));
mock('GET', '/api/admin/disputes', ({ query }) => {
    const st = query.get('status') || 'open';
    return { items: DB.disputes.filter(d => d.status === st) };
});
mock('POST', '/api/admin/disputes/:id/resolve', ({ params, body }) => {
    const d = DB.disputes.find(x => x.id === params.id);
    if (!d)
        throw new ApiError(404, 'Dispute not found.');
    d.status = 'resolved';
    d.resolution = `${body.decision}${body.amount ? ' (' + money(Number(body.amount)) + ')' : ''} — ${body.message}`;
    return d;
});
/* Public screens: P1 Landing, P2 Find a mentor, P3 Mentor profile, P4 Auth, P0 Screen map. */
function mentorCard(m) {
    const topicNames = m.topics.map(t => DB.topics.find(x => x.id === t)?.name ?? t);
    return `
  <article class="card mentor-card">
    <a href="#/mentors/${m.id}">${avatar(m.name, m.color, 'lg')}</a>
    <div style="min-width:0">
      <div class="row" style="gap:8px"><h3 style="margin:0"><a href="#/mentors/${m.id}" style="color:inherit">${esc(m.name)}</a></h3>
        ${m.superMentor ? chip('★ Super mentor', 'accent') : ''} <small>${esc(m.country)}</small></div>
      <p style="margin:6px 0">${esc(m.headline)}</p>
      <div class="chips" style="margin-bottom:8px">${topicNames.map(t => chip(t, 'brand')).join('')}</div>
      <small>🗣 ${esc(m.languages.join(', '))} · ${m.years} yrs experience · replies in ~${m.responseHrs} h</small>
      <p style="margin:8px 0 0;color:var(--ink-2);font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(m.bio)}</p>
    </div>
    <div class="side">
      <div class="row-between"><span><span class="rating-num">${m.rating.toFixed(1)}</span> ${stars(m.rating)}</span>
        <button class="btn btn-ghost btn-sm fav ${m.favorite ? 'on' : ''}" data-act="fav" data-id="${m.id}" aria-pressed="${m.favorite}" title="Save to favourites">${m.favorite ? '♥' : '♡'}</button></div>
      <small>${m.reviews} reviews · ${m.sessions} sessions</small>
      <div><span class="price">${money(m.rate)}</span> <small>/ 60 min</small></div>
      ${m.introAvailable ? `<a class="btn btn-primary btn-block" href="#/book/${m.id}?type=intro">Book intro · ${money(m.introPrice)}</a>`
        : `<a class="btn btn-primary btn-block" href="#/book/${m.id}?type=regular">Book a session</a>`}
      <button class="btn btn-block" data-act="msg-mentor" data-id="${m.id}">Send message</button>
      <button class="btn btn-ghost btn-sm" data-act="video" data-id="${m.id}">▶ Watch intro video</button>
    </div>
  </article>`;
}
/** Actions shared by mentor cards on several screens. */
function bindMentorCardActions(onFavChange) {
    ACT['fav'] = async (el) => {
        if (S.role === 'guest') {
            go(withQuery('/auth', { mode: 'signup', next: parseHash().path }));
            toast('Create a free account to save mentors.', 'info');
            return;
        }
        const id = el.dataset.id;
        const on = el.classList.contains('on');
        el.classList.toggle('on', !on);
        el.textContent = on ? '♡' : '♥';
        try {
            await (on ? api.del(`/api/me/favorites/${id}`) : api.put(`/api/me/favorites/${id}`));
            toast(on ? 'Removed from favourites' : 'Saved to favourites');
            onFavChange?.();
        }
        catch (e) {
            el.classList.toggle('on', on);
            el.textContent = on ? '♥' : '♡';
            toast(e.message, 'err');
        }
    };
    ACT['msg-mentor'] = async (el) => {
        if (S.role === 'guest') {
            go(withQuery('/auth', { mode: 'signup', next: `/mentors/${el.dataset.id}` }));
            toast('Create a free account to message mentors.', 'info');
            return;
        }
        busy(el, true);
        try {
            const t = await api.post('/api/threads', { mentorId: el.dataset.id });
            go(`/messages/${t.id}`);
        }
        catch (e) {
            toast(e.message, 'err');
            busy(el, false);
        }
    };
    ACT['video'] = el => {
        const m = mentorById(el.dataset.id);
        openModal(`${m.name} — intro video`, `<div class="video-ph"><div><div class="play">▶</div>Intro video placeholder (max 2 min)<br><small style="color:#cfd2ea">Streamed from the video CDN; subtitles EN</small></div></div>`, `<a class="btn btn-primary" href="#/mentors/${m.id}">View full profile</a>`);
    };
}
/* ---------------- P1 Landing ---------------- */
defineScreen({
    id: 'P1', path: '/', title: 'Landing page', group: 'Public', roles: null,
    render(root) {
        root.innerHTML = `
    <div class="container stack-lg">
      <section class="hero">
        <h1>Grow faster with a mentor who has done it before</h1>
        <p>1:1 video sessions with vetted product, engineering, design and AI leaders. Start with a low-cost intro session — if it is not a fit, the next intro is on us.</p>
        <form class="hero-search" data-form="${act((el, ev) => { const f = el; const v = formValues(f); go(withQuery('/mentors', { topic: v.topic, q: v.q })); })}">
          <select name="topic" aria-label="Topic"><option value="">All topics</option>${DB.topics.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
          <input name="q" class="input" style="flex:2;min-width:180px;border:0" placeholder="Skill, role or company (optional)" aria-label="Keyword">
          <button class="btn btn-accent btn-lg">Find a mentor</button>
        </form>
        <div class="row" style="margin-top:18px;opacity:.9;font-size:14px">⭐ 4.8 average rating · 1 200+ vetted mentors · 98% sessions start on time</div>
      </section>
      <section><div class="row-between"><h2>Browse by topic</h2><a href="#/mentors">All mentors →</a></div><div id="topics"></div></section>
      <section><div class="row-between"><h2>Featured mentors</h2></div><div id="featured"></div></section>
      <section id="how"><h2>How it works</h2>
        <div class="grid g3">
          <div class="card"><div class="step-n">1</div><h3>Find your mentor</h3><p class="muted">Filter by topic, price, language and time. Watch intro videos and read verified reviews.</p></div>
          <div class="card"><div class="step-n">2</div><h3>Book an intro session</h3><p class="muted">30 minutes at half price to check the fit. Not happy? Your next intro with another mentor is free.</p></div>
          <div class="card"><div class="step-n">3</div><h3>Keep growing on a plan</h3><p class="muted">Choose weekly sessions, reschedule up to 12 h before, cancel anytime.</p></div>
        </div>
      </section>
      <section class="card row-between" style="background:var(--accent-soft);border-color:#f3dca8">
        <div><h2 style="margin:0">Share your experience and earn</h2><p class="muted" style="margin:4px 0 0">Set your own price and schedule. Applications are reviewed within 5 business days.</p></div>
        <a class="btn btn-primary btn-lg" href="#/apply">Become a mentor</a>
      </section>
    </div>`;
        load($('#topics', root), () => api.get('/api/topics'), {
            skeleton: skelCards(4, 'grid g4'),
            isEmpty: d => !d.length,
            empty: () => emptyState('No topics yet', 'Topics will appear when the first mentors are approved.'),
            ok: d => `<div class="grid g4">${d.map(t => `<a class="card card-tight card-link topic-tile" href="#/mentors?topic=${t.id}" style="color:inherit;text-decoration:none"><span class="ico">${t.icon}</span><span><b>${esc(t.name)}</b><br><small>${t.mentors} mentors</small></span></a>`).join('')}</div>`,
        });
        load($('#featured', root), () => api.get('/api/mentors?featured=1&limit=4'), {
            skeleton: skelCards(4, 'grid g4'),
            isEmpty: d => !d.items.length,
            empty: () => emptyState('No featured mentors yet', 'Browse all mentors instead.', `<a class="btn" href="#/mentors">Browse mentors</a>`),
            ok: d => `<div class="grid g4">${d.items.map(m => `
        <a class="card card-link" href="#/mentors/${m.id}" style="color:inherit;text-decoration:none">
          ${avatar(m.name, m.color, 'lg')}<h3 style="margin-top:10px">${esc(m.name)}</h3>
          <p class="muted" style="font-size:14px;min-height:42px">${esc(m.headline)}</p>
          <div class="row-between"><span><b>${m.rating.toFixed(1)}</b> ${stars(m.rating)}</span><b>${money(m.rate)}</b></div>
        </a>`).join('')}</div>`,
        });
    },
});
/* ---------------- P2 Find a mentor ---------------- */
defineScreen({
    id: 'P2', path: '/mentors', title: 'Find a mentor', group: 'Public', roles: null,
    render(root, _p, q) {
        const v = (k) => q.get(k) ?? '';
        const page = Number(q.get('page') || 1);
        root.innerHTML = `
    <div class="container">
      ${pageHead('Find a mentor', 'Vetted experts for 1:1 video sessions. Prices are per 60 minutes; intro sessions are 30 minutes at half price.')}
      <div class="split-left">
        <aside class="card sticky">
          <form data-form="filters" novalidate>
            ${field({ name: 'q', label: 'Keyword', value: v('q'), placeholder: 'e.g. roadmap, LLM, portfolio' })}
            ${field({ name: 'topic', label: 'Topic', type: 'select', value: v('topic'), options: [['', 'All topics'], ...DB.topics.map(t => [t.id, t.name])] })}
            <div class="inline-fields">
              ${field({ name: 'priceMin', label: 'Min $', type: 'number', value: v('priceMin'), attrs: 'min="0" step="5"' })}
              ${field({ name: 'priceMax', label: 'Max $', type: 'number', value: v('priceMax'), attrs: 'min="0" step="5"' })}
            </div>
            ${field({ name: 'time', label: 'Available', type: 'select', value: v('time'), options: [['', 'Any time'], ['morning', 'Mornings (before 12)'], ['afternoon', 'Afternoons (12–17)'], ['evening', 'Evenings (after 17)']] })}
            ${field({ name: 'language', label: 'Speaks', type: 'select', value: v('language'), options: [['', 'Any language'], ['English', 'English'], ['Polish', 'Polish'], ['German', 'German'], ['Spanish', 'Spanish'], ['Portuguese', 'Portuguese']] })}
            <label class="check" style="margin-bottom:14px"><input type="checkbox" name="super" value="1" ${v('super') === '1' ? 'checked' : ''}> Super mentors only</label>
            <div class="row"><button class="btn btn-primary">Apply filters</button><a class="btn btn-ghost" href="#/mentors">Clear</a></div>
          </form>
        </aside>
        <section>
          <div class="row-between" style="margin-bottom:12px">
            <span id="count" class="muted">Searching…</span>
            <label class="row" style="gap:6px"><small>Sort by</small>
              <select class="input" style="width:auto" data-change="sort" aria-label="Sort">
                ${[['recommended', 'Recommended'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['rating', 'Rating'], ['sessions', 'Most sessions']].map(([k, l]) => `<option value="${k}" ${v('sort') === k ? 'selected' : ''}>${l}</option>`).join('')}
              </select></label>
          </div>
          <div id="results"></div>
        </section>
      </div>
    </div>`;
        const params = Object.fromEntries(q.entries());
        on('submit:filters', el => {
            const f = el;
            const vals = validate(f, {
                priceMin: [V.num(0, 1000, 'Enter 0–1000.')],
                priceMax: [V.num(0, 1000, 'Enter 0–1000.'), (val, form) => { const mn = Number(formValues(form).priceMin || 0); return val && Number(val) < mn ? 'Max price must be greater than or equal to min price.' : null; }],
                q: [V.max(60)],
            });
            if (!vals)
                return;
            go(withQuery('/mentors', { q: vals.q, topic: vals.topic, priceMin: vals.priceMin, priceMax: vals.priceMax, time: vals.time, language: vals.language, super: vals.super, sort: v('sort') }));
        });
        on('sort', el => go(withQuery('/mentors', { ...params, sort: el.value, page: undefined })));
        on('more', () => go(withQuery('/mentors', { ...params, page: String(page + 1) })));
        bindMentorCardActions();
        const apiQ = withQuery('/api/mentors', { ...params, limit: '4', page: String(page) });
        load($('#results', root), () => api.get(apiQ), {
            skeleton: skelCards(3, 'stack'),
            isEmpty: d => !d.items.length,
            empty: () => { $('#count').textContent = '0 mentors'; return emptyState('No mentors match your filters', 'Try a wider price range, another topic or “Any time”.', `<a class="btn btn-primary" href="#/mentors">Clear all filters</a>`); },
            ok: d => {
                $('#count').textContent = `${plural(d.total, 'mentor')} found`;
                return `<div class="stack">${d.items.map(mentorCard).join('')}</div>
          ${d.items.length < d.total ? `<div style="text-align:center;margin-top:16px"><button class="btn" data-act="more">Show more mentors (${d.total - d.items.length} left)</button></div>` : `<p class="muted" style="text-align:center;margin-top:16px">You have seen all mentors for these filters.</p>`}`;
            },
        });
    },
});
/* ---------------- P3 Mentor profile ---------------- */
defineScreen({
    id: 'P3', path: '/mentors/:id', title: 'Mentor profile', group: 'Public', roles: null,
    render(root, p) {
        root.innerHTML = `<div class="container" id="prof"></div>`;
        bindMentorCardActions(() => go(`/mentors/${p.id}`));
        let weekOffset = 0;
        let reviewsPage = 1;
        const loadReviews = () => load($('#reviews'), () => api.get(`/api/mentors/${p.id}/reviews?page=${reviewsPage}`), {
            isEmpty: d => !d.items.length,
            empty: () => emptyState('No reviews yet', 'This mentor is new on MentorHub. Intro sessions are covered by our satisfaction guarantee.'),
            ok: d => `<ul class="list">${d.items.map(r => `<li><div class="row-between"><b>${esc(r.author)}</b><small>${fmtLongDate(r.date)}</small></div>${stars(r.rating)}
        <p style="margin:6px 0">${esc(r.text)}</p><div class="chips">${r.tags.map(t => chip(t)).join('')}</div>
        ${r.reply ? `<div class="notice" style="margin-top:8px"><b>Mentor reply:</b> ${esc(r.reply)}</div>` : ''}</li>`).join('')}</ul>
        ${d.items.length < d.total ? `<button class="btn" data-act="more-reviews">Show more reviews</button>` : ''}`,
        });
        const loadWeek = () => {
            const from = new Date();
            from.setDate(from.getDate() + weekOffset * 7);
            load($('#avail'), () => api.get(`/api/mentors/${p.id}/availability?from=${isoDay(from)}&days=7&minutes=60`), {
                isEmpty: d => d.days.every(x => !x.slots.some(s => s.available)),
                empty: () => `${weekNav()}${emptyState('No free slots this week', 'Check the next week or send the mentor a message.', `<button class="btn" data-act="next-week">Next week →</button>`)}`,
                ok: d => `${weekNav()}<p class="muted" style="font-size:13px">Times shown in your time zone: <b>${esc(d.timezone)}</b>. Click a time to book.</p>${weekGrid(d.days, null)}`,
            });
        };
        const weekNav = () => `<div class="row-between" style="margin-bottom:8px"><button class="btn btn-sm" data-act="prev-week" ${weekOffset === 0 ? 'disabled' : ''}>← Previous</button><b>${weekOffset === 0 ? 'This week' : `In ${weekOffset} week${weekOffset > 1 ? 's' : ''}`}</b><button class="btn btn-sm" data-act="next-week" ${weekOffset >= 5 ? 'disabled' : ''}>Next →</button></div>`;
        on('prev-week', () => { weekOffset = Math.max(0, weekOffset - 1); loadWeek(); });
        on('next-week', () => { weekOffset = Math.min(5, weekOffset + 1); loadWeek(); });
        on('more-reviews', () => { reviewsPage++; loadReviews(); });
        on('pick-slot', el => go(withQuery(`/book/${p.id}`, { type: 'regular', slot: el.dataset.start })));
        load($('#prof', root), () => api.get(`/api/mentors/${p.id}`), {
            skeleton: `<div class="split"><div>${skelCards(1, 'stack')}${skelLines(8)}</div>${skelCards(1, 'stack')}</div>`,
            ok: m => `
      <p><a href="#/mentors">← Back to search</a></p>
      <div class="split">
        <div class="stack-lg">
          <div class="card row" style="align-items:flex-start;flex-wrap:nowrap;gap:20px">
            ${avatar(m.name, m.color, 'xl')}
            <div style="min-width:0">
              <div class="row"><h1 style="margin:0">${esc(m.name)}</h1>${m.superMentor ? chip('★ Super mentor', 'accent') : ''}</div>
              <p style="margin:6px 0">${esc(m.headline)}</p>
              <div class="row" style="gap:16px"><span><b>${m.rating.toFixed(1)}</b> ${stars(m.rating)} <small>(${m.reviews})</small></span><span><b>${m.sessions}</b> <small>sessions</small></span><span><b>${m.mentees}</b> <small>mentees</small></span><span><small>Replies in ~${m.responseHrs} h</small></span></div>
              <div class="chips" style="margin-top:10px">${m.topics.map(t => chip(DB.topics.find(x => x.id === t)?.name ?? t, 'brand')).join('')}${m.languages.map(l => chip('🗣 ' + l)).join('')}${chip('📍 ' + m.country)}</div>
            </div>
          </div>
          <div class="video-ph"><div><div class="play">▶</div>Intro video · 1:48<br><small style="color:#cfd2ea">Placeholder — streamed with EN subtitles</small></div></div>
          <section class="card"><h2>About me</h2><p>${esc(m.bio)}</p></section>
          <section class="card"><h2>Experience</h2><ul class="list">${m.experience.map(e => `<li><b>${esc(e.title)}</b> · ${esc(e.org)}<br><small>${esc(e.period)}</small></li>`).join('')}</ul>
            <p class="muted" style="font-size:13px;margin-top:8px">✔ Identity and LinkedIn profile verified by MentorHub</p></section>
          <section class="card" id="schedule"><h2>Availability</h2><div id="avail"></div></section>
          <section class="card"><h2>Reviews <small class="muted">${m.rating.toFixed(1)} · ${m.reviews}</small></h2><div id="reviews"></div></section>
        </div>
        <aside class="card sticky stack">
          <div><span class="price">${money(m.rate)}</span> <small>/ 60 min session</small></div>
          ${m.introAvailable ? `<a class="btn btn-primary btn-lg btn-block" href="#/book/${m.id}?type=intro">Book intro · 30 min · ${money(m.introPrice)}</a>` : m.intro ? `<div class="notice">You already had an intro with ${esc(m.name.split(' ')[0])}.</div>` : `<div class="notice">This mentor does not offer intro sessions.</div>`}
          <a class="btn btn-block ${m.introAvailable ? '' : 'btn-primary'}" href="#/book/${m.id}?type=regular">Book a 60-min session</a>
          <a class="btn btn-block" href="#/plans/${m.id}">See weekly plans</a>
          <button class="btn btn-block" data-act="msg-mentor" data-id="${m.id}">Send message</button>
          <button class="btn btn-ghost btn-block fav ${m.favorite ? 'on' : ''}" data-act="fav" data-id="${m.id}">${m.favorite ? '♥' : '♡'}</button>
          <hr class="divider">
          <small>🛡 <b>Satisfaction guarantee:</b> if your intro is not a fit, we cover your next intro with another mentor.</small>
          <small>↺ Free rescheduling and cancellation up to ${RULES.freeCancelHours} h before the session.</small>
        </aside>
      </div>`,
            after: () => { loadWeek(); loadReviews(); },
        });
    },
});
/** 7-day slot grid; selected = ISO string of the currently selected slot (null on read-only preview). */
function weekGrid(days, selected, actName = 'pick-slot') {
    return `<div class="week" role="grid">${days.map(d => {
        const dt = new Date(d.date + 'T12:00:00');
        return `<div class="day"><h4>${dt.toLocaleDateString('en-GB', { weekday: 'short' })}<b>${dt.getDate()} ${dt.toLocaleDateString('en-GB', { month: 'short' })}</b></h4>
      ${d.slots.length ? d.slots.map(s => `<button class="slot ${selected === s.start ? 'sel' : ''}" data-act="${actName}" data-start="${s.start}" ${s.available ? '' : 'disabled'} title="${s.available ? 'Available' : s.reason === 'notice' ? `Less than ${RULES.minNoticeHours} h notice` : 'Already booked'}">${fmtTime(s.start)}</button>`).join('') : `<div class="day-empty">—</div>`}
    </div>`;
    }).join('')}</div>`;
}
/* ---------------- P4 Auth ---------------- */
defineScreen({
    id: 'P4', path: '/auth', title: 'Sign up / Log in', group: 'Public', roles: null,
    render(root, _p, q) {
        const mode = q.get('mode') || 'login';
        const next = q.get('next') || '';
        const intent = q.get('intent') || (next === '/apply' ? 'mentor' : 'mentee');
        const t = (m, l) => [l, withQuery('/auth', { mode: m, next: next || undefined })];
        root.innerHTML = `
    <div class="container" style="max-width:460px">
      <div class="card">
        ${tabs([t('login', 'Log in'), t('signup', 'Sign up'), t('reset', 'Forgot password')], withQuery('/auth', { mode, next: next || undefined }))}
        <div id="authBody"></div>
      </div>
      <p class="muted" style="font-size:12.5px;margin-top:12px">Prototype hints: log in with any email — include “mentor” or “admin” to enter that role; password <span class="kbd">wrong</span> shows the 401 error; sign-up with <span class="kbd">taken@example.com</span> shows the 409 error.</p>
    </div>`;
        const body = $('#authBody', root);
        const social = `<div class="grid g2" style="margin-bottom:14px"><button type="button" class="btn" data-act="social">Continue with Google</button><button type="button" class="btn" data-act="social">Continue with LinkedIn</button></div><div class="muted" style="text-align:center;font-size:13px;margin-bottom:14px">or with email</div>`;
        on('social', () => { setRole('mentee'); toast('Signed in with Google (simulated OAuth)'); go(next || '/home'); });
        if (mode === 'login') {
            body.innerHTML = `${social}<form data-form="login" novalidate>${formAlert()}
        ${field({ name: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com', attrs: 'autocomplete="email"' })}
        ${field({ name: 'password', label: 'Password', type: 'password', attrs: 'autocomplete="current-password"' })}
        <label class="check" style="margin-bottom:14px"><input type="checkbox" name="remember" checked> Keep me signed in for 30 days</label>
        <button class="btn btn-primary btn-block btn-lg">Log in</button></form>`;
            on('submit:login', async (el, ev) => {
                const f = el;
                const v = validate(f, { email: [V.req('Enter your email.'), V.email()], password: [V.req('Enter your password.')] });
                if (!v)
                    return;
                const btn = $('button.btn-primary', f);
                busy(btn, true);
                try {
                    const r = await api.post('/api/auth/login', v);
                    setRole(r.role);
                    toast(`Welcome back! Signed in as ${ROLE_LABEL[r.role]}.`);
                    go(next || (r.role === 'mentor' ? '/mentor' : r.role === 'admin' ? '/admin' : '/home'));
                }
                catch (e) {
                    apiErrToForm(f, e);
                    busy(btn, false);
                }
            });
        }
        else if (mode === 'signup') {
            body.innerHTML = `${social}<form data-form="signup" novalidate>${formAlert()}
        <div class="field"><span>I want to</span><div class="seg" role="radiogroup">
          <label class="toggle-chip chip ${intent === 'mentee' ? 'on' : ''}"><input type="radio" name="intent" value="mentee" ${intent === 'mentee' ? 'checked' : ''}> Find a mentor</label>
          <label class="toggle-chip chip ${intent === 'mentor' ? 'on' : ''}"><input type="radio" name="intent" value="mentor" ${intent === 'mentor' ? 'checked' : ''}> Become a mentor</label></div></div>
        ${field({ name: 'name', label: 'Full name', attrs: 'autocomplete="name"' })}
        ${field({ name: 'email', label: 'Email', type: 'email', attrs: 'autocomplete="email"' })}
        ${field({ name: 'password', label: 'Password', type: 'password', hint: 'At least 8 characters, including a letter and a digit.', attrs: 'autocomplete="new-password"' })}
        <label class="check"><input type="checkbox" name="terms" value="1"> I agree to the Terms of Service and Privacy Policy</label><div class="err" data-err="terms"></div>
        <label class="check" style="margin:8px 0 14px"><input type="checkbox" name="marketing" value="1"> Send me tips and mentor recommendations (optional)</label>
        <button class="btn btn-primary btn-block btn-lg">Create account</button></form>`;
            on('submit:signup', async (el) => {
                const f = el;
                const v = validate(f, {
                    name: [V.req('Enter your name.'), V.min(2), V.max(80)],
                    email: [V.req('Enter your email.'), V.email()],
                    password: [V.req('Create a password.'), V.min(8, 'Use at least 8 characters.'), V.re(/(?=.*[A-Za-z])(?=.*\d)/, 'Include at least one letter and one digit.')],
                    terms: [V.checked('You need to accept the Terms to create an account.')],
                });
                if (!v)
                    return;
                const btn = $('button.btn-primary', f);
                busy(btn, true);
                try {
                    const r = await api.post('/api/auth/register', v);
                    setRole('mentee');
                    DB.profile.name = v.name;
                    DB.profile.email = v.email;
                    toast('Account created. We sent a confirmation link to ' + v.email);
                    go(next || r.next);
                }
                catch (e) {
                    apiErrToForm(f, e);
                    busy(btn, false);
                }
            });
        }
        else {
            body.innerHTML = `<form data-form="reset" novalidate>${formAlert()}<p class="muted">Enter the email you signed up with. We will send a link to set a new password (valid 60 minutes).</p>
        ${field({ name: 'email', label: 'Email', type: 'email' })}<button class="btn btn-primary btn-block">Send reset link</button></form>`;
            on('submit:reset', async (el) => {
                const f = el;
                const v = validate(f, { email: [V.req('Enter your email.'), V.email()] });
                if (!v)
                    return;
                const btn = $('button.btn-primary', f);
                busy(btn, true);
                try {
                    await api.post('/api/auth/password-reset', v);
                    body.innerHTML = successState('Check your inbox', `If an account exists for <b>${esc(v.email)}</b>, a reset link is on its way. It expires in 60 minutes.`, `<a class="btn" href="#/auth?mode=login">Back to log in</a>`);
                }
                catch (e) {
                    apiErrToForm(f, e);
                    busy(btn, false);
                }
            });
        }
        $$('.toggle-chip input', root).forEach(i => i.addEventListener('change', () => $$('.toggle-chip', root).forEach(c => c.classList.toggle('on', $('input', c).checked))));
    },
});
/* ---------------- P0 Screen map (prototype index) ---------------- */
defineScreen({
    id: 'P0', path: '/map', title: 'Screen map', group: 'Prototype', roles: null,
    render(root) {
        const groups = ['Public', 'Mentee', 'Shared', 'Mentor', 'Admin'];
        const example = { '/mentors/:id': '/mentors/m1', '/book/:mentorId': '/book/m1?type=intro', '/booking/:id/confirmed': '/booking/s2/confirmed', '/room/:id': '/room/s1', '/sessions/:id/review': '/sessions/s4/review', '/plans/:mentorId': '/plans/m3', '/messages/:id': '/messages/t1' };
        const roleFor = { Public: 'guest', Mentee: 'mentee', Shared: 'mentee', Mentor: 'mentor', Admin: 'admin' };
        root.innerHTML = `
    <div class="container">
      ${pageHead('Screen map', 'All prototype screens with their IDs from the concept documents. “Open as …” switches the prototype role first. Use the dark bar at the bottom to switch data states (loading, empty, error) on any screen.')}
      <div class="grid g2">${groups.map(g => `
        <section class="card map-group"><h3>${g}</h3>
          ${SCREENS.filter(s => s.group === g).map(s => {
            const href = example[s.path] ?? s.path;
            return `<div class="map-item"><span class="id">${s.id}</span><div><b>${esc(s.title)}</b> <small class="kbd">#${esc(s.path)}</small><br>
              <button class="btn btn-sm" style="margin-top:6px" data-act="open-as" data-role="${s.roles ? (s.roles.includes(roleFor[g]) ? roleFor[g] : s.roles[0]) : S.role === 'guest' ? 'guest' : S.role}" data-href="${esc(href)}">Open as ${ROLE_LABEL[s.roles ? (s.roles.includes(roleFor[g]) ? roleFor[g] : s.roles[0]) : (S.role === 'guest' ? 'guest' : S.role)]}</button></div></div>`;
        }).join('')}
        </section>`).join('')}
      </div>
      <section class="card" style="margin-top:16px"><h3>Key paths to click through</h3>
        <ol>
          <li><b>Guest → first intro session:</b> P1 → P2 → P3 → M1 → P4 (sign up) → M1 → M2 (promo <span class="kbd">WELCOME10</span>, card <span class="kbd">4242 4242 4242 4242</span>; <span class="kbd">4000 0000 0000 0002</span> = declined) → M3</li>
          <li><b>After the intro → weekly plan:</b> M4 → M7 (review Tomasz) → M8 → M2 → M9</li>
          <li><b>Session lifecycle:</b> M5 → reschedule / cancel modals → M6 room → M7 review / report a problem</li>
          <li><b>Become a mentor:</b> P4 (Become a mentor) → T1 six steps → submitted → A2 (admin approves)</li>
          <li><b>Mentor daily work:</b> T2 → T3 availability &amp; time off → C1 messages → T4 notes → T5 payout</li>
          <li><b>Trust &amp; safety:</b> C1 (contact details blocked before first session) → M5 report → A3 dispute resolved</li>
        </ol>
      </section>
    </div>`;
        on('open-as', el => { setRole(el.dataset.role); go(el.dataset.href); });
    },
});
/* Mentee screens: M1 Book, M2 Checkout, M3 Confirmed, M4 Home, M5 My sessions, M6 Session room, M7 Review, M8 Plans, M9 Billing. */
function luhn(num) {
    const d = num.replace(/\D/g, '');
    if (d.length < 13 || d.length > 19)
        return false;
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
        let x = Number(d[d.length - 1 - i]);
        if (i % 2) {
            x *= 2;
            if (x > 9)
                x -= 9;
        }
        sum += x;
    }
    return sum % 10 === 0;
}
const cardRules = {
    number: [V.req('Enter the card number.'), v => (luhn(v) ? null : 'This card number is not valid.')],
    holder: [V.req('Enter the name on the card.'), V.min(2)],
    exp: [V.req('Enter the expiry date.'), V.re(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY format.'), v => {
            const m = v.match(/^(\d{2})\/(\d{2})$/);
            if (!m)
                return null;
            const end = new Date(2000 + Number(m[2]), Number(m[1]), 1);
            return end.getTime() > Date.now() ? null : 'This card has expired.';
        }],
    cvc: [V.req('Enter the security code.'), V.re(/^\d{3,4}$/, 'CVC is 3 or 4 digits.')],
};
function cardFields() {
    return `${field({ name: 'number', label: 'Card number', placeholder: '4242 4242 4242 4242', attrs: 'inputmode="numeric" autocomplete="cc-number"' })}
    ${field({ name: 'holder', label: 'Name on card', attrs: 'autocomplete="cc-name"' })}
    <div class="inline-fields">${field({ name: 'exp', label: 'Expiry (MM/YY)', placeholder: '08/28', attrs: 'autocomplete="cc-exp"' })}${field({ name: 'cvc', label: 'CVC', placeholder: '123', attrs: 'inputmode="numeric" autocomplete="cc-csc"' })}</div>`;
}
function stepper(steps, cur) {
    return `<div class="stepper">${steps.map((s, i) => `<div class="st ${i < cur ? 'done' : i === cur ? 'cur' : ''}"><b>Step ${i + 1}</b>${esc(s)}</div>`).join('')}</div>`;
}
/* ---------------- M1 Book a session ---------------- */
defineScreen({
    id: 'M1', path: '/book/:mentorId', title: 'Book a session', group: 'Mentee', roles: null,
    render(root, p, q) {
        let type = q.get('type') === 'intro' ? 'intro' : 'regular';
        let minutes = type === 'intro' ? RULES.introMinutes : 60;
        let selected = q.get('slot');
        let weekOffset = 0;
        let goal = '';
        root.innerHTML = `<div class="container" id="book"></div>`;
        load($('#book', root), () => api.get(`/api/mentors/${p.mentorId}`), {
            ok: m => {
                if (type === 'intro' && !m.introAvailable)
                    type = 'regular', minutes = 60;
                return `
        ${stepper(['Choose a time', 'Pay securely', 'Confirmation'], 0)}
        <div class="split">
          <div class="stack-lg">
            <div class="card">${mentorMini(m)}</div>
            <section class="card"><h2>Session type</h2>
              <div class="seg" role="radiogroup" aria-label="Session type">
                <button type="button" data-act="type" data-type="intro" class="${type === 'intro' ? 'on' : ''}" ${m.introAvailable ? '' : 'disabled title="Intro already used or not offered"'}>Intro · 30 min · ${money(m.introPrice)}</button>
                <button type="button" data-act="type" data-type="regular" class="${type === 'regular' && minutes === 60 ? 'on' : ''}">60 min · ${money(m.rate)}</button>
                <button type="button" data-act="type" data-type="regular30" class="${type === 'regular' && minutes === 30 ? 'on' : ''}">30 min · ${money(Math.round(m.rate / 2))}</button>
              </div>
              ${m.introAvailable ? '' : `<p class="muted" style="font-size:13px;margin-top:8px">${m.intro ? 'You have already used your intro session with this mentor.' : 'This mentor does not offer intro sessions.'}</p>`}
            </section>
            <section class="card"><h2>Pick a time</h2><div id="slots"></div><div class="err" id="slotErr" role="alert"></div></section>
            <section class="card"><form data-form="goal" novalidate>${field({ name: 'goal', label: 'What would you like to achieve?', type: 'textarea', optional: true, counter: 500, rows: 3, placeholder: 'e.g. I want feedback on my product case study before an interview next week.', hint: 'Shared with the mentor so they can prepare.' })}</form></section>
          </div>
          <aside class="card sticky stack" id="summary"></aside>
        </div>`;
            },
            after: m => {
                const renderSummary = () => {
                    const price = sessionPrice(m, type, minutes);
                    $('#summary').innerHTML = `
            <h3>Summary</h3>
            <div class="row-between"><span>${type === 'intro' ? 'Intro session' : 'Session'} · ${minutes} min</span><b>${money(price)}</b></div>
            <div class="row-between"><span>Date & time</span><b>${selected ? fmtDT(selected) : '—'}</b></div>
            <small>Time zone: ${esc(tzName())}</small>
            <hr class="divider">
            <button class="btn btn-primary btn-lg btn-block" data-act="continue">${S.role === 'guest' ? 'Sign up to continue' : 'Continue to payment'}</button>
            <small>The time is held for ${RULES.holdMinutes} minutes while you pay. Free cancellation up to ${RULES.freeCancelHours} h before.</small>
            ${type === 'intro' ? `<div class="notice">🛡 Not a fit? Your next intro with another mentor is free.</div>` : ''}`;
                };
                const loadSlots = () => {
                    const from = new Date();
                    from.setDate(from.getDate() + weekOffset * 7);
                    load($('#slots'), () => api.get(`/api/mentors/${m.id}/availability?from=${isoDay(from)}&days=7&minutes=${minutes}`), {
                        isEmpty: d => d.days.every(x => !x.slots.some(s => s.available)),
                        empty: () => `${nav()}${emptyState('No free times this week', 'Try the next week, or ask the mentor about other times.', `<button class="btn" data-act="nw">Next week →</button><button class="btn" data-act="msg-mentor" data-id="${m.id}">Message mentor</button>`)}`,
                        ok: d => `${nav()}${weekGrid(d.days, selected, 'slot')}<p class="muted" style="font-size:12.5px;margin-top:6px">Crossed-out times are booked or less than ${RULES.minNoticeHours} h away.</p>`,
                    });
                };
                const nav = () => `<div class="row-between" style="margin-bottom:10px"><button class="btn btn-sm" data-act="pw" ${weekOffset === 0 ? 'disabled' : ''}>← Previous week</button><b>${weekOffset === 0 ? 'Next 7 days' : `Week +${weekOffset}`}</b><button class="btn btn-sm" data-act="nw" ${weekOffset >= 5 ? 'disabled' : ''}>Next week →</button></div>`;
                on('pw', () => { weekOffset--; loadSlots(); });
                on('nw', () => { weekOffset++; loadSlots(); });
                on('slot', el => { selected = el.dataset.start; $$('.slot.sel').forEach(s => s.classList.remove('sel')); el.classList.add('sel'); $('#slotErr').textContent = ''; renderSummary(); });
                on('type', el => {
                    const t = el.dataset.type;
                    type = t === 'intro' ? 'intro' : 'regular';
                    minutes = t === 'regular' ? 60 : 30;
                    selected = null;
                    $$('[data-act="type"]').forEach(b => b.classList.toggle('on', b === el));
                    renderSummary();
                    loadSlots();
                });
                bindMentorCardActions();
                on('continue', async (el) => {
                    goal = ($('textarea[name="goal"]')?.value ?? '').trim();
                    if (goal.length > 500) {
                        showErr($('form[data-form="goal"]'), 'goal', 'Use at most 500 characters.');
                        return;
                    }
                    if (!selected) {
                        $('#slotErr').textContent = 'Pick a time to continue.';
                        $('#slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        return;
                    }
                    if (S.role === 'guest') {
                        toast('Create a free account to book — your selection is kept.', 'info');
                        go(withQuery('/auth', { mode: 'signup', next: withQuery(`/book/${m.id}`, { type, slot: selected }) }));
                        return;
                    }
                    busy(el, true);
                    try {
                        const h = await api.post('/api/bookings/hold', { mentorId: m.id, start: selected, minutes, type });
                        S.cart = { kind: 'booking', mentorId: m.id, type, start: selected, minutes, goal, holdId: h.holdId, holdExpires: h.expiresAt, price: sessionPrice(m, type, minutes) };
                        go('/checkout');
                    }
                    catch (e) {
                        const err = e;
                        busy(el, false);
                        $('#slotErr').textContent = err.message;
                        if (err.status === 409) {
                            selected = null;
                            renderSummary();
                            loadSlots();
                        }
                    }
                });
                renderSummary();
                loadSlots();
            },
        });
    },
});
/* ---------------- M2 Checkout ---------------- */
defineScreen({
    id: 'M2', path: '/checkout', title: 'Checkout', group: 'Mentee', roles: ['mentee'],
    render(root) {
        const cart = S.cart;
        if (!cart) {
            root.innerHTML = `<div class="container">${emptyState('Nothing to pay for', 'Your booking has expired or was already paid. Choose a mentor and a time first.', `<a class="btn btn-primary" href="#/mentors">Find a mentor</a><a class="btn" href="#/sessions">My sessions</a>`)}</div>`;
            return;
        }
        const m = mentorById(cart.mentorId);
        let promo = '';
        let method = 'saved';
        const token = S.renderToken;
        root.innerHTML = `
    <div class="container">
      ${stepper(['Choose a time', 'Pay securely', 'Confirmation'], 1)}
      <div class="split">
        <section class="card">
          <h2>Payment</h2>
          ${cart.kind === 'booking' ? `<div class="notice" id="hold">⏱ We are holding this time for you: <span class="countdown" id="cd">--:--</span></div>` : ''}
          <form data-form="pay" novalidate style="margin-top:16px">${formAlert()}
            <div class="field"><span>Payment method</span><div id="methods">${skelLines(2)}</div></div>
            <div id="newCard" hidden>${cardFields()}<label class="check" style="margin-bottom:14px"><input type="checkbox" name="save" value="1" checked> Save card for future sessions</label></div>
            <div id="blik" hidden>${field({ name: 'blik', label: 'BLIK code', placeholder: '6 digits', attrs: 'inputmode="numeric" maxlength="6"', hint: 'Generate the code in your banking app.' })}</div>
            <button class="btn btn-primary btn-lg btn-block" id="payBtn">Pay</button>
            <p class="muted" style="font-size:12.5px;margin-top:10px">🔒 Payments are processed by a PCI-DSS certified provider. MentorHub never stores your full card number. ${cart.kind === 'subscription' ? 'Your plan renews every 4 weeks; cancel anytime in Billing.' : ''}</p>
          </form>
        </section>
        <aside class="card sticky stack">
          ${mentorMini(m)}
          <hr class="divider">
          ${cart.kind === 'booking'
            ? `<div class="row-between"><span>${cart.type === 'intro' ? 'Intro session' : 'Session'} · ${cart.minutes} min</span></div><div class="row-between"><span>When</span><b>${fmtDT(cart.start)}</b></div>`
            : `<div class="row-between"><span>Weekly plan</span><b>${cart.perWeek}× / week · 60 min</b></div><div class="row-between"><span>First session from</span><b>${fmtLongDate(cart.startDate)}</b></div><div class="row-between"><span>Sessions per 4 weeks</span><b>${cart.perWeek * 4}</b></div>`}
          <form data-form="promo" class="row" novalidate style="flex-wrap:nowrap;align-items:flex-start">
            <div style="flex:1">${field({ name: 'promo', label: 'Promo code', placeholder: 'e.g. WELCOME10', optional: true })}</div>
            <button class="btn" style="margin-top:27px">Apply</button></form>
          <div id="quote">${skelLines(3)}</div>
        </aside>
      </div>
    </div>`;
        const loadQuote = () => load($('#quote'), () => api.post('/api/checkout/quote', { kind: cart.kind, mentorId: cart.mentorId, price: cart.price, promo }), {
            ok: qd => {
                $('#payBtn').textContent = `Pay ${money(qd.total)}`;
                cart.total = qd.total;
                return `<div class="row-between"><span>Subtotal</span><span>${money(qd.subtotal)}</span></div>
          ${qd.discount ? `<div class="row-between" style="color:var(--ok)"><span>Discount (${esc(promo.toUpperCase())})</span><span>−${money(qd.discount)}</span></div>` : ''}
          <div class="row-between"><span>Service fee</span><span>${money(qd.fee)}</span></div>
          <hr class="divider"><div class="row-between"><b>Total</b><span class="price">${money(qd.total)}</span></div>`;
            },
        });
        const pmBox = $('#methods', root);
        api.get('/api/me/payment-methods').then(pms => {
            if (token !== S.renderToken)
                return;
            if (!pms.length)
                method = 'card';
            pmBox.innerHTML = `<div class="stack">
        ${pms.map((p, i) => `<label class="check card card-tight"><input type="radio" name="method" value="saved:${p.id}" ${i === 0 ? 'checked' : ''}> 💳 ${esc(p.brand)} •••• ${esc(p.last4)} <small>exp. ${esc(p.exp)}</small></label>`).join('')}
        <label class="check card card-tight"><input type="radio" name="method" value="card" ${pms.length ? '' : 'checked'}> ➕ New card</label>
        <label class="check card card-tight"><input type="radio" name="method" value="blik"> 📱 BLIK</label></div><div class="err" data-err="method"></div>`;
            const sync = () => { const v = $('input[name="method"]:checked', pmBox).value; method = v.startsWith('saved') ? 'saved' : v; $('#newCard').hidden = method !== 'card'; $('#blik').hidden = method !== 'blik'; };
            $$('input[name="method"]', pmBox).forEach(r => r.addEventListener('change', sync));
            sync();
        }).catch((e) => { if (token === S.renderToken)
            pmBox.innerHTML = `<div class="notice notice-err">Could not load saved cards (${esc(e.message)}). You can still pay with a new card.</div>`; method = 'card'; $('#newCard').hidden = false; });
        if (cart.kind === 'booking' && cart.holdExpires) {
            const tick = () => {
                if (token !== S.renderToken) {
                    clearInterval(iv);
                    return;
                }
                const left = Math.max(0, cart.holdExpires - Date.now());
                const cd = $('#cd');
                if (cd)
                    cd.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
                if (left <= 0) {
                    clearInterval(iv);
                    S.cart = null;
                    root.innerHTML = `<div class="container">${stateBox('⌛', 'Your hold has expired', 'The time was released so others can book it. Pick a time again — it only takes a moment.', `<a class="btn btn-primary" href="#/book/${m.id}?type=${cart.type}">Pick another time</a>`, 'state-error')}</div>`;
                }
            };
            const iv = setInterval(tick, 1000);
            tick();
            on('expire', () => { cart.holdExpires = Date.now(); });
        }
        on('submit:promo', el => {
            const f = el;
            const v = validate(f, { promo: [V.req('Enter a code.'), V.re(/^[A-Za-z0-9]{4,20}$/, 'Codes use 4–20 letters or digits.')] });
            if (!v)
                return;
            const prev = promo;
            promo = v.promo;
            api.post('/api/checkout/quote', { price: cart.price, promo }).then(() => { toast('Promo code applied'); loadQuote(); })
                .catch((e) => { promo = prev; apiErrToForm(f, e); });
        });
        on('submit:pay', async (el) => {
            const f = el;
            const rules = method === 'card' ? cardRules : method === 'blik' ? { blik: [V.req('Enter the BLIK code.'), V.re(/^\d{6}$/, 'BLIK code has 6 digits.')] } : {};
            const v = validate(f, rules);
            if (!v)
                return;
            const btn = $('#payBtn');
            busy(btn, true);
            try {
                const total = cart.total ?? cart.price;
                const pi = await api.post('/api/payments/intents', { amount: total, method, number: v.number, blik: v.blik });
                if (cart.kind === 'booking') {
                    const b = await api.post('/api/bookings', { holdId: cart.holdId, paymentIntentId: pi.id, mentorId: cart.mentorId, start: cart.start, minutes: cart.minutes, type: cart.type, price: cart.price, total, goal: cart.goal });
                    S.cart = null;
                    go(`/booking/${b.id}/confirmed`);
                }
                else {
                    await api.post('/api/subscriptions', { mentorId: cart.mentorId, perWeek: cart.perWeek, startDate: cart.startDate, paymentIntentId: pi.id, total });
                    S.cart = null;
                    toast('Your weekly plan is active!');
                    go('/billing?welcome=plan');
                }
            }
            catch (e) {
                busy(btn, false);
                apiErrToForm(f, e);
            }
        });
        loadQuote();
    },
});
/* ---------------- M3 Booking confirmed ---------------- */
defineScreen({
    id: 'M3', path: '/booking/:id/confirmed', title: 'Booking confirmed', group: 'Mentee', roles: ['mentee'],
    render(root, p) {
        root.innerHTML = `<div class="container" style="max-width:760px" id="conf"></div>`;
        on('ics', () => toast('Calendar file mentorhub-session.ics downloaded (simulated)'));
        bindMentorCardActions();
        load($('#conf', root), () => api.get(`/api/bookings/${p.id}`), {
            ok: s => `${stepper(['Choose a time', 'Pay securely', 'Confirmation'], 3)}
        ${successState('You are booked!', `${s.type === 'intro' ? 'Intro session' : 'Session'} with <b>${esc(s.mentor.name)}</b> on <b>${fmtDT(s.start)}</b> (${s.minutes} min, ${esc(tzName())}). A confirmation email and receipt are on the way.`, `<button class="btn" data-act="ics">📅 Add to calendar</button><button class="btn" data-act="msg-mentor" data-id="${s.mentorId}">💬 Message ${esc(s.mentor.name.split(' ')[0])}</button><a class="btn btn-primary" href="#/sessions">Go to my sessions</a>`)}
        <div class="grid g3" style="margin-top:16px">
          <div class="card"><h4>Before the session</h4><small>Share your goals or documents in messages so ${esc(s.mentor.name.split(' ')[0])} can prepare.</small></div>
          <div class="card"><h4>Joining</h4><small>The video room opens ${RULES.roomOpensMinutesBefore} minutes before the start. Use Chrome, Edge or Safari; no install needed.</small></div>
          <div class="card"><h4>Changes</h4><small>Reschedule or cancel for free up to ${RULES.freeCancelHours} hours before the session.</small></div>
        </div>`,
        });
    },
});
/* ---------------- M4 Mentee home ---------------- */
defineScreen({
    id: 'M4', path: '/home', title: 'Home', group: 'Mentee', roles: ['mentee'],
    render(root) {
        root.innerHTML = `<div class="container">${pageHead(`Hi ${DB.profile.name.split(' ')[0]} 👋`, 'Your sessions, plans and next steps.', `<a class="btn btn-primary" href="#/mentors">Find a mentor</a>`)}<div id="home"></div></div>`;
        load($('#home', root), () => api.get('/api/me/home'), {
            skeleton: `<div class="split"><div>${skelCards(2, 'stack')}</div>${skelCards(1, 'stack')}</div>`,
            isEmpty: d => !d.upcoming.length && !d.toReview.length && !d.subscriptions.length,
            empty: () => emptyState('Start with your first mentor', 'Book a 30-minute intro session at half price. If it is not a fit, the next intro is on us.', `<a class="btn btn-primary" href="#/mentors">Browse mentors</a><a class="btn" href="#/settings">Complete your profile</a>`),
            ok: d => {
                const next = d.upcoming[0];
                return `<div class="split"><div class="stack-lg">
          ${next ? `<section class="card" style="border-color:var(--brand)"><div class="row-between"><h2 style="margin:0">Next session</h2>${chip(relTime(next.start), 'brand')}</div>
            <div class="row-between" style="margin-top:12px">${mentorMini(next.mentor, `<br><small>${next.type === 'intro' ? 'Intro · ' : ''}${fmtDT(next.start)} · ${next.minutes} min</small>`)}
              <div class="row"><a class="btn btn-primary" href="#/room/${next.id}">Join room</a><a class="btn" href="#/sessions">Manage</a></div></div>
            ${next.goal ? `<p class="muted" style="margin:12px 0 0;font-size:14px">🎯 ${esc(next.goal)}</p>` : ''}</section>` : `<section class="card">${emptyState('No upcoming sessions', 'Book your next session with one of your mentors.', `<a class="btn btn-primary" href="#/mentors">Book a session</a>`)}</section>`}
          ${d.toReview.length || d.trialsNoPlan.length ? `<section class="card"><h2>To do</h2><ul class="list">
            ${d.toReview.map((s) => `<li class="row-between"><span>⭐ How was your ${s.type === 'intro' ? 'intro' : 'session'} with <b>${esc(s.mentor.name)}</b>?</span><a class="btn btn-sm btn-primary" href="#/sessions/${s.id}/review">Leave a review</a></li>`).join('')}
            ${d.trialsNoPlan.map((s) => `<li class="row-between"><span>🚀 Continue with <b>${esc(s.mentor.name)}</b> — choose a weekly plan</span><a class="btn btn-sm" href="#/plans/${s.mentorId}">See plans</a></li>`).join('')}
          </ul></section>` : ''}
          <section class="card"><h2>Upcoming</h2>${d.upcoming.length > 1 ? `<ul class="list">${d.upcoming.slice(1).map((s) => `<li class="row-between">${mentorMini(s.mentor, `<br><small>${fmtDT(s.start)} · ${s.minutes} min</small>`)}${chip(relTime(s.start))}</li>`).join('')}</ul>` : `<p class="muted">Nothing else scheduled.</p>`}</section>
          <section><h2>Recommended for your goals</h2><div class="grid g3">${d.recommended.map((m) => `<a class="card card-link" style="color:inherit;text-decoration:none" href="#/mentors/${m.id}">${avatar(m.name, m.color)}<h4 style="margin-top:8px">${esc(m.name)}</h4><small>${esc(m.headline)}</small><div class="row-between" style="margin-top:8px"><span>${stars(m.rating)}</span><b>${money(m.rate)}</b></div></a>`).join('')}</div></section>
        </div>
        <aside class="stack-lg">
          <section class="card"><h3>Your plans</h3>${d.subscriptions.length ? d.subscriptions.map((s) => `<div class="stack"><div class="row-between">${mentorMini(s.mentor)}</div><div class="row-between"><span>${s.perWeek}× / week</span><b>${plural(s.credits, 'credit')} left</b></div><div class="progress"><i style="width:${Math.min(100, (s.credits / (s.perWeek * 4)) * 100)}%"></i></div><small>Renews ${fmtLongDate(s.renewsOn)}</small></div>`).join('<hr class="divider">') : `<p class="muted">No active plan yet.</p>`}
            <a class="btn btn-block" style="margin-top:12px" href="#/billing">Manage billing</a></section>
          <section class="card"><h3>Progress</h3><div class="grid g3" style="text-align:center"><div><div class="kpi">${d.stats.sessionsDone}</div><div class="kpi-label">sessions</div></div><div><div class="kpi">${d.stats.hours}</div><div class="kpi-label">hours</div></div><div><div class="kpi">${d.stats.streakWeeks}</div><div class="kpi-label">week streak</div></div></div></section>
        </aside></div>`;
            },
        });
    },
});
/* ---------------- M5 My sessions ---------------- */
defineScreen({
    id: 'M5', path: '/sessions', title: 'My sessions', group: 'Mentee', roles: ['mentee'],
    render(root, _p, q) {
        const tab = q.get('tab') || 'upcoming';
        root.innerHTML = `<div class="container">${pageHead('My sessions', '', `<a class="btn btn-primary" href="#/mentors">Book a session</a>`)}
      ${tabs([['Upcoming', '/sessions?tab=upcoming'], ['Past', '/sessions?tab=past'], ['Cancelled', '/sessions?tab=cancelled']], `/sessions?tab=${tab}`)}<div id="list"></div></div>`;
        const reload = () => load($('#list', root), () => api.get(`/api/me/sessions?status=${tab}`), {
            skeleton: skelCards(3, 'stack'),
            isEmpty: d => !d.items.length,
            empty: () => tab === 'upcoming' ? emptyState('No upcoming sessions', 'When you book a session it will appear here.', `<a class="btn btn-primary" href="#/mentors">Find a mentor</a>`)
                : tab === 'past' ? emptyState('No past sessions yet', 'Your completed sessions and notes will be kept here.') : emptyState('No cancelled sessions', 'Good news — nothing was cancelled.'),
            ok: d => `<div class="stack">${d.items.map(s => {
                const h = hoursUntil(s.start);
                const actions = tab === 'upcoming'
                    ? `<a class="btn btn-primary btn-sm" href="#/room/${s.id}">Join room</a><button class="btn btn-sm" data-act="resched" data-id="${s.id}">Reschedule</button><button class="btn btn-sm btn-danger" data-act="cancel" data-id="${s.id}">Cancel</button>`
                    : tab === 'past' ? `${s.reviewed ? chip('Reviewed ✓', 'ok') : `<a class="btn btn-primary btn-sm" href="#/sessions/${s.id}/review">Leave a review</a>`}<button class="btn btn-sm" data-act="book-again" data-id="${s.mentorId}">Book again</button><button class="btn btn-sm btn-ghost" data-act="report" data-id="${s.id}">Report a problem</button>`
                        : `<small>${esc(s.cancelReason ?? '')}</small><button class="btn btn-sm" data-act="book-again" data-id="${s.mentorId}">Book again</button>`;
                return `<article class="card row-between">
          ${mentorMini(s.mentor, `<br><small>${s.type === 'intro' ? 'Intro · ' : ''}${fmtDT(s.start)} · ${s.minutes} min${s.subscriptionId ? ' · plan credit' : ''}</small>`)}
          <div class="row">${tab === 'upcoming' ? chip(relTime(s.start), h < RULES.freeCancelHours ? 'warn' : 'brand') : statusChip(s.status)}${actions}</div>
          ${s.notes && tab === 'past' ? `<details style="flex-basis:100%"><summary class="muted">Session notes</summary><pre style="white-space:pre-wrap;font:14px var(--font)">${esc(s.notes)}</pre></details>` : ''}
        </article>`;
            }).join('')}</div>
      ${tab === 'upcoming' ? `<p class="muted" style="font-size:13px;margin-top:12px">Free rescheduling and cancellation up to ${RULES.freeCancelHours} hours before the start. Later cancellations use the credit / are not refunded.</p>` : ''}`,
        });
        on('book-again', el => go(`/book/${el.dataset.id}?type=regular`));
        on('resched', async (el) => {
            const s = DB.sessions.find(x => x.id === el.dataset.id);
            const m = mentorById(s.mentorId);
            if (hoursUntil(s.start) < RULES.freeCancelHours) {
                openModal('Too late to reschedule', `<div class="notice notice-warn">This session starts ${relTime(s.start)}. Sessions can be rescheduled up to ${RULES.freeCancelHours} hours before the start.</div><p style="margin-top:12px">You can still message ${esc(m.name)} — mentors may agree to move it on their side.</p>`, `<button class="btn" data-act="modal-close">Close</button><a class="btn btn-primary" href="#/messages">Message mentor</a>`);
                return;
            }
            let pick = null;
            openModal('Reschedule session', `<p>Current time: <b>${fmtDT(s.start)}</b> with ${esc(m.name)}. Pick a new time:</p><div id="rs"></div><div class="err" id="rsErr"></div>`, `<button class="btn" data-act="modal-close">Keep current time</button><button class="btn btn-primary" data-act="rs-ok">Confirm new time</button>`, true);
            load($('#rs'), () => api.get(`/api/mentors/${m.id}/availability?from=${isoDay(new Date())}&days=7&minutes=${s.minutes}`), {
                isEmpty: d => d.days.every(x => !x.slots.some(z => z.available)),
                empty: () => emptyState('No free times in the next 7 days', 'Message the mentor to find another time.'),
                ok: d => weekGrid(d.days, null, 'rs-pick'),
            });
            on('rs-pick', b => { pick = b.dataset.start; $$('#rs .slot.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); });
            on('rs-ok', async (b) => {
                if (!pick) {
                    $('#rsErr').textContent = 'Pick a new time first.';
                    return;
                }
                busy(b, true);
                try {
                    await api.post(`/api/sessions/${s.id}/reschedule`, { start: pick });
                    closeModal();
                    toast(`Moved to ${fmtDT(pick)}. ${m.name.split(' ')[0]} has been notified.`);
                    reload();
                }
                catch (e) {
                    busy(b, false);
                    $('#rsErr').textContent = e.message;
                }
            });
        });
        on('cancel', el => {
            const s = DB.sessions.find(x => x.id === el.dataset.id);
            const late = hoursUntil(s.start) < RULES.freeCancelHours;
            openModal('Cancel session?', `
        <form data-form="cancel" novalidate>${formAlert()}
          ${late ? `<div class="notice notice-warn" style="margin-bottom:12px">⚠ Less than ${RULES.freeCancelHours} h before the start: ${s.subscriptionId ? 'the plan credit will be used' : 'the payment will not be refunded'} and the mentor will be paid.</div>`
                : `<div class="notice notice-ok" style="margin-bottom:12px">Free cancellation: ${s.subscriptionId ? 'the credit returns to your plan' : `${money(s.price)} will be refunded to your original payment method`}.</div>`}
          ${field({ name: 'reason', label: 'Reason', type: 'select', options: [['', 'Select a reason'], ['schedule', 'Schedule conflict'], ['health', 'Health'], ['mentor_fit', 'Not the right mentor'], ['other', 'Other']] })}
          ${field({ name: 'note', label: 'Message to the mentor', type: 'textarea', optional: true, rows: 2, counter: 300 })}
        </form>`, `<button class="btn" data-act="modal-close">Keep session</button><button class="btn btn-danger" data-act="cancel-ok">Cancel session</button>`);
            on('cancel-ok', async (b) => {
                const f = $('form[data-form="cancel"]');
                const v = validate(f, { reason: [V.req('Select a reason.')], note: [V.max(300)] });
                if (!v)
                    return;
                busy(b, true);
                try {
                    const r = await api.post(`/api/sessions/${s.id}/cancel`, v);
                    closeModal();
                    toast(r.refunded ? `Session cancelled. Refunded to your ${r.refundTo}.` : 'Session cancelled. No refund (late cancellation).', r.refunded ? 'ok' : 'info');
                    reload();
                }
                catch (e) {
                    busy(b, false);
                    apiErrToForm(f, e);
                }
            });
        });
        on('report', el => {
            openModal('Report a problem', `<form data-form="report" novalidate>${formAlert()}
        ${field({ name: 'kind', label: 'What happened?', type: 'select', options: [['', 'Select'], ['mentor_no_show', 'Mentor did not show up'], ['technical', 'Technical problems'], ['quality', 'Session quality / conduct'], ['payment', 'Payment issue']] })}
        ${field({ name: 'description', label: 'Describe the problem', type: 'textarea', rows: 4, counter: 1000, hint: 'Our support team replies within 24 h. Problems must be reported within 7 days of the session.' })}</form>`, `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="report-ok">Send report</button>`);
            on('report-ok', async (b) => {
                const f = $('form[data-form="report"]');
                const v = validate(f, { kind: [V.req('Choose a category.')], description: [V.req('Describe what happened.'), V.min(20), V.max(1000)] });
                if (!v)
                    return;
                busy(b, true);
                try {
                    const r = await api.post(`/api/sessions/${el.dataset.id}/report`, v);
                    closeModal();
                    toast(`Report ${r.id} sent. We will reply within 24 h.`);
                }
                catch (e) {
                    busy(b, false);
                    apiErrToForm(f, e);
                }
            });
        });
        reload();
    },
});
/* ---------------- M6 Session room ---------------- */
defineScreen({
    id: 'M6', path: '/room/:id', title: 'Session room', group: 'Mentee', roles: ['mentee', 'mentor'],
    render(root, p) {
        const token = S.renderToken;
        root.innerHTML = `<div class="container" id="room"></div>`;
        load($('#room', root), () => api.get(`/api/sessions/${p.id}`), {
            ok: s => {
                const other = S.role === 'mentor' ? s.menteeName : s.mentor.name;
                const minsTo = hoursUntil(s.start) * 60;
                return `${pageHead(`${s.type === 'intro' ? 'Intro session' : 'Session'} with ${other}`, `${fmtDT(s.start)} · ${s.minutes} min`)}
          ${minsTo > RULES.roomOpensMinutesBefore ? `<div class="notice notice-warn" style="margin-bottom:16px">⏳ The room opens ${RULES.roomOpensMinutesBefore} minutes before the start (${relTime(s.start)}). <button class="btn btn-sm" data-act="early" style="margin-left:8px">Prototype: enter anyway</button></div>` : ''}
          <div id="stage" ${minsTo > RULES.roomOpensMinutesBefore ? 'hidden' : ''}>
            <div class="split"><div class="card"><h2>Check your camera and microphone</h2>
              <div class="video-ph" style="aspect-ratio:16/9"><div>📷 Camera preview<br><small style="color:#cfd2ea">Kasia — you look great</small></div></div>
              <div class="inline-fields" style="margin-top:12px">${field({ name: 'cam', label: 'Camera', type: 'select', options: [['1', 'FaceTime HD Camera'], ['2', 'USB Webcam']] })}${field({ name: 'mic', label: 'Microphone', type: 'select', options: [['1', 'MacBook Microphone'], ['2', 'Headset']] })}</div>
              <small>Mic level</small><div class="meter"><i style="width:62%"></i></div></div>
              <aside class="card stack"><h3>Ready to join?</h3><p class="muted">${esc(other)} ${S.role === 'mentor' ? 'is waiting' : 'will join shortly'}.</p>
                ${s.goal ? `<div class="notice">🎯 ${esc(s.goal)}</div>` : ''}
                <button class="btn btn-primary btn-lg btn-block" data-act="join">Join session</button><div class="err" id="joinErr"></div>
                <small>Problems? Use the “Report a problem” link in My sessions after the session.</small></aside></div>
          </div>`;
            },
            after: s => {
                const other = S.role === 'mentor' ? s.menteeName : s.mentor.name;
                on('early', el => { el.closest('.notice').remove(); $('#stage').hidden = false; });
                on('join', async (el) => {
                    busy(el, true);
                    try {
                        await api.post(`/api/sessions/${s.id}/room-token`);
                        inSession();
                    }
                    catch (e) {
                        busy(el, false);
                        $('#joinErr').textContent = `Could not connect: ${e.message}`;
                    }
                });
                const inSession = () => {
                    let sec = 0;
                    let mic = true;
                    let cam = true;
                    let panel = 'notes';
                    const started = Date.now();
                    const box = $('#stage');
                    const draw = () => {
                        box.innerHTML = `<div class="room"><div><div class="stage"><span class="timer" id="tm">00:00 / ${s.minutes}:00</span><div style="text-align:center">${avatar(other, s.mentor.color, 'xl')}<p style="margin-top:8px">${esc(other)}</p></div><div class="self">${cam ? 'You' : '📷 off'}</div></div>
              <div class="bar"><button class="btn ${mic ? '' : 'off'}" data-act="mic">${mic ? '🎙 Mute' : '🔇 Unmute'}</button><button class="btn ${cam ? '' : 'off'}" data-act="cam">${cam ? '📷 Stop video' : '📷 Start video'}</button><button class="btn" data-act="share">🖥 Share screen</button><button class="btn" style="background:var(--err);border-color:var(--err)" data-act="end">End session</button></div></div>
              <div class="panel"><div class="seg" style="margin-bottom:10px"><button class="${panel === 'notes' ? 'on' : ''}" data-act="pn" data-p="notes">Notes</button><button class="${panel === 'chat' ? 'on' : ''}" data-act="pn" data-p="chat">Chat</button><button class="${panel === 'agenda' ? 'on' : ''}" data-act="pn" data-p="agenda">Agenda</button></div>
                ${panel === 'notes' ? `<textarea class="input" id="notes" style="flex:1;min-height:300px" placeholder="Shared notes — both of you can see them after the session.">${esc(s.notes ?? '')}</textarea><small id="saved" class="muted">Autosaves every few seconds</small>`
                            : panel === 'chat' ? `<div class="msgs" style="flex:1;max-height:none"><div class="msg">Hi! Can you hear me well?</div><div class="msg me">Yes, all good 👍</div></div><input class="input" placeholder="Message (Enter to send)" style="margin-top:8px">`
                                : `<ol><li>Check-in (5 min)</li><li>${esc(s.goal ?? 'Main topic')}</li><li>Action items &amp; homework</li></ol>`}
              </div></div>`;
                        const n = $('#notes');
                        let deb;
                        n?.addEventListener('input', () => { clearTimeout(deb); deb = window.setTimeout(async () => { s.notes = n.value; try {
                            const r = await api.put(`/api/sessions/${s.id}/notes`, { notes: n.value });
                            const sv = $('#saved');
                            if (sv)
                                sv.textContent = `Saved at ${fmtTime(r.savedAt)}`;
                        }
                        catch {
                            const sv = $('#saved');
                            if (sv)
                                sv.textContent = '⚠ Not saved — retrying when connection is back';
                        } }, 1200); });
                    };
                    draw();
                    const iv = setInterval(() => { if (token !== S.renderToken) {
                        clearInterval(iv);
                        return;
                    } sec = Math.floor((Date.now() - started) / 1000); const t = $('#tm'); if (t)
                        t.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')} / ${s.minutes}:00`; }, 1000);
                    on('mic', () => { mic = !mic; draw(); });
                    on('cam', () => { cam = !cam; draw(); });
                    on('share', () => toast('Screen sharing started (simulated)', 'info'));
                    on('pn', el => { panel = el.dataset.p; draw(); });
                    on('end', () => openModal('End the session?', `<p>The session will be marked as completed for both participants${S.role === 'mentee' ? ' and you will be asked for a short review' : ''}.</p>`, `<button class="btn" data-act="modal-close">Stay</button><button class="btn btn-primary" data-act="end-ok">End session</button>`));
                    on('end-ok', async (b) => {
                        busy(b, true);
                        try {
                            await api.post(`/api/sessions/${s.id}/complete`);
                            clearInterval(iv);
                            closeModal();
                            go(S.role === 'mentor' ? '/mentor/mentees' : `/sessions/${s.id}/review`);
                        }
                        catch (e) {
                            busy(b, false);
                            toast(e.message, 'err');
                        }
                    });
                };
            },
        });
    },
});
/* ---------------- M7 Review ---------------- */
defineScreen({
    id: 'M7', path: '/sessions/:id/review', title: 'Review a session', group: 'Mentee', roles: ['mentee'],
    render(root, p) {
        root.innerHTML = `<div class="container" style="max-width:720px" id="rev"></div>`;
        const TAGS = ['Actionable advice', 'Clear communication', 'Good listener', 'Expert knowledge', 'Well prepared', 'Career impact'];
        load($('#rev', root), () => api.get(`/api/sessions/${p.id}`), {
            ok: s => {
                if (s.status !== 'completed')
                    return stateBox('⏳', 'Not yet', 'You can review a session after it has taken place.', `<a class="btn" href="#/sessions">Back to my sessions</a>`);
                if (s.reviewed)
                    return successState('Already reviewed', 'Thank you — you have already reviewed this session. You can edit your review within 14 days in My sessions.', `<a class="btn" href="#/sessions?tab=past">Back to my sessions</a>`);
                return `<div class="card"><h1>How was your ${s.type === 'intro' ? 'intro ' : ''}session?</h1>
          ${mentorMini(s.mentor, `<br><small>${fmtDT(s.start)} · ${s.minutes} min</small>`)}
          <form data-form="review" novalidate style="margin-top:18px">${formAlert()}
            <div class="field"><span>Your rating</span><div class="row" id="stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<label class="btn btn-sm" style="font-size:20px"><input type="radio" name="rating" value="${n}" class="sr-only">☆</label>`).join('')}<span id="rlabel" class="muted"></span></div><div class="err" data-err="rating"></div></div>
            <div class="field"><span>What went well? <small>(optional)</small></span><div class="chips">${TAGS.map(t => `<label class="chip toggle-chip"><input type="checkbox" name="tags" value="${t}">${t}</label>`).join('')}</div></div>
            ${field({ name: 'comment', label: 'Public review', type: 'textarea', counter: 1000, rows: 4, hint: 'Shown on the mentor’s profile with your first name. Required for ratings of 3★ or lower (min. 20 characters).' })}
            ${field({ name: 'private', label: 'Private feedback for MentorHub', type: 'textarea', optional: true, rows: 2, counter: 500 })}
            <button class="btn btn-primary btn-lg">Submit review</button> <a class="btn btn-ghost" href="#/sessions?tab=past">Later</a>
          </form></div>`;
            },
            after: s => {
                if (s.status !== 'completed' || s.reviewed)
                    return;
                const labels = ['', 'Poor', 'Below expectations', 'OK', 'Very good', 'Excellent'];
                $$('#stars input').forEach(i => i.addEventListener('change', () => {
                    const n = Number(i.value);
                    $$('#stars label').forEach((l, k) => { l.childNodes[1].textContent = k < n ? '★' : '☆'; l.style.color = k < n ? 'var(--accent)' : ''; });
                    $('#rlabel').textContent = labels[n];
                }));
                on('submit:review', async (el) => {
                    const f = el;
                    const v = validate(f, {
                        rating: [V.req('Choose a rating from 1 to 5 stars.')],
                        comment: [(val, form) => (Number(formValues(form).rating) <= 3 && val.trim().length < 20 ? 'Please tell us what could be better (at least 20 characters).' : null), V.max(1000)],
                        private: [V.max(500)],
                    });
                    if (!v)
                        return;
                    const btn = $('button.btn-primary', f);
                    busy(btn, true);
                    try {
                        await api.post(`/api/sessions/${s.id}/review`, v);
                        const first = s.mentor.name.split(' ')[0];
                        $('#rev').innerHTML = successState('Thank you for your review!', 'It helps other mentees choose and helps mentors grow.', `<a class="btn" href="#/home">Back to home</a>`) + (s.type === 'intro' ? `
              <h2 style="margin-top:24px">What next?</h2><div class="grid g2">
                <div class="card"><h3>Continue with ${esc(first)}</h3><p class="muted">Choose a weekly plan — your intro time can become your regular slot.</p><a class="btn btn-primary" href="#/plans/${s.mentorId}">See plans</a></div>
                <div class="card"><h3>Not a fit?</h3><p class="muted">Try another mentor — your next intro is free under our satisfaction guarantee.</p><a class="btn" href="#/mentors?topic=${s.mentor.topics[0]}">Find another mentor</a></div></div>` : '');
                    }
                    catch (e) {
                        busy(btn, false);
                        apiErrToForm(f, e);
                    }
                });
            },
        });
    },
});
/* ---------------- M8 Plans ---------------- */
defineScreen({
    id: 'M8', path: '/plans/:mentorId', title: 'Choose a weekly plan', group: 'Mentee', roles: ['mentee'],
    render(root, p) {
        root.innerHTML = `<div class="container" id="plans"></div>`;
        let perWeek = 1;
        load($('#plans', root), () => api.get(`/api/mentors/${p.mentorId}/plans`), {
            isEmpty: d => !d.items.length,
            empty: () => emptyState('No plans available', 'This mentor currently accepts single sessions only.', `<a class="btn btn-primary" href="#/book/${p.mentorId}?type=regular">Book a single session</a>`),
            ok: d => `${pageHead(`Weekly plan with ${d.mentor.name}`, 'Regular sessions build momentum. Billed every 4 weeks — change, pause or cancel anytime.')}
        <div class="split"><form data-form="plan" novalidate class="stack-lg">
          <div class="grid g2">${d.items.map(it => `<label class="card card-link" style="display:block"><input type="radio" name="perWeek" value="${it.perWeek}" ${it.perWeek === 1 ? 'checked' : ''}>
            <b style="font-size:18px">${it.perWeek}× per week</b> ${it.popular ? chip('Most popular', 'accent') : ''}<br><small>${it.sessionsPerCycle} sessions × 60 min every 4 weeks</small>
            <div class="price" style="margin-top:8px">${money(it.pricePerCycle)}</div><small>${money(d.mentor.rate)} per session</small></label>`).join('')}</div>
          <div class="card">${field({ name: 'startDate', label: 'First session week starts on', type: 'date', value: isoDay(new Date(Date.now() + 864e5)), attrs: `min="${isoDay(new Date())}" max="${isoDay(new Date(Date.now() + 30 * 864e5))}"`, hint: 'You schedule each session yourself from your credits — any free time in the mentor’s calendar.' })}
            <label class="check"><input type="checkbox" name="autorenew" value="1" checked disabled> Renews automatically every 4 weeks (you can cancel anytime)</label></div>
          <div class="err" data-err="perWeek"></div>
          <button class="btn btn-primary btn-lg">Continue to payment</button>
        </form>
        <aside class="card sticky stack">${mentorMini(d.mentor)}<hr class="divider"><div id="sum"></div>
          <small>✓ Unused credits carry over to the next cycle once.<br>✓ Reschedule free up to ${RULES.freeCancelHours} h before.<br>✓ Move credits to another mentor anytime.</small></aside></div>`,
            after: d => {
                const sum = () => { const it = d.items.find(x => x.perWeek === perWeek) ?? d.items[0]; $('#sum').innerHTML = `<div class="row-between"><span>${it.perWeek}× / week</span><b>${money(it.pricePerCycle)}</b></div><small>per 4 weeks · ${it.sessionsPerCycle} credits</small>`; };
                $$('input[name="perWeek"]').forEach(r => r.addEventListener('change', () => { perWeek = Number(r.value); sum(); }));
                sum();
                on('submit:plan', el => {
                    const f = el;
                    const v = validate(f, {
                        perWeek: [V.req('Choose how many sessions per week.')],
                        startDate: [V.req('Choose a start date.'), val => { const t = new Date(val + 'T23:59:59').getTime(); return t < Date.now() ? 'Start date cannot be in the past.' : t > Date.now() + 31 * 864e5 ? 'Start within the next 30 days.' : null; }],
                    });
                    if (!v)
                        return;
                    const it = d.items.find(x => x.perWeek === Number(v.perWeek)) ?? d.items[0];
                    S.cart = { kind: 'subscription', mentorId: d.mentor.id, perWeek: it.perWeek, minutes: 60, price: it.pricePerCycle, startDate: v.startDate };
                    go('/checkout');
                });
            },
        });
    },
});
/* ---------------- M9 Billing ---------------- */
defineScreen({
    id: 'M9', path: '/billing', title: 'Billing & plans', group: 'Mentee', roles: ['mentee'],
    render(root, _p, q) {
        root.innerHTML = `<div class="container">${pageHead('Billing & plans', 'Your weekly plans, credits, payment methods and invoices.')}
      ${q.get('welcome') ? `<div class="notice notice-ok" style="margin-bottom:16px">✅ Your new plan is active. Schedule your first session from the mentor’s calendar.</div>` : ''}<div id="bill"></div></div>`;
        const reload = () => load($('#bill', root), () => api.get('/api/me/billing'), {
            skeleton: skelCards(3, 'stack'),
            ok: d => `<div class="stack-lg">
        <section><h2>Plans</h2>${d.subscriptions.length ? `<div class="grid g2">${d.subscriptions.map((s) => `<div class="card stack">
          <div class="row-between">${mentorMini(s.mentor)}${statusChip(s.status)}</div>
          <div class="row-between"><span>${s.perWeek}× / week · ${s.minutes} min</span><b>${money(s.pricePerCycle)} / 4 weeks</b></div>
          <div class="row-between"><span>Credits left</span><b>${s.credits}</b></div>
          ${s.status === 'active' ? `<small>Renews on ${fmtLongDate(s.renewsOn)}</small>
          <div class="row"><a class="btn btn-sm btn-primary" href="#/book/${s.mentorId}?type=regular">Schedule session</a><button class="btn btn-sm" data-act="change" data-id="${s.id}">Change plan</button><button class="btn btn-sm" data-act="transfer" data-id="${s.id}">Move credits</button><button class="btn btn-sm btn-danger" data-act="cancel-sub" data-id="${s.id}">Cancel plan</button></div>` : `<small>Plan ended. Remaining credits can still be used until ${fmtLongDate(s.renewsOn)}.</small>`}
        </div>`).join('')}</div>` : emptyState('No plans yet', 'After an intro session you can choose a weekly plan with your mentor.', `<a class="btn btn-primary" href="#/mentors">Find a mentor</a>`)}</section>
        <section class="card"><div class="row-between"><h2 style="margin:0">Payment methods</h2><button class="btn btn-sm" data-act="add-card">Add card</button></div>
          ${d.paymentMethods.length ? `<ul class="list" style="margin-top:8px">${d.paymentMethods.map((pm) => `<li class="row-between"><span>💳 ${esc(pm.brand)} •••• ${esc(pm.last4)} <small>exp. ${esc(pm.exp)}</small> ${pm.default ? chip('Default', 'brand') : ''}</span><button class="btn btn-sm btn-ghost" data-act="rm-card" data-id="${pm.id}">Remove</button></li>`).join('')}</ul>` : `<p class="muted">No saved cards. You will be asked for a card at checkout.</p>`}</section>
        <section class="card"><h2>Invoices</h2>${d.invoices.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead><tbody>
          ${d.invoices.map((i) => `<tr><td>${fmtLongDate(i.date)}</td><td>${esc(i.desc)}<br><small>${esc(i.id)}</small></td><td class="num">${money(i.amount)}</td><td><button class="btn btn-sm" data-act="pdf" data-id="${i.id}">PDF</button></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">No invoices yet.</p>`}</section>
      </div>`,
        });
        on('pdf', async (el) => { busy(el, true); try {
            await api.get(`/api/invoices/${el.dataset.id}/pdf`);
            toast(`${el.dataset.id}.pdf downloaded (simulated)`);
        }
        catch (e) {
            toast(e.message, 'err');
        } busy(el, false); });
        on('change', el => {
            const s = DB.subscriptions.find(x => x.id === el.dataset.id);
            openModal('Change plan', `<form data-form="chg" novalidate>${field({ name: 'perWeek', label: 'Sessions per week', type: 'select', value: String(s.perWeek), options: [['1', '1× per week'], ['2', '2× per week'], ['3', '3× per week'], ['5', '5× per week']] })}
        <div class="notice">Changes apply from the next billing cycle (${fmtLongDate(s.renewsOn)}). Your current credits stay.</div></form>`, `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="chg-ok">Save change</button>`);
            on('chg-ok', async (b) => {
                const v = formValues($('form[data-form="chg"]'));
                if (Number(v.perWeek) === s.perWeek) {
                    closeModal();
                    toast('No changes', 'info');
                    return;
                }
                busy(b, true);
                try {
                    await api.patch(`/api/subscriptions/${s.id}`, v);
                    closeModal();
                    toast('Plan updated from the next cycle');
                    reload();
                }
                catch (e) {
                    busy(b, false);
                    toast(e.message, 'err');
                }
            });
        });
        on('transfer', el => {
            const s = DB.subscriptions.find(x => x.id === el.dataset.id);
            openModal('Move credits to another mentor', `<form data-form="tr" novalidate>${formAlert()}
        ${field({ name: 'toMentorId', label: 'New mentor', type: 'select', options: [['', 'Select a mentor'], ...DB.mentors.filter(m => m.id !== s.mentorId).map(m => [m.id, `${m.name} — ${money(m.rate)}/h`])] })}
        ${field({ name: 'credits', label: `Credits to move (you have ${s.credits})`, type: 'number', value: String(s.credits), attrs: `min="1" max="${s.credits}"` })}
        <div class="notice">Credits are converted by value. If the new mentor is more expensive you may get fewer sessions.</div></form>`, `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="tr-ok">Move credits</button>`);
            on('tr-ok', async (b) => {
                const f = $('form[data-form="tr"]');
                const v = validate(f, { toMentorId: [V.req('Choose a mentor.')], credits: [V.req('Enter how many credits.'), V.num(1, Math.max(1, s.credits), `Enter 1–${s.credits}.`)] });
                if (!v)
                    return;
                busy(b, true);
                try {
                    await api.post(`/api/subscriptions/${s.id}/transfer`, v);
                    closeModal();
                    toast('Credits moved');
                    reload();
                }
                catch (e) {
                    busy(b, false);
                    apiErrToForm(f, e);
                }
            });
        });
        on('cancel-sub', el => {
            openModal('Cancel plan?', `<p>Your plan will not renew. You can still use the remaining credits until the end of the current cycle.</p><form data-form="cs" novalidate>${field({ name: 'reason', label: 'Why are you cancelling?', type: 'select', options: [['', 'Select a reason'], ['goal', 'I reached my goal'], ['price', 'Too expensive'], ['time', 'No time right now'], ['mentor', 'Want a different mentor'], ['other', 'Other']] })}</form>
        <div class="notice">Tip: you can also <b>pause</b> or <b>move credits</b> to another mentor instead.</div>`, `<button class="btn" data-act="modal-close">Keep plan</button><button class="btn btn-danger" data-act="cs-ok">Cancel plan</button>`);
            on('cs-ok', async (b) => {
                const f = $('form[data-form="cs"]');
                const v = validate(f, { reason: [V.req('Select a reason.')] });
                if (!v)
                    return;
                busy(b, true);
                try {
                    await api.post(`/api/subscriptions/${el.dataset.id}/cancel`, v);
                    closeModal();
                    toast('Plan cancelled. It will not renew.');
                    reload();
                }
                catch (e) {
                    busy(b, false);
                    toast(e.message, 'err');
                }
            });
        });
        on('add-card', () => {
            openModal('Add a card', `<form data-form="card" novalidate>${formAlert()}${cardFields()}</form>`, `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="card-ok">Save card</button>`);
            on('card-ok', async (b) => {
                const f = $('form[data-form="card"]');
                const v = validate(f, cardRules);
                if (!v)
                    return;
                busy(b, true);
                try {
                    await api.post('/api/me/payment-methods', v);
                    closeModal();
                    toast('Card saved');
                    reload();
                }
                catch (e) {
                    busy(b, false);
                    apiErrToForm(f, e);
                }
            });
        });
        on('rm-card', async (el) => {
            busy(el, true);
            try {
                await api.del(`/api/me/payment-methods/${el.dataset.id}`);
                toast('Card removed');
                reload();
            }
            catch (e) {
                busy(el, false);
                toast(e.message, 'err');
            }
        });
        reload();
    },
});
/* Shared screens (mentee + mentor): C1 Messages, C2 Notifications, C3 Account settings. */
/* ---------------- C1 Messages ---------------- */
function renderMessages(root, threadId) {
    root.innerHTML = `<div class="container">${pageHead('Messages', S.role === 'mentor' ? 'Conversations with your mentees.' : 'Conversations with your mentors.')}<div id="inbox"></div></div>`;
    const token = S.renderToken;
    load($('#inbox', root), () => api.get('/api/threads'), {
        skeleton: `<div class="inbox"><div class="threads">${skelLines(6)}</div><div style="padding:16px">${skelLines(5)}</div></div>`,
        isEmpty: d => !d.length,
        empty: () => emptyState('No conversations yet', S.role === 'mentor' ? 'Mentees will write to you here before and after sessions.' : 'Message a mentor from their profile to ask a question before booking.', S.role === 'mentor' ? '' : `<a class="btn btn-primary" href="#/mentors">Find a mentor</a>`),
        ok: list => {
            const active = threadId ?? list[0].id;
            return `<div class="inbox">
        <div class="threads"><div style="padding:10px"><input class="input" placeholder="Search conversations" data-change="filter-threads" aria-label="Search conversations"></div>
          ${list.map(t => `<div class="thread ${t.id === active ? 'active' : ''}" data-go="/messages/${t.id}" data-name="${esc(t.withName.toLowerCase())}">${avatar(t.withName, t.withColor, 'sm')}
            <div class="meta"><div class="row-between"><b style="font-size:14px">${esc(t.withName)}</b>${t.unread ? `<span class="chip chip-brand">${t.unread}</span>` : ''}</div>
            <p>${t.last ? esc((t.last.from === 'me' ? 'You: ' : '') + t.last.text) : '<i>No messages yet</i>'}</p></div></div>`).join('')}
        </div>
        <div class="convo" id="convo">${skelLines(5)}</div></div>`;
        },
        after: list => {
            const active = threadId ?? list[0].id;
            on('filter-threads', el => { const q = el.value.toLowerCase(); $$('.thread').forEach(t => (t.style.display = (t.dataset.name ?? '').includes(q) ? '' : 'none')); });
            const convo = $('#convo');
            const drawConvo = (t) => {
                convo.innerHTML = `
          <div class="convo-head row-between"><div class="row">${avatar(t.withName, t.withColor, 'sm')}<b>${esc(t.withName)}</b></div>
            ${S.role === 'mentee' && t.mentorId ? `<div class="row"><a class="btn btn-sm" href="#/mentors/${t.mentorId}">Profile</a><a class="btn btn-sm btn-primary" href="#/book/${t.mentorId}?type=regular">Book</a></div>` : ''}</div>
          <div class="msgs" id="msgs">${t.messages.length ? t.messages.map(m => `<div class="msg ${m.from === 'me' ? 'me' : m.from === 'sys' ? 'sys' : ''}">${esc(m.text)}<small>${fmtDT(m.at)}</small></div>`).join('') : `<div class="muted" style="margin:auto;text-align:center">Say hello 👋<br><small>Tip: describe your goal and ask about availability.</small></div>`}</div>
          <form class="composer" data-form="send" novalidate>
            ${!t.paidSession ? `<div class="notice notice-warn" style="margin-bottom:8px;font-size:12.5px">🛡 For your safety, contact details (email, phone, links) are hidden until your first completed session. Keep payments on MentorHub to stay protected.</div>` : ''}
            <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1"><textarea class="input" name="text" rows="2" placeholder="Write a message…" data-counter="2000" aria-label="Message"></textarea><div class="err" data-err="text"></div></div>
            <button class="btn btn-primary">Send</button></div></form>`;
                const ms = $('#msgs');
                ms.scrollTop = ms.scrollHeight;
            };
            api.get(`/api/threads/${active}/messages`).then(t => {
                if (token !== S.renderToken)
                    return;
                drawConvo(t);
                if (t.unread)
                    api.post(`/api/threads/${t.id}/read`).catch(() => undefined);
                on('submit:send', async (el) => {
                    const f = el;
                    const v = validate(f, { text: [V.req('Write a message first.'), V.max(2000)] });
                    if (!v)
                        return;
                    const btn = $('button.btn-primary', f);
                    busy(btn, true);
                    try {
                        const t2 = await api.post(`/api/threads/${t.id}/messages`, { text: v.text.trim() });
                        drawConvo(t2);
                    }
                    catch (e) {
                        busy(btn, false);
                        apiErrToForm(f, e);
                    }
                });
            }).catch((e) => { if (token === S.renderToken)
                convo.innerHTML = `<div style="padding:16px">${errorState(e.message, act(() => go(`/messages/${active}`)))}</div>`; });
        },
    });
}
defineScreen({ id: 'C1', path: '/messages', title: 'Messages', group: 'Shared', roles: ['mentee', 'mentor'], render: root => renderMessages(root, undefined) });
defineScreen({ id: 'C1', path: '/messages/:id', title: 'Messages · conversation', group: 'Shared', roles: ['mentee', 'mentor'], render: (root, p) => renderMessages(root, p.id) });
/* ---------------- C2 Notifications ---------------- */
defineScreen({
    id: 'C2', path: '/notifications', title: 'Notifications', group: 'Shared', roles: ['mentee', 'mentor', 'admin'],
    render(root, _p, q) {
        const kind = q.get('kind') || 'all';
        root.innerHTML = `<div class="container" style="max-width:820px">${pageHead('Notifications', '', `<button class="btn btn-sm" data-act="read-all">Mark all as read</button><a class="btn btn-sm btn-ghost" href="#/settings?tab=notifications">Preferences</a>`)}
      ${tabs([['All', '/notifications?kind=all'], ['Sessions', '/notifications?kind=session'], ['Messages', '/notifications?kind=message'], ['Payments', '/notifications?kind=payment'], ['System', '/notifications?kind=system']], `/notifications?kind=${kind}`)}<div id="nl"></div></div>`;
        const icon = { session: '📅', message: '💬', payment: '💳', system: '🔔' };
        const reload = () => load($('#nl', root), () => api.get(`/api/notifications?kind=${kind}`), {
            isEmpty: d => !d.items.length,
            empty: () => emptyState('You are all caught up', 'New notifications about sessions, messages and payments will show up here.'),
            ok: d => {
                unreadCount = d.unread;
                renderShellBell();
                const today = d.items.filter(n => isoDay(new Date(n.at)) === isoDay(new Date()));
                const earlier = d.items.filter(n => !today.includes(n));
                const row = (n) => `<li class="row" style="flex-wrap:nowrap;cursor:pointer" data-go="${n.href}"><span style="font-size:20px">${icon[n.kind]}</span><div style="flex:1">${n.read ? '' : '<span class="badge-dot"></span> '}${n.read ? esc(n.text) : `<b>${esc(n.text)}</b>`}<br><small>${relTime(n.at)}</small></div><span class="muted">›</span></li>`;
                return `<div class="card">${today.length ? `<h4>Today</h4><ul class="list">${today.map(row).join('')}</ul>` : ''}${earlier.length ? `<h4 style="margin-top:12px">Earlier</h4><ul class="list">${earlier.map(row).join('')}</ul>` : ''}</div>`;
            },
        });
        on('read-all', async (el) => { busy(el, true); try {
            await api.post('/api/notifications/read-all');
            toast('All notifications marked as read');
            reload();
        }
        catch (e) {
            toast(e.message, 'err');
        } busy(el, false); });
        reload();
    },
});
function renderShellBell() {
    const b = $('.bell');
    if (b)
        b.innerHTML = `🔔${unreadCount ? `<b>${unreadCount}</b>` : ''}`;
}
/* ---------------- C3 Account settings ---------------- */
defineScreen({
    id: 'C3', path: '/settings', title: 'Account settings', group: 'Shared', roles: ['mentee', 'mentor', 'admin'],
    render(root, _p, q) {
        const tab = q.get('tab') || 'profile';
        root.innerHTML = `<div class="container" style="max-width:820px">${pageHead('Account settings')}
      ${tabs([['Profile', '/settings?tab=profile'], ['Security', '/settings?tab=security'], ['Notifications', '/settings?tab=notifications'], ['Privacy', '/settings?tab=privacy']], `/settings?tab=${tab}`)}<div id="st"></div></div>`;
        const box = $('#st', root);
        if (tab === 'profile') {
            load(box, () => api.get('/api/me'), {
                ok: me => `<form class="card" data-form="profile" novalidate>${formAlert()}
          <div class="row" style="margin-bottom:16px">${avatar(me.name, '#5b5fe0', 'lg')}<div><button type="button" class="btn btn-sm" data-act="photo">Change photo</button><br><small>JPG or PNG, max 5 MB</small></div></div>
          ${field({ name: 'name', label: 'Full name', value: me.name })}
          ${field({ name: 'email', label: 'Email', type: 'email', value: me.email, hint: 'Changing your email requires confirmation via a link.' })}
          <div class="inline-fields">${field({ name: 'timezone', label: 'Time zone', type: 'select', value: me.timezone, options: [[me.timezone, me.timezone], ['Europe/London', 'Europe/London'], ['America/New_York', 'America/New_York']] })}
          ${field({ name: 'language', label: 'Interface language', type: 'select', value: me.language, options: [['English', 'English'], ['Polski', 'Polski']] })}</div>
          ${S.role === 'mentee' ? field({ name: 'goals', label: 'My goals', type: 'textarea', value: me.goals, rows: 3, counter: 300, optional: true, hint: 'Used to recommend mentors.' }) : ''}
          <button class="btn btn-primary">Save changes</button></form>`,
            });
            on('photo', () => toast('Photo uploaded (simulated) — POST /api/uploads', 'info'));
            on('submit:profile', async (el) => {
                const f = el;
                const v = validate(f, { name: [V.req('Enter your name.'), V.min(2), V.max(80)], email: [V.req('Enter your email.'), V.email()], goals: [V.max(300)] });
                if (!v)
                    return;
                const btn = $('button.btn-primary', f);
                busy(btn, true);
                try {
                    await api.patch('/api/me', v);
                    toast('Profile saved');
                }
                catch (e) {
                    apiErrToForm(f, e);
                }
                busy(btn, false);
            });
        }
        else if (tab === 'security') {
            box.innerHTML = `<form class="card" data-form="pwd" novalidate>${formAlert()}<h3>Change password</h3>
        ${field({ name: 'current', label: 'Current password', type: 'password', hint: 'Prototype: “wrong” shows the server error.' })}
        ${field({ name: 'next', label: 'New password', type: 'password', hint: 'At least 8 characters, including a letter and a digit.' })}
        ${field({ name: 'confirm', label: 'Repeat new password', type: 'password' })}
        <button class="btn btn-primary">Update password</button></form>
        <div class="card" style="margin-top:16px"><h3>Two-step verification</h3><p class="muted">Add a code from an authenticator app when you log in on a new device.</p><button class="btn" data-act="2fa">Set up</button></div>`;
            on('2fa', () => toast('2FA setup flow is out of MVP scope', 'info'));
            on('submit:pwd', async (el) => {
                const f = el;
                const v = validate(f, {
                    current: [V.req('Enter your current password.')],
                    next: [V.req('Enter a new password.'), V.min(8, 'Use at least 8 characters.'), V.re(/(?=.*[A-Za-z])(?=.*\d)/, 'Include at least one letter and one digit.'), (val, form) => (val === formValues(form).current ? 'The new password must be different from the current one.' : null)],
                    confirm: [V.req('Repeat the new password.'), V.same('next', 'Passwords do not match.')],
                });
                if (!v)
                    return;
                const btn = $('button.btn-primary', f);
                busy(btn, true);
                try {
                    await api.put('/api/me/password', v);
                    f.reset();
                    toast('Password updated. Other devices were signed out.');
                }
                catch (e) {
                    apiErrToForm(f, e);
                }
                busy(btn, false);
            });
        }
        else if (tab === 'notifications') {
            const rows = [['session', 'Session bookings, reminders and changes'], ['message', 'New messages'], ['payment', 'Payments, renewals and payouts']];
            load(box, () => api.get('/api/me/notification-preferences'), {
                ok: p => `<form class="card" data-form="prefs"><div class="table-wrap"><table class="tbl"><thead><tr><th>Notification</th><th>Email</th><th>Push</th></tr></thead><tbody>
          ${rows.map(([k, l]) => `<tr><td>${l}</td><td><label class="switch"><input type="checkbox" name="${k}_email" ${p[k + '_email'] ? 'checked' : ''}><i></i></label></td><td><label class="switch"><input type="checkbox" name="${k}_push" ${p[k + '_push'] ? 'checked' : ''}><i></i></label></td></tr>`).join('')}
          <tr><td>Tips and mentor recommendations</td><td><label class="switch"><input type="checkbox" name="marketing_email" ${p.marketing_email ? 'checked' : ''}><i></i></label></td><td>—</td></tr></tbody></table></div>
          <p class="muted" style="font-size:13px">Session reminders 24 h and 1 h before the start are always sent by email.</p><button class="btn btn-primary">Save preferences</button></form>`,
            });
            on('submit:prefs', async (el) => {
                const f = el;
                const body = {};
                $$('input[type="checkbox"]', f).forEach(i => (body[i.name] = i.checked));
                const btn = $('button.btn-primary', f);
                busy(btn, true);
                try {
                    await api.put('/api/me/notification-preferences', body);
                    toast('Preferences saved');
                }
                catch (e) {
                    toast(e.message, 'err');
                }
                busy(btn, false);
            });
        }
        else {
            box.innerHTML = `<div class="card"><h3>Download your data</h3><p class="muted">Get a copy of your profile, sessions, messages and invoices (GDPR art. 15/20). We email a link within 24 h.</p><button class="btn" data-act="export">Request data export</button></div>
        <form class="card" style="margin-top:16px;border-color:#f3c1c6" data-form="del" novalidate>${formAlert()}<h3>Delete account</h3>
          <p class="muted">Your profile and messages are deleted. Invoices are kept for 5 years as required by tax law. Active plans are cancelled; unused credits are lost.</p>
          ${field({ name: 'confirm', label: 'Type DELETE to confirm' })}
          <button class="btn btn-danger">Delete my account</button></form>`;
            on('export', async (el) => { busy(el, true); try {
                await api.post('/api/me/data-export');
                toast('Export requested — link will arrive by email within 24 h');
            }
            catch (e) {
                toast(e.message, 'err');
            } busy(el, false); });
            on('submit:del', async (el) => {
                const f = el;
                const v = validate(f, { confirm: [V.req('Type DELETE to confirm.'), val => (val.trim() === 'DELETE' ? null : 'Type DELETE in capital letters.')] });
                if (!v)
                    return;
                const btn = $('button.btn-danger', f);
                busy(btn, true);
                try {
                    await api.del('/api/me');
                    setRole('guest');
                    toast('Your account has been deleted');
                    go('/');
                }
                catch (e) {
                    busy(btn, false);
                    apiErrToForm(f, e);
                }
            });
        }
    },
});
/* Mentor screens: T1 Become a mentor (application wizard), T2 Dashboard, T3 Calendar & availability, T4 Mentees, T5 Earnings & payouts, T6 Profile editor. */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GRID_DAYS = [1, 2, 3, 4, 5, 6, 0];
const GRID_HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07–21
function availGrid(weekly, actName = 'cell') {
    return `<div class="avail-grid" role="grid" aria-label="Weekly availability"><span></span>${GRID_DAYS.map(d => `<span class="dh">${DAY_NAMES[d]}</span>`).join('')}
    ${GRID_HOURS.map(h => `<span class="h">${String(h).padStart(2, '0')}:00</span>${GRID_DAYS.map(d => `<button type="button" class="cell ${(weekly[d] ?? []).includes(h) ? 'on' : ''}" data-act="${actName}" data-d="${d}" data-h="${h}" aria-pressed="${(weekly[d] ?? []).includes(h)}" aria-label="${DAY_NAMES[d]} ${h}:00"></button>`).join('')}`).join('')}</div>`;
}
function toggleCell(weekly, el) {
    const d = Number(el.dataset.d);
    const h = Number(el.dataset.h);
    const set = new Set(weekly[d] ?? []);
    set.has(h) ? set.delete(h) : set.add(h);
    weekly[d] = Array.from(set).sort((a, b) => a - b);
    el.classList.toggle('on');
    el.setAttribute('aria-pressed', String(set.has(h)));
}
const weeklyHours = (w) => Object.values(w).reduce((a, h) => a + h.length, 0);
function feeFor(hoursTaught) { let f = RULES.platformFeeTiers[0][1]; for (const [h, p] of RULES.platformFeeTiers)
    if (hoursTaught >= h)
        f = p; return f; }
function ibanValid(raw) {
    const s = raw.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s))
        return false;
    const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
    let mod = 0;
    for (const ch of r)
        mod = (mod * 10 + Number(ch)) % 97;
    return mod === 1;
}
function topicChips(selected, name = 'topics') {
    return `<div class="chips">${DB.topics.map(t => `<label class="chip toggle-chip"><input type="checkbox" name="${name}" value="${t.id}" ${selected.includes(t.id) ? 'checked' : ''}>${t.icon} ${esc(t.name)}</label>`).join('')}</div><div class="err" data-err="${name}"></div>`;
}
/* ---------------- T1 Become a mentor ---------------- */
defineScreen({
    id: 'T1', path: '/apply', title: 'Become a mentor', group: 'Mentor', roles: null,
    render(root) {
        if (S.role === 'guest') {
            root.innerHTML = `<div class="container" style="max-width:760px">${pageHead('Become a mentor', 'Share your experience, set your own price and schedule.')}
        <div class="grid g3" style="margin-bottom:16px"><div class="card"><h4>💸 Earn on your terms</h4><small>You set the hourly rate. Platform fee drops from 25% to 15% as you teach more.</small></div><div class="card"><h4>📅 Your schedule</h4><small>Open only the hours you want. Mentees book within them.</small></div><div class="card"><h4>🛡 Paid on time</h4><small>Weekly payouts to your bank account. We handle payments and invoices.</small></div></div>
        ${stateBox('📝', 'Create an account to apply', 'The application takes about 15 minutes. You can save a draft and come back.', `<a class="btn btn-primary" href="#/auth?mode=signup&intent=mentor&next=/apply">Create account</a><a class="btn" href="#/auth?mode=login&next=/apply">I already have an account</a>`)}</div>`;
            return;
        }
        if (S.role === 'mentor') {
            root.innerHTML = `<div class="container">${successState('You are already a mentor', 'Your application was approved. Manage your public profile in the mentor area.', `<a class="btn btn-primary" href="#/mentor/profile">Edit profile</a>`)}</div>`;
            return;
        }
        if (S.role === 'admin') {
            root.innerHTML = `<div class="container">${stateBox('🚧', 'Not available for admin accounts', 'Admins review applications in the admin panel.', `<a class="btn btn-primary" href="#/admin/applications">Open applications</a>`)}</div>`;
            return;
        }
        const STEPS = ['About you', 'Expertise', 'Profile', 'Availability', 'Pricing', 'Review & submit'];
        let step = 0;
        let app;
        let weekly = { 1: [18, 19], 3: [18] };
        let photo = '';
        root.innerHTML = `<div class="container" style="max-width:900px">${pageHead('Become a mentor', 'Application · about 15 minutes · we save a draft after every step.')}<div id="wiz"></div></div>`;
        const wiz = $('#wiz', root);
        const draw = () => {
            const a = app;
            let body = '';
            if (a.status === 'submitted') {
                wiz.innerHTML = `${stepper(STEPS, 6)}${successState('Application submitted', `Thanks, ${esc(a.name.split(' ')[0])}! Our team reviews applications within <b>5 business days</b>. We will email you at ${esc(a.email)} — you may be asked for changes before approval.`, `<a class="btn" href="#/home">Back to home</a><button class="btn btn-primary" data-act="proto-approve">Prototype: see it in the admin queue</button>`)}
          <div class="card" style="margin-top:16px"><h3>What happens next</h3><ol><li>Identity and LinkedIn check</li><li>Profile and video review against our quality guidelines</li><li>Decision: approved / changes requested / rejected (with reason)</li><li>After approval: your profile goes live and you can receive bookings</li></ol></div>`;
                on('proto-approve', () => { setRole('admin'); go('/admin/applications'); });
                return;
            }
            if (step === 0)
                body = `
        ${field({ name: 'name', label: 'Full name (as on your ID)', value: a.name })}
        ${field({ name: 'country', label: 'Country of residence', type: 'select', value: a.country, options: [['', 'Select country'], ['Poland', 'Poland'], ['Germany', 'Germany'], ['United Kingdom', 'United Kingdom'], ['Spain', 'Spain'], ['Other', 'Other']] })}
        <div class="field"><span>Languages you mentor in</span><div class="chips">${['English', 'Polish', 'German', 'Spanish', 'French'].map(l => `<label class="chip toggle-chip"><input type="checkbox" name="languages" value="${l}" ${a.languages?.includes(l) ? 'checked' : ''}>${l}</label>`).join('')}</div><div class="err" data-err="languages"></div></div>
        ${field({ name: 'headline', label: 'Headline', value: a.headline, counter: 80, placeholder: 'e.g. Engineering Manager · first-time managers · hiring', hint: 'Shown under your name in search results.' })}`;
            if (step === 1)
                body = `
        <div class="field"><span>Topics you mentor (1–3)</span>${topicChips(a.topics)}</div>
        <div class="inline-fields">${field({ name: 'years', label: 'Years of professional experience', type: 'number', value: a.years ? String(a.years) : '', attrs: 'min="0" max="50"' })}
        ${field({ name: 'currentRole', label: 'Current role', value: a.currentRole ?? '' })}</div>
        ${field({ name: 'company', label: 'Company', optional: true, value: a.company ?? '', hint: 'You can show it as e.g. “Fintech scale-up” instead of the name.' })}
        ${field({ name: 'linkedin', label: 'LinkedIn profile URL', value: a.linkedin, placeholder: 'https://www.linkedin.com/in/your-name', hint: 'Used to verify your experience. Not shown publicly.' })}`;
            if (step === 2)
                body = `
        <div class="field"><span>Profile photo</span><div class="row">${photo ? avatar(a.name, '#5b5fe0', 'lg') : `<div class="avatar av-lg" style="background:var(--surface-2);color:var(--ink-3)">?</div>`}
          <div><button type="button" class="btn btn-sm" data-act="upload">${photo ? 'Replace photo' : 'Upload photo'}</button><br><small>Face clearly visible, no logos. JPG/PNG, max 5 MB.</small></div></div>
          <input type="hidden" name="photo" value="${esc(photo)}"><div class="err" data-err="photo"></div></div>
        ${field({ name: 'bio', label: 'About you', type: 'textarea', rows: 7, counter: 1500, value: a.bio, hint: 'Who you help, how sessions look and what results mentees get. 150–1500 characters.' })}
        ${field({ name: 'video', label: 'Intro video link', optional: true, value: a.video, placeholder: 'YouTube, Vimeo or Loom URL', hint: 'Profiles with a video get ~2× more intro bookings. Max 2 minutes.' })}`;
            if (step === 3)
                body = `
        <p class="muted">Click the hours you are usually available each week (your time zone). You can change this anytime.</p>
        ${field({ name: 'timezone', label: 'Time zone', type: 'select', value: tzName(), options: [[tzName(), tzName()], ['Europe/London', 'Europe/London']] })}
        ${availGrid(weekly)}<p id="hrs" class="muted" style="margin-top:8px"></p><div class="err" data-err="hours"></div>`;
            if (step === 4)
                body = `
        ${field({ name: 'rate', label: 'Price for 60 minutes (USD)', type: 'number', value: String(a.rate || 50), attrs: 'min="20" max="500" step="5"', hint: 'Mentors with your experience usually charge $50–$120. You can change it later.' })}
        <label class="check" style="margin-bottom:14px"><input type="checkbox" name="intro" value="on" checked> Offer 30-min intro sessions at half the 30-minute price (recommended — most mentees start with an intro)</label>
        <div class="card card-tight" id="earn"></div>`;
            if (step === 5)
                body = `
        <div class="card card-tight stack"><div class="row-between"><b>${esc(a.name)}</b><button type="button" class="btn btn-sm btn-ghost" data-act="goto" data-s="0">Edit</button></div><small>${esc(a.headline)} · ${esc(a.country)}</small>
          <div class="row-between"><span>Topics: ${a.topics.map(t => DB.topics.find(x => x.id === t)?.name).join(', ')} · ${a.years} yrs</span><button type="button" class="btn btn-sm btn-ghost" data-act="goto" data-s="1">Edit</button></div>
          <div class="row-between"><span>Bio: ${a.bio.length} characters · video ${a.video ? '✓' : '—'}</span><button type="button" class="btn btn-sm btn-ghost" data-act="goto" data-s="2">Edit</button></div>
          <div class="row-between"><span>Availability: ${weeklyHours(weekly)} h / week</span><button type="button" class="btn btn-sm btn-ghost" data-act="goto" data-s="3">Edit</button></div>
          <div class="row-between"><span>Price: ${money(a.rate)} / 60 min</span><button type="button" class="btn btn-sm btn-ghost" data-act="goto" data-s="4">Edit</button></div></div>
        <label class="check" style="margin-top:14px"><input type="checkbox" name="conduct" value="1"> I have read and accept the Mentor Code of Conduct and Terms (incl. payments only via MentorHub).</label><div class="err" data-err="conduct"></div>
        <label class="check" style="margin-top:8px"><input type="checkbox" name="accurate" value="1"> The information I provided is true and I agree to identity verification.</label><div class="err" data-err="accurate"></div>`;
            wiz.innerHTML = `${stepper(STEPS, step)}<form class="card" data-form="step" novalidate>${formAlert()}<h2>${STEPS[step]}</h2>${body}
        <hr class="divider"><div class="row-between"><button type="button" class="btn" data-act="back" ${step === 0 ? 'disabled' : ''}>← Back</button>
        <div class="row"><button type="button" class="btn btn-ghost" data-act="save-exit">Save & exit</button><button class="btn btn-primary">${step === 5 ? 'Submit application' : 'Save & continue →'}</button></div></div></form>`;
            if (step === 3) {
                const upd = () => ($('#hrs').textContent = `${weeklyHours(weekly)} hours per week selected (minimum 5).`);
                upd();
                on('cell', el => { toggleCell(weekly, el); upd(); });
            }
            if (step === 4) {
                const upd = () => { const r = Number($('input[name="rate"]').value) || 0; const fee = feeFor(0); $('#earn').innerHTML = `<b>You earn ${money(Math.round(r * (100 - fee)) / 100)}</b> per 60-min session at the starting fee of ${fee}%. <small>Fee drops to 20% after 50 h and 15% after 200 h taught. Intro sessions: the platform keeps the intro fee to cover acquisition.</small>`; };
                $('input[name="rate"]')?.addEventListener('input', upd);
                upd();
            }
            $$('.toggle-chip input', wiz).forEach(i => i.addEventListener('change', () => { /* :has() handles style; keep for older browsers */ i.parentElement.classList.toggle('on', i.checked); }));
            $$('.toggle-chip input:checked', wiz).forEach(i => i.parentElement.classList.add('on'));
        };
        const stepRules = () => [
            { name: [V.req('Enter your full name.'), V.min(3)], country: [V.req('Select your country.')], languages: [V.count(1, 5, 'language')], headline: [V.req('Write a headline.'), V.min(10), V.max(80)] },
            { topics: [V.count(1, 3, 'topic')], years: [V.req('Enter your years of experience.'), V.num(2, 50, 'Mentors need at least 2 years of professional experience.')], currentRole: [V.req('Enter your current role.'), V.max(80)], company: [V.max(80)], linkedin: [V.req('Add your LinkedIn URL.'), V.re(/^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]{3,}\/?$/i, 'Use a profile link like https://www.linkedin.com/in/your-name.')] },
            { photo: [V.req('Upload a profile photo.')], bio: [V.req('Write a short bio.'), V.min(150, 'Write at least 150 characters so mentees understand how you can help.'), V.max(1500)], video: [V.re(/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|loom\.com)\/\S+$/i, 'Use a YouTube, Vimeo or Loom link.')] },
            { hours: [() => (weeklyHours(weekly) >= 5 ? null : `Select at least 5 hours per week (now ${weeklyHours(weekly)}).`)] },
            { rate: [V.req('Set your price.'), V.num(20, 500, 'Price must be between $20 and $500.')] },
            { conduct: [V.checked('You need to accept the Code of Conduct.')], accurate: [V.checked('Please confirm your information is accurate.')] },
        ][step];
        on('back', () => { step = Math.max(0, step - 1); draw(); });
        on('goto', el => { step = Number(el.dataset.s); draw(); });
        on('upload', async (el) => {
            busy(el, true);
            try {
                const u = await api.post('/api/uploads', { kind: 'photo' });
                photo = u.url;
                toast('Photo uploaded');
                draw();
            }
            catch (e) {
                busy(el, false);
                toast(e.message, 'err');
            }
        });
        on('save-exit', async (el) => {
            busy(el, true);
            try {
                await api.patch(`/api/mentor-applications/${app.id}`, formValues($('form[data-form="step"]')));
                toast('Draft saved. Continue anytime from “Become a mentor”.');
                go('/home');
            }
            catch (e) {
                busy(el, false);
                toast(e.message, 'err');
            }
        });
        on('submit:step', async (el) => {
            const f = el;
            const v = validate(f, stepRules());
            if (!v)
                return;
            const btn = $('button.btn-primary', f);
            busy(btn, true);
            try {
                const patch = { ...v };
                if (step === 0)
                    patch.languages = (v.languages || '').split(',');
                if (step === 1) {
                    patch.topics = (v.topics || '').split(',');
                    patch.years = Number(v.years);
                }
                if (step === 3) {
                    patch.weekly = weekly;
                    patch.hoursPerWeek = weeklyHours(weekly);
                }
                if (step === 4)
                    patch.rate = Number(v.rate);
                if (step < 5) {
                    app = await api.patch(`/api/mentor-applications/${app.id}`, patch);
                    step++;
                }
                else {
                    app = await api.post(`/api/mentor-applications/${app.id}/submit`);
                    toast('Application submitted');
                }
                draw();
                window.scrollTo(0, 0);
            }
            catch (e) {
                busy(btn, false);
                apiErrToForm(f, e);
            }
        });
        load(wiz, () => (DB.myApplication ? api.get('/api/mentor-applications/me') : api.post('/api/mentor-applications', { name: DB.profile.name })), {
            ok: a => { app = a; return ''; },
            after: () => draw(),
        });
    },
});
/* ---------------- T2 Mentor dashboard ---------------- */
defineScreen({
    id: 'T2', path: '/mentor', title: 'Mentor dashboard', group: 'Mentor', roles: ['mentor'],
    render(root) {
        root.innerHTML = `<div class="container">${pageHead('Good afternoon, Anna', 'Here is your mentoring week.', `<a class="btn" href="#/mentors/m1">View public profile</a><a class="btn btn-primary" href="#/mentor/calendar?tab=availability">Edit availability</a>`)}<div id="dash"></div></div>`;
        load($('#dash', root), () => api.get('/api/mentor/dashboard'), {
            skeleton: `${skelCards(4, 'grid g4')}<div style="height:16px"></div>${skelCards(2, 'grid g2')}`,
            ok: d => `<div class="grid g4">
          <div class="card"><div class="kpi-label">Sessions this week</div><div class="kpi">${d.kpis.sessionsThisWeek}</div><div class="kpi-delta">${d.next7} upcoming in 7 days</div></div>
          <div class="card"><div class="kpi-label">Earnings this month</div><div class="kpi">${money(d.kpis.earningsMonth)}</div><div class="kpi-delta">▲ 12% vs last month</div></div>
          <div class="card"><div class="kpi-label">Rating</div><div class="kpi">${d.kpis.rating} <span class="stars" style="font-size:16px">★</span></div><div class="kpi-label">132 reviews</div></div>
          <div class="card"><div class="kpi-label">Intro → plan conversion</div><div class="kpi">${d.kpis.conversion}%</div><div class="kpi-label">${d.kpis.profileViews} profile views (30 d)</div></div></div>
        <div class="split" style="margin-top:16px"><div class="stack-lg">
          <section class="card"><h2>Today</h2>${d.today.length ? `<ul class="list">${d.today.map((s) => `<li class="row-between"><div class="row">${avatar(s.menteeName, '#1f8a70', 'sm')}<div><b>${esc(s.menteeName)}</b> ${s.type === 'intro' ? chip('Intro', 'accent') : ''}<br><small>${fmtTime(s.start)} · ${s.minutes} min${s.goal ? ' · 🎯 ' + esc(s.goal) : ''}</small></div></div>
            <div class="row">${chip(relTime(s.start), 'brand')}<a class="btn btn-sm btn-primary" href="#/room/${s.id}">Join</a></div></li>`).join('')}</ul>` : emptyState('No sessions today', 'Enjoy the free time — or open more hours in your calendar.', `<a class="btn" href="#/mentor/calendar?tab=availability">Open hours</a>`)}</section>
          <section class="card"><h2>Needs your attention</h2>${d.tasks.length ? `<ul class="list">${d.tasks.map((t) => `<li class="row-between"><span>${t.kind === 'message' ? '💬' : t.kind === 'payout' ? '💸' : '📝'} ${esc(t.text)}</span><a class="btn btn-sm" href="#${t.href}">Open</a></li>`).join('')}</ul>` : `<p class="muted">All done 🎉</p>`}</section>
        </div>
        <aside class="stack-lg"><section class="card"><h3>Profile strength</h3><div class="progress"><i style="width:${d.profileCompleteness}%"></i></div><p style="margin-top:8px"><b>${d.profileCompleteness}%</b> complete</p><ul style="padding-left:18px;margin:0">${d.missing.map((x) => `<li><small>${esc(x)}</small></li>`).join('')}</ul><a class="btn btn-block" style="margin-top:12px" href="#/mentor/profile">Improve profile</a></section>
          <section class="card"><h3>Tip of the week</h3><p class="muted" style="font-size:14px">Mentors who send a short agenda before an intro convert 18% more intros into plans.</p></section></aside></div>`,
        });
    },
});
/* ---------------- T3 Calendar & availability ---------------- */
defineScreen({
    id: 'T3', path: '/mentor/calendar', title: 'Calendar & availability', group: 'Mentor', roles: ['mentor'],
    render(root, _p, q) {
        const tab = q.get('tab') || 'week';
        root.innerHTML = `<div class="container">${pageHead('Calendar & availability')}
      ${tabs([['Week', '/mentor/calendar?tab=week'], ['Weekly availability', '/mentor/calendar?tab=availability'], ['Time off & rules', '/mentor/calendar?tab=timeoff']], `/mentor/calendar?tab=${tab}`)}<div id="cal"></div></div>`;
        const box = $('#cal', root);
        if (tab === 'week') {
            let offset = 0;
            const monday = () => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow + offset * 7); d.setHours(0, 0, 0, 0); return d; };
            const reload = () => {
                const mon = monday();
                load(box, () => Promise.all([api.get(`/api/mentor/sessions?from=${isoDay(mon)}`), api.get('/api/mentor/availability')]), {
                    skeleton: skelCards(1, 'stack'),
                    ok: ([ss, av]) => {
                        const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return d; });
                        const evAt = (d, h) => ss.items.find(s => { const t = new Date(s.start); return isoDay(t) === isoDay(d) && t.getHours() === h; });
                        const off = (d) => av.timeOff.some(t => isoDay(d) >= t.from && isoDay(d) <= t.to);
                        return `<div class="row-between" style="margin-bottom:12px"><div class="row"><button class="btn btn-sm" data-act="pw">←</button><button class="btn btn-sm" data-act="tw">Today</button><button class="btn btn-sm" data-act="nw">→</button>
                <b>${fmtLongDate(days[0].toISOString())} – ${fmtLongDate(days[6].toISOString())}</b></div>
                <div class="row"><span class="chip">▨ open hours</span><span class="chip chip-brand">■ session</span><span class="chip chip-accent">■ intro</span></div></div>
              ${ss.items.length ? '' : `<div class="notice" style="margin-bottom:12px">No sessions booked this week yet. Open hours are shown as hatched cells.</div>`}
              <div class="cal"><div class="ch"></div>${days.map(d => `<div class="ch ${isoDay(d) === isoDay(new Date()) ? 'today' : ''}">${DAY_NAMES[d.getDay()]} ${d.getDate()}</div>`).join('')}
              ${GRID_HOURS.map(h => `<div class="rh">${String(h).padStart(2, '0')}:00</div>${days.map(d => {
                            const ev = evAt(d, h);
                            const free = (av.weekly[d.getDay()] ?? []).includes(h) && !off(d);
                            return `<div class="cc ${free && !ev ? 'free' : ''}">${ev ? `<div class="ev ${ev.type === 'intro' ? 'intro' : ''}" data-act="ev" data-id="${ev.id}">${fmtTime(ev.start)} ${esc(ev.menteeName)}</div>` : off(d) && h === GRID_HOURS[0] ? `<div class="ev off">Time off</div>` : ''}</div>`;
                        }).join('')}`).join('')}</div>`;
                    },
                });
            };
            on('pw', () => { offset--; reload(); });
            on('nw', () => { offset++; reload(); });
            on('tw', () => { offset = 0; reload(); });
            on('ev', el => {
                const s = DB.sessions.find(x => x.id === el.dataset.id);
                openModal(`${s.type === 'intro' ? 'Intro' : 'Session'} with ${s.menteeName}`, `<p><b>${fmtDT(s.start)}</b> · ${s.minutes} min · ${money(s.price)}</p>${s.goal ? `<div class="notice">🎯 ${esc(s.goal)}</div>` : ''}
          <form data-form="mcancel" novalidate style="margin-top:12px" hidden id="mc">${formAlert()}<div class="notice notice-warn" style="margin-bottom:10px">The mentee gets a full refund. Cancelling less than 24 h before lowers your reliability score.</div>
            ${field({ name: 'reason', label: 'Reason (sent to the mentee)', type: 'textarea', rows: 2, counter: 300 })}</form>`, `<button class="btn btn-danger" data-act="mc-show">Cancel session</button><a class="btn" href="#/messages">Message</a><a class="btn btn-primary" href="#/room/${s.id}">Join room</a>`);
                on('mc-show', async (b) => {
                    const f = $('#mc');
                    if (f.hidden) {
                        f.hidden = false;
                        b.textContent = 'Confirm cancellation';
                        return;
                    }
                    const v = validate(f, { reason: [V.req('Tell the mentee why you cancel.'), V.min(10), V.max(300)] });
                    if (!v)
                        return;
                    busy(b, true);
                    try {
                        await api.post(`/api/mentor/sessions/${s.id}/cancel`, v);
                        closeModal();
                        toast('Session cancelled — mentee refunded and notified');
                        reload();
                    }
                    catch (e) {
                        busy(b, false);
                        apiErrToForm(f, e);
                    }
                });
            });
            reload();
        }
        else if (tab === 'availability') {
            load(box, () => api.get('/api/mentor/availability'), {
                ok: av => `<form class="card" data-form="avail" novalidate>${formAlert()}<div class="row-between"><p class="muted" style="margin:0">Recurring weekly hours in <b>${esc(av.timezone)}</b>. Booked sessions are kept even if you close an hour.</p><span id="hrs" class="chip chip-brand"></span></div>
          <div style="margin:14px 0">${availGrid(av.weekly)}</div><button class="btn btn-primary">Save availability</button> <button type="button" class="btn btn-ghost" data-act="clear">Clear all</button></form>`,
                after: av => {
                    const weekly = clone(av.weekly);
                    const upd = () => ($('#hrs').textContent = `${weeklyHours(weekly)} h / week`);
                    upd();
                    on('cell', el => { toggleCell(weekly, el); upd(); });
                    on('clear', () => { Object.keys(weekly).forEach(k => (weekly[Number(k)] = [])); $$('.cell.on').forEach(c => c.classList.remove('on')); upd(); });
                    on('submit:avail', async (el) => {
                        const f = el;
                        const btn = $('button.btn-primary', f);
                        busy(btn, true);
                        clearErrors(f);
                        try {
                            await api.put('/api/mentor/availability', { weekly });
                            toast('Availability saved — mentees see the new hours now');
                        }
                        catch (e) {
                            apiErrToForm(f, e);
                        }
                        busy(btn, false);
                    });
                },
            });
        }
        else {
            load(box, () => api.get('/api/mentor/availability'), {
                ok: av => `<div class="grid g2">
          <section class="card"><h3>Time off</h3>${av.timeOff.length ? `<ul class="list">${av.timeOff.map(t => `<li class="row-between"><span>🏖 ${fmtLongDate(t.from + 'T12:00:00')} – ${fmtLongDate(t.to + 'T12:00:00')} <small>${esc(t.reason)}</small></span><button class="btn btn-sm btn-ghost" data-act="rm-off" data-id="${t.id}">Remove</button></li>`).join('')}</ul>` : `<p class="muted">No time off planned.</p>`}
            <hr class="divider"><form data-form="off" novalidate>${formAlert()}<div class="inline-fields">${field({ name: 'from', label: 'From', type: 'date', attrs: `min="${isoDay(new Date())}"` })}${field({ name: 'to', label: 'To', type: 'date', attrs: `min="${isoDay(new Date())}"` })}</div>
            ${field({ name: 'reason', label: 'Note', optional: true, placeholder: 'e.g. Holiday' })}<button class="btn btn-primary">Add time off</button></form></section>
          <form class="card" data-form="rules" novalidate>${formAlert()}<h3>Booking rules</h3>
            ${field({ name: 'minNoticeHours', label: 'Minimum notice (hours)', type: 'number', value: String(av.minNoticeHours), attrs: 'min="1" max="48"', hint: 'Mentees cannot book later than this before a session.' })}
            ${field({ name: 'horizonWeeks', label: 'Booking horizon (weeks ahead)', type: 'number', value: String(av.horizonWeeks), attrs: 'min="1" max="12"' })}
            ${field({ name: 'bufferMinutes', label: 'Break between sessions', type: 'select', value: String(av.bufferMinutes), options: [['0', 'No break'], ['10', '10 min'], ['15', '15 min'], ['30', '30 min']] })}
            <button class="btn btn-primary">Save rules</button></form></div>`,
            });
            on('rm-off', async (el) => { busy(el, true); try {
                await api.del(`/api/mentor/time-off/${el.dataset.id}`);
                toast('Time off removed');
                go('/mentor/calendar?tab=timeoff');
            }
            catch (e) {
                busy(el, false);
                toast(e.message, 'err');
            } });
            on('submit:off', async (el) => {
                const f = el;
                const v = validate(f, { from: [V.req('Choose a start date.'), val => (val < isoDay(new Date()) ? 'Start date cannot be in the past.' : null)], to: [V.req('Choose an end date.'), (val, form) => (val < formValues(form).from ? 'End date must be on or after the start date.' : null)], reason: [V.max(60)] });
                if (!v)
                    return;
                const btn = $('button.btn-primary', f);
                busy(btn, true);
                try {
                    await api.post('/api/mentor/time-off', v);
                    toast('Time off added — these days are hidden from mentees');
                    go('/mentor/calendar?tab=timeoff');
                }
                catch (e) {
                    busy(btn, false);
                    apiErrToForm(f, e);
                }
            });
            on('submit:rules', async (el) => {
                const f = el;
                const v = validate(f, { minNoticeHours: [V.req(), V.num(1, 48)], horizonWeeks: [V.req(), V.num(1, 12)] });
                if (!v)
                    return;
                const btn = $('button.btn-primary', f);
                busy(btn, true);
                try {
                    await api.put('/api/mentor/availability', { ...v, minNoticeHours: Number(v.minNoticeHours), horizonWeeks: Number(v.horizonWeeks), bufferMinutes: Number(v.bufferMinutes), weekly: DB.availability.weekly });
                    toast('Booking rules saved');
                }
                catch (e) {
                    apiErrToForm(f, e);
                }
                busy(btn, false);
            });
        }
    },
});
/* ---------------- T4 Mentees ---------------- */
defineScreen({
    id: 'T4', path: '/mentor/mentees', title: 'My mentees', group: 'Mentor', roles: ['mentor'],
    render(root, _p, q) {
        const st = q.get('status') || 'all';
        root.innerHTML = `<div class="container">${pageHead('My mentees', 'Plans, credits, goals and your private notes.')}
      ${tabs([['All', '/mentor/mentees?status=all'], ['Active', '/mentor/mentees?status=active'], ['Paused', '/mentor/mentees?status=paused'], ['Ended', '/mentor/mentees?status=ended']], `/mentor/mentees?status=${st}`)}<div id="mt"></div></div>`;
        const open = (m) => {
            const hist = DB.sessions.filter(s => s.mentorId === ME_MENTOR_ID && s.menteeId === m.id).sort((a, b) => b.start.localeCompare(a.start));
            openModal(m.name, `<div class="row" style="margin-bottom:12px">${avatar(m.name, m.color)}<div>${statusChip(m.status)} <small>${esc(m.plan)} · ${m.done} sessions done · ${plural(m.credits, 'credit')} left</small></div></div>
        <h4>Goals</h4><ul>${m.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
        <h4>Private notes <small class="muted">(only you see them)</small></h4>
        <form data-form="note" novalidate class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1">${field({ name: 'text', label: 'Add a note', type: 'textarea', rows: 2, counter: 1000 })}</div><button class="btn btn-primary" style="margin-top:27px">Add</button></form>
        <ul class="list" id="notes">${m.notes.length ? m.notes.map(n => `<li>${esc(n)}</li>`).join('') : '<li class="muted">No notes yet.</li>'}</ul>
        <h4>Sessions</h4>${hist.length ? `<ul class="list">${hist.map(s => `<li class="row-between"><span>${fmtDT(s.start)} · ${s.minutes} min</span>${statusChip(s.status)}</li>`).join('')}</ul>` : '<p class="muted">No sessions yet.</p>'}`, `<a class="btn" href="#/messages">Message</a><button class="btn" data-act="modal-close">Close</button>`, true);
            on('submit:note', async (el) => {
                const f = el;
                const v = validate(f, { text: [V.req('Write a note first.'), V.min(3), V.max(1000)] });
                if (!v)
                    return;
                const btn = $('button.btn-primary', f);
                busy(btn, true);
                try {
                    const r = await api.post(`/api/mentor/mentees/${m.id}/notes`, v);
                    $('#notes').innerHTML = r.notes.map(n => `<li>${esc(n)}</li>`).join('');
                    f.reset();
                    toast('Note saved');
                }
                catch (e) {
                    apiErrToForm(f, e);
                }
                busy(btn, false);
            });
        };
        load($('#mt', root), () => api.get(`/api/mentor/mentees?status=${st}`), {
            isEmpty: d => !d.items.length,
            empty: () => emptyState(st === 'all' ? 'No mentees yet' : `No ${st} mentees`, st === 'all' ? 'Mentees appear here after their first booking. A complete profile with a video gets more intros.' : 'Try another filter.', st === 'all' ? `<a class="btn btn-primary" href="#/mentor/profile">Improve profile</a>` : ''),
            ok: d => `<div class="card table-wrap"><table class="tbl"><thead><tr><th>Mentee</th><th>Plan</th><th class="num">Sessions</th><th class="num">Credits</th><th>Next session</th><th>Status</th></tr></thead><tbody>
        ${d.items.map(m => `<tr class="clickable" data-act="open" data-id="${m.id}"><td><div class="row">${avatar(m.name, m.color, 'sm')}<b>${esc(m.name)}</b></div></td><td>${esc(m.plan)}</td><td class="num">${m.done}</td><td class="num">${m.credits}</td><td>${m.next ? fmtDT(m.next) : '—'}</td><td>${statusChip(m.status)}</td></tr>`).join('')}</tbody></table></div>`,
            after: d => { on('open', el => open(d.items.find(x => x.id === el.dataset.id))); const pre = q.get('id'); const m = d.items.find(x => x.id === pre); if (m)
                open(m); },
        });
    },
});
/* ---------------- T5 Earnings & payouts ---------------- */
defineScreen({
    id: 'T5', path: '/mentor/earnings', title: 'Earnings & payouts', group: 'Mentor', roles: ['mentor'],
    render(root) {
        root.innerHTML = `<div class="container">${pageHead('Earnings & payouts', 'Earnings become available 72 h after a session (time for mentee complaints).')}<div id="earn"></div></div>`;
        const reload = () => load($('#earn', root), () => api.get('/api/mentor/earnings'), {
            skeleton: `${skelCards(4, 'grid g4')}${skelLines(6)}`,
            ok: e => {
                const max = Math.max(...e.weeks.map(w => w.net), 1);
                return `<div class="grid g4">
          <div class="card"><div class="kpi-label">Available to withdraw</div><div class="kpi">${money(e.available)}</div><button class="btn btn-primary btn-sm" style="margin-top:8px" data-act="withdraw" ${e.available < RULES.payoutMin ? 'disabled' : ''}>Withdraw</button></div>
          <div class="card"><div class="kpi-label">Pending (72 h hold)</div><div class="kpi">${money(e.pending)}</div></div>
          <div class="card"><div class="kpi-label">Your platform fee</div><div class="kpi">${e.tier}%</div><small>${e.hoursTaught} h taught · lowest tier</small></div>
          <div class="card"><div class="kpi-label">Lifetime earnings</div><div class="kpi">${money(e.lifetime)}</div></div></div>
        <div class="split" style="margin-top:16px"><div class="stack-lg">
          <section class="card"><h2>Net earnings, last 8 weeks</h2>${e.weeks.length ? `<div class="bars">${e.weeks.map((w, i) => `<div class="b"><span>${money(w.net)}</span><i class="${i === e.weeks.length - 1 ? 'cur' : ''}" style="height:${(w.net / max) * 110}px"></i>${w.label}</div>`).join('')}</div>` : `<p class="muted">No earnings yet.</p>`}</section>
          <section class="card"><h2>Transactions</h2>${e.transactions.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Description</th><th class="num">Gross</th><th class="num">Fee</th><th class="num">Net</th><th></th></tr></thead><tbody>
            ${e.transactions.map(t => `<tr><td>${fmtDate(t.date)}</td><td>${esc(t.desc)}</td><td class="num">${money(t.gross)}</td><td class="num">−${money(t.fee)}</td><td class="num"><b>${money(t.net)}</b></td><td>${statusChip(t.status)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No transactions yet', 'Completed sessions will show up here.')}</section>
        </div><aside class="stack-lg">
          <section class="card"><h3>Payout method</h3>${e.payoutMethod ? `<p>🏦 ${esc(e.payoutMethod.holder)}<br><span class="kbd">•••• ${esc(e.payoutMethod.iban.slice(-4))}</span></p><button class="btn btn-sm" data-act="pm">Change</button>` : `<div class="notice notice-warn">Add a bank account to receive payouts.</div><button class="btn btn-primary btn-block" style="margin-top:10px" data-act="pm">Add bank account</button>`}</section>
          <section class="card"><h3>Payouts</h3>${e.payouts.length ? `<ul class="list">${e.payouts.map(p => `<li class="row-between"><span>${fmtLongDate(p.date)}<br><small>${esc(p.id)}</small></span><span><b>${money(p.amount)}</b> ${statusChip(p.status)}</span></li>`).join('')}</ul>` : `<p class="muted">No payouts yet.</p>`}</section>
          <section class="card"><h3>Fee tiers</h3><small>${RULES.platformFeeTiers.map(([h, p]) => `${p}% from ${h} h taught`).join('<br>')}<br>Intro sessions: platform keeps the intro fee.</small></section></aside></div>`;
            },
        });
        on('pm', () => {
            openModal('Bank account for payouts', `<form data-form="pmf" novalidate>${formAlert()}${field({ name: 'holder', label: 'Account holder name', value: 'Anna Wiśniewska' })}${field({ name: 'iban', label: 'IBAN', placeholder: 'PL61 1090 1014 0000 0712 1981 2874', hint: 'Prototype: the sample IBAN above is valid.' })}</form>`, `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="pm-ok">Save</button>`);
            on('pm-ok', async (b) => {
                const f = $('form[data-form="pmf"]');
                const v = validate(f, { holder: [V.req('Enter the account holder name.'), V.min(3)], iban: [V.req('Enter your IBAN.'), val => (ibanValid(val) ? null : 'This IBAN is not valid. Check the country code and digits.')] });
                if (!v)
                    return;
                busy(b, true);
                try {
                    await api.put('/api/mentor/payout-method', { ...v, iban: v.iban.replace(/\s/g, '').toUpperCase() });
                    closeModal();
                    toast('Payout method saved');
                    reload();
                }
                catch (e) {
                    busy(b, false);
                    apiErrToForm(f, e);
                }
            });
        });
        on('withdraw', () => {
            const e = DB.earnings;
            openModal('Withdraw earnings', `<form data-form="wd" novalidate>${formAlert()}${field({ name: 'amount', label: `Amount (USD), available ${money(e.available)}`, type: 'number', value: String(e.available), attrs: `min="${RULES.payoutMin}" max="${e.available}" step="0.01"`, hint: `Minimum ${money(RULES.payoutMin)}. Arrives in 1–3 business days.` })}</form>`, `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="wd-ok">Withdraw</button>`);
            on('wd-ok', async (b) => {
                const f = $('form[data-form="wd"]');
                const v = validate(f, { amount: [V.req('Enter an amount.'), V.num(RULES.payoutMin, Math.max(RULES.payoutMin, e.available), `Enter ${money(RULES.payoutMin)}–${money(e.available)}.`)] });
                if (!v)
                    return;
                busy(b, true);
                try {
                    await api.post('/api/mentor/payouts', v);
                    closeModal();
                    toast('Payout requested');
                    reload();
                }
                catch (err) {
                    busy(b, false);
                    apiErrToForm(f, err);
                }
            });
        });
        reload();
    },
});
/* ---------------- T6 Profile editor ---------------- */
defineScreen({
    id: 'T6', path: '/mentor/profile', title: 'Edit public profile', group: 'Mentor', roles: ['mentor'],
    render(root) {
        root.innerHTML = `<div class="container">${pageHead('Public profile', 'Changes to headline, bio and video are reviewed by our team (usually within 24 h). Price and topics update immediately.', `<a class="btn" href="#/mentors/m1">View as mentee</a>`)}<div id="pe"></div></div>`;
        load($('#pe', root), () => api.get('/api/mentor/profile'), {
            ok: m => `<div class="split"><form class="card" data-form="prof" novalidate>${formAlert()}
          ${field({ name: 'headline', label: 'Headline', value: m.headline, counter: 80 })}
          <div class="field"><span>Topics (1–3)</span>${topicChips(m.topics)}</div>
          ${field({ name: 'bio', label: 'About me', type: 'textarea', rows: 8, counter: 1500, value: m.bio })}
          <div class="inline-fields">${field({ name: 'rate', label: 'Price / 60 min (USD)', type: 'number', value: String(m.rate), attrs: 'min="20" max="500" step="5"' })}</div>
          <label class="check" style="margin-bottom:14px"><input type="checkbox" name="intro" value="on" ${m.intro ? 'checked' : ''}> Offer 30-min intro sessions</label>
          <div class="row"><button class="btn btn-primary">Save profile</button><button type="button" class="btn" data-act="video">Replace intro video</button></div></form>
        <aside class="sticky"><h4 class="muted">Preview in search results</h4><div id="prev"></div></aside></div>`,
            after: m => {
                const f = $('form[data-form="prof"]');
                const preview = () => {
                    const v = formValues(f);
                    const mm = { ...m, headline: v.headline || '…', bio: v.bio || '…', rate: Number(v.rate) || 0, topics: (v.topics || '').split(',').filter(Boolean), intro: v.intro === 'on', introAvailable: false, introPrice: Math.round((Number(v.rate) || 0) / 2) };
                    $('#prev').innerHTML = `<div style="pointer-events:none">${mentorCard(mm)}</div>`;
                };
                f.addEventListener('input', preview);
                f.addEventListener('change', preview);
                preview();
                on('video', () => toast('Video upload → POST /api/uploads (kind=video), then moderation', 'info'));
                on('submit:prof', async (el) => {
                    const v = validate(el, { headline: [V.req(), V.min(10), V.max(80)], topics: [V.count(1, 3, 'topic')], bio: [V.req(), V.min(150), V.max(1500)], rate: [V.req(), V.num(20, 500, 'Price must be between $20 and $500.')] });
                    if (!v)
                        return;
                    const btn = $('button.btn-primary', el);
                    busy(btn, true);
                    try {
                        const r = await api.patch('/api/mentor/profile', v);
                        toast(r.moderation === 'pending' ? 'Saved. Text changes go live after review (≈24 h).' : 'Profile saved');
                    }
                    catch (e) {
                        apiErrToForm(el, e);
                    }
                    busy(btn, false);
                });
            },
        });
    },
});
/* Admin screens: A1 Overview, A2 Mentor applications, A3 Disputes. */
/* ---------------- A1 Overview ---------------- */
defineScreen({
    id: 'A1', path: '/admin', title: 'Admin overview', group: 'Admin', roles: ['admin'],
    render(root) {
        root.innerHTML = `<div class="container">${pageHead('Marketplace overview', 'Last 30 days')}<div id="ov"></div></div>`;
        load($('#ov', root), () => api.get('/api/admin/metrics'), {
            skeleton: `${skelCards(4, 'grid g4')}${skelLines(6)}`,
            ok: d => {
                const max = Math.max(...d.weekly, 1);
                return `<div class="grid g4">
          <div class="card"><div class="kpi-label">GMV</div><div class="kpi">${money(d.gmv30)}</div><div class="kpi-delta">▲ 8% vs previous 30 d</div></div>
          <div class="card"><div class="kpi-label">Sessions held</div><div class="kpi">${d.sessions30.toLocaleString('en-US')}</div></div>
          <div class="card"><div class="kpi-label">Intro → plan conversion</div><div class="kpi">${d.trialToPlan}%</div></div>
          <div class="card"><div class="kpi-label">New mentees</div><div class="kpi">${d.newMentees30}</div><div class="kpi-label">${d.activeMentors} active mentors · NPS ${d.nps}</div></div></div>
        <div class="split" style="margin-top:16px"><section class="card"><h2>Sessions per week</h2>${d.weekly.length ? `<div class="bars">${d.weekly.map((v, i) => `<div class="b"><span>${v}</span><i class="${i === d.weekly.length - 1 ? 'cur' : ''}" style="height:${(v / max) * 110}px"></i>W${i + 1}</div>`).join('')}</div>` : '<p class="muted">No data.</p>'}</section>
          <aside class="stack-lg"><section class="card"><h3>Queues</h3><ul class="list">
            <li class="row-between"><span>Mentor applications</span><a class="btn btn-sm ${d.pendingApplications ? 'btn-primary' : ''}" href="#/admin/applications">${d.pendingApplications} pending</a></li>
            <li class="row-between"><span>Open disputes</span><a class="btn btn-sm ${d.openDisputes ? 'btn-primary' : ''}" href="#/admin/disputes">${d.openDisputes} open</a></li></ul></section>
            <section class="card"><h3>Recent activity</h3>${d.activity.length ? `<ul class="list">${d.activity.map((a) => `<li><small>${relTime(a.at)}</small><br>${esc(a.text)}</li>`).join('')}</ul>` : '<p class="muted">Nothing new.</p>'}</section></aside></div>`;
            },
        });
    },
});
/* ---------------- A2 Mentor applications ---------------- */
defineScreen({
    id: 'A2', path: '/admin/applications', title: 'Mentor applications', group: 'Admin', roles: ['admin'],
    render(root, _p, q) {
        const st = q.get('status') || 'pending';
        root.innerHTML = `<div class="container">${pageHead('Mentor applications', 'Target: decision within 5 business days. Every decision is logged with the admin name.')}<div id="tabsBox"></div><div id="apps"></div></div>`;
        const reload = () => load($('#apps', root), () => api.get(`/api/admin/mentor-applications?status=${st}`), {
            isEmpty: d => { $('#tabsBox').innerHTML = tabsFor(d.counts); return !d.items.length; },
            empty: () => emptyState(st === 'pending' ? 'Queue is empty' : 'Nothing here', st === 'pending' ? 'All applications have been reviewed. 🎉' : 'No applications with this status.'),
            ok: d => `<div class="card table-wrap"><table class="tbl"><thead><tr><th>Applicant</th><th>Topics</th><th class="num">Exp.</th><th class="num">Rate</th><th>Checks</th><th>Submitted</th></tr></thead><tbody>
        ${d.items.map(a => `<tr class="clickable" data-act="open" data-id="${a.id}"><td><b>${esc(a.name)}</b><br><small>${esc(a.headline)}</small></td><td>${a.topics.map(t => DB.topics.find(x => x.id === t)?.name ?? t).join(', ')}</td><td class="num">${a.years} y</td><td class="num">${money(a.rate)}</td>
          <td>${[['ID', a.checks.identity], ['LinkedIn', a.checks.linkedin], ['Video', a.checks.video]].map(([l, ok]) => chip(`${ok ? '✓' : '✗'} ${l}`, ok ? 'ok' : 'warn')).join(' ')}</td><td>${relTime(a.submitted)}</td></tr>`).join('')}</tbody></table></div>`,
        });
        const tabsFor = (c) => tabs([['Pending (' + (c.pending ?? 0) + ')', '/admin/applications?status=pending'], ['Changes requested (' + (c.changes ?? 0) + ')', '/admin/applications?status=changes'], ['Approved', '/admin/applications?status=approved'], ['Rejected', '/admin/applications?status=rejected']], `/admin/applications?status=${st}`);
        on('open', async (el) => {
            openModal('Application', skelLines(8), '', true);
            try {
                const a = await api.get(`/api/admin/mentor-applications/${el.dataset.id}`);
                const decided = a.status === 'approved' || a.status === 'rejected';
                openModal(`Application · ${a.name}`, `
          <div class="row" style="margin-bottom:10px">${avatar(a.name, '#7a4fd8', 'md')}<div><b>${esc(a.headline)}</b><br><small>${esc(a.email)} · ${esc(a.country)} · ${a.years} years · ${money(a.rate)}/h · ${a.hoursPerWeek} h/week</small></div>${statusChip(a.status)}</div>
          <div class="grid g3" style="margin-bottom:12px">${[['Identity (KYC)', a.checks.identity], ['LinkedIn matches', a.checks.linkedin], ['Intro video', a.checks.video]].map(([l, ok]) => `<div class="card card-tight">${ok ? '✅' : '⚠️'} ${l}</div>`).join('')}</div>
          <h4>Bio</h4><p>${esc(a.bio)}</p>
          <p><a href="${esc(a.linkedin)}" target="_blank" rel="noopener">LinkedIn profile ↗</a>${a.video ? ` · <a href="${esc(a.video)}" target="_blank" rel="noopener">Intro video ↗</a>` : ' · <span class="muted">no video</span>'}</p>
          ${a.note ? `<div class="notice">Previous note: ${esc(a.note)}</div>` : ''}
          ${decided ? '' : `<form data-form="decision" novalidate style="margin-top:12px">${formAlert()}
            ${field({ name: 'decision', label: 'Decision', type: 'select', options: [['', 'Select a decision'], ['approve', 'Approve — profile goes live'], ['changes', 'Request changes'], ['reject', 'Reject']] })}
            ${field({ name: 'reason', label: 'Rejection reason', type: 'select', options: [['', '—'], ['experience', 'Not enough relevant experience'], ['quality', 'Profile quality below guidelines'], ['verification', 'Identity / experience could not be verified'], ['policy', 'Policy violation']], hint: 'Required when rejecting.' })}
            ${field({ name: 'message', label: 'Message to the applicant', type: 'textarea', rows: 3, counter: 1000, hint: 'Required for “Request changes” and “Reject” (min. 20 characters).' })}</form>`}`, decided ? `<button class="btn" data-act="modal-close">Close</button>` : `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="decide" data-id="${a.id}">Confirm decision</button>`, true);
            }
            catch (e) {
                openModal('Application', errorState(e.message, act(() => ACT['open'](el, new Event('click')))), `<button class="btn" data-act="modal-close">Close</button>`);
            }
        });
        on('decide', async (b) => {
            const f = $('form[data-form="decision"]');
            const v = validate(f, {
                decision: [V.req('Choose a decision.')],
                reason: [(val, form) => (formValues(form).decision === 'reject' && !val ? 'Choose a rejection reason.' : null)],
                message: [(val, form) => (['changes', 'reject'].includes(formValues(form).decision) && val.trim().length < 20 ? 'Write at least 20 characters so the applicant knows what to do.' : null), V.max(1000)],
            });
            if (!v)
                return;
            busy(b, true);
            const id = b.dataset.id;
            try {
                if (v.decision === 'approve')
                    await api.post(`/api/admin/mentor-applications/${id}/approve`);
                if (v.decision === 'changes')
                    await api.post(`/api/admin/mentor-applications/${id}/request-changes`, { message: v.message });
                if (v.decision === 'reject')
                    await api.post(`/api/admin/mentor-applications/${id}/reject`, { reason: v.reason, note: v.message });
                closeModal();
                toast(v.decision === 'approve' ? 'Approved — the mentor was notified and the profile is live' : v.decision === 'changes' ? 'Changes requested — applicant notified' : 'Application rejected — applicant notified');
                reload();
            }
            catch (e) {
                busy(b, false);
                apiErrToForm(f, e);
            }
        });
        reload();
    },
});
/* ---------------- A3 Disputes ---------------- */
defineScreen({
    id: 'A3', path: '/admin/disputes', title: 'Disputes & reports', group: 'Admin', roles: ['admin'],
    render(root, _p, q) {
        const st = q.get('status') || 'open';
        root.innerHTML = `<div class="container">${pageHead('Disputes & reports', 'Reports from My sessions. Target: first response within 24 h, resolution within 3 days.')}
      ${tabs([['Open', '/admin/disputes?status=open'], ['Resolved', '/admin/disputes?status=resolved']], `/admin/disputes?status=${st}`)}<div id="ds"></div></div>`;
        const KIND = { mentor_no_show: 'Mentor no-show', quality: 'Quality / conduct', technical: 'Technical', payment: 'Payment' };
        const reload = () => load($('#ds', root), () => api.get(`/api/admin/disputes?status=${st}`), {
            isEmpty: d => !d.items.length,
            empty: () => emptyState(st === 'open' ? 'No open disputes' : 'No resolved disputes yet', st === 'open' ? 'Nice — every report has been handled.' : ''),
            ok: d => `<div class="stack">${d.items.map(x => `<article class="card">
        <div class="row-between"><div><b>${esc(x.id)}</b> ${chip(KIND[x.kind], x.kind === 'mentor_no_show' ? 'err' : 'warn')} ${statusChip(x.status)}<br><small>Opened ${relTime(x.opened)} by ${esc(x.by)} · against ${esc(x.against)} · session ${esc(x.sessionId)}${x.amount ? ' · ' + money(x.amount) : ''}</small></div>
          ${x.status === 'open' ? `<button class="btn btn-primary btn-sm" data-act="resolve" data-id="${x.id}">Resolve</button>` : ''}</div>
        <p style="margin:10px 0">“${esc(x.description)}”</p>
        <details><summary class="muted">Session timeline (room logs)</summary><ul>${x.timeline.map(t => `<li><small>${esc(t)}</small></li>`).join('')}</ul></details>
        ${x.resolution ? `<div class="notice notice-ok" style="margin-top:8px">Resolution: ${esc(x.resolution)}</div>` : ''}</article>`).join('')}</div>`,
        });
        on('resolve', el => {
            const x = DB.disputes.find(d => d.id === el.dataset.id);
            openModal(`Resolve ${x.id}`, `<form data-form="res" novalidate>${formAlert()}
        ${field({ name: 'decision', label: 'Decision', type: 'select', options: [['', 'Select'], ['Full refund to mentee', 'Full refund to mentee'], ['Partial refund', 'Partial refund'], ['Free replacement session', 'Free replacement session'], ['Claim rejected', 'Claim rejected — mentor paid']] })}
        ${field({ name: 'amount', label: 'Refund amount (USD)', type: 'number', optional: true, attrs: `min="0" max="${x.amount}" step="0.01"`, hint: `Only for partial refunds. Max ${money(x.amount)}.` })}
        ${field({ name: 'message', label: 'Message to both parties', type: 'textarea', rows: 3, counter: 1000 })}
        <label class="check"><input type="checkbox" name="strike" value="1"> Add a reliability strike to the mentor (3 strikes = profile paused)</label></form>`, `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="res-ok">Resolve dispute</button>`);
            on('res-ok', async (b) => {
                const f = $('form[data-form="res"]');
                const v = validate(f, {
                    decision: [V.req('Choose a decision.')],
                    amount: [(val, form) => (formValues(form).decision === 'Partial refund' && !val ? 'Enter the refund amount.' : null), V.num(0.01, Math.max(0.01, x.amount), `Enter up to ${money(x.amount)}.`)],
                    message: [V.req('Explain the decision to both parties.'), V.min(20), V.max(1000)],
                });
                if (!v)
                    return;
                busy(b, true);
                try {
                    await api.post(`/api/admin/disputes/${x.id}/resolve`, v);
                    closeModal();
                    toast(`${x.id} resolved — both parties notified`);
                    reload();
                }
                catch (e) {
                    busy(b, false);
                    apiErrToForm(f, e);
                }
            });
        });
        reload();
    },
});
/* MentorHub clickable prototype — boot: global event delegation and prototype controls. */
GLOBAL_ACT['proto-log'] = () => { logOpen = true; renderLog(); };
GLOBAL_ACT['proto-log-close'] = () => { logOpen = false; $('#drawer').innerHTML = ''; };
GLOBAL_ACT['proto-reset'] = () => { DB = freshDb(); S.cart = null; S.log = []; toast('Demo data restored', 'info'); renderRoute(); };
GLOBAL_ACT['proto-switch'] = el => { setRole(el.dataset.role); renderRoute(); };
GLOBAL_ACT['proto-role'] = el => { setRole(el.value); toast(`Prototype role: ${ROLE_LABEL[S.role]}`, 'info'); renderRoute(); };
GLOBAL_ACT['proto-scenario'] = el => { S.scenario = el.value; storeSet('scenario', S.scenario); toast(`Data state: ${SCENARIO_LABEL[S.scenario]}`, 'info'); renderRoute(); };
GLOBAL_ACT['modal-close'] = () => closeModal();
GLOBAL_ACT['modal-bg'] = (el, ev) => { if (ev.target === el)
    closeModal(); };
GLOBAL_ACT['logout'] = async (el) => {
    busy(el, true);
    try {
        await api.post('/api/auth/logout');
    }
    catch { /* log out locally anyway */ }
    setRole('guest');
    toast('You have been logged out', 'info');
    go('/');
};
function runAct(name, el, ev) {
    if (!name)
        return false;
    const fn = ACT[name] ?? GLOBAL_ACT[name];
    if (!fn)
        return false;
    fn(el, ev);
    return true;
}
document.addEventListener('click', ev => {
    const t = ev.target;
    const a = t.closest('[data-act]');
    if (a && !a.disabled) {
        if (a.tagName === 'A' || a.tagName === 'BUTTON')
            ev.preventDefault();
        if (runAct(a.dataset.act, a, ev))
            return;
    }
    const g = t.closest('[data-go]');
    if (g)
        go(g.dataset.go);
});
document.addEventListener('submit', ev => {
    const f = ev.target;
    const name = f.dataset.form;
    if (!name)
        return;
    ev.preventDefault();
    runAct('submit:' + name, f, ev) || runAct(name, f, ev);
});
document.addEventListener('change', ev => {
    const el = ev.target;
    if (el.dataset.change && el.tagName === 'SELECT')
        runAct(el.dataset.change, el, ev);
});
document.addEventListener('input', ev => {
    const el = ev.target;
    if (el.dataset.change && el.tagName === 'INPUT')
        runAct(el.dataset.change, el, ev);
    if (el.dataset.counter) {
        const c = document.querySelector(`[data-count-for="${el.id}"]`);
        if (c)
            c.textContent = `${el.value.length} / ${el.dataset.counter}`;
    }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') {
    closeModal();
    if (logOpen)
        GLOBAL_ACT['proto-log-close'](document.body, ev);
} });
(function boot() {
    const r = storeGet('role');
    if (r && r in ROLE_LABEL)
        S.role = r;
    const sc = storeGet('scenario');
    if (sc && sc in SCENARIO_LABEL)
        S.scenario = sc;
    unreadCount = 3;
    window.addEventListener('hashchange', renderRoute);
    renderRoute();
})();

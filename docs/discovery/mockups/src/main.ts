/* MentorHub clickable prototype — boot: global event delegation and prototype controls. */

GLOBAL_ACT['proto-log'] = () => { logOpen = true; renderLog(); };
GLOBAL_ACT['proto-log-close'] = () => { logOpen = false; ($('#drawer') as HTMLElement).innerHTML = ''; };
GLOBAL_ACT['proto-reset'] = () => { DB = freshDb(); S.cart = null; S.log = []; toast('Demo data restored', 'info'); renderRoute(); };
GLOBAL_ACT['proto-switch'] = el => { setRole(el.dataset.role as Role); renderRoute(); };
GLOBAL_ACT['proto-role'] = el => { setRole((el as HTMLSelectElement).value as Role); toast(`Prototype role: ${ROLE_LABEL[S.role]}`, 'info'); renderRoute(); };
GLOBAL_ACT['proto-scenario'] = el => { S.scenario = (el as HTMLSelectElement).value as Scenario; storeSet('scenario', S.scenario); toast(`Data state: ${SCENARIO_LABEL[S.scenario]}`, 'info'); renderRoute(); };
GLOBAL_ACT['modal-close'] = () => closeModal();
GLOBAL_ACT['modal-bg'] = (el, ev) => { if (ev.target === el) closeModal(); };
GLOBAL_ACT['logout'] = async el => {
  busy(el, true);
  try { await api.post('/api/auth/logout'); } catch { /* log out locally anyway */ }
  setRole('guest'); toast('You have been logged out', 'info'); go('/');
};

function runAct(name: string | undefined, el: HTMLElement, ev: Event): boolean {
  if (!name) return false;
  const fn = ACT[name] ?? GLOBAL_ACT[name];
  if (!fn) return false;
  fn(el, ev);
  return true;
}

document.addEventListener('click', ev => {
  const t = ev.target as HTMLElement;
  const a = t.closest('[data-act]') as HTMLElement | null;
  if (a && !(a as HTMLButtonElement).disabled) {
    if (a.tagName === 'A' || a.tagName === 'BUTTON') ev.preventDefault();
    if (runAct(a.dataset.act, a, ev)) return;
  }
  const g = t.closest('[data-go]') as HTMLElement | null;
  if (g) go(g.dataset.go as string);
});
document.addEventListener('submit', ev => {
  const f = ev.target as HTMLFormElement;
  const name = f.dataset.form;
  if (!name) return;
  ev.preventDefault();
  runAct('submit:' + name, f, ev) || runAct(name, f, ev);
});
document.addEventListener('change', ev => {
  const el = ev.target as HTMLElement;
  if (el.dataset.change && el.tagName === 'SELECT') runAct(el.dataset.change, el, ev);
});
document.addEventListener('input', ev => {
  const el = ev.target as HTMLInputElement;
  if (el.dataset.change && el.tagName === 'INPUT') runAct(el.dataset.change, el, ev);
  if (el.dataset.counter) {
    const c = document.querySelector(`[data-count-for="${el.id}"]`);
    if (c) c.textContent = `${el.value.length} / ${el.dataset.counter}`;
  }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { closeModal(); if (logOpen) GLOBAL_ACT['proto-log-close'](document.body, ev); } });

(function boot() {
  const r = storeGet('role') as Role | null;
  if (r && r in ROLE_LABEL) S.role = r;
  const sc = storeGet('scenario') as Scenario | null;
  if (sc && sc in SCENARIO_LABEL) S.scenario = sc;
  unreadCount = 3;
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();

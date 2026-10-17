/* Mentor screens: T1 Become a mentor (application wizard), T2 Dashboard, T3 Calendar & availability, T4 Mentees, T5 Earnings & payouts, T6 Profile editor. */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GRID_DAYS = [1, 2, 3, 4, 5, 6, 0];
const GRID_HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07–21

function availGrid(weekly: Record<number, number[]>, actName = 'cell'): string {
  return `<div class="avail-grid" role="grid" aria-label="Weekly availability"><span></span>${GRID_DAYS.map(d => `<span class="dh">${DAY_NAMES[d]}</span>`).join('')}
    ${GRID_HOURS.map(h => `<span class="h">${String(h).padStart(2, '0')}:00</span>${GRID_DAYS.map(d => `<button type="button" class="cell ${(weekly[d] ?? []).includes(h) ? 'on' : ''}" data-act="${actName}" data-d="${d}" data-h="${h}" aria-pressed="${(weekly[d] ?? []).includes(h)}" aria-label="${DAY_NAMES[d]} ${h}:00"></button>`).join('')}`).join('')}</div>`;
}
function toggleCell(weekly: Record<number, number[]>, el: HTMLElement): void {
  const d = Number(el.dataset.d); const h = Number(el.dataset.h);
  const set = new Set(weekly[d] ?? []);
  set.has(h) ? set.delete(h) : set.add(h);
  weekly[d] = Array.from(set).sort((a, b) => a - b);
  el.classList.toggle('on'); el.setAttribute('aria-pressed', String(set.has(h)));
}
const weeklyHours = (w: Record<number, number[]>) => Object.values(w).reduce((a, h) => a + h.length, 0);
function feeFor(hoursTaught: number): number { let f = RULES.platformFeeTiers[0][1]; for (const [h, p] of RULES.platformFeeTiers) if (hoursTaught >= h) f = p; return f; }
function ibanValid(raw: string): boolean {
  const s = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let mod = 0;
  for (const ch of r) mod = (mod * 10 + Number(ch)) % 97;
  return mod === 1;
}
function topicChips(selected: string[], name = 'topics'): string {
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
    if (S.role === 'mentor') { root.innerHTML = `<div class="container">${successState('You are already a mentor', 'Your application was approved. Manage your public profile in the mentor area.', `<a class="btn btn-primary" href="#/mentor/profile">Edit profile</a>`)}</div>`; return; }
    if (S.role === 'admin') { root.innerHTML = `<div class="container">${stateBox('🚧', 'Not available for admin accounts', 'Admins review applications in the admin panel.', `<a class="btn btn-primary" href="#/admin/applications">Open applications</a>`)}</div>`; return; }

    const STEPS = ['About you', 'Expertise', 'Profile', 'Availability', 'Pricing', 'Review & submit'];
    let step = 0;
    let app: Application;
    let weekly: Record<number, number[]> = { 1: [18, 19], 3: [18] };
    let photo = '';
    root.innerHTML = `<div class="container" style="max-width:900px">${pageHead('Become a mentor', 'Application · about 15 minutes · we save a draft after every step.')}<div id="wiz"></div></div>`;
    const wiz = $('#wiz', root) as HTMLElement;

    const draw = () => {
      const a = app;
      let body = '';
      if (a.status === 'submitted') {
        wiz.innerHTML = `${stepper(STEPS, 6)}${successState('Application submitted', `Thanks, ${esc(a.name.split(' ')[0])}! Our team reviews applications within <b>5 business days</b>. We will email you at ${esc(a.email)} — you may be asked for changes before approval.`, `<a class="btn" href="#/home">Back to home</a><button class="btn btn-primary" data-act="proto-approve">Prototype: see it in the admin queue</button>`)}
          <div class="card" style="margin-top:16px"><h3>What happens next</h3><ol><li>Identity and LinkedIn check</li><li>Profile and video review against our quality guidelines</li><li>Decision: approved / changes requested / rejected (with reason)</li><li>After approval: your profile goes live and you can receive bookings</li></ol></div>`;
        on('proto-approve', () => { setRole('admin'); go('/admin/applications'); });
        return;
      }
      if (step === 0) body = `
        ${field({ name: 'name', label: 'Full name (as on your ID)', value: a.name })}
        ${field({ name: 'country', label: 'Country of residence', type: 'select', value: a.country, options: [['', 'Select country'], ['Poland', 'Poland'], ['Germany', 'Germany'], ['United Kingdom', 'United Kingdom'], ['Spain', 'Spain'], ['Other', 'Other']] })}
        <div class="field"><span>Languages you mentor in</span><div class="chips">${['English', 'Polish', 'German', 'Spanish', 'French'].map(l => `<label class="chip toggle-chip"><input type="checkbox" name="languages" value="${l}" ${(a as any).languages?.includes(l) ? 'checked' : ''}>${l}</label>`).join('')}</div><div class="err" data-err="languages"></div></div>
        ${field({ name: 'headline', label: 'Headline', value: a.headline, counter: 80, placeholder: 'e.g. Engineering Manager · first-time managers · hiring', hint: 'Shown under your name in search results.' })}`;
      if (step === 1) body = `
        <div class="field"><span>Topics you mentor (1–3)</span>${topicChips(a.topics)}</div>
        <div class="inline-fields">${field({ name: 'years', label: 'Years of professional experience', type: 'number', value: a.years ? String(a.years) : '', attrs: 'min="0" max="50"' })}
        ${field({ name: 'currentRole', label: 'Current role', value: (a as any).currentRole ?? '' })}</div>
        ${field({ name: 'company', label: 'Company', optional: true, value: (a as any).company ?? '', hint: 'You can show it as e.g. “Fintech scale-up” instead of the name.' })}
        ${field({ name: 'linkedin', label: 'LinkedIn profile URL', value: a.linkedin, placeholder: 'https://www.linkedin.com/in/your-name', hint: 'Used to verify your experience. Not shown publicly.' })}`;
      if (step === 2) body = `
        <div class="field"><span>Profile photo</span><div class="row">${photo ? avatar(a.name, '#5b5fe0', 'lg') : `<div class="avatar av-lg" style="background:var(--surface-2);color:var(--ink-3)">?</div>`}
          <div><button type="button" class="btn btn-sm" data-act="upload">${photo ? 'Replace photo' : 'Upload photo'}</button><br><small>Face clearly visible, no logos. JPG/PNG, max 5 MB.</small></div></div>
          <input type="hidden" name="photo" value="${esc(photo)}"><div class="err" data-err="photo"></div></div>
        ${field({ name: 'bio', label: 'About you', type: 'textarea', rows: 7, counter: 1500, value: a.bio, hint: 'Who you help, how sessions look and what results mentees get. 150–1500 characters.' })}
        ${field({ name: 'video', label: 'Intro video link', optional: true, value: a.video, placeholder: 'YouTube, Vimeo or Loom URL', hint: 'Profiles with a video get ~2× more intro bookings. Max 2 minutes.' })}`;
      if (step === 3) body = `
        <p class="muted">Click the hours you are usually available each week (your time zone). You can change this anytime.</p>
        ${field({ name: 'timezone', label: 'Time zone', type: 'select', value: tzName(), options: [[tzName(), tzName()], ['Europe/London', 'Europe/London']] })}
        ${availGrid(weekly)}<p id="hrs" class="muted" style="margin-top:8px"></p><div class="err" data-err="hours"></div>`;
      if (step === 4) body = `
        ${field({ name: 'rate', label: 'Price for 60 minutes (USD)', type: 'number', value: String(a.rate || 50), attrs: 'min="20" max="500" step="5"', hint: 'Mentors with your experience usually charge $50–$120. You can change it later.' })}
        <label class="check" style="margin-bottom:14px"><input type="checkbox" name="intro" value="on" checked> Offer 30-min intro sessions at half the 30-minute price (recommended — most mentees start with an intro)</label>
        <div class="card card-tight" id="earn"></div>`;
      if (step === 5) body = `
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
      if (step === 3) { const upd = () => (($('#hrs') as HTMLElement).textContent = `${weeklyHours(weekly)} hours per week selected (minimum 5).`); upd(); on('cell', el => { toggleCell(weekly, el); upd(); }); }
      if (step === 4) {
        const upd = () => { const r = Number(($('input[name="rate"]') as HTMLInputElement).value) || 0; const fee = feeFor(0); ($('#earn') as HTMLElement).innerHTML = `<b>You earn ${money(Math.round(r * (100 - fee)) / 100)}</b> per 60-min session at the starting fee of ${fee}%. <small>Fee drops to 20% after 50 h and 15% after 200 h taught. Intro sessions: the platform keeps the intro fee to cover acquisition.</small>`; };
        $('input[name="rate"]')?.addEventListener('input', upd); upd();
      }
      $$('.toggle-chip input', wiz).forEach(i => i.addEventListener('change', () => { /* :has() handles style; keep for older browsers */ (i.parentElement as HTMLElement).classList.toggle('on', (i as HTMLInputElement).checked); }));
      $$('.toggle-chip input:checked', wiz).forEach(i => (i.parentElement as HTMLElement).classList.add('on'));
    };

    const stepRules = (): Record<string, Rule[]> => [
      { name: [V.req('Enter your full name.'), V.min(3)], country: [V.req('Select your country.')], languages: [V.count(1, 5, 'language')], headline: [V.req('Write a headline.'), V.min(10), V.max(80)] },
      { topics: [V.count(1, 3, 'topic')], years: [V.req('Enter your years of experience.'), V.num(2, 50, 'Mentors need at least 2 years of professional experience.')], currentRole: [V.req('Enter your current role.'), V.max(80)], company: [V.max(80)], linkedin: [V.req('Add your LinkedIn URL.'), V.re(/^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]{3,}\/?$/i, 'Use a profile link like https://www.linkedin.com/in/your-name.')] },
      { photo: [V.req('Upload a profile photo.')], bio: [V.req('Write a short bio.'), V.min(150, 'Write at least 150 characters so mentees understand how you can help.'), V.max(1500)], video: [V.re(/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|loom\.com)\/\S+$/i, 'Use a YouTube, Vimeo or Loom link.')] },
      { hours: [() => (weeklyHours(weekly) >= 5 ? null : `Select at least 5 hours per week (now ${weeklyHours(weekly)}).`)] },
      { rate: [V.req('Set your price.'), V.num(20, 500, 'Price must be between $20 and $500.')] },
      { conduct: [V.checked('You need to accept the Code of Conduct.')], accurate: [V.checked('Please confirm your information is accurate.')] },
    ][step];

    on('back', () => { step = Math.max(0, step - 1); draw(); });
    on('goto', el => { step = Number(el.dataset.s); draw(); });
    on('upload', async el => {
      busy(el, true);
      try { const u = await api.post<{ url: string }>('/api/uploads', { kind: 'photo' }); photo = u.url; toast('Photo uploaded'); draw(); }
      catch (e) { busy(el, false); toast((e as ApiError).message, 'err'); }
    });
    on('save-exit', async el => {
      busy(el, true);
      try { await api.patch(`/api/mentor-applications/${app.id}`, formValues($('form[data-form="step"]') as HTMLFormElement)); toast('Draft saved. Continue anytime from “Become a mentor”.'); go('/home'); }
      catch (e) { busy(el, false); toast((e as ApiError).message, 'err'); }
    });
    on('submit:step', async el => {
      const f = el as HTMLFormElement;
      const v = validate(f, stepRules());
      if (!v) return;
      const btn = $('button.btn-primary', f); busy(btn, true);
      try {
        const patch: any = { ...v };
        if (step === 0) patch.languages = (v.languages || '').split(',');
        if (step === 1) { patch.topics = (v.topics || '').split(','); patch.years = Number(v.years); }
        if (step === 3) { patch.weekly = weekly; patch.hoursPerWeek = weeklyHours(weekly); }
        if (step === 4) patch.rate = Number(v.rate);
        if (step < 5) { app = await api.patch<Application>(`/api/mentor-applications/${app.id}`, patch); step++; }
        else { app = await api.post<Application>(`/api/mentor-applications/${app.id}/submit`); toast('Application submitted'); }
        draw(); window.scrollTo(0, 0);
      } catch (e) { busy(btn, false); apiErrToForm(f, e as ApiError); }
    });

    load(wiz, () => (DB.myApplication ? api.get<Application>('/api/mentor-applications/me') : api.post<Application>('/api/mentor-applications', { name: DB.profile.name })), {
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
    load($('#dash', root) as HTMLElement, () => api.get<any>('/api/mentor/dashboard'), {
      skeleton: `${skelCards(4, 'grid g4')}<div style="height:16px"></div>${skelCards(2, 'grid g2')}`,
      ok: d => `<div class="grid g4">
          <div class="card"><div class="kpi-label">Sessions this week</div><div class="kpi">${d.kpis.sessionsThisWeek}</div><div class="kpi-delta">${d.next7} upcoming in 7 days</div></div>
          <div class="card"><div class="kpi-label">Earnings this month</div><div class="kpi">${money(d.kpis.earningsMonth)}</div><div class="kpi-delta">▲ 12% vs last month</div></div>
          <div class="card"><div class="kpi-label">Rating</div><div class="kpi">${d.kpis.rating} <span class="stars" style="font-size:16px">★</span></div><div class="kpi-label">132 reviews</div></div>
          <div class="card"><div class="kpi-label">Intro → plan conversion</div><div class="kpi">${d.kpis.conversion}%</div><div class="kpi-label">${d.kpis.profileViews} profile views (30 d)</div></div></div>
        <div class="split" style="margin-top:16px"><div class="stack-lg">
          <section class="card"><h2>Today</h2>${d.today.length ? `<ul class="list">${d.today.map((s: Session) => `<li class="row-between"><div class="row">${avatar(s.menteeName, '#1f8a70', 'sm')}<div><b>${esc(s.menteeName)}</b> ${s.type === 'intro' ? chip('Intro', 'accent') : ''}<br><small>${fmtTime(s.start)} · ${s.minutes} min${s.goal ? ' · 🎯 ' + esc(s.goal) : ''}</small></div></div>
            <div class="row">${chip(relTime(s.start), 'brand')}<a class="btn btn-sm btn-primary" href="#/room/${s.id}">Join</a></div></li>`).join('')}</ul>` : emptyState('No sessions today', 'Enjoy the free time — or open more hours in your calendar.', `<a class="btn" href="#/mentor/calendar?tab=availability">Open hours</a>`)}</section>
          <section class="card"><h2>Needs your attention</h2>${d.tasks.length ? `<ul class="list">${d.tasks.map((t: any) => `<li class="row-between"><span>${t.kind === 'message' ? '💬' : t.kind === 'payout' ? '💸' : '📝'} ${esc(t.text)}</span><a class="btn btn-sm" href="#${t.href}">Open</a></li>`).join('')}</ul>` : `<p class="muted">All done 🎉</p>`}</section>
        </div>
        <aside class="stack-lg"><section class="card"><h3>Profile strength</h3><div class="progress"><i style="width:${d.profileCompleteness}%"></i></div><p style="margin-top:8px"><b>${d.profileCompleteness}%</b> complete</p><ul style="padding-left:18px;margin:0">${d.missing.map((x: string) => `<li><small>${esc(x)}</small></li>`).join('')}</ul><a class="btn btn-block" style="margin-top:12px" href="#/mentor/profile">Improve profile</a></section>
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
    const box = $('#cal', root) as HTMLElement;
    if (tab === 'week') {
      let offset = 0;
      const monday = () => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow + offset * 7); d.setHours(0, 0, 0, 0); return d; };
      const reload = () => {
        const mon = monday();
        load(box, () => Promise.all([api.get<{ items: Session[] }>(`/api/mentor/sessions?from=${isoDay(mon)}`), api.get<typeof DB.availability>('/api/mentor/availability')]), {
          skeleton: skelCards(1, 'stack'),
          ok: ([ss, av]) => {
            const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return d; });
            const evAt = (d: Date, h: number) => ss.items.find(s => { const t = new Date(s.start); return isoDay(t) === isoDay(d) && t.getHours() === h; });
            const off = (d: Date) => av.timeOff.some(t => isoDay(d) >= t.from && isoDay(d) <= t.to);
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
        const s = DB.sessions.find(x => x.id === el.dataset.id) as Session;
        openModal(`${s.type === 'intro' ? 'Intro' : 'Session'} with ${s.menteeName}`, `<p><b>${fmtDT(s.start)}</b> · ${s.minutes} min · ${money(s.price)}</p>${s.goal ? `<div class="notice">🎯 ${esc(s.goal)}</div>` : ''}
          <form data-form="mcancel" novalidate style="margin-top:12px" hidden id="mc">${formAlert()}<div class="notice notice-warn" style="margin-bottom:10px">The mentee gets a full refund. Cancelling less than 24 h before lowers your reliability score.</div>
            ${field({ name: 'reason', label: 'Reason (sent to the mentee)', type: 'textarea', rows: 2, counter: 300 })}</form>`,
          `<button class="btn btn-danger" data-act="mc-show">Cancel session</button><a class="btn" href="#/messages">Message</a><a class="btn btn-primary" href="#/room/${s.id}">Join room</a>`);
        on('mc-show', async b => {
          const f = $('#mc') as HTMLFormElement;
          if (f.hidden) { f.hidden = false; b.textContent = 'Confirm cancellation'; return; }
          const v = validate(f, { reason: [V.req('Tell the mentee why you cancel.'), V.min(10), V.max(300)] });
          if (!v) return;
          busy(b, true);
          try { await api.post(`/api/mentor/sessions/${s.id}/cancel`, v); closeModal(); toast('Session cancelled — mentee refunded and notified'); reload(); } catch (e) { busy(b, false); apiErrToForm(f, e as ApiError); }
        });
      });
      reload();
    } else if (tab === 'availability') {
      load(box, () => api.get<typeof DB.availability>('/api/mentor/availability'), {
        ok: av => `<form class="card" data-form="avail" novalidate>${formAlert()}<div class="row-between"><p class="muted" style="margin:0">Recurring weekly hours in <b>${esc(av.timezone)}</b>. Booked sessions are kept even if you close an hour.</p><span id="hrs" class="chip chip-brand"></span></div>
          <div style="margin:14px 0">${availGrid(av.weekly)}</div><button class="btn btn-primary">Save availability</button> <button type="button" class="btn btn-ghost" data-act="clear">Clear all</button></form>`,
        after: av => {
          const weekly = clone(av.weekly);
          const upd = () => (($('#hrs') as HTMLElement).textContent = `${weeklyHours(weekly)} h / week`);
          upd();
          on('cell', el => { toggleCell(weekly, el); upd(); });
          on('clear', () => { Object.keys(weekly).forEach(k => (weekly[Number(k)] = [])); $$('.cell.on').forEach(c => c.classList.remove('on')); upd(); });
          on('submit:avail', async el => {
            const f = el as HTMLFormElement;
            const btn = $('button.btn-primary', f); busy(btn, true); clearErrors(f);
            try { await api.put('/api/mentor/availability', { weekly }); toast('Availability saved — mentees see the new hours now'); } catch (e) { apiErrToForm(f, e as ApiError); }
            busy(btn, false);
          });
        },
      });
    } else {
      load(box, () => api.get<typeof DB.availability>('/api/mentor/availability'), {
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
      on('rm-off', async el => { busy(el, true); try { await api.del(`/api/mentor/time-off/${el.dataset.id}`); toast('Time off removed'); go('/mentor/calendar?tab=timeoff'); } catch (e) { busy(el, false); toast((e as ApiError).message, 'err'); } });
      on('submit:off', async el => {
        const f = el as HTMLFormElement;
        const v = validate(f, { from: [V.req('Choose a start date.'), val => (val < isoDay(new Date()) ? 'Start date cannot be in the past.' : null)], to: [V.req('Choose an end date.'), (val, form) => (val < formValues(form).from ? 'End date must be on or after the start date.' : null)], reason: [V.max(60)] });
        if (!v) return;
        const btn = $('button.btn-primary', f); busy(btn, true);
        try { await api.post('/api/mentor/time-off', v); toast('Time off added — these days are hidden from mentees'); go('/mentor/calendar?tab=timeoff'); } catch (e) { busy(btn, false); apiErrToForm(f, e as ApiError); }
      });
      on('submit:rules', async el => {
        const f = el as HTMLFormElement;
        const v = validate(f, { minNoticeHours: [V.req(), V.num(1, 48)], horizonWeeks: [V.req(), V.num(1, 12)] });
        if (!v) return;
        const btn = $('button.btn-primary', f); busy(btn, true);
        try { await api.put('/api/mentor/availability', { ...v, minNoticeHours: Number(v.minNoticeHours), horizonWeeks: Number(v.horizonWeeks), bufferMinutes: Number(v.bufferMinutes), weekly: DB.availability.weekly }); toast('Booking rules saved'); } catch (e) { apiErrToForm(f, e as ApiError); }
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
    type MenteeRow = (typeof DB.mentees)[number];
    const open = (m: MenteeRow) => {
      const hist = DB.sessions.filter(s => s.mentorId === ME_MENTOR_ID && s.menteeId === m.id).sort((a, b) => b.start.localeCompare(a.start));
      openModal(m.name, `<div class="row" style="margin-bottom:12px">${avatar(m.name, m.color)}<div>${statusChip(m.status)} <small>${esc(m.plan)} · ${m.done} sessions done · ${plural(m.credits, 'credit')} left</small></div></div>
        <h4>Goals</h4><ul>${m.goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
        <h4>Private notes <small class="muted">(only you see them)</small></h4>
        <form data-form="note" novalidate class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1">${field({ name: 'text', label: 'Add a note', type: 'textarea', rows: 2, counter: 1000 })}</div><button class="btn btn-primary" style="margin-top:27px">Add</button></form>
        <ul class="list" id="notes">${m.notes.length ? m.notes.map(n => `<li>${esc(n)}</li>`).join('') : '<li class="muted">No notes yet.</li>'}</ul>
        <h4>Sessions</h4>${hist.length ? `<ul class="list">${hist.map(s => `<li class="row-between"><span>${fmtDT(s.start)} · ${s.minutes} min</span>${statusChip(s.status)}</li>`).join('')}</ul>` : '<p class="muted">No sessions yet.</p>'}`,
        `<a class="btn" href="#/messages">Message</a><button class="btn" data-act="modal-close">Close</button>`, true);
      on('submit:note', async el => {
        const f = el as HTMLFormElement;
        const v = validate(f, { text: [V.req('Write a note first.'), V.min(3), V.max(1000)] });
        if (!v) return;
        const btn = $('button.btn-primary', f); busy(btn, true);
        try { const r = await api.post<MenteeRow>(`/api/mentor/mentees/${m.id}/notes`, v); ($('#notes') as HTMLElement).innerHTML = r.notes.map(n => `<li>${esc(n)}</li>`).join(''); f.reset(); toast('Note saved'); } catch (e) { apiErrToForm(f, e as ApiError); }
        busy(btn, false);
      });
    };
    load($('#mt', root) as HTMLElement, () => api.get<{ items: MenteeRow[] }>(`/api/mentor/mentees?status=${st}`), {
      isEmpty: d => !d.items.length,
      empty: () => emptyState(st === 'all' ? 'No mentees yet' : `No ${st} mentees`, st === 'all' ? 'Mentees appear here after their first booking. A complete profile with a video gets more intros.' : 'Try another filter.', st === 'all' ? `<a class="btn btn-primary" href="#/mentor/profile">Improve profile</a>` : ''),
      ok: d => `<div class="card table-wrap"><table class="tbl"><thead><tr><th>Mentee</th><th>Plan</th><th class="num">Sessions</th><th class="num">Credits</th><th>Next session</th><th>Status</th></tr></thead><tbody>
        ${d.items.map(m => `<tr class="clickable" data-act="open" data-id="${m.id}"><td><div class="row">${avatar(m.name, m.color, 'sm')}<b>${esc(m.name)}</b></div></td><td>${esc(m.plan)}</td><td class="num">${m.done}</td><td class="num">${m.credits}</td><td>${m.next ? fmtDT(m.next) : '—'}</td><td>${statusChip(m.status)}</td></tr>`).join('')}</tbody></table></div>`,
      after: d => { on('open', el => open(d.items.find(x => x.id === el.dataset.id) as MenteeRow)); const pre = q.get('id'); const m = d.items.find(x => x.id === pre); if (m) open(m); },
    });
  },
});

/* ---------------- T5 Earnings & payouts ---------------- */
defineScreen({
  id: 'T5', path: '/mentor/earnings', title: 'Earnings & payouts', group: 'Mentor', roles: ['mentor'],
  render(root) {
    root.innerHTML = `<div class="container">${pageHead('Earnings & payouts', 'Earnings become available 72 h after a session (time for mentee complaints).')}<div id="earn"></div></div>`;
    const reload = () => load($('#earn', root) as HTMLElement, () => api.get<typeof DB.earnings>('/api/mentor/earnings'), {
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
      openModal('Bank account for payouts', `<form data-form="pmf" novalidate>${formAlert()}${field({ name: 'holder', label: 'Account holder name', value: 'Anna Wiśniewska' })}${field({ name: 'iban', label: 'IBAN', placeholder: 'PL61 1090 1014 0000 0712 1981 2874', hint: 'Prototype: the sample IBAN above is valid.' })}</form>`,
        `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="pm-ok">Save</button>`);
      on('pm-ok', async b => {
        const f = $('form[data-form="pmf"]') as HTMLFormElement;
        const v = validate(f, { holder: [V.req('Enter the account holder name.'), V.min(3)], iban: [V.req('Enter your IBAN.'), val => (ibanValid(val) ? null : 'This IBAN is not valid. Check the country code and digits.')] });
        if (!v) return;
        busy(b, true);
        try { await api.put('/api/mentor/payout-method', { ...v, iban: v.iban.replace(/\s/g, '').toUpperCase() }); closeModal(); toast('Payout method saved'); reload(); } catch (e) { busy(b, false); apiErrToForm(f, e as ApiError); }
      });
    });
    on('withdraw', () => {
      const e = DB.earnings;
      openModal('Withdraw earnings', `<form data-form="wd" novalidate>${formAlert()}${field({ name: 'amount', label: `Amount (USD), available ${money(e.available)}`, type: 'number', value: String(e.available), attrs: `min="${RULES.payoutMin}" max="${e.available}" step="0.01"`, hint: `Minimum ${money(RULES.payoutMin)}. Arrives in 1–3 business days.` })}</form>`,
        `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="wd-ok">Withdraw</button>`);
      on('wd-ok', async b => {
        const f = $('form[data-form="wd"]') as HTMLFormElement;
        const v = validate(f, { amount: [V.req('Enter an amount.'), V.num(RULES.payoutMin, Math.max(RULES.payoutMin, e.available), `Enter ${money(RULES.payoutMin)}–${money(e.available)}.`)] });
        if (!v) return;
        busy(b, true);
        try { await api.post('/api/mentor/payouts', v); closeModal(); toast('Payout requested'); reload(); } catch (err) { busy(b, false); apiErrToForm(f, err as ApiError); }
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
    load($('#pe', root) as HTMLElement, () => api.get<MentorView>('/api/mentor/profile'), {
      ok: m => `<div class="split"><form class="card" data-form="prof" novalidate>${formAlert()}
          ${field({ name: 'headline', label: 'Headline', value: m.headline, counter: 80 })}
          <div class="field"><span>Topics (1–3)</span>${topicChips(m.topics)}</div>
          ${field({ name: 'bio', label: 'About me', type: 'textarea', rows: 8, counter: 1500, value: m.bio })}
          <div class="inline-fields">${field({ name: 'rate', label: 'Price / 60 min (USD)', type: 'number', value: String(m.rate), attrs: 'min="20" max="500" step="5"' })}</div>
          <label class="check" style="margin-bottom:14px"><input type="checkbox" name="intro" value="on" ${m.intro ? 'checked' : ''}> Offer 30-min intro sessions</label>
          <div class="row"><button class="btn btn-primary">Save profile</button><button type="button" class="btn" data-act="video">Replace intro video</button></div></form>
        <aside class="sticky"><h4 class="muted">Preview in search results</h4><div id="prev"></div></aside></div>`,
      after: m => {
        const f = $('form[data-form="prof"]') as HTMLFormElement;
        const preview = () => {
          const v = formValues(f);
          const mm: MentorView = { ...m, headline: v.headline || '…', bio: v.bio || '…', rate: Number(v.rate) || 0, topics: (v.topics || '').split(',').filter(Boolean), intro: v.intro === 'on', introAvailable: false, introPrice: Math.round((Number(v.rate) || 0) / 2) };
          ($('#prev') as HTMLElement).innerHTML = `<div style="pointer-events:none">${mentorCard(mm)}</div>`;
        };
        f.addEventListener('input', preview); f.addEventListener('change', preview); preview();
        on('video', () => toast('Video upload → POST /api/uploads (kind=video), then moderation', 'info'));
        on('submit:prof', async el => {
          const v = validate(el as HTMLFormElement, { headline: [V.req(), V.min(10), V.max(80)], topics: [V.count(1, 3, 'topic')], bio: [V.req(), V.min(150), V.max(1500)], rate: [V.req(), V.num(20, 500, 'Price must be between $20 and $500.')] });
          if (!v) return;
          const btn = $('button.btn-primary', el); busy(btn, true);
          try { const r = await api.patch<{ moderation: string }>('/api/mentor/profile', v); toast(r.moderation === 'pending' ? 'Saved. Text changes go live after review (≈24 h).' : 'Profile saved'); } catch (e) { apiErrToForm(el as HTMLFormElement, e as ApiError); }
          busy(btn, false);
        });
      },
    });
  },
});

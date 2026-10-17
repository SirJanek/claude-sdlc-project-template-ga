/* Mentee screens: M1 Book, M2 Checkout, M3 Confirmed, M4 Home, M5 My sessions, M6 Session room, M7 Review, M8 Plans, M9 Billing. */

type SessionView = Session & { mentor: MentorView };

function luhn(num: string): boolean {
  const d = num.replace(/\D/g, '');
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let x = Number(d[d.length - 1 - i]);
    if (i % 2) { x *= 2; if (x > 9) x -= 9; }
    sum += x;
  }
  return sum % 10 === 0;
}
const cardRules: Record<string, Rule[]> = {
  number: [V.req('Enter the card number.'), v => (luhn(v) ? null : 'This card number is not valid.')],
  holder: [V.req('Enter the name on the card.'), V.min(2)],
  exp: [V.req('Enter the expiry date.'), V.re(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY format.'), v => {
    const m = v.match(/^(\d{2})\/(\d{2})$/); if (!m) return null;
    const end = new Date(2000 + Number(m[2]), Number(m[1]), 1);
    return end.getTime() > Date.now() ? null : 'This card has expired.';
  }],
  cvc: [V.req('Enter the security code.'), V.re(/^\d{3,4}$/, 'CVC is 3 or 4 digits.')],
};
function cardFields(): string {
  return `${field({ name: 'number', label: 'Card number', placeholder: '4242 4242 4242 4242', attrs: 'inputmode="numeric" autocomplete="cc-number"' })}
    ${field({ name: 'holder', label: 'Name on card', attrs: 'autocomplete="cc-name"' })}
    <div class="inline-fields">${field({ name: 'exp', label: 'Expiry (MM/YY)', placeholder: '08/28', attrs: 'autocomplete="cc-exp"' })}${field({ name: 'cvc', label: 'CVC', placeholder: '123', attrs: 'inputmode="numeric" autocomplete="cc-csc"' })}</div>`;
}
function stepper(steps: string[], cur: number): string {
  return `<div class="stepper">${steps.map((s, i) => `<div class="st ${i < cur ? 'done' : i === cur ? 'cur' : ''}"><b>Step ${i + 1}</b>${esc(s)}</div>`).join('')}</div>`;
}

/* ---------------- M1 Book a session ---------------- */
defineScreen({
  id: 'M1', path: '/book/:mentorId', title: 'Book a session', group: 'Mentee', roles: null,
  render(root, p, q) {
    let type: 'intro' | 'regular' = q.get('type') === 'intro' ? 'intro' : 'regular';
    let minutes = type === 'intro' ? RULES.introMinutes : 60;
    let selected: string | null = q.get('slot');
    let weekOffset = 0;
    let goal = '';
    root.innerHTML = `<div class="container" id="book"></div>`;
    load($('#book', root) as HTMLElement, () => api.get<MentorView>(`/api/mentors/${p.mentorId}`), {
      ok: m => {
        if (type === 'intro' && !m.introAvailable) type = 'regular', minutes = 60;
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
          ($('#summary') as HTMLElement).innerHTML = `
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
          const from = new Date(); from.setDate(from.getDate() + weekOffset * 7);
          load($('#slots') as HTMLElement, () => api.get<{ timezone: string; days: { date: string; slots: Slot[] }[] }>(`/api/mentors/${m.id}/availability?from=${isoDay(from)}&days=7&minutes=${minutes}`), {
            isEmpty: d => d.days.every(x => !x.slots.some(s => s.available)),
            empty: () => `${nav()}${emptyState('No free times this week', 'Try the next week, or ask the mentor about other times.', `<button class="btn" data-act="nw">Next week →</button><button class="btn" data-act="msg-mentor" data-id="${m.id}">Message mentor</button>`)}`,
            ok: d => `${nav()}${weekGrid(d.days, selected, 'slot')}<p class="muted" style="font-size:12.5px;margin-top:6px">Crossed-out times are booked or less than ${RULES.minNoticeHours} h away.</p>`,
          });
        };
        const nav = () => `<div class="row-between" style="margin-bottom:10px"><button class="btn btn-sm" data-act="pw" ${weekOffset === 0 ? 'disabled' : ''}>← Previous week</button><b>${weekOffset === 0 ? 'Next 7 days' : `Week +${weekOffset}`}</b><button class="btn btn-sm" data-act="nw" ${weekOffset >= 5 ? 'disabled' : ''}>Next week →</button></div>`;
        on('pw', () => { weekOffset--; loadSlots(); });
        on('nw', () => { weekOffset++; loadSlots(); });
        on('slot', el => { selected = el.dataset.start as string; $$('.slot.sel').forEach(s => s.classList.remove('sel')); el.classList.add('sel'); ($('#slotErr') as HTMLElement).textContent = ''; renderSummary(); });
        on('type', el => {
          const t = el.dataset.type as string;
          type = t === 'intro' ? 'intro' : 'regular';
          minutes = t === 'regular' ? 60 : 30;
          selected = null;
          $$('[data-act="type"]').forEach(b => b.classList.toggle('on', b === el));
          renderSummary(); loadSlots();
        });
        bindMentorCardActions();
        on('continue', async el => {
          goal = (($('textarea[name="goal"]') as HTMLTextAreaElement)?.value ?? '').trim();
          if (goal.length > 500) { showErr($('form[data-form="goal"]') as HTMLFormElement, 'goal', 'Use at most 500 characters.'); return; }
          if (!selected) { ($('#slotErr') as HTMLElement).textContent = 'Pick a time to continue.'; $('#slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
          if (S.role === 'guest') { toast('Create a free account to book — your selection is kept.', 'info'); go(withQuery('/auth', { mode: 'signup', next: withQuery(`/book/${m.id}`, { type, slot: selected }) })); return; }
          busy(el, true);
          try {
            const h = await api.post<{ holdId: string; expiresAt: number }>('/api/bookings/hold', { mentorId: m.id, start: selected, minutes, type });
            S.cart = { kind: 'booking', mentorId: m.id, type, start: selected, minutes, goal, holdId: h.holdId, holdExpires: h.expiresAt, price: sessionPrice(m, type, minutes) };
            go('/checkout');
          } catch (e) {
            const err = e as ApiError;
            busy(el, false);
            ($('#slotErr') as HTMLElement).textContent = err.message;
            if (err.status === 409) { selected = null; renderSummary(); loadSlots(); }
          }
        });
        renderSummary(); loadSlots();
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
    const m = mentorById(cart.mentorId) as Mentor;
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
            ? `<div class="row-between"><span>${cart.type === 'intro' ? 'Intro session' : 'Session'} · ${cart.minutes} min</span></div><div class="row-between"><span>When</span><b>${fmtDT(cart.start as string)}</b></div>`
            : `<div class="row-between"><span>Weekly plan</span><b>${cart.perWeek}× / week · 60 min</b></div><div class="row-between"><span>First session from</span><b>${fmtLongDate(cart.startDate as string)}</b></div><div class="row-between"><span>Sessions per 4 weeks</span><b>${(cart.perWeek as number) * 4}</b></div>`}
          <form data-form="promo" class="row" novalidate style="flex-wrap:nowrap;align-items:flex-start">
            <div style="flex:1">${field({ name: 'promo', label: 'Promo code', placeholder: 'e.g. WELCOME10', optional: true })}</div>
            <button class="btn" style="margin-top:27px">Apply</button></form>
          <div id="quote">${skelLines(3)}</div>
        </aside>
      </div>
    </div>`;
    const loadQuote = () => load($('#quote') as HTMLElement, () => api.post<{ subtotal: number; discount: number; fee: number; total: number }>('/api/checkout/quote', { kind: cart.kind, mentorId: cart.mentorId, price: cart.price, promo }), {
      ok: qd => {
        ($('#payBtn') as HTMLElement).textContent = `Pay ${money(qd.total)}`;
        (cart as any).total = qd.total;
        return `<div class="row-between"><span>Subtotal</span><span>${money(qd.subtotal)}</span></div>
          ${qd.discount ? `<div class="row-between" style="color:var(--ok)"><span>Discount (${esc(promo.toUpperCase())})</span><span>−${money(qd.discount)}</span></div>` : ''}
          <div class="row-between"><span>Service fee</span><span>${money(qd.fee)}</span></div>
          <hr class="divider"><div class="row-between"><b>Total</b><span class="price">${money(qd.total)}</span></div>`;
      },
    });
    const pmBox = $('#methods', root) as HTMLElement;
    api.get<{ id: string; brand: string; last4: string; exp: string }[]>('/api/me/payment-methods').then(pms => {
      if (token !== S.renderToken) return;
      if (!pms.length) method = 'card';
      pmBox.innerHTML = `<div class="stack">
        ${pms.map((p, i) => `<label class="check card card-tight"><input type="radio" name="method" value="saved:${p.id}" ${i === 0 ? 'checked' : ''}> 💳 ${esc(p.brand)} •••• ${esc(p.last4)} <small>exp. ${esc(p.exp)}</small></label>`).join('')}
        <label class="check card card-tight"><input type="radio" name="method" value="card" ${pms.length ? '' : 'checked'}> ➕ New card</label>
        <label class="check card card-tight"><input type="radio" name="method" value="blik"> 📱 BLIK</label></div><div class="err" data-err="method"></div>`;
      const sync = () => { const v = ($('input[name="method"]:checked', pmBox) as HTMLInputElement).value; method = v.startsWith('saved') ? 'saved' : v; ($('#newCard') as HTMLElement).hidden = method !== 'card'; ($('#blik') as HTMLElement).hidden = method !== 'blik'; };
      $$('input[name="method"]', pmBox).forEach(r => r.addEventListener('change', sync));
      sync();
    }).catch((e: ApiError) => { if (token === S.renderToken) pmBox.innerHTML = `<div class="notice notice-err">Could not load saved cards (${esc(e.message)}). You can still pay with a new card.</div>`; method = 'card'; ($('#newCard') as HTMLElement).hidden = false; });

    if (cart.kind === 'booking' && cart.holdExpires) {
      const tick = () => {
        if (token !== S.renderToken) { clearInterval(iv); return; }
        const left = Math.max(0, (cart.holdExpires as number) - Date.now());
        const cd = $('#cd'); if (cd) cd.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
        if (left <= 0) {
          clearInterval(iv); S.cart = null;
          root.innerHTML = `<div class="container">${stateBox('⌛', 'Your hold has expired', 'The time was released so others can book it. Pick a time again — it only takes a moment.', `<a class="btn btn-primary" href="#/book/${m.id}?type=${cart.type}">Pick another time</a>`, 'state-error')}</div>`;
        }
      };
      const iv = setInterval(tick, 1000); tick();
      on('expire', () => { cart.holdExpires = Date.now(); });
    }
    on('submit:promo', el => {
      const f = el as HTMLFormElement;
      const v = validate(f, { promo: [V.req('Enter a code.'), V.re(/^[A-Za-z0-9]{4,20}$/, 'Codes use 4–20 letters or digits.')] });
      if (!v) return;
      const prev = promo; promo = v.promo;
      api.post('/api/checkout/quote', { price: cart.price, promo }).then(() => { toast('Promo code applied'); loadQuote(); })
        .catch((e: ApiError) => { promo = prev; apiErrToForm(f, e); });
    });
    on('submit:pay', async el => {
      const f = el as HTMLFormElement;
      const rules: Record<string, Rule[]> = method === 'card' ? cardRules : method === 'blik' ? { blik: [V.req('Enter the BLIK code.'), V.re(/^\d{6}$/, 'BLIK code has 6 digits.')] } : {};
      const v = validate(f, rules);
      if (!v) return;
      const btn = $('#payBtn'); busy(btn, true);
      try {
        const total = (cart as any).total ?? cart.price;
        const pi = await api.post<{ id: string }>('/api/payments/intents', { amount: total, method, number: v.number, blik: v.blik });
        if (cart.kind === 'booking') {
          const b = await api.post<{ id: string }>('/api/bookings', { holdId: cart.holdId, paymentIntentId: pi.id, mentorId: cart.mentorId, start: cart.start, minutes: cart.minutes, type: cart.type, price: cart.price, total, goal: cart.goal });
          S.cart = null; go(`/booking/${b.id}/confirmed`);
        } else {
          await api.post('/api/subscriptions', { mentorId: cart.mentorId, perWeek: cart.perWeek, startDate: cart.startDate, paymentIntentId: pi.id, total });
          S.cart = null; toast('Your weekly plan is active!'); go('/billing?welcome=plan');
        }
      } catch (e) { busy(btn, false); apiErrToForm(f, e as ApiError); }
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
    load($('#conf', root) as HTMLElement, () => api.get<SessionView>(`/api/bookings/${p.id}`), {
      ok: s => `${stepper(['Choose a time', 'Pay securely', 'Confirmation'], 3)}
        ${successState('You are booked!', `${s.type === 'intro' ? 'Intro session' : 'Session'} with <b>${esc(s.mentor.name)}</b> on <b>${fmtDT(s.start)}</b> (${s.minutes} min, ${esc(tzName())}). A confirmation email and receipt are on the way.`,
          `<button class="btn" data-act="ics">📅 Add to calendar</button><button class="btn" data-act="msg-mentor" data-id="${s.mentorId}">💬 Message ${esc(s.mentor.name.split(' ')[0])}</button><a class="btn btn-primary" href="#/sessions">Go to my sessions</a>`)}
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
    load($('#home', root) as HTMLElement, () => api.get<any>('/api/me/home'), {
      skeleton: `<div class="split"><div>${skelCards(2, 'stack')}</div>${skelCards(1, 'stack')}</div>`,
      isEmpty: d => !d.upcoming.length && !d.toReview.length && !d.subscriptions.length,
      empty: () => emptyState('Start with your first mentor', 'Book a 30-minute intro session at half price. If it is not a fit, the next intro is on us.', `<a class="btn btn-primary" href="#/mentors">Browse mentors</a><a class="btn" href="#/settings">Complete your profile</a>`),
      ok: d => {
        const next: SessionView | undefined = d.upcoming[0];
        return `<div class="split"><div class="stack-lg">
          ${next ? `<section class="card" style="border-color:var(--brand)"><div class="row-between"><h2 style="margin:0">Next session</h2>${chip(relTime(next.start), 'brand')}</div>
            <div class="row-between" style="margin-top:12px">${mentorMini(next.mentor, `<br><small>${next.type === 'intro' ? 'Intro · ' : ''}${fmtDT(next.start)} · ${next.minutes} min</small>`)}
              <div class="row"><a class="btn btn-primary" href="#/room/${next.id}">Join room</a><a class="btn" href="#/sessions">Manage</a></div></div>
            ${next.goal ? `<p class="muted" style="margin:12px 0 0;font-size:14px">🎯 ${esc(next.goal)}</p>` : ''}</section>` : `<section class="card">${emptyState('No upcoming sessions', 'Book your next session with one of your mentors.', `<a class="btn btn-primary" href="#/mentors">Book a session</a>`)}</section>`}
          ${d.toReview.length || d.trialsNoPlan.length ? `<section class="card"><h2>To do</h2><ul class="list">
            ${d.toReview.map((s: SessionView) => `<li class="row-between"><span>⭐ How was your ${s.type === 'intro' ? 'intro' : 'session'} with <b>${esc(s.mentor.name)}</b>?</span><a class="btn btn-sm btn-primary" href="#/sessions/${s.id}/review">Leave a review</a></li>`).join('')}
            ${d.trialsNoPlan.map((s: SessionView) => `<li class="row-between"><span>🚀 Continue with <b>${esc(s.mentor.name)}</b> — choose a weekly plan</span><a class="btn btn-sm" href="#/plans/${s.mentorId}">See plans</a></li>`).join('')}
          </ul></section>` : ''}
          <section class="card"><h2>Upcoming</h2>${d.upcoming.length > 1 ? `<ul class="list">${d.upcoming.slice(1).map((s: SessionView) => `<li class="row-between">${mentorMini(s.mentor, `<br><small>${fmtDT(s.start)} · ${s.minutes} min</small>`)}${chip(relTime(s.start))}</li>`).join('')}</ul>` : `<p class="muted">Nothing else scheduled.</p>`}</section>
          <section><h2>Recommended for your goals</h2><div class="grid g3">${d.recommended.map((m: MentorView) => `<a class="card card-link" style="color:inherit;text-decoration:none" href="#/mentors/${m.id}">${avatar(m.name, m.color)}<h4 style="margin-top:8px">${esc(m.name)}</h4><small>${esc(m.headline)}</small><div class="row-between" style="margin-top:8px"><span>${stars(m.rating)}</span><b>${money(m.rate)}</b></div></a>`).join('')}</div></section>
        </div>
        <aside class="stack-lg">
          <section class="card"><h3>Your plans</h3>${d.subscriptions.length ? d.subscriptions.map((s: any) => `<div class="stack"><div class="row-between">${mentorMini(s.mentor)}</div><div class="row-between"><span>${s.perWeek}× / week</span><b>${plural(s.credits, 'credit')} left</b></div><div class="progress"><i style="width:${Math.min(100, (s.credits / (s.perWeek * 4)) * 100)}%"></i></div><small>Renews ${fmtLongDate(s.renewsOn)}</small></div>`).join('<hr class="divider">') : `<p class="muted">No active plan yet.</p>`}
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
    const reload = () => load($('#list', root) as HTMLElement, () => api.get<{ items: SessionView[] }>(`/api/me/sessions?status=${tab}`), {
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
    on('resched', async el => {
      const s = DB.sessions.find(x => x.id === el.dataset.id) as Session;
      const m = mentorById(s.mentorId) as Mentor;
      if (hoursUntil(s.start) < RULES.freeCancelHours) {
        openModal('Too late to reschedule', `<div class="notice notice-warn">This session starts ${relTime(s.start)}. Sessions can be rescheduled up to ${RULES.freeCancelHours} hours before the start.</div><p style="margin-top:12px">You can still message ${esc(m.name)} — mentors may agree to move it on their side.</p>`,
          `<button class="btn" data-act="modal-close">Close</button><a class="btn btn-primary" href="#/messages">Message mentor</a>`);
        return;
      }
      let pick: string | null = null;
      openModal('Reschedule session', `<p>Current time: <b>${fmtDT(s.start)}</b> with ${esc(m.name)}. Pick a new time:</p><div id="rs"></div><div class="err" id="rsErr"></div>`,
        `<button class="btn" data-act="modal-close">Keep current time</button><button class="btn btn-primary" data-act="rs-ok">Confirm new time</button>`, true);
      load($('#rs') as HTMLElement, () => api.get<{ days: { date: string; slots: Slot[] }[] }>(`/api/mentors/${m.id}/availability?from=${isoDay(new Date())}&days=7&minutes=${s.minutes}`), {
        isEmpty: d => d.days.every(x => !x.slots.some(z => z.available)),
        empty: () => emptyState('No free times in the next 7 days', 'Message the mentor to find another time.'),
        ok: d => weekGrid(d.days, null, 'rs-pick'),
      });
      on('rs-pick', b => { pick = b.dataset.start as string; $$('#rs .slot.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); });
      on('rs-ok', async b => {
        if (!pick) { ($('#rsErr') as HTMLElement).textContent = 'Pick a new time first.'; return; }
        busy(b, true);
        try { await api.post(`/api/sessions/${s.id}/reschedule`, { start: pick }); closeModal(); toast(`Moved to ${fmtDT(pick)}. ${m.name.split(' ')[0]} has been notified.`); reload(); }
        catch (e) { busy(b, false); ($('#rsErr') as HTMLElement).textContent = (e as ApiError).message; }
      });
    });
    on('cancel', el => {
      const s = DB.sessions.find(x => x.id === el.dataset.id) as Session;
      const late = hoursUntil(s.start) < RULES.freeCancelHours;
      openModal('Cancel session?', `
        <form data-form="cancel" novalidate>${formAlert()}
          ${late ? `<div class="notice notice-warn" style="margin-bottom:12px">⚠ Less than ${RULES.freeCancelHours} h before the start: ${s.subscriptionId ? 'the plan credit will be used' : 'the payment will not be refunded'} and the mentor will be paid.</div>`
            : `<div class="notice notice-ok" style="margin-bottom:12px">Free cancellation: ${s.subscriptionId ? 'the credit returns to your plan' : `${money(s.price)} will be refunded to your original payment method`}.</div>`}
          ${field({ name: 'reason', label: 'Reason', type: 'select', options: [['', 'Select a reason'], ['schedule', 'Schedule conflict'], ['health', 'Health'], ['mentor_fit', 'Not the right mentor'], ['other', 'Other']] })}
          ${field({ name: 'note', label: 'Message to the mentor', type: 'textarea', optional: true, rows: 2, counter: 300 })}
        </form>`, `<button class="btn" data-act="modal-close">Keep session</button><button class="btn btn-danger" data-act="cancel-ok">Cancel session</button>`);
      on('cancel-ok', async b => {
        const f = $('form[data-form="cancel"]') as HTMLFormElement;
        const v = validate(f, { reason: [V.req('Select a reason.')], note: [V.max(300)] });
        if (!v) return;
        busy(b, true);
        try { const r = await api.post<{ refunded: boolean; refundTo: string }>(`/api/sessions/${s.id}/cancel`, v); closeModal(); toast(r.refunded ? `Session cancelled. Refunded to your ${r.refundTo}.` : 'Session cancelled. No refund (late cancellation).', r.refunded ? 'ok' : 'info'); reload(); }
        catch (e) { busy(b, false); apiErrToForm(f, e as ApiError); }
      });
    });
    on('report', el => {
      openModal('Report a problem', `<form data-form="report" novalidate>${formAlert()}
        ${field({ name: 'kind', label: 'What happened?', type: 'select', options: [['', 'Select'], ['mentor_no_show', 'Mentor did not show up'], ['technical', 'Technical problems'], ['quality', 'Session quality / conduct'], ['payment', 'Payment issue']] })}
        ${field({ name: 'description', label: 'Describe the problem', type: 'textarea', rows: 4, counter: 1000, hint: 'Our support team replies within 24 h. Problems must be reported within 7 days of the session.' })}</form>`,
        `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="report-ok">Send report</button>`);
      on('report-ok', async b => {
        const f = $('form[data-form="report"]') as HTMLFormElement;
        const v = validate(f, { kind: [V.req('Choose a category.')], description: [V.req('Describe what happened.'), V.min(20), V.max(1000)] });
        if (!v) return;
        busy(b, true);
        try { const r = await api.post<{ id: string }>(`/api/sessions/${el.dataset.id}/report`, v); closeModal(); toast(`Report ${r.id} sent. We will reply within 24 h.`); }
        catch (e) { busy(b, false); apiErrToForm(f, e as ApiError); }
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
    load($('#room', root) as HTMLElement, () => api.get<SessionView>(`/api/sessions/${p.id}`), {
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
        on('early', el => { (el.closest('.notice') as HTMLElement).remove(); ($('#stage') as HTMLElement).hidden = false; });
        on('join', async el => {
          busy(el, true);
          try { await api.post(`/api/sessions/${s.id}/room-token`); inSession(); }
          catch (e) { busy(el, false); ($('#joinErr') as HTMLElement).textContent = `Could not connect: ${(e as ApiError).message}`; }
        });
        const inSession = () => {
          let sec = 0; let mic = true; let cam = true; let panel = 'notes';
          const started = Date.now();
          const box = $('#stage') as HTMLElement;
          const draw = () => {
            box.innerHTML = `<div class="room"><div><div class="stage"><span class="timer" id="tm">00:00 / ${s.minutes}:00</span><div style="text-align:center">${avatar(other, s.mentor.color, 'xl')}<p style="margin-top:8px">${esc(other)}</p></div><div class="self">${cam ? 'You' : '📷 off'}</div></div>
              <div class="bar"><button class="btn ${mic ? '' : 'off'}" data-act="mic">${mic ? '🎙 Mute' : '🔇 Unmute'}</button><button class="btn ${cam ? '' : 'off'}" data-act="cam">${cam ? '📷 Stop video' : '📷 Start video'}</button><button class="btn" data-act="share">🖥 Share screen</button><button class="btn" style="background:var(--err);border-color:var(--err)" data-act="end">End session</button></div></div>
              <div class="panel"><div class="seg" style="margin-bottom:10px"><button class="${panel === 'notes' ? 'on' : ''}" data-act="pn" data-p="notes">Notes</button><button class="${panel === 'chat' ? 'on' : ''}" data-act="pn" data-p="chat">Chat</button><button class="${panel === 'agenda' ? 'on' : ''}" data-act="pn" data-p="agenda">Agenda</button></div>
                ${panel === 'notes' ? `<textarea class="input" id="notes" style="flex:1;min-height:300px" placeholder="Shared notes — both of you can see them after the session.">${esc(s.notes ?? '')}</textarea><small id="saved" class="muted">Autosaves every few seconds</small>`
                  : panel === 'chat' ? `<div class="msgs" style="flex:1;max-height:none"><div class="msg">Hi! Can you hear me well?</div><div class="msg me">Yes, all good 👍</div></div><input class="input" placeholder="Message (Enter to send)" style="margin-top:8px">`
                  : `<ol><li>Check-in (5 min)</li><li>${esc(s.goal ?? 'Main topic')}</li><li>Action items &amp; homework</li></ol>`}
              </div></div>`;
            const n = $('#notes') as HTMLTextAreaElement | null;
            let deb: number | undefined;
            n?.addEventListener('input', () => { clearTimeout(deb); deb = window.setTimeout(async () => { s.notes = n.value; try { const r = await api.put<{ savedAt: string }>(`/api/sessions/${s.id}/notes`, { notes: n.value }); const sv = $('#saved'); if (sv) sv.textContent = `Saved at ${fmtTime(r.savedAt)}`; } catch { const sv = $('#saved'); if (sv) sv.textContent = '⚠ Not saved — retrying when connection is back'; } }, 1200); });
          };
          draw();
          const iv = setInterval(() => { if (token !== S.renderToken) { clearInterval(iv); return; } sec = Math.floor((Date.now() - started) / 1000); const t = $('#tm'); if (t) t.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')} / ${s.minutes}:00`; }, 1000);
          on('mic', () => { mic = !mic; draw(); });
          on('cam', () => { cam = !cam; draw(); });
          on('share', () => toast('Screen sharing started (simulated)', 'info'));
          on('pn', el => { panel = el.dataset.p as string; draw(); });
          on('end', () => openModal('End the session?', `<p>The session will be marked as completed for both participants${S.role === 'mentee' ? ' and you will be asked for a short review' : ''}.</p>`,
            `<button class="btn" data-act="modal-close">Stay</button><button class="btn btn-primary" data-act="end-ok">End session</button>`));
          on('end-ok', async b => {
            busy(b, true);
            try { await api.post(`/api/sessions/${s.id}/complete`); clearInterval(iv); closeModal(); go(S.role === 'mentor' ? '/mentor/mentees' : `/sessions/${s.id}/review`); }
            catch (e) { busy(b, false); toast((e as ApiError).message, 'err'); }
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
    load($('#rev', root) as HTMLElement, () => api.get<SessionView>(`/api/sessions/${p.id}`), {
      ok: s => {
        if (s.status !== 'completed') return stateBox('⏳', 'Not yet', 'You can review a session after it has taken place.', `<a class="btn" href="#/sessions">Back to my sessions</a>`);
        if (s.reviewed) return successState('Already reviewed', 'Thank you — you have already reviewed this session. You can edit your review within 14 days in My sessions.', `<a class="btn" href="#/sessions?tab=past">Back to my sessions</a>`);
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
        if (s.status !== 'completed' || s.reviewed) return;
        const labels = ['', 'Poor', 'Below expectations', 'OK', 'Very good', 'Excellent'];
        $$('#stars input').forEach(i => i.addEventListener('change', () => {
          const n = Number((i as HTMLInputElement).value);
          $$('#stars label').forEach((l, k) => { (l.childNodes[1] as Text).textContent = k < n ? '★' : '☆'; (l as HTMLElement).style.color = k < n ? 'var(--accent)' : ''; });
          ($('#rlabel') as HTMLElement).textContent = labels[n];
        }));
        on('submit:review', async el => {
          const f = el as HTMLFormElement;
          const v = validate(f, {
            rating: [V.req('Choose a rating from 1 to 5 stars.')],
            comment: [(val, form) => (Number(formValues(form).rating) <= 3 && val.trim().length < 20 ? 'Please tell us what could be better (at least 20 characters).' : null), V.max(1000)],
            private: [V.max(500)],
          });
          if (!v) return;
          const btn = $('button.btn-primary', f); busy(btn, true);
          try {
            await api.post(`/api/sessions/${s.id}/review`, v);
            const first = s.mentor.name.split(' ')[0];
            ($('#rev') as HTMLElement).innerHTML = successState('Thank you for your review!', 'It helps other mentees choose and helps mentors grow.',
              `<a class="btn" href="#/home">Back to home</a>`) + (s.type === 'intro' ? `
              <h2 style="margin-top:24px">What next?</h2><div class="grid g2">
                <div class="card"><h3>Continue with ${esc(first)}</h3><p class="muted">Choose a weekly plan — your intro time can become your regular slot.</p><a class="btn btn-primary" href="#/plans/${s.mentorId}">See plans</a></div>
                <div class="card"><h3>Not a fit?</h3><p class="muted">Try another mentor — your next intro is free under our satisfaction guarantee.</p><a class="btn" href="#/mentors?topic=${s.mentor.topics[0]}">Find another mentor</a></div></div>` : '');
          } catch (e) { busy(btn, false); apiErrToForm(f, e as ApiError); }
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
    load($('#plans', root) as HTMLElement, () => api.get<{ mentor: MentorView; items: { perWeek: number; sessionsPerCycle: number; pricePerCycle: number; popular: boolean }[] }>(`/api/mentors/${p.mentorId}/plans`), {
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
        const sum = () => { const it = d.items.find(x => x.perWeek === perWeek) ?? d.items[0]; ($('#sum') as HTMLElement).innerHTML = `<div class="row-between"><span>${it.perWeek}× / week</span><b>${money(it.pricePerCycle)}</b></div><small>per 4 weeks · ${it.sessionsPerCycle} credits</small>`; };
        $$('input[name="perWeek"]').forEach(r => r.addEventListener('change', () => { perWeek = Number((r as HTMLInputElement).value); sum(); }));
        sum();
        on('submit:plan', el => {
          const f = el as HTMLFormElement;
          const v = validate(f, {
            perWeek: [V.req('Choose how many sessions per week.')],
            startDate: [V.req('Choose a start date.'), val => { const t = new Date(val + 'T23:59:59').getTime(); return t < Date.now() ? 'Start date cannot be in the past.' : t > Date.now() + 31 * 864e5 ? 'Start within the next 30 days.' : null; }],
          });
          if (!v) return;
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
    const reload = () => load($('#bill', root) as HTMLElement, () => api.get<any>('/api/me/billing'), {
      skeleton: skelCards(3, 'stack'),
      ok: d => `<div class="stack-lg">
        <section><h2>Plans</h2>${d.subscriptions.length ? `<div class="grid g2">${d.subscriptions.map((s: any) => `<div class="card stack">
          <div class="row-between">${mentorMini(s.mentor)}${statusChip(s.status)}</div>
          <div class="row-between"><span>${s.perWeek}× / week · ${s.minutes} min</span><b>${money(s.pricePerCycle)} / 4 weeks</b></div>
          <div class="row-between"><span>Credits left</span><b>${s.credits}</b></div>
          ${s.status === 'active' ? `<small>Renews on ${fmtLongDate(s.renewsOn)}</small>
          <div class="row"><a class="btn btn-sm btn-primary" href="#/book/${s.mentorId}?type=regular">Schedule session</a><button class="btn btn-sm" data-act="change" data-id="${s.id}">Change plan</button><button class="btn btn-sm" data-act="transfer" data-id="${s.id}">Move credits</button><button class="btn btn-sm btn-danger" data-act="cancel-sub" data-id="${s.id}">Cancel plan</button></div>` : `<small>Plan ended. Remaining credits can still be used until ${fmtLongDate(s.renewsOn)}.</small>`}
        </div>`).join('')}</div>` : emptyState('No plans yet', 'After an intro session you can choose a weekly plan with your mentor.', `<a class="btn btn-primary" href="#/mentors">Find a mentor</a>`)}</section>
        <section class="card"><div class="row-between"><h2 style="margin:0">Payment methods</h2><button class="btn btn-sm" data-act="add-card">Add card</button></div>
          ${d.paymentMethods.length ? `<ul class="list" style="margin-top:8px">${d.paymentMethods.map((pm: any) => `<li class="row-between"><span>💳 ${esc(pm.brand)} •••• ${esc(pm.last4)} <small>exp. ${esc(pm.exp)}</small> ${pm.default ? chip('Default', 'brand') : ''}</span><button class="btn btn-sm btn-ghost" data-act="rm-card" data-id="${pm.id}">Remove</button></li>`).join('')}</ul>` : `<p class="muted">No saved cards. You will be asked for a card at checkout.</p>`}</section>
        <section class="card"><h2>Invoices</h2>${d.invoices.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead><tbody>
          ${d.invoices.map((i: any) => `<tr><td>${fmtLongDate(i.date)}</td><td>${esc(i.desc)}<br><small>${esc(i.id)}</small></td><td class="num">${money(i.amount)}</td><td><button class="btn btn-sm" data-act="pdf" data-id="${i.id}">PDF</button></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">No invoices yet.</p>`}</section>
      </div>`,
    });
    on('pdf', async el => { busy(el, true); try { await api.get(`/api/invoices/${el.dataset.id}/pdf`); toast(`${el.dataset.id}.pdf downloaded (simulated)`); } catch (e) { toast((e as ApiError).message, 'err'); } busy(el, false); });
    on('change', el => {
      const s = DB.subscriptions.find(x => x.id === el.dataset.id) as Subscription;
      openModal('Change plan', `<form data-form="chg" novalidate>${field({ name: 'perWeek', label: 'Sessions per week', type: 'select', value: String(s.perWeek), options: [['1', '1× per week'], ['2', '2× per week'], ['3', '3× per week'], ['5', '5× per week']] })}
        <div class="notice">Changes apply from the next billing cycle (${fmtLongDate(s.renewsOn)}). Your current credits stay.</div></form>`,
        `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="chg-ok">Save change</button>`);
      on('chg-ok', async b => {
        const v = formValues($('form[data-form="chg"]') as HTMLFormElement);
        if (Number(v.perWeek) === s.perWeek) { closeModal(); toast('No changes', 'info'); return; }
        busy(b, true);
        try { await api.patch(`/api/subscriptions/${s.id}`, v); closeModal(); toast('Plan updated from the next cycle'); reload(); } catch (e) { busy(b, false); toast((e as ApiError).message, 'err'); }
      });
    });
    on('transfer', el => {
      const s = DB.subscriptions.find(x => x.id === el.dataset.id) as Subscription;
      openModal('Move credits to another mentor', `<form data-form="tr" novalidate>${formAlert()}
        ${field({ name: 'toMentorId', label: 'New mentor', type: 'select', options: [['', 'Select a mentor'], ...DB.mentors.filter(m => m.id !== s.mentorId).map(m => [m.id, `${m.name} — ${money(m.rate)}/h`] as [string, string])] })}
        ${field({ name: 'credits', label: `Credits to move (you have ${s.credits})`, type: 'number', value: String(s.credits), attrs: `min="1" max="${s.credits}"` })}
        <div class="notice">Credits are converted by value. If the new mentor is more expensive you may get fewer sessions.</div></form>`,
        `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="tr-ok">Move credits</button>`);
      on('tr-ok', async b => {
        const f = $('form[data-form="tr"]') as HTMLFormElement;
        const v = validate(f, { toMentorId: [V.req('Choose a mentor.')], credits: [V.req('Enter how many credits.'), V.num(1, Math.max(1, s.credits), `Enter 1–${s.credits}.`)] });
        if (!v) return;
        busy(b, true);
        try { await api.post(`/api/subscriptions/${s.id}/transfer`, v); closeModal(); toast('Credits moved'); reload(); } catch (e) { busy(b, false); apiErrToForm(f, e as ApiError); }
      });
    });
    on('cancel-sub', el => {
      openModal('Cancel plan?', `<p>Your plan will not renew. You can still use the remaining credits until the end of the current cycle.</p><form data-form="cs" novalidate>${field({ name: 'reason', label: 'Why are you cancelling?', type: 'select', options: [['', 'Select a reason'], ['goal', 'I reached my goal'], ['price', 'Too expensive'], ['time', 'No time right now'], ['mentor', 'Want a different mentor'], ['other', 'Other']] })}</form>
        <div class="notice">Tip: you can also <b>pause</b> or <b>move credits</b> to another mentor instead.</div>`,
        `<button class="btn" data-act="modal-close">Keep plan</button><button class="btn btn-danger" data-act="cs-ok">Cancel plan</button>`);
      on('cs-ok', async b => {
        const f = $('form[data-form="cs"]') as HTMLFormElement;
        const v = validate(f, { reason: [V.req('Select a reason.')] });
        if (!v) return;
        busy(b, true);
        try { await api.post(`/api/subscriptions/${el.dataset.id}/cancel`, v); closeModal(); toast('Plan cancelled. It will not renew.'); reload(); } catch (e) { busy(b, false); toast((e as ApiError).message, 'err'); }
      });
    });
    on('add-card', () => {
      openModal('Add a card', `<form data-form="card" novalidate>${formAlert()}${cardFields()}</form>`, `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="card-ok">Save card</button>`);
      on('card-ok', async b => {
        const f = $('form[data-form="card"]') as HTMLFormElement;
        const v = validate(f, cardRules);
        if (!v) return;
        busy(b, true);
        try { await api.post('/api/me/payment-methods', v); closeModal(); toast('Card saved'); reload(); } catch (e) { busy(b, false); apiErrToForm(f, e as ApiError); }
      });
    });
    on('rm-card', async el => {
      busy(el, true);
      try { await api.del(`/api/me/payment-methods/${el.dataset.id}`); toast('Card removed'); reload(); } catch (e) { busy(el, false); toast((e as ApiError).message, 'err'); }
    });
    reload();
  },
});

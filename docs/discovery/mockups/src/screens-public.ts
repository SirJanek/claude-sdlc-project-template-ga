/* Public screens: P1 Landing, P2 Find a mentor, P3 Mentor profile, P4 Auth, P0 Screen map. */

type MentorView = Mentor & { introPrice: number; favorite: boolean; introAvailable: boolean };

function mentorCard(m: MentorView): string {
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
function bindMentorCardActions(onFavChange?: () => void): void {
  ACT['fav'] = async el => {
    if (S.role === 'guest') { go(withQuery('/auth', { mode: 'signup', next: parseHash().path })); toast('Create a free account to save mentors.', 'info'); return; }
    const id = el.dataset.id as string;
    const on = el.classList.contains('on');
    el.classList.toggle('on', !on); el.textContent = on ? '♡' : '♥';
    try { await (on ? api.del(`/api/me/favorites/${id}`) : api.put(`/api/me/favorites/${id}`)); toast(on ? 'Removed from favourites' : 'Saved to favourites'); onFavChange?.(); }
    catch (e) { el.classList.toggle('on', on); el.textContent = on ? '♥' : '♡'; toast((e as ApiError).message, 'err'); }
  };
  ACT['msg-mentor'] = async el => {
    if (S.role === 'guest') { go(withQuery('/auth', { mode: 'signup', next: `/mentors/${el.dataset.id}` })); toast('Create a free account to message mentors.', 'info'); return; }
    busy(el, true);
    try { const t = await api.post<Thread>('/api/threads', { mentorId: el.dataset.id }); go(`/messages/${t.id}`); }
    catch (e) { toast((e as ApiError).message, 'err'); busy(el, false); }
  };
  ACT['video'] = el => {
    const m = mentorById(el.dataset.id as string) as Mentor;
    openModal(`${m.name} — intro video`, `<div class="video-ph"><div><div class="play">▶</div>Intro video placeholder (max 2 min)<br><small style="color:#cfd2ea">Streamed from the video CDN; subtitles EN</small></div></div>`,
      `<a class="btn btn-primary" href="#/mentors/${m.id}">View full profile</a>`);
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
        <form class="hero-search" data-form="${act((el, ev) => { const f = el as HTMLFormElement; const v = formValues(f); go(withQuery('/mentors', { topic: v.topic, q: v.q })); })}">
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
    load($('#topics', root) as HTMLElement, () => api.get<Topic[]>('/api/topics'), {
      skeleton: skelCards(4, 'grid g4'),
      isEmpty: d => !d.length,
      empty: () => emptyState('No topics yet', 'Topics will appear when the first mentors are approved.'),
      ok: d => `<div class="grid g4">${d.map(t => `<a class="card card-tight card-link topic-tile" href="#/mentors?topic=${t.id}" style="color:inherit;text-decoration:none"><span class="ico">${t.icon}</span><span><b>${esc(t.name)}</b><br><small>${t.mentors} mentors</small></span></a>`).join('')}</div>`,
    });
    load($('#featured', root) as HTMLElement, () => api.get<{ items: MentorView[] }>('/api/mentors?featured=1&limit=4'), {
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
    const v = (k: string) => q.get(k) ?? '';
    const page = Number(q.get('page') || 1);
    root.innerHTML = `
    <div class="container">
      ${pageHead('Find a mentor', 'Vetted experts for 1:1 video sessions. Prices are per 60 minutes; intro sessions are 30 minutes at half price.')}
      <div class="split-left">
        <aside class="card sticky">
          <form data-form="filters" novalidate>
            ${field({ name: 'q', label: 'Keyword', value: v('q'), placeholder: 'e.g. roadmap, LLM, portfolio' })}
            ${field({ name: 'topic', label: 'Topic', type: 'select', value: v('topic'), options: [['', 'All topics'], ...DB.topics.map(t => [t.id, t.name] as [string, string])] })}
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
      const f = el as HTMLFormElement;
      const vals = validate(f, {
        priceMin: [V.num(0, 1000, 'Enter 0–1000.')],
        priceMax: [V.num(0, 1000, 'Enter 0–1000.'), (val, form) => { const mn = Number(formValues(form).priceMin || 0); return val && Number(val) < mn ? 'Max price must be greater than or equal to min price.' : null; }],
        q: [V.max(60)],
      });
      if (!vals) return;
      go(withQuery('/mentors', { q: vals.q, topic: vals.topic, priceMin: vals.priceMin, priceMax: vals.priceMax, time: vals.time, language: vals.language, super: vals.super, sort: v('sort') }));
    });
    on('sort', el => go(withQuery('/mentors', { ...params, sort: (el as HTMLSelectElement).value, page: undefined })));
    on('more', () => go(withQuery('/mentors', { ...params, page: String(page + 1) })));
    bindMentorCardActions();
    const apiQ = withQuery('/api/mentors', { ...params, limit: '4', page: String(page) });
    load($('#results', root) as HTMLElement, () => api.get<{ items: MentorView[]; total: number }>(apiQ), {
      skeleton: skelCards(3, 'stack'),
      isEmpty: d => !d.items.length,
      empty: () => { ($('#count') as HTMLElement).textContent = '0 mentors'; return emptyState('No mentors match your filters', 'Try a wider price range, another topic or “Any time”.', `<a class="btn btn-primary" href="#/mentors">Clear all filters</a>`); },
      ok: d => {
        ($('#count') as HTMLElement).textContent = `${plural(d.total, 'mentor')} found`;
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
    const loadReviews = () => load($('#reviews') as HTMLElement, () => api.get<{ items: Review[]; total: number }>(`/api/mentors/${p.id}/reviews?page=${reviewsPage}`), {
      isEmpty: d => !d.items.length,
      empty: () => emptyState('No reviews yet', 'This mentor is new on MentorHub. Intro sessions are covered by our satisfaction guarantee.'),
      ok: d => `<ul class="list">${d.items.map(r => `<li><div class="row-between"><b>${esc(r.author)}</b><small>${fmtLongDate(r.date)}</small></div>${stars(r.rating)}
        <p style="margin:6px 0">${esc(r.text)}</p><div class="chips">${r.tags.map(t => chip(t)).join('')}</div>
        ${r.reply ? `<div class="notice" style="margin-top:8px"><b>Mentor reply:</b> ${esc(r.reply)}</div>` : ''}</li>`).join('')}</ul>
        ${d.items.length < d.total ? `<button class="btn" data-act="more-reviews">Show more reviews</button>` : ''}`,
    });
    const loadWeek = () => {
      const from = new Date(); from.setDate(from.getDate() + weekOffset * 7);
      load($('#avail') as HTMLElement, () => api.get<{ timezone: string; days: { date: string; slots: Slot[] }[] }>(`/api/mentors/${p.id}/availability?from=${isoDay(from)}&days=7&minutes=60`), {
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
    load($('#prof', root) as HTMLElement, () => api.get<MentorView>(`/api/mentors/${p.id}`), {
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
function weekGrid(days: { date: string; slots: Slot[] }[], selected: string | null, actName = 'pick-slot'): string {
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
    const t = (m: string, l: string) => [l, withQuery('/auth', { mode: m, next: next || undefined })] as [string, string];
    root.innerHTML = `
    <div class="container" style="max-width:460px">
      <div class="card">
        ${tabs([t('login', 'Log in'), t('signup', 'Sign up'), t('reset', 'Forgot password')], withQuery('/auth', { mode, next: next || undefined }))}
        <div id="authBody"></div>
      </div>
      <p class="muted" style="font-size:12.5px;margin-top:12px">Prototype hints: log in with any email — include “mentor” or “admin” to enter that role; password <span class="kbd">wrong</span> shows the 401 error; sign-up with <span class="kbd">taken@example.com</span> shows the 409 error.</p>
    </div>`;
    const body = $('#authBody', root) as HTMLElement;
    const social = `<div class="grid g2" style="margin-bottom:14px"><button type="button" class="btn" data-act="social">Continue with Google</button><button type="button" class="btn" data-act="social">Continue with LinkedIn</button></div><div class="muted" style="text-align:center;font-size:13px;margin-bottom:14px">or with email</div>`;
    on('social', () => { setRole('mentee'); toast('Signed in with Google (simulated OAuth)'); go(next || '/home'); });
    if (mode === 'login') {
      body.innerHTML = `${social}<form data-form="login" novalidate>${formAlert()}
        ${field({ name: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com', attrs: 'autocomplete="email"' })}
        ${field({ name: 'password', label: 'Password', type: 'password', attrs: 'autocomplete="current-password"' })}
        <label class="check" style="margin-bottom:14px"><input type="checkbox" name="remember" checked> Keep me signed in for 30 days</label>
        <button class="btn btn-primary btn-block btn-lg">Log in</button></form>`;
      on('submit:login', async (el, ev) => {
        const f = el as HTMLFormElement;
        const v = validate(f, { email: [V.req('Enter your email.'), V.email()], password: [V.req('Enter your password.')] });
        if (!v) return;
        const btn = $('button.btn-primary', f); busy(btn, true);
        try {
          const r = await api.post<{ role: Role }>('/api/auth/login', v);
          setRole(r.role); toast(`Welcome back! Signed in as ${ROLE_LABEL[r.role]}.`);
          go(next || (r.role === 'mentor' ? '/mentor' : r.role === 'admin' ? '/admin' : '/home'));
        } catch (e) { apiErrToForm(f, e as ApiError); busy(btn, false); }
      });
    } else if (mode === 'signup') {
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
      on('submit:signup', async el => {
        const f = el as HTMLFormElement;
        const v = validate(f, {
          name: [V.req('Enter your name.'), V.min(2), V.max(80)],
          email: [V.req('Enter your email.'), V.email()],
          password: [V.req('Create a password.'), V.min(8, 'Use at least 8 characters.'), V.re(/(?=.*[A-Za-z])(?=.*\d)/, 'Include at least one letter and one digit.')],
          terms: [V.checked('You need to accept the Terms to create an account.')],
        });
        if (!v) return;
        const btn = $('button.btn-primary', f); busy(btn, true);
        try {
          const r = await api.post<{ next: string }>('/api/auth/register', v);
          setRole('mentee'); DB.profile.name = v.name; DB.profile.email = v.email;
          toast('Account created. We sent a confirmation link to ' + v.email);
          go(next || r.next);
        } catch (e) { apiErrToForm(f, e as ApiError); busy(btn, false); }
      });
    } else {
      body.innerHTML = `<form data-form="reset" novalidate>${formAlert()}<p class="muted">Enter the email you signed up with. We will send a link to set a new password (valid 60 minutes).</p>
        ${field({ name: 'email', label: 'Email', type: 'email' })}<button class="btn btn-primary btn-block">Send reset link</button></form>`;
      on('submit:reset', async el => {
        const f = el as HTMLFormElement;
        const v = validate(f, { email: [V.req('Enter your email.'), V.email()] });
        if (!v) return;
        const btn = $('button.btn-primary', f); busy(btn, true);
        try { await api.post('/api/auth/password-reset', v); body.innerHTML = successState('Check your inbox', `If an account exists for <b>${esc(v.email)}</b>, a reset link is on its way. It expires in 60 minutes.`, `<a class="btn" href="#/auth?mode=login">Back to log in</a>`); }
        catch (e) { apiErrToForm(f, e as ApiError); busy(btn, false); }
      });
    }
    $$('.toggle-chip input', root).forEach(i => i.addEventListener('change', () => $$('.toggle-chip', root).forEach(c => c.classList.toggle('on', ($('input', c) as HTMLInputElement).checked))));
  },
});

/* ---------------- P0 Screen map (prototype index) ---------------- */
defineScreen({
  id: 'P0', path: '/map', title: 'Screen map', group: 'Prototype', roles: null,
  render(root) {
    const groups = ['Public', 'Mentee', 'Shared', 'Mentor', 'Admin'];
    const example: Record<string, string> = { '/mentors/:id': '/mentors/m1', '/book/:mentorId': '/book/m1?type=intro', '/booking/:id/confirmed': '/booking/s2/confirmed', '/room/:id': '/room/s1', '/sessions/:id/review': '/sessions/s4/review', '/plans/:mentorId': '/plans/m3', '/messages/:id': '/messages/t1' };
    const roleFor: Record<string, Role> = { Public: 'guest', Mentee: 'mentee', Shared: 'mentee', Mentor: 'mentor', Admin: 'admin' };
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
    on('open-as', el => { setRole(el.dataset.role as Role); go(el.dataset.href as string); });
  },
});

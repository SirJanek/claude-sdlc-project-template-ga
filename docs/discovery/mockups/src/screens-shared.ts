/* Shared screens (mentee + mentor): C1 Messages, C2 Notifications, C3 Account settings. */

type ThreadView = Thread & { last?: { from: string; text: string; at: string } };

/* ---------------- C1 Messages ---------------- */
function renderMessages(root: HTMLElement, threadId: string | undefined): void {
  root.innerHTML = `<div class="container">${pageHead('Messages', S.role === 'mentor' ? 'Conversations with your mentees.' : 'Conversations with your mentors.')}<div id="inbox"></div></div>`;
  const token = S.renderToken;
  load($('#inbox', root) as HTMLElement, () => api.get<ThreadView[]>('/api/threads'), {
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
      on('filter-threads', el => { const q = (el as HTMLInputElement).value.toLowerCase(); $$('.thread').forEach(t => (t.style.display = (t.dataset.name ?? '').includes(q) ? '' : 'none')); });
      const convo = $('#convo') as HTMLElement;
      const drawConvo = (t: Thread) => {
        convo.innerHTML = `
          <div class="convo-head row-between"><div class="row">${avatar(t.withName, t.withColor, 'sm')}<b>${esc(t.withName)}</b></div>
            ${S.role === 'mentee' && t.mentorId ? `<div class="row"><a class="btn btn-sm" href="#/mentors/${t.mentorId}">Profile</a><a class="btn btn-sm btn-primary" href="#/book/${t.mentorId}?type=regular">Book</a></div>` : ''}</div>
          <div class="msgs" id="msgs">${t.messages.length ? t.messages.map(m => `<div class="msg ${m.from === 'me' ? 'me' : m.from === 'sys' ? 'sys' : ''}">${esc(m.text)}<small>${fmtDT(m.at)}</small></div>`).join('') : `<div class="muted" style="margin:auto;text-align:center">Say hello 👋<br><small>Tip: describe your goal and ask about availability.</small></div>`}</div>
          <form class="composer" data-form="send" novalidate>
            ${!t.paidSession ? `<div class="notice notice-warn" style="margin-bottom:8px;font-size:12.5px">🛡 For your safety, contact details (email, phone, links) are hidden until your first completed session. Keep payments on MentorHub to stay protected.</div>` : ''}
            <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1"><textarea class="input" name="text" rows="2" placeholder="Write a message…" data-counter="2000" aria-label="Message"></textarea><div class="err" data-err="text"></div></div>
            <button class="btn btn-primary">Send</button></div></form>`;
        const ms = $('#msgs') as HTMLElement; ms.scrollTop = ms.scrollHeight;
      };
      api.get<Thread>(`/api/threads/${active}/messages`).then(t => {
        if (token !== S.renderToken) return;
        drawConvo(t);
        if (t.unread) api.post(`/api/threads/${t.id}/read`).catch(() => undefined);
        on('submit:send', async el => {
          const f = el as HTMLFormElement;
          const v = validate(f, { text: [V.req('Write a message first.'), V.max(2000)] });
          if (!v) return;
          const btn = $('button.btn-primary', f); busy(btn, true);
          try { const t2 = await api.post<Thread>(`/api/threads/${t.id}/messages`, { text: v.text.trim() }); drawConvo(t2); }
          catch (e) { busy(btn, false); apiErrToForm(f, e as ApiError); }
        });
      }).catch((e: ApiError) => { if (token === S.renderToken) convo.innerHTML = `<div style="padding:16px">${errorState(e.message, act(() => go(`/messages/${active}`)))}</div>`; });
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
    const icon: Record<string, string> = { session: '📅', message: '💬', payment: '💳', system: '🔔' };
    const reload = () => load($('#nl', root) as HTMLElement, () => api.get<{ items: AppNotification[]; unread: number }>(`/api/notifications?kind=${kind}`), {
      isEmpty: d => !d.items.length,
      empty: () => emptyState('You are all caught up', 'New notifications about sessions, messages and payments will show up here.'),
      ok: d => {
        unreadCount = d.unread; renderShellBell();
        const today = d.items.filter(n => isoDay(new Date(n.at)) === isoDay(new Date()));
        const earlier = d.items.filter(n => !today.includes(n));
        const row = (n: AppNotification) => `<li class="row" style="flex-wrap:nowrap;cursor:pointer" data-go="${n.href}"><span style="font-size:20px">${icon[n.kind]}</span><div style="flex:1">${n.read ? '' : '<span class="badge-dot"></span> '}${n.read ? esc(n.text) : `<b>${esc(n.text)}</b>`}<br><small>${relTime(n.at)}</small></div><span class="muted">›</span></li>`;
        return `<div class="card">${today.length ? `<h4>Today</h4><ul class="list">${today.map(row).join('')}</ul>` : ''}${earlier.length ? `<h4 style="margin-top:12px">Earlier</h4><ul class="list">${earlier.map(row).join('')}</ul>` : ''}</div>`;
      },
    });
    on('read-all', async el => { busy(el, true); try { await api.post('/api/notifications/read-all'); toast('All notifications marked as read'); reload(); } catch (e) { toast((e as ApiError).message, 'err'); } busy(el, false); });
    reload();
  },
});
function renderShellBell(): void {
  const b = $('.bell');
  if (b) b.innerHTML = `🔔${unreadCount ? `<b>${unreadCount}</b>` : ''}`;
}

/* ---------------- C3 Account settings ---------------- */
defineScreen({
  id: 'C3', path: '/settings', title: 'Account settings', group: 'Shared', roles: ['mentee', 'mentor', 'admin'],
  render(root, _p, q) {
    const tab = q.get('tab') || 'profile';
    root.innerHTML = `<div class="container" style="max-width:820px">${pageHead('Account settings')}
      ${tabs([['Profile', '/settings?tab=profile'], ['Security', '/settings?tab=security'], ['Notifications', '/settings?tab=notifications'], ['Privacy', '/settings?tab=privacy']], `/settings?tab=${tab}`)}<div id="st"></div></div>`;
    const box = $('#st', root) as HTMLElement;
    if (tab === 'profile') {
      load(box, () => api.get<any>('/api/me'), {
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
      on('submit:profile', async el => {
        const f = el as HTMLFormElement;
        const v = validate(f, { name: [V.req('Enter your name.'), V.min(2), V.max(80)], email: [V.req('Enter your email.'), V.email()], goals: [V.max(300)] });
        if (!v) return;
        const btn = $('button.btn-primary', f); busy(btn, true);
        try { await api.patch('/api/me', v); toast('Profile saved'); } catch (e) { apiErrToForm(f, e as ApiError); }
        busy(btn, false);
      });
    } else if (tab === 'security') {
      box.innerHTML = `<form class="card" data-form="pwd" novalidate>${formAlert()}<h3>Change password</h3>
        ${field({ name: 'current', label: 'Current password', type: 'password', hint: 'Prototype: “wrong” shows the server error.' })}
        ${field({ name: 'next', label: 'New password', type: 'password', hint: 'At least 8 characters, including a letter and a digit.' })}
        ${field({ name: 'confirm', label: 'Repeat new password', type: 'password' })}
        <button class="btn btn-primary">Update password</button></form>
        <div class="card" style="margin-top:16px"><h3>Two-step verification</h3><p class="muted">Add a code from an authenticator app when you log in on a new device.</p><button class="btn" data-act="2fa">Set up</button></div>`;
      on('2fa', () => toast('2FA setup flow is out of MVP scope', 'info'));
      on('submit:pwd', async el => {
        const f = el as HTMLFormElement;
        const v = validate(f, {
          current: [V.req('Enter your current password.')],
          next: [V.req('Enter a new password.'), V.min(8, 'Use at least 8 characters.'), V.re(/(?=.*[A-Za-z])(?=.*\d)/, 'Include at least one letter and one digit.'), (val, form) => (val === formValues(form).current ? 'The new password must be different from the current one.' : null)],
          confirm: [V.req('Repeat the new password.'), V.same('next', 'Passwords do not match.')],
        });
        if (!v) return;
        const btn = $('button.btn-primary', f); busy(btn, true);
        try { await api.put('/api/me/password', v); f.reset(); toast('Password updated. Other devices were signed out.'); } catch (e) { apiErrToForm(f, e as ApiError); }
        busy(btn, false);
      });
    } else if (tab === 'notifications') {
      const rows: [string, string][] = [['session', 'Session bookings, reminders and changes'], ['message', 'New messages'], ['payment', 'Payments, renewals and payouts']];
      load(box, () => api.get<Record<string, boolean>>('/api/me/notification-preferences'), {
        ok: p => `<form class="card" data-form="prefs"><div class="table-wrap"><table class="tbl"><thead><tr><th>Notification</th><th>Email</th><th>Push</th></tr></thead><tbody>
          ${rows.map(([k, l]) => `<tr><td>${l}</td><td><label class="switch"><input type="checkbox" name="${k}_email" ${p[k + '_email'] ? 'checked' : ''}><i></i></label></td><td><label class="switch"><input type="checkbox" name="${k}_push" ${p[k + '_push'] ? 'checked' : ''}><i></i></label></td></tr>`).join('')}
          <tr><td>Tips and mentor recommendations</td><td><label class="switch"><input type="checkbox" name="marketing_email" ${p.marketing_email ? 'checked' : ''}><i></i></label></td><td>—</td></tr></tbody></table></div>
          <p class="muted" style="font-size:13px">Session reminders 24 h and 1 h before the start are always sent by email.</p><button class="btn btn-primary">Save preferences</button></form>`,
      });
      on('submit:prefs', async el => {
        const f = el as HTMLFormElement;
        const body: Record<string, boolean> = {};
        $$('input[type="checkbox"]', f).forEach(i => (body[(i as HTMLInputElement).name] = (i as HTMLInputElement).checked));
        const btn = $('button.btn-primary', f); busy(btn, true);
        try { await api.put('/api/me/notification-preferences', body); toast('Preferences saved'); } catch (e) { toast((e as ApiError).message, 'err'); }
        busy(btn, false);
      });
    } else {
      box.innerHTML = `<div class="card"><h3>Download your data</h3><p class="muted">Get a copy of your profile, sessions, messages and invoices (GDPR art. 15/20). We email a link within 24 h.</p><button class="btn" data-act="export">Request data export</button></div>
        <form class="card" style="margin-top:16px;border-color:#f3c1c6" data-form="del" novalidate>${formAlert()}<h3>Delete account</h3>
          <p class="muted">Your profile and messages are deleted. Invoices are kept for 5 years as required by tax law. Active plans are cancelled; unused credits are lost.</p>
          ${field({ name: 'confirm', label: 'Type DELETE to confirm' })}
          <button class="btn btn-danger">Delete my account</button></form>`;
      on('export', async el => { busy(el, true); try { await api.post('/api/me/data-export'); toast('Export requested — link will arrive by email within 24 h'); } catch (e) { toast((e as ApiError).message, 'err'); } busy(el, false); });
      on('submit:del', async el => {
        const f = el as HTMLFormElement;
        const v = validate(f, { confirm: [V.req('Type DELETE to confirm.'), val => (val.trim() === 'DELETE' ? null : 'Type DELETE in capital letters.')] });
        if (!v) return;
        const btn = $('button.btn-danger', f); busy(btn, true);
        try { await api.del('/api/me'); setRole('guest'); toast('Your account has been deleted'); go('/'); } catch (e) { busy(btn, false); apiErrToForm(f, e as ApiError); }
      });
    }
  },
});

/* Admin screens: A1 Overview, A2 Mentor applications, A3 Disputes. */

/* ---------------- A1 Overview ---------------- */
defineScreen({
  id: 'A1', path: '/admin', title: 'Admin overview', group: 'Admin', roles: ['admin'],
  render(root) {
    root.innerHTML = `<div class="container">${pageHead('Marketplace overview', 'Last 30 days')}<div id="ov"></div></div>`;
    load($('#ov', root) as HTMLElement, () => api.get<any>('/api/admin/metrics'), {
      skeleton: `${skelCards(4, 'grid g4')}${skelLines(6)}`,
      ok: d => {
        const max = Math.max(...d.weekly, 1);
        return `<div class="grid g4">
          <div class="card"><div class="kpi-label">GMV</div><div class="kpi">${money(d.gmv30)}</div><div class="kpi-delta">▲ 8% vs previous 30 d</div></div>
          <div class="card"><div class="kpi-label">Sessions held</div><div class="kpi">${d.sessions30.toLocaleString('en-US')}</div></div>
          <div class="card"><div class="kpi-label">Intro → plan conversion</div><div class="kpi">${d.trialToPlan}%</div></div>
          <div class="card"><div class="kpi-label">New mentees</div><div class="kpi">${d.newMentees30}</div><div class="kpi-label">${d.activeMentors} active mentors · NPS ${d.nps}</div></div></div>
        <div class="split" style="margin-top:16px"><section class="card"><h2>Sessions per week</h2>${d.weekly.length ? `<div class="bars">${d.weekly.map((v: number, i: number) => `<div class="b"><span>${v}</span><i class="${i === d.weekly.length - 1 ? 'cur' : ''}" style="height:${(v / max) * 110}px"></i>W${i + 1}</div>`).join('')}</div>` : '<p class="muted">No data.</p>'}</section>
          <aside class="stack-lg"><section class="card"><h3>Queues</h3><ul class="list">
            <li class="row-between"><span>Mentor applications</span><a class="btn btn-sm ${d.pendingApplications ? 'btn-primary' : ''}" href="#/admin/applications">${d.pendingApplications} pending</a></li>
            <li class="row-between"><span>Open disputes</span><a class="btn btn-sm ${d.openDisputes ? 'btn-primary' : ''}" href="#/admin/disputes">${d.openDisputes} open</a></li></ul></section>
            <section class="card"><h3>Recent activity</h3>${d.activity.length ? `<ul class="list">${d.activity.map((a: any) => `<li><small>${relTime(a.at)}</small><br>${esc(a.text)}</li>`).join('')}</ul>` : '<p class="muted">Nothing new.</p>'}</section></aside></div>`;
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
    const reload = () => load($('#apps', root) as HTMLElement, () => api.get<{ items: Application[]; counts: Record<string, number> }>(`/api/admin/mentor-applications?status=${st}`), {
      isEmpty: d => { ($('#tabsBox') as HTMLElement).innerHTML = tabsFor(d.counts); return !d.items.length; },
      empty: () => emptyState(st === 'pending' ? 'Queue is empty' : 'Nothing here', st === 'pending' ? 'All applications have been reviewed. 🎉' : 'No applications with this status.'),
      ok: d => `<div class="card table-wrap"><table class="tbl"><thead><tr><th>Applicant</th><th>Topics</th><th class="num">Exp.</th><th class="num">Rate</th><th>Checks</th><th>Submitted</th></tr></thead><tbody>
        ${d.items.map(a => `<tr class="clickable" data-act="open" data-id="${a.id}"><td><b>${esc(a.name)}</b><br><small>${esc(a.headline)}</small></td><td>${a.topics.map(t => DB.topics.find(x => x.id === t)?.name ?? t).join(', ')}</td><td class="num">${a.years} y</td><td class="num">${money(a.rate)}</td>
          <td>${[['ID', a.checks.identity], ['LinkedIn', a.checks.linkedin], ['Video', a.checks.video]].map(([l, ok]) => chip(`${ok ? '✓' : '✗'} ${l}`, ok ? 'ok' : 'warn')).join(' ')}</td><td>${relTime(a.submitted)}</td></tr>`).join('')}</tbody></table></div>`,
    });
    const tabsFor = (c: Record<string, number>) => tabs([['Pending (' + (c.pending ?? 0) + ')', '/admin/applications?status=pending'], ['Changes requested (' + (c.changes ?? 0) + ')', '/admin/applications?status=changes'], ['Approved', '/admin/applications?status=approved'], ['Rejected', '/admin/applications?status=rejected']], `/admin/applications?status=${st}`);
    on('open', async el => {
      openModal('Application', skelLines(8), '', true);
      try {
        const a = await api.get<Application>(`/api/admin/mentor-applications/${el.dataset.id}`);
        const decided = a.status === 'approved' || a.status === 'rejected';
        openModal(`Application · ${a.name}`, `
          <div class="row" style="margin-bottom:10px">${avatar(a.name, '#7a4fd8', 'md')}<div><b>${esc(a.headline)}</b><br><small>${esc(a.email)} · ${esc(a.country)} · ${a.years} years · ${money(a.rate)}/h · ${a.hoursPerWeek} h/week</small></div>${statusChip(a.status)}</div>
          <div class="grid g3" style="margin-bottom:12px">${[['Identity (KYC)', a.checks.identity], ['LinkedIn matches', a.checks.linkedin], ['Intro video', a.checks.video]].map(([l, ok]) => `<div class="card card-tight">${ok ? '✅' : '⚠️'} ${l}</div>`).join('')}</div>
          <h4>Bio</h4><p>${esc(a.bio)}</p>
          <p><a href="${esc(a.linkedin)}" target="_blank" rel="noopener">LinkedIn profile ↗</a>${a.video ? ` · <a href="${esc(a.video)}" target="_blank" rel="noopener">Intro video ↗</a>` : ' · <span class="muted">no video</span>'}</p>
          ${a.note ? `<div class="notice">Previous note: ${esc(a.note)}</div>` : ''}
          ${decided ? '' : `<form data-form="decision" novalidate style="margin-top:12px">${formAlert()}
            ${field({ name: 'decision', label: 'Decision', type: 'select', options: [['', 'Select a decision'], ['approve', 'Approve — profile goes live'], ['changes', 'Request changes'], ['reject', 'Reject']] })}
            ${field({ name: 'reason', label: 'Rejection reason', type: 'select', options: [['', '—'], ['experience', 'Not enough relevant experience'], ['quality', 'Profile quality below guidelines'], ['verification', 'Identity / experience could not be verified'], ['policy', 'Policy violation']] , hint: 'Required when rejecting.' })}
            ${field({ name: 'message', label: 'Message to the applicant', type: 'textarea', rows: 3, counter: 1000, hint: 'Required for “Request changes” and “Reject” (min. 20 characters).' })}</form>`}`,
          decided ? `<button class="btn" data-act="modal-close">Close</button>` : `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="decide" data-id="${a.id}">Confirm decision</button>`, true);
      } catch (e) { openModal('Application', errorState((e as ApiError).message, act(() => (ACT['open'] as Handler)(el, new Event('click')))), `<button class="btn" data-act="modal-close">Close</button>`); }
    });
    on('decide', async b => {
      const f = $('form[data-form="decision"]') as HTMLFormElement;
      const v = validate(f, {
        decision: [V.req('Choose a decision.')],
        reason: [(val, form) => (formValues(form).decision === 'reject' && !val ? 'Choose a rejection reason.' : null)],
        message: [(val, form) => (['changes', 'reject'].includes(formValues(form).decision) && val.trim().length < 20 ? 'Write at least 20 characters so the applicant knows what to do.' : null), V.max(1000)],
      });
      if (!v) return;
      busy(b, true);
      const id = b.dataset.id as string;
      try {
        if (v.decision === 'approve') await api.post(`/api/admin/mentor-applications/${id}/approve`);
        if (v.decision === 'changes') await api.post(`/api/admin/mentor-applications/${id}/request-changes`, { message: v.message });
        if (v.decision === 'reject') await api.post(`/api/admin/mentor-applications/${id}/reject`, { reason: v.reason, note: v.message });
        closeModal(); toast(v.decision === 'approve' ? 'Approved — the mentor was notified and the profile is live' : v.decision === 'changes' ? 'Changes requested — applicant notified' : 'Application rejected — applicant notified'); reload();
      } catch (e) { busy(b, false); apiErrToForm(f, e as ApiError); }
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
    const KIND: Record<string, string> = { mentor_no_show: 'Mentor no-show', quality: 'Quality / conduct', technical: 'Technical', payment: 'Payment' };
    const reload = () => load($('#ds', root) as HTMLElement, () => api.get<{ items: Dispute[] }>(`/api/admin/disputes?status=${st}`), {
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
      const x = DB.disputes.find(d => d.id === el.dataset.id) as Dispute;
      openModal(`Resolve ${x.id}`, `<form data-form="res" novalidate>${formAlert()}
        ${field({ name: 'decision', label: 'Decision', type: 'select', options: [['', 'Select'], ['Full refund to mentee', 'Full refund to mentee'], ['Partial refund', 'Partial refund'], ['Free replacement session', 'Free replacement session'], ['Claim rejected', 'Claim rejected — mentor paid']] })}
        ${field({ name: 'amount', label: 'Refund amount (USD)', type: 'number', optional: true, attrs: `min="0" max="${x.amount}" step="0.01"`, hint: `Only for partial refunds. Max ${money(x.amount)}.` })}
        ${field({ name: 'message', label: 'Message to both parties', type: 'textarea', rows: 3, counter: 1000 })}
        <label class="check"><input type="checkbox" name="strike" value="1"> Add a reliability strike to the mentor (3 strikes = profile paused)</label></form>`,
        `<button class="btn" data-act="modal-close">Close</button><button class="btn btn-primary" data-act="res-ok">Resolve dispute</button>`);
      on('res-ok', async b => {
        const f = $('form[data-form="res"]') as HTMLFormElement;
        const v = validate(f, {
          decision: [V.req('Choose a decision.')],
          amount: [(val, form) => (formValues(form).decision === 'Partial refund' && !val ? 'Enter the refund amount.' : null), V.num(0.01, Math.max(0.01, x.amount), `Enter up to ${money(x.amount)}.`)],
          message: [V.req('Explain the decision to both parties.'), V.min(20), V.max(1000)],
        });
        if (!v) return;
        busy(b, true);
        try { await api.post(`/api/admin/disputes/${x.id}/resolve`, v); closeModal(); toast(`${x.id} resolved — both parties notified`); reload(); } catch (e) { busy(b, false); apiErrToForm(f, e as ApiError); }
      });
    });
    reload();
  },
});

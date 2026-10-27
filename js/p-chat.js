/* Chat anonyme modéré : lecture en quasi-direct (actualisation périodique), envoi filtré, signalement */
MPP.page(async ({ sb, S, el }) => {
  const { esc, icon, $ } = MPP;
  const dev = MPP.device();
  const msgs = new Map();
  let lastMaj = '';
  let status = { ouvert: true };
  const mine = new Set(MPP.store.get('mine_msgs', []));
  const reported = new Set(MPP.store.get('reported_msgs', []));
  const MOTIFS = {
    hors_horaires: () => 'Le chat est ouvert ' + (status.debut ? 'de ' + MPP.hhmm(status.debut) + ' à ' + MPP.hhmm(status.fin) : 'à certaines heures') + '. Il est en lecture seule pour le moment.',
    pas_de_moderateur: () => "Aucun modérateur n'est connecté : le chat est en lecture seule pour votre sécurité.",
    ferme_manuel: () => 'Le chat est fermé par le bureau pour le moment (lecture seule).'
  };

  el.innerHTML = '<div class="page-head"><div class="wrap"><h1 class="title">Chat anonyme</h1><p class="lead">Parlez librement, sans compte ni nom. Respectez la <a href="charte.html">charte</a> : la critique est permise, les insultes et les numéros de téléphone non.</p></div></div>' +
    '<section class="section" style="padding-top:12px"><div class="wrap" style="max-width:760px"><div class="chat">' +
    '<div class="chat-head"><span id="state"><span class="dot"></span>Connexion…</span><span class="muted small">Messages modérés</span></div>' +
    '<div class="msgs" id="msgs" aria-live="polite"><div class="loading">Chargement des messages…</div></div>' +
    '<div id="warn" class="chat-warn" hidden></div>' +
    '<form class="composer" id="form"><textarea id="txt" rows="1" maxlength="500" placeholder="Écrire un message…" aria-label="Votre message"></textarea><button class="btn" type="submit" aria-label="Envoyer">' + icon('send') + '</button></form></div>' +
    '<p class="small muted mt">Un pseudo automatique vous est attribué. Appuyez sur ' + icon('flag') + ' pour signaler un message : à ' + esc(S.seuil_signalements || 2) + ' signalements, il est masqué en attendant la modération.</p></div></section>';

  const list = $('#msgs'), txt = $('#txt'), form = $('#form'), warn = $('#warn');

  function render(stick) {
    const all = Array.from(msgs.values()).sort((a, b) => a.id - b.id);
    const pinned = all.filter((m) => m.officiel && m.epingle && m.statut === 'visible');
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    const one = (m) => {
      const cls = ['msg'];
      let body;
      if (m.statut === 'supprime') { cls.push('removed'); body = 'Message supprimé par la modération'; }
      else if (m.statut === 'masque') { cls.push('removed'); body = 'Message en cours d\'examen par la modération'; }
      else body = esc(m.contenu);
      if (m.officiel) cls.push('official');
      if (mine.has(m.id)) cls.push('me');
      const canReport = m.statut === 'visible' && !m.officiel && !m.retabli && !mine.has(m.id) && !reported.has(m.id);
      const who = m.officiel ? '<span class="chip gold">' + icon('megaphone') + ' Bureau MPPE</span>' + (m.poste ? '<span>' + esc(m.poste) + '</span>' : '') : '<span>' + (mine.has(m.id) ? 'Vous · ' : '') + esc(m.pseudo) + '</span>';
      return '<div class="' + cls.join(' ') + '" data-id="' + m.id + '">' + (m.statut === 'visible' || m.officiel ? '<div class="who">' + who + '<time datetime="' + esc(m.created_at) + '">' + esc(MPP.fmtTime(m.created_at)) + '</time>' + (canReport ? '<button class="rep" type="button" data-rep="' + m.id + '" aria-label="Signaler ce message" title="Signaler">' + icon('flag') + '</button>' : '') + '</div>' : '') + '<p>' + body + '</p></div>';
    };
    list.innerHTML = (pinned.length ? '<div class="stack" style="margin-bottom:4px">' + pinned.slice(-2).map((m) => one(m).replace('class="msg official"', 'class="msg official" style="border-width:2px"') + '<div class="pinned-tag" style="margin-top:-6px">Épinglé</div>').join('') + '</div>' : '') +
      (all.length ? all.filter((m) => !(m.officiel && m.epingle && m.statut === 'visible' && pinned.slice(-2).includes(m))).map(one).join('') : '<div class="empty">Pas encore de message. Lancez la discussion !</div>');
    if (stick || nearBottom) list.scrollTop = list.scrollHeight;
  }

  async function refresh(first) {
    let rows;
    if (first) rows = (await MPP.q(sb.from('chat_public').select('*').order('id', { ascending: false }).limit(80))).reverse();
    else rows = await MPP.q(sb.from('chat_public').select('*').gt('maj_at', lastMaj).order('maj_at').limit(200));
    let changed = first;
    rows.forEach((r) => { const p = msgs.get(r.id); if (!p || p.maj_at !== r.maj_at) changed = true; msgs.set(r.id, r); if (r.maj_at > lastMaj) lastMaj = r.maj_at; });
    if (changed) render(first);
  }
  async function refreshStatus() {
    try {
      status = await MPP.rpc('chat_status');
      $('#state').innerHTML = '<span class="dot ' + (status.ouvert ? 'on' : '') + '"></span>' + (status.ouvert ? 'Chat ouvert' : 'Lecture seule');
      txt.disabled = !status.ouvert; txt.placeholder = status.ouvert ? 'Écrire un message…' : 'Chat en lecture seule';
      $('button', form).disabled = !status.ouvert;
      if (!status.ouvert && MOTIFS[status.raison]) { warn.hidden = false; warn.textContent = MOTIFS[status.raison](); warn.style.background = 'var(--gold-l)'; warn.style.color = '#5a4300'; }
      else if (warn.dataset.err !== '1') warn.hidden = true;
    } catch (e) { /* ignore */ }
  }
  const showErr = (m) => { warn.hidden = false; warn.dataset.err = '1'; warn.style.background = ''; warn.style.color = ''; warn.textContent = m; };
  const clearErr = () => { warn.dataset.err = ''; if (status.ouvert) warn.hidden = true; };

  async function send() {
    const text = txt.value.trim();
    if (!text || !status.ouvert) return;
    const pre = MPP_FILTERS.contacts(text);
    if (pre) { showErr(MPP_FILTERS.messages[pre]); return; }
    clearErr();
    const btn = $('button', form); btn.disabled = true;
    try {
      const r = await MPP.rpc('send_message', { p_device: dev, p_content: text });
      if (r.ok) { mine.add(r.id); MPP.store.set('mine_msgs', Array.from(mine).slice(-200)); txt.value = ''; txt.style.height = ''; await refresh(false); list.scrollTop = list.scrollHeight; }
      else if (r.raison) { await refreshStatus(); showErr(r.message); }
      else showErr(r.message);
    } catch (e) { showErr('Envoi impossible : ' + e.message); } finally { btn.disabled = !status.ouvert; txt.focus(); }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); send(); });
  txt.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  txt.addEventListener('input', () => { txt.style.height = 'auto'; txt.style.height = Math.min(120, txt.scrollHeight) + 'px'; if (warn.dataset.err === '1') clearErr(); });
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-rep]'); if (!b) return;
    const id = Number(b.dataset.rep);
    if (!(await MPP.confirm('Signaler ce message à la modération ?', { ok: 'Signaler', danger: true }))) return;
    try {
      const r = await MPP.rpc('report_content', { p_type: 'chat', p_id: id, p_device: dev });
      MPP.toast(r.message || 'Signalement envoyé', r.ok ? 'ok' : 'error');
      if (r.ok) { reported.add(id); MPP.store.set('reported_msgs', Array.from(reported)); }
      await refresh(false); render(false);
    } catch (err) { MPP.toast(err.message, 'error'); }
  });

  await refreshStatus();
  await refresh(true);
  let n = 0;
  MPP.poll(async () => { await refresh(false); if (++n % 4 === 0) await refreshStatus(); }, 5000);
});

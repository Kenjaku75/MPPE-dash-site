/* Avis mensuel sur le bureau : la zone se déverrouille pendant les derniers jours de chaque mois */
MPP.page(async ({ sb, S, el }) => {
  const { esc, icon, $ } = MPP;
  const dev = MPP.device();
  const st = await MPP.rpc('avis_status');
  const [avis, reps, bilans] = await Promise.all([
    MPP.q(sb.from('avis_public').select('*').order('created_at', { ascending: false })),
    MPP.q(sb.from('avis_reponses').select('*').order('created_at')),
    MPP.q(sb.from('bilans_mensuels').select('*').order('mois', { ascending: false }))
  ]);
  const reported = new Set(MPP.store.get('reported_avis', []));
  const THEMES = [['travail', 'Travail accompli'], ['communication', 'Communication'], ['ecoute', 'Écoute des étudiants'], ['promesses', 'Respect des promesses']];
  const starsRo = (n) => '<span class="row" style="gap:2px;color:var(--gold-d)" aria-label="' + n + ' sur 5">' + [1, 2, 3, 4, 5].map((i) => '<span class="' + (i <= n ? '' : 'muted') + '" style="opacity:' + (i <= n ? 1 : .35) + '">' + MPP.icon('star').replace('<svg ', '<svg style="fill:' + (i <= n ? 'currentColor' : 'none') + '" ') + '</span>').join('') + '</span>';

  const done = MPP.store.get('avis_done', {});
  let top;
  if (!st.ouvert) {
    const days = Math.max(1, Math.ceil((MPP.parseDate(st.debut) - MPP.parseDate(MPP.ymd(new Date()))) / 864e5));
    top = '<div class="lockbox"><div class="big">' + icon('lock') + '</div><h2>La zone d\'avis est verrouillée</h2><p class="muted" style="max-width:46ch;margin:0 auto 14px">Chaque mois, pendant <b>les derniers jours du mois</b>, vous pouvez juger le travail du bureau : ce qui va, ce qui ne va pas, ce que vous attendez.</p>' +
      '<div class="alert warn" style="display:inline-block;margin:0"><b>Prochaine ouverture : ' + esc(MPP.fmtDay(st.debut)) + '</b> (dans ' + days + ' jour' + (days > 1 ? 's' : '') + ')</div></div>';
  } else if (done[st.mois]) {
    top = '<div class="alert ok"><b>Merci !</b> Votre avis de ' + esc(MPP.fmtMonth(st.mois)) + ' a bien été envoyé au bureau. La zone reste ouverte jusqu\'au ' + esc(MPP.fmtDate(st.fin)) + '.</div>';
  } else {
    top = '<form id="f" class="card form-card" novalidate><div class="alert ok" style="margin-top:0"><b>La zone est ouverte !</b> Donnez votre avis de ' + esc(MPP.fmtMonth(st.mois)) + ' jusqu\'au ' + esc(MPP.fmtDate(st.fin)) + '. Anonyme : aucun nom, aucun compte. Un avis par appareil et par mois.</div>' +
      '<div class="field"><span>Note globale du bureau <span class="muted" style="font-weight:400">(obligatoire)</span></span><div class="stars" data-k="note" role="radiogroup" aria-label="Note globale">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" class="star" data-n="' + n + '" aria-label="' + n + ' sur 5">' + icon('star') + '</button>').join('') + '</div></div>' +
      '<details class="faq" style="margin-bottom:14px"><summary>Noter par thème (facultatif)</summary><div class="a">' + THEMES.map(([k, l]) => '<div class="field"><span>' + l + '</span><div class="stars" data-k="' + k + '">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" class="star" data-n="' + n + '" aria-label="' + n + ' sur 5">' + icon('star') + '</button>').join('') + '</div></div>').join('') + '</div></details>' +
      '<label class="field"><span>Votre commentaire</span><textarea name="commentaire" maxlength="1000" placeholder="Qu\'est-ce qui va bien ? Qu\'est-ce qui ne va pas ?"></textarea></label>' +
      '<label class="field"><span>Qu\'attendez-vous du bureau le mois prochain ?</span><textarea name="attente" maxlength="500" style="min-height:80px"></textarea></label>' +
      '<div id="msg"></div><button class="btn btn-block" type="submit">' + icon('send') + ' Envoyer mon avis</button><p class="small muted mt" style="margin-bottom:0">Pas de numéros, liens ni insultes. La critique n\'est jamais supprimée pour son seul contenu d\'opinion. <a href="charte.html">Charte</a>.</p></form>';
  }

  // ---- moyennes par mois ----
  const byMonth = {};
  avis.forEach((a) => { (byMonth[a.mois] = byMonth[a.mois] || []).push(a); });
  const months = Object.keys(byMonth).sort();
  const avg = (arr) => arr.reduce((s, a) => s + a.note_globale, 0) / arr.length;
  const overall = avis.length ? avg(avis) : null;
  const chart = S.avis_afficher_moyenne !== false && months.length
    ? '<div class="card"><div class="row between"><div><div class="lbl muted small">Note moyenne (tous les mois)</div><div class="avg">' + String(overall.toFixed(1)).replace('.', ',') + '<small style="font-size:1rem;color:var(--muted)"> / 5</small></div></div><div class="muted small">' + avis.length + ' avis</div></div>' +
      '<div class="months" aria-label="Évolution de la note par mois">' + months.slice(-6).map((m) => { const a = avg(byMonth[m]); return '<div title="' + esc(MPP.fmtMonth(m)) + '"><i style="height:' + Math.round((a / 5) * 90) + 'px"></i><b>' + a.toFixed(1).replace('.', ',') + '</b><br>' + esc(new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short' })) + '</div>'; }).join('') + '</div></div>'
    : '';

  const card = (a) => {
    const r = reps.filter((x) => String(x.avis_id) === String(a.id));
    const th = THEMES.filter(([k]) => a.notes_themes && a.notes_themes[k]).map(([k, l]) => '<span class="chip">' + l + ' · ' + a.notes_themes[k] + '/5</span>').join(' ');
    return '<article class="card"><div class="row between">' + starsRo(a.note_globale) + '<span class="muted small">' + esc(MPP.fmtDate(a.created_at, { day: 'numeric', month: 'long' })) + '</span></div>' +
      (th ? '<div class="row" style="gap:6px;margin-top:8px">' + th + '</div>' : '') +
      (a.commentaire ? '<p style="margin:10px 0 0">' + esc(a.commentaire) + '</p>' : '') + (a.attente_mois_suivant ? '<p class="small muted" style="margin:8px 0 0"><b>Attente pour le mois prochain :</b> ' + esc(a.attente_mois_suivant) + '</p>' : '') +
      r.map((x) => '<div class="reply"><b>Réponse du bureau' + (x.auteur_poste ? ' · ' + esc(x.auteur_poste) : '') + '</b><br>' + esc(x.texte) + '</div>').join('') +
      (reported.has(a.id) ? '' : '<div class="mt"><button class="link-btn" type="button" data-rep="' + a.id + '">Signaler</button></div>') + '</article>';
  };
  let shown = 12;
  const listHtml = () => avis.length ? '<div class="stack">' + avis.slice(0, shown).map(card).join('') + '</div>' + (avis.length > shown ? '<button class="btn btn-ghost btn-block mt" id="more" type="button">Voir plus d\'avis</button>' : '') : '<div class="empty">Aucun avis publié pour le moment.</div>';

  el.innerHTML = '<div class="page-head"><div class="wrap"><h1 class="title">Avis sur le bureau</h1><p class="lead">Le travail a-t-il été bien fait ? Que souhaitez-vous ? Le bureau lit tous les avis et répond publiquement.</p></div></div>' +
    '<section class="section" style="padding-top:12px"><div class="wrap grid c2" style="align-items:start"><div>' + top + '</div><div class="stack">' + chart +
    (bilans.length ? '<div class="card"><h2 style="font-size:1.1rem">Bilan du bureau</h2>' + bilans.slice(0, 2).map((b) => '<div class="reply" style="margin:8px 0 0"><b>' + esc(MPP.fmtMonth(b.mois)) + '</b><br>' + esc(b.texte) + '</div>').join('') + '<p class="small muted" style="margin:8px 0 0">Voir aussi les <a href="idees.html">idées retenues</a>.</p></div>' : '') +
    '</div></div><div class="wrap mt2"><h2 class="sec-title">Les avis publiés</h2><div id="list">' + listHtml() + '</div></div></section>';

  const redraw = () => { $('#list').innerHTML = listHtml(); };
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'more') { shown += 12; redraw(); return; }
    const rb = e.target.closest('[data-rep]');
    if (rb) {
      const id = Number(rb.dataset.rep);
      if (!(await MPP.confirm('Signaler cet avis à la modération ? (Un avis n\'est masqué que s\'il est contraire à la charte.)', { ok: 'Signaler', danger: true }))) return;
      try { const r = await MPP.rpc('report_content', { p_type: 'avis', p_id: id, p_device: dev }); MPP.toast(r.message || 'Signalement envoyé', r.ok ? 'ok' : 'error'); if (r.ok) { reported.add(id); MPP.store.set('reported_avis', Array.from(reported)); redraw(); } } catch (err) { MPP.toast(err.message, 'error'); }
    }
  });

  const f = $('#f');
  if (f) {
    const vals = {};
    f.querySelectorAll('.stars').forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('.star'); if (!b) return; const n = Number(b.dataset.n); vals[g.dataset.k] = n;
      g.querySelectorAll('.star').forEach((x) => x.classList.toggle('on', Number(x.dataset.n) <= n));
    }));
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const msg = $('#msg'); const btn = $('button[type=submit]', f);
      if (!vals.note) { msg.innerHTML = MPP.alert('warn', 'Donnez une note globale de 1 à 5.'); return; }
      const d = Object.fromEntries(new FormData(f).entries());
      const pre = MPP_FILTERS.contacts((d.commentaire || '') + ' ' + (d.attente || ''));
      if (pre) { msg.innerHTML = MPP.alert('error', esc(MPP_FILTERS.messages[pre])); return; }
      MPP.busy(btn, true);
      try {
        const themes = {}; THEMES.forEach(([k]) => { if (vals[k]) themes[k] = vals[k]; });
        const r = await MPP.rpc('submit_avis', { p_device: dev, p_note: vals.note, p_themes: themes, p_commentaire: d.commentaire || '', p_attente: d.attente || '' });
        if (r.ok || r.code === 'deja') { done[st.mois] = 1; MPP.store.set('avis_done', done); MPP.toast(r.ok ? 'Merci pour votre avis !' : 'Vous avez déjà donné votre avis ce mois-ci.', 'ok'); location.reload(); }
        else msg.innerHTML = MPP.alert('error', esc(r.message));
      } catch (err) { msg.innerHTML = MPP.alert('error', 'Envoi impossible : ' + esc(err.message)); } finally { MPP.busy(btn, false); }
    });
  }
});

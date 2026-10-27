/* Dashboard : vue d'ensemble */
MPP.admin.page({ nav: 'index' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon } = MPP;
  const st = await MPP.rpc('stats_dashboard');
  const camp = MPP.campaign(S);
  const isAdmin = A.allowed(me.role, 'admin');
  const today = camp.today;
  let todayDraw = null;
  if (isAdmin) { const t = await MPP.q(sb.from('tirages').select('*').eq('jour', today).eq('statut', 'actif')); todayDraw = t[0] || null; }

  const stat = (n, label, href, cls) => '<a class="stat ' + (cls || '') + '" href="' + href + '"><b>' + n + '</b><span>' + label + '</span></a>';
  const todo = [
    [st.a_verifier, 'inscription(s) à vérifier', 'participants.html', isAdmin], [st.messages_masques, 'message(s) signalé(s) à examiner', 'chat.html#examiner', true],
    [st.idees_signalees, 'idée(s) signalée(s)', 'idees.html', true], [st.avis_a_examiner, 'avis à examiner', 'avis.html', isAdmin],
    [st.aides_nouvelles, "demande(s) d'aide", 'aide.html', isAdmin], [st.benevoles_nouveaux, 'demande(s) de bénévolat', 'benevoles.html', isAdmin]
  ].filter((x) => x[0] > 0 && x[3]);

  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(MPP.ymd(d)); }
  const maxDay = Math.max(1, ...days.map((d) => (st.par_jour || {})[d] || 0));

  let campHtml;
  if (camp.closed) campHtml = '<div class="alert warn" style="margin:0"><b>Campagne clôturée.</b> Les inscriptions, le tirage et les promesses sont désactivés.</div>';
  else if (!camp.set) campHtml = '<div class="alert warn" style="margin:0"><b>Dates de campagne non renseignées.</b> Le tirage est impossible tant qu\'elles ne le sont pas. <a href="parametres.html">Renseigner les dates</a></div>';
  else campHtml = '<div class="row between"><div><b>' + (camp.phase === 'en_cours' ? 'Jour ' + camp.dayNo + ' sur ' + camp.total : camp.phase === 'avant' ? 'La campagne n\'a pas commencé' : 'Campagne terminée') + '</b><div class="muted small">Du ' + esc(MPP.fmtDate(S.campagne_debut)) + ' au ' + esc(MPP.fmtDate(S.campagne_fin)) + '</div></div>' +
    (isAdmin && camp.phase === 'en_cours' ? (todayDraw ? '<span class="chip green">' + icon('trophy') + ' Gagnant du jour : ' + esc(todayDraw.gagnant_label) + '</span>' : '<a class="btn btn-gold" href="tirage.html">' + icon('trophy') + ' Lancer le tirage du jour</a>') : '') + '</div>';

  el.innerHTML = A.head('Vue d\'ensemble', 'Bonjour ' + esc(me.nom_affiche || '') + '. Voici l\'état de la plateforme.') +
    '<div class="panel">' + campHtml + '</div>' +
    (todo.length ? '<div class="panel" style="border-color:#ecd27a;background:var(--gold-l)"><h2>À traiter</h2><div class="row">' + todo.map(([n, l, h]) => '<a class="chip gold" style="font-size:.9rem;padding:6px 12px" href="' + h + '"><b>' + n + '</b>&nbsp;' + l + '</a>').join('') + '</div></div>' : '') +
    '<div class="stats">' +
    (isAdmin ? stat(st.participants, 'Inscrits au tirage', 'participants.html') + stat(st.promesses, 'Promesses de vote (total)', A.allowed(me.role, 'president') ? 'promesses.html' : '#') : '') +
    stat(st.idees, 'Idées déposées', 'idees.html') + stat(st.votes, 'Votes sur les idées', 'idees.html') + stat(st.reponses_sondages, 'Réponses aux sondages', isAdmin ? 'sondages.html' : '#') +
    stat(st.messages, 'Messages du chat', 'chat.html') + stat(st.messages_masques + st.messages_supprimes, 'Masqués ou supprimés', 'chat.html') + (isAdmin ? stat(st.avis_mois, 'Avis ce mois-ci', 'avis.html') : '') +
    stat(st.pages_vues, 'Pages vues', '#') + '</div>' +
    (isAdmin ? '<div class="cols-auto"><div class="panel"><h2>Inscriptions, 7 derniers jours</h2><div class="vbars">' + days.map((d) => { const n = (st.par_jour || {})[d] || 0; return '<div><b>' + n + '</b><i style="height:' + Math.round((n / maxDay) * 90) + 'px"></i>' + esc(d.slice(8) + '/' + d.slice(5, 7)) + '</div>'; }).join('') + '</div></div>' +
      '<div class="panel"><h2>Par filière</h2>' + A.hbars(st.par_filiere || {}) + '</div><div class="panel"><h2>Par année</h2>' + A.hbars(st.par_annee || {}) + '<p class="small muted" style="margin:10px 0 0">Dont ' + (st.stand || 0) + ' inscription(s) faite(s) à un point d\'inscription.</p></div></div>' : '') +
    '<p class="small muted">Les visites sont comptées sans cookie ni donnée personnelle (pages vues uniquement).</p>';
});

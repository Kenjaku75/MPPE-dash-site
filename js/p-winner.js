/* Gagnant du jour et historique */
MPP.page(async ({ sb, S, el, camp }) => {
  const { esc, icon } = MPP;
  const head = '<div class="page-head"><div class="wrap"><h1 class="title">Gagnant du jour</h1></div></div>';
  if (camp.closed) {
    el.innerHTML = head + '<section class="section"><div class="wrap"><div class="lockbox"><div class="big">' + icon('lock') + '</div><h2>Le tirage est terminé</h2><p class="muted">Merci à toutes et à tous pour votre participation. Les données nominatives ont été supprimées à la clôture de la campagne.</p><a class="btn" href="index.html">Retour à l\'accueil</a></div></div></section>';
    return;
  }
  const rows = await MPP.q(sb.from('gagnants_public').select('*').order('jour', { ascending: false }));
  const today = rows.find((r) => r.jour === camp.today);
  const past = rows.filter((r) => r !== today);
  const expired = (g) => g.valide_jusqu_au && new Date(g.valide_jusqu_au) < new Date() && g.statut_repas === 'en_attente';
  const badge = (g) => (g.statut_repas === 'remis' ? '<span class="chip green">' + icon('check') + ' Repas remis</span>' : expired(g) ? '<span class="chip">Délai dépassé</span>' : '<span class="chip gold">À récupérer</span>');

  const todayHtml = today
    ? '<section class="winner-card" style="margin-top:0"><div class="lbl">' + icon('trophy') + ' ' + esc(MPP.fmtDay(today.jour)) + '</div><p class="winner-name">' + esc(today.nom_affiche) + '</p><div style="margin-bottom:10px">' + badge(today) + '</div>' +
      (today.statut_repas === 'remis' ? '<p class="alert ok" style="margin:0">Le repas a été remis. Rendez-vous demain pour un nouveau tirage !</p>'
        : '<p><b>Vous êtes ' + esc(today.nom_affiche) + ' ?</b> Contactez ce numéro et venez avec votre <b>carte d\'étudiant ou votre CNIB</b> pour prouver que c\'est bien vous.</p><a class="big-phone" href="' + MPP.telLink(S.numero_gagnant) + '">' + icon('phone') + ' ' + esc(S.numero_gagnant) + '</a>' +
          '<ol class="steps mt"><li><div>Appelez le numéro ci-dessus.</div></li><li><div>Présentez une pièce justificative : le nom doit correspondre à celui annoncé.</div></li><li><div>Choisissez votre créneau parmi ceux proposés (' + esc((S.creneaux_repas || []).join(', ')) + ').</div></li><li><div>Un membre du bureau vous accompagne à la cantine.</div></li></ol>' +
          (today.valide_jusqu_au ? '<p class="small muted" style="margin:0">Valable jusqu\'au ' + esc(MPP.fmtDateTime(today.valide_jusqu_au)) + '.</p>' : '')) +
      MPP.shareHtml('Le gagnant du jour du MPPE : ' + today.nom_affiche, '') + '</section>'
    : '<section class="winner-card" style="margin-top:0"><div class="lbl">' + icon('trophy') + ' ' + esc(MPP.fmtDay(camp.today)) + '</div><p class="winner-name" style="font-size:1.6rem">Pas encore tiré au sort</p><p class="muted">' +
      (camp.phase === 'en_cours' ? 'Le tirage du jour a lieu vers ' + esc(MPP.hhmm(S.heure_tirage || '12:00')) + '. Revenez ensuite sur cette page !' : camp.phase === 'avant' ? 'La campagne n\'a pas encore commencé.' : 'Les tirages sont terminés.') + '</p><a class="btn" href="inscription.html">' + icon('gift') + ' Je m\'inscris au tirage</a></section>';

  el.innerHTML = head + '<section class="section" style="padding-top:12px"><div class="wrap" style="max-width:760px">' + todayHtml +
    '<h2 class="sec-title mt2">Les jours précédents</h2>' +
    (past.length ? '<div class="stack">' + past.map((g) => '<div class="card row between"><div><b>' + esc(g.nom_affiche) + '</b><div class="muted small">' + esc(MPP.fmtDay(g.jour)) + '</div></div>' + badge(g) + '</div>').join('') + '</div>' : '<div class="empty">Aucun gagnant précédent.</div>') +
    '<p class="small muted mt2">Seuls le nom et le prénom du gagnant sont publiés, avec son consentement donné à l\'inscription. <a href="regles-tirage.html">Règles du tirage</a>.</p></div></section>';
});

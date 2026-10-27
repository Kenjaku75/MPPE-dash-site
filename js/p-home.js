/* Page d'accueil */
MPP.page(async ({ sb, S, el, camp }) => {
  const { esc, icon } = MPP;
  const now = new Date();
  const [winners, events, news] = await Promise.all([
    MPP.q(sb.from('gagnants_public').select('*').order('jour', { ascending: false }).limit(1)),
    MPP.q(sb.from('evenements').select('*').order('debut')),
    MPP.q(sb.from('annonces').select('*').order('publie_at', { ascending: false }).limit(2))
  ]);
  const win = winners[0] && winners[0].jour === camp.today ? winners[0] : null;
  const upcoming = events.filter((e) => new Date(e.fin || e.debut).getTime() > now.getTime() - 3 * 36e5).slice(0, 3);

  // ---- cible du compte à rebours ----
  const [hh, mm] = String(S.heure_tirage || '12:00').split(':').map(Number);
  let cdTitle = '', cdTarget = null, cdNote = '';
  const at = (ymd, h, m) => { const d = MPP.parseDate(ymd); d.setHours(h, m, 0, 0); return d; };
  if (camp.closed) { cdTitle = 'Campagne terminée'; cdNote = 'Merci à toutes et à tous pour votre participation.'; }
  else if (!camp.set) { cdTitle = 'Campagne'; cdNote = 'Les dates seront annoncées très bientôt.'; }
  else if (camp.phase === 'avant') { cdTitle = 'La campagne commence dans'; cdTarget = at(S.campagne_debut, 0, 0); }
  else if (camp.phase === 'apres') { cdTitle = 'La campagne est terminée'; cdNote = 'Merci pour votre participation.'; }
  else {
    const todayDraw = at(camp.today, hh, mm);
    if (!win && todayDraw > now) { cdTitle = 'Prochain tirage dans'; cdTarget = todayDraw; }
    else if (camp.dayNo < camp.total) { const next = MPP.parseDate(camp.today); next.setDate(next.getDate() + 1); cdTitle = 'Prochain tirage dans'; cdTarget = at(MPP.ymd(next), hh, mm); }
    else { cdTitle = 'Dernier tirage effectué'; cdNote = 'Merci à toutes et à tous !'; }
  }
  const dots = camp.phase === 'en_cours' ? '<div class="day-dots" aria-label="Jour ' + camp.dayNo + ' sur ' + camp.total + '">Jour ' + camp.dayNo + ' sur ' + camp.total + ' ' + Array.from({ length: camp.total }, (_, i) => '<i class="' + (i < camp.dayNo ? 'on' : '') + '"></i>').join('') + '</div>' : '';

  const regOpen = !camp.closed;
  el.innerHTML =
    '<section class="hero"><div class="wrap hero-in"><div>' +
    '<img class="hero-logo" src="' + MPP.root + 'assets/logo.svg" alt="Logo du MPPE" width="104" height="104">' +
    '<h1>La force de la jeunesse, <em>l\'avenir du Faso.</em></h1>' +
    '<p class="slogan">Le Mouvement Patriotique pour le Progrès Estudiantin vous donne la parole : idées, sondages, chat anonyme… et un repas offert chaque jour de la campagne.</p>' +
    '<div class="cta">' +
    (regOpen ? '<a class="btn btn-gold" href="inscription.html">' + icon('gift') + ' Participer au tirage</a>' : '') +
    '<a class="btn btn-ghost-light" href="idees.html">' + icon('bulb') + ' Donner une idée</a></div></div>' +
    '<div class="cd-box"><h2>' + esc(cdTitle) + '</h2>' + (cdTarget ? '<div class="countdown" id="cd" role="timer"></div>' : '<p style="margin:0;font-size:1.05rem">' + esc(cdNote) + '</p>') + dots + '</div></div></section>' +

    '<div class="wrap"><section class="winner-card" aria-live="polite">' +
    (camp.closed ? '<div class="lbl">Tirage au sort</div><p class="winner-name" style="font-size:1.4rem">La campagne est terminée</p><p class="muted" style="margin:0">Merci à toutes et à tous pour votre participation.</p>'
      : win
        ? '<div class="lbl">' + icon('trophy') + ' Gagnant du jour · ' + esc(MPP.fmtDay(win.jour)) + '</div><p class="winner-name">' + esc(win.nom_affiche) + '</p>' +
          (win.statut_repas === 'remis' ? '<p class="alert ok" style="margin:0">Repas remis. Félicitations !</p>'
            : '<p>Félicitations ! Contactez le numéro ci-dessous et présentez-vous avec votre <b>carte d\'étudiant ou votre CNIB</b> pour recevoir votre repas gratuit.</p><a class="big-phone" href="' + MPP.telLink(S.numero_gagnant) + '">' + icon('phone') + ' ' + esc(S.numero_gagnant) + '</a>') +
          MPP.shareHtml('Le gagnant du jour du MPPE est ' + win.nom_affiche + ' !', '')
        : '<div class="lbl">' + icon('trophy') + ' Gagnant du jour</div><p class="winner-name" style="font-size:1.5rem">' + (camp.phase === 'en_cours' ? 'Pas encore tiré au sort' : 'Tirage à venir') + '</p>' +
          '<p class="muted" style="margin:0 0 10px">Chaque jour de la campagne, un inscrit est tiré au sort à ' + esc(MPP.hhmm(S.heure_tirage || '12:00')) + ' et gagne son repas de midi à la cantine.</p>' +
          '<a class="btn" href="inscription.html">' + icon('gift') + ' Je m\'inscris</a>') +
    '</section></div>' +

    '<section class="section"><div class="wrap"><h2 class="sec-title">Accès rapide</h2><div class="tiles">' +
    (regOpen ? tile('inscription', 'gift', 'Tirage au sort', 'Inscrivez-vous, gagnez un repas', '') : '') +
    tile('idees', 'bulb', 'Boîte à idées', 'Proposez, likez, suivez', 'gold') +
    tile('chat', 'chat', 'Chat anonyme', 'Discutez librement, sans compte', '') +
    tile('sondages', 'chart', 'Sondages', 'Donnez votre avis en 10 secondes', 'gold') +
    tile('avis', 'star', 'Avis sur le bureau', 'Jugez le travail du bureau', 'red') +
    tile('parking', 'car', 'Parking gratuit', '100 places, carte d\'étudiant', '') +
    tile('projets', 'flag', 'Vision et projets', 'Ce que nous voulons faire', 'gold') +
    tile('equipe', 'users', "L'équipe", 'Qui sont les membres du bureau', '') +
    '</div></div></section>' +

    '<section class="section" style="padding-top:0"><div class="wrap grid c2">' +
    '<div><h2 class="sec-title">Agenda <a class="small" href="agenda.html">Tout voir →</a></h2>' +
    (upcoming.length ? upcoming.map((e) => eventHtml(e)).join('') : '<div class="empty">Aucun événement annoncé pour le moment.</div>') + '</div>' +
    '<div><h2 class="sec-title">Annonces <a class="small" href="annonces.html">Tout voir →</a></h2>' +
    (news.length ? news.map((a) => '<article class="card news"><span class="chip">' + esc(MPP.fmtDate(a.publie_at, { day: 'numeric', month: 'long' })) + '</span><h3>' + esc(a.titre) + '</h3><p class="muted" style="margin:0">' + esc(a.corps || '') + '</p></article>').join('') : '<div class="empty">Aucune annonce pour le moment.</div>') + '</div>' +
    '</div></section>';

  function tile(page, ic, title, sub, c) {
    return '<a class="tile" href="' + page + '.html"' + (c ? ' data-c="' + c + '"' : '') + '><span class="ti">' + icon(ic) + '</span><b>' + title + '</b><small>' + sub + '</small></a>';
  }
  function eventHtml(e) {
    const d = new Date(e.debut);
    return '<article class="card event"><div class="date-badge"><b>' + d.getDate() + '</b><span>' + d.toLocaleDateString('fr-FR', { month: 'short' }) + '</span></div><div><b>' + esc(e.titre) + '</b><div class="muted small">' + icon('clock') + ' ' + esc(MPP.fmtTime(e.debut)) + (e.lieu ? ' · ' + icon('pin') + ' ' + esc(e.lieu) : '') + '</div></div></article>';
  }
  if (cdTarget) MPP.countdown(MPP.$('#cd'), cdTarget.getTime(), () => setTimeout(() => location.reload(), 1500));
});

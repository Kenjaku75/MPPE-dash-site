/* Pages de contenu : mouvement, projets, équipe, annonces, agenda, FAQ, liens, parking, remerciements, pages légales */
MPP.page(async (ctx) => {
  const { sb, S, el, camp } = ctx;
  const { esc, icon } = MPP;
  const page = document.body.dataset.page;
  const head = (title, lead) => '<div class="page-head"><div class="wrap"><h1 class="title">' + esc(title) + '</h1>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + '</div></div>';
  const body = (html) => '<section class="section" style="padding-top:12px"><div class="wrap">' + html + '</div></section>';
  const empty = (t) => '<div class="empty">' + t + '</div>';
  const whatsapp = () => '<div class="card"><div class="row between"><div><b>' + icon('chat') + ' Écrire au bureau sur WhatsApp</b><div class="muted small">Contact principal : la secrétaire générale' + (S.whatsapp_horaires ? ' · réponses ' + esc(S.whatsapp_horaires) : '') + '</div></div>' +
    '<a class="btn btn-sm" target="_blank" rel="noopener noreferrer" href="' + esc(MPP.waLink(S)) + '">' + icon('send') + ' Ouvrir WhatsApp</a></div></div>';

  const R = {
    async mouvement() {
      const rows = await MPP.q(sb.from('pages_contenu').select('*'));
      const by = Object.fromEntries(rows.map((r) => [r.slug, r]));
      const sec = (slug) => (by[slug] ? '<div class="card prose"><h2>' + esc(by[slug].titre) + '</h2>' + MPP.md(MPP.tpl(by[slug].corps, S)) + '</div>' : '');
      el.innerHTML = head('Le mouvement', 'Mouvement Patriotique pour le Progrès Estudiantin') + body('<div class="grid c2">' + sec('mouvement') + sec('valeurs') + '</div>' + (by.histoire ? '<div style="margin-top:14px">' + sec('histoire') + '</div>' : '') +
        '<div class="row mt2"><a class="btn" href="projets.html">' + icon('flag') + ' Voir nos projets</a><a class="btn btn-ghost" href="equipe.html">' + icon('users') + " Rencontrer l'équipe</a></div>");
    },

    async projets() {
      const [projets, idees] = await Promise.all([
        MPP.q(sb.from('projets').select('*').order('ordre')),
        MPP.q(sb.from('idees_public').select('id,titre,projet_id,statut'))
      ]);
      const card = (p) => {
        const st = MPP.STATUT_PROJET[p.statut] || ['', ''];
        const li = idees.filter((i) => String(i.projet_id) === String(p.id) && ['retenue', 'realisee'].includes(i.statut));
        return '<article class="card project"><span class="chip ' + st[1] + '">' + st[0] + '</span><h3>' + esc(p.titre) + '</h3><p>' + esc(p.description || '') + '</p>' +
          (p.objectif ? '<p class="small"><b>Objectif :</b> ' + esc(p.objectif) + '</p>' : '') +
          (li.length ? '<p class="small muted" style="margin:0">' + icon('bulb') + ' Né de ' + (li.length > 1 ? 'vos idées' : 'votre idée') + ' : ' + li.map((i) => '<a href="idees.html#idee-' + i.id + '">' + esc(i.titre) + '</a>').join(', ') + '</p>' : '') + '</article>';
      };
      el.innerHTML = head('Vision et projets', "Ce que nous voulons réaliser pour les étudiants de l'UTM, et où nous en sommes.") +
        body(projets.length ? '<div class="grid c2">' + projets.map(card).join('') + '</div><p class="mt2 muted">Une idée pour un nouveau projet ? <a href="idees.html">Déposez-la dans la boîte à idées</a>.</p>' : empty('Les projets seront publiés très bientôt.'));
    },

    async equipe() {
      const m = await MPP.q(sb.from('membres_bureau').select('*').order('ordre'));
      const card = (x) => '<article class="card member">' + (x.photo_url ? '<img class="avatar" src="' + esc(x.photo_url) + '" alt="Photo de ' + esc(x.prenom + ' ' + x.nom) + '" loading="lazy">' : '<div class="avatar" aria-hidden="true">' + esc(MPP.initials(x.prenom, x.nom)) + '</div>') +
        '<b>' + esc(x.prenom + ' ' + x.nom) + '</b><div class="poste">' + esc(x.poste) + '</div>' + (x.presentation ? '<p class="muted small" style="margin:8px 0 0">' + esc(x.presentation) + '</p>' : '') + '</article>';
      el.innerHTML = head("L'équipe", "Les membres du bureau du MPPE, à votre service.") + body(m.length ? '<div class="grid c3">' + m.map(card).join('') + '</div>' : empty("L'équipe sera présentée très bientôt."));
    },

    async annonces() {
      const a = await MPP.q(sb.from('annonces').select('*').order('publie_at', { ascending: false }));
      el.innerHTML = head('Annonces', 'Les actualités du MPPE : meetings, rencontres, parking, résultats de sondages.') +
        body(a.length ? '<div class="stack" style="max-width:720px">' + a.map((x) => '<article class="card news" id="annonce-' + x.id + '"><span class="chip">' + esc(MPP.fmtDate(x.publie_at)) + '</span><h3>' + esc(x.titre) + '</h3>' + MPP.md(x.corps || '') + MPP.shareHtml(x.titre, '#annonce-' + x.id) + '</article>').join('') + '</div>' : empty('Aucune annonce pour le moment.'));
    },

    async agenda() {
      const ev = await MPP.q(sb.from('evenements').select('*').order('debut'));
      const all = ev.map((e) => Object.assign({}, e));
      const day = (ymd, h) => { const d = MPP.parseDate(ymd); const [hh, mm] = String(h || '09:00').split(':').map(Number); d.setHours(hh, mm, 0, 0); return d.toISOString(); };
      if (S.campagne_debut && S.campagne_fin && !camp.closed) {
        for (let d = MPP.parseDate(S.campagne_debut), i = 0; MPP.ymd(d) <= S.campagne_fin && i < 31; d.setDate(d.getDate() + 1), i++) {
          all.push({ id: 't' + i, titre: 'Tirage au sort du jour', debut: day(MPP.ymd(d), S.heure_tirage), lieu: 'Sur le site', description: 'Un inscrit est tiré au sort et gagne son repas.', categorie: 'tirage', auto: true });
        }
      }
      (S.parking_jours || []).forEach((j, i) => all.push({ id: 'p' + i, titre: 'Parking gratuit', debut: day(j, S.parking_heure), lieu: S.parking_lieu, description: 'Les ' + (S.parking_places || 100) + " premiers étudiants, carte d'étudiant obligatoire.", categorie: 'parking', auto: true }));
      all.sort((a, b) => new Date(a.debut) - new Date(b.debut));
      const now = Date.now() - 3 * 36e5;
      const up = all.filter((e) => new Date(e.fin || e.debut).getTime() >= now);
      const past = all.filter((e) => new Date(e.fin || e.debut).getTime() < now).reverse();
      const CAT = { rencontre: 'Rencontre', tirage: 'Tirage', parking: 'Parking', point_inscription: "Point d'inscription", autre: 'Événement' };
      const item = (e, isPast) => { const d = new Date(e.debut); return '<article class="card event ' + (isPast ? 'past' : '') + '"><div class="date-badge"><b>' + d.getDate() + '</b><span>' + d.toLocaleDateString('fr-FR', { month: 'short' }) + '</span></div><div><span class="chip ' + (e.categorie === 'tirage' ? 'gold' : e.categorie === 'parking' ? 'green' : '') + '">' + (CAT[e.categorie] || 'Événement') + '</span> <b>' + esc(e.titre) + '</b>' +
        '<div class="muted small">' + icon('clock') + ' ' + esc(MPP.fmtDay(d)) + ' à ' + esc(MPP.fmtTime(d)) + (e.lieu ? ' · ' + icon('pin') + ' ' + esc(e.lieu) : '') + '</div>' + (e.description ? '<p class="small" style="margin:6px 0 0">' + esc(e.description) + '</p>' : '') + (isPast ? '' : MPP.shareHtml(e.titre + ' — ' + MPP.fmtDay(d), '')) + '</div></article>'; };
      el.innerHTML = head('Agenda', 'Les rencontres, tirages, parking et points d\'inscription à venir.') +
        body('<div class="stack" style="max-width:720px">' + (up.length ? up.map((e) => item(e)).join('') : empty('Aucun événement à venir.')) + '</div>' +
          (past.length ? '<details class="faq mt2" style="max-width:720px"><summary>Événements passés (' + past.length + ')</summary><div class="a stack">' + past.slice(0, 20).map((e) => item(e, true)).join('') + '</div></details>' : ''));
    },

    async faq() {
      const f = await MPP.q(sb.from('faq').select('*').order('ordre'));
      el.innerHTML = head('FAQ et règles', 'Comment ça marche ? Les réponses aux questions les plus fréquentes.') +
        body('<div style="max-width:720px">' + (f.length ? f.map((x, i) => '<details class="faq"' + (i === 0 ? ' open' : '') + '><summary>' + esc(x.question) + '</summary><div class="a">' + MPP.md(MPP.tpl(x.reponse, S)) + '</div></details>').join('') : empty('La FAQ sera publiée très bientôt.')) +
          '<div class="mt2 stack">' + whatsapp() + '<div class="card"><div class="row between"><b>' + icon('help') + ' Vous ne trouvez pas votre réponse ?</b><a class="btn btn-sm btn-ghost" href="aide.html">Besoin d\'aide ?</a></div></div></div></div>');
    },

    async liens() {
      const l = await MPP.q(sb.from('liens_officiels').select('*').order('ordre'));
      el.innerHTML = head('Liens utiles', "Le site et les réseaux sociaux officiels de l'UTM.") +
        body('<div style="max-width:720px"><div class="link-list">' + l.map((x) => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(x.libelle) + '<small>' + esc(x.url.replace(/^https?:\/\/(www\.)?/, '')) + '</small></span>' + icon('link') + '</a>').join('') + '</div>' +
          '<p class="muted small">La plateforme renvoie vers ces pages sans en copier ni en intégrer le contenu. Site de campagne du MPPE, indépendant de l\'administration de l\'UTM.</p><div class="mt2">' + whatsapp() + '</div></div>');
    },

    async parking() {
      const jours = (S.parking_jours || []).slice().sort();
      const today = camp.today;
      const nextDay = jours.find((j) => j >= today);
      const status = !jours.length ? 'Dates à annoncer' : nextDay === today ? "C'est aujourd'hui !" : nextDay ? 'Prochain jour : ' + MPP.fmtDay(nextDay) : "L'opération est terminée";
      const places = Number(S.parking_places) || 100;
      el.innerHTML = head('Parking gratuit', "Venez en voiture, garez-vous gratuitement : une attention du MPPE pour les étudiants.") +
        body('<div class="grid c2" style="align-items:start"><div class="card"><span class="chip ' + (nextDay === today ? 'green' : 'gold') + '">' + esc(status) + '</span>' +
          '<div class="parking-n mt">' + places + '</div><p style="margin:0"><b>places gratuites chaque jour</b>, pour les ' + places + ' premiers arrivés.</p>' +
          (S.parking_compteur && S.parking_restantes != null && nextDay === today ? '<div class="alert ok"><b>' + esc(S.parking_restantes) + '</b> places restantes aujourd\'hui (mis à jour par l\'équipe).</div>' : '') + '</div>' +
          '<div class="card stack"><h2 style="font-size:1.1rem">Infos pratiques</h2><ul class="steps">' +
          '<li><div><b>Jours</b><br>' + (jours.length ? jours.map((j) => esc(MPP.fmtDay(j))).join('<br>') : 'À annoncer') + '</div></li>' +
          '<li><div><b>Ouverture</b><br>À ' + esc(MPP.hhmm(S.parking_heure || '07:00')) + '</div></li>' +
          '<li><div><b>Lieu</b><br>' + esc(S.parking_lieu || 'À annoncer') + '</div></li>' +
          '<li><div><b>Conditions</b><br>Étudiants de l\'UTM, avec leur carte d\'étudiant.</div></li></ul></div></div>' +
          '<div class="quote mt2"><b>Règle du « premier arrivé » :</b> une liste d\'arrivée est tenue sur place par l\'équipe, avec contrôle de la carte d\'étudiant. Quand les ' + places + ' places sont prises, l\'opération s\'arrête pour la journée.</div>');
    },

    async merci() {
      if (!S.merci_active) { el.innerHTML = head('Remerciements et résultats', '') + body('<div class="lockbox"><div class="big">' + icon('lock') + '</div><h2>Cette page ouvrira après le scrutin</h2><p class="muted">Le bureau publiera ici ses remerciements et les résultats officiels, dès leur annonce par l\'université.</p><a class="btn" href="index.html">Retour à l\'accueil</a></div>'); return; }
      el.innerHTML = head('Merci !', 'Remerciements du bureau et résultats officiels.') +
        body('<div class="grid c2" style="align-items:start"><div class="card prose"><h2>Un grand merci</h2>' + MPP.md(S.merci_texte || '') + '</div>' +
          (S.merci_resultats ? '<div class="card prose"><h2>Résultats officiels</h2>' + MPP.md(S.merci_resultats) + '<p class="muted small">Résultats saisis par le bureau après leur annonce officielle par l\'université.</p></div>' : '') + '</div>' +
          '<div class="card mt2"><h2 style="font-size:1.15rem">Et maintenant ?</h2><p>Le MPPE continue d\'être à votre écoute : donnez votre avis sur le bureau chaque mois et proposez vos idées.</p><div class="row"><a class="btn" href="avis.html">' + icon('star') + ' Avis sur le bureau</a><a class="btn btn-ghost" href="idees.html">' + icon('bulb') + ' Boîte à idées</a></div></div>');
    },

    async legal() {
      const rows = await MPP.q(sb.from('pages_legales').select('*').eq('slug', page));
      const p = rows[0];
      if (!p) { el.innerHTML = head('Page introuvable', '') + body(empty('Ce texte n\'est pas encore publié.')); return; }
      el.innerHTML = head(p.titre, '') + body('<article class="card prose" style="max-width:760px">' + MPP.md(MPP.tpl(p.corps, S)) + '<p class="muted small" style="margin-top:22px">Dernière mise à jour : ' + esc(MPP.fmtDate(p.maj_at)) + '</p></article><p class="small muted mt"><a href="index.html">← Retour à l\'accueil</a></p>');
    }
  };

  const legal = ['mentions-legales', 'regles-tirage', 'confidentialite', 'charte'];
  const fn = legal.includes(page) ? R.legal : R[page];
  if (!fn) throw new Error('Page inconnue : ' + page);
  await fn();
});

/* Formulaires : inscription au tirage, promesse de vote, besoin d'aide, rejoindre l'équipe */
MPP.page(async ({ sb, S, el, camp }) => {
  const { esc, icon, $ } = MPP;
  const page = document.body.dataset.page;
  const t0 = Date.now();
  const head = (title, lead) => '<div class="page-head"><div class="wrap"><h1 class="title">' + esc(title) + '</h1>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + '</div></div>';
  const wrap = (html) => '<section class="section" style="padding-top:12px"><div class="wrap">' + html + '</div></section>';
  const opts = (arr, ph) => '<option value="">' + ph + '</option>' + (arr || []).map((v) => '<option>' + esc(v) + '</option>').join('');
  const hp = '<div class="hp" aria-hidden="true"><label>Ne pas remplir <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
  const identityFields = () =>
    '<div class="cols2"><label class="field"><span>Nom</span><input name="nom" required maxlength="60" autocomplete="family-name" autocapitalize="words"></label>' +
    '<label class="field"><span>Prénom</span><input name="prenom" required maxlength="60" autocomplete="given-name" autocapitalize="words"></label></div>' +
    '<div class="cols2"><label class="field"><span>Filière</span><select name="filiere" required>' + opts(S.filieres, 'Choisir…') + '</select></label>' +
    '<label class="field"><span>Année</span><select name="annee" required>' + opts(S.annees, 'Choisir…') + '</select></label></div>' +
    '<label class="field"><span>Numéro de matricule</span><input name="matricule" required maxlength="30" autocomplete="off" autocapitalize="characters" inputmode="text"><div class="hint">Il est conservé sous forme chiffrée irréversible : personne ne peut le relire.</div></label>';
  const closedBox = (msg) => head(document.title.split(' — ')[0], '') + wrap('<div class="lockbox"><div class="big">' + icon('lock') + '</div><h2>' + msg + '</h2><a class="btn" href="index.html">Retour à l\'accueil</a></div>');
  const fdata = (form) => Object.fromEntries(new FormData(form).entries());
  const say = (kind, html) => { const m = $('#msg'); m.innerHTML = MPP.alert(kind, html); m.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  const dupHelp = (code) => (['doublon_matricule', 'doublon_nom', 'bloque', 'limite'].includes(code) ? ' <a href="aide.html?type=' + (code === 'bloque' ? 'autre' : 'doublon') + '">Besoin d\'aide ?</a>' : '');

  /* ---------------- Inscription au tirage ---------------- */
  async function inscription() {
    if (camp.closed) { el.innerHTML = closedBox('Les inscriptions sont closes'); return; }
    let stand = MPP.store.get('stand', null);
    const draw = MPP.hhmm(S.heure_tirage || '12:00');
    el.innerHTML = head('Tirage au sort', 'Un repas de midi offert, chaque jour de la campagne.') + wrap(
      '<div class="grid c2" style="align-items:start"><div>' +
      (stand ? '<div class="alert warn" id="stand-banner"><b>Mode point d\'inscription : ' + esc(stand.nom) + '</b><br><span class="small">La limite d\'inscriptions par appareil est levée. Le matricule reste unique.</span> <button class="link-btn" type="button" id="stand-off">Quitter le mode stand</button></div>' : '') +
      '<form id="f" class="card form-card" novalidate><h2 style="font-size:1.2rem">Je m\'inscris</h2>' + identityFields() +
      (stand ? '<label class="field"><span>Opérateur du stand (membre du bureau)</span><input name="operateur" maxlength="60" value="' + esc(stand.operateur || '') + '" required></label><label class="check"><input type="checkbox" name="carte"> <span>Carte d\'étudiant vérifiée sur place</span></label>' : '') +
      '<label class="check"><input type="checkbox" name="consent" required><span>J\'accepte que mes données (nom, prénom, filière, année, matricule chiffré) servent à organiser le tirage, que <b>mon nom et mon prénom soient publiés si je gagne</b>, et qu\'elles soient supprimées à la clôture de la campagne. Voir la <a href="confidentialite.html" target="_blank">politique de confidentialité</a> et les <a href="regles-tirage.html" target="_blank">règles du tirage</a>.</span></label>' +
      hp + '<div id="msg"></div><button class="btn btn-block" type="submit">' + icon('gift') + ' Valider mon inscription</button></form></div>' +
      '<aside class="card stack"><h2 style="font-size:1.1rem">Comment ça marche ?</h2><ol class="steps">' +
      '<li><div><b>Je m\'inscris</b><br><span class="muted">En 30 secondes, sans téléphone ni e-mail.</span></div></li>' +
      '<li><div><b>Un tirage par jour</b><br><span class="muted">Chaque jour de la campagne' + (camp.set ? ' (du ' + esc(MPP.fmtDate(S.campagne_debut, { day: 'numeric', month: 'long' })) + ' au ' + esc(MPP.fmtDate(S.campagne_fin, { day: 'numeric', month: 'long' })) + ')' : '') + ', vers ' + esc(draw) + '. Un gagnant ne regagne pas.</span></div></li>' +
      '<li><div><b>Je consulte le gagnant du jour</b><br><span class="muted">Son nom et le numéro à appeler sont affichés sur le site.</span></div></li>' +
      '<li><div><b>Je viens avec ma pièce</b><br><span class="muted">Carte d\'étudiant ou CNIB : le nom doit correspondre. Le repas est offert à la cantine.</span></div></li></ol>' +
      '<p class="small muted" style="margin:0">Le tirage est <b>ouvert à tous</b> les inscrits et n\'a aucun lien avec le scrutin. Une seule inscription par étudiant.</p></aside></div>');
    const off = $('#stand-off'); if (off) off.addEventListener('click', () => { MPP.store.set('stand', null); location.reload(); });
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault(); const form = e.target; const btn = $('button[type=submit]', form); const d = fdata(form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      MPP.busy(btn, true);
      try {
        const r = await MPP.rpc('register_participant', {
          p_nom: d.nom, p_prenom: d.prenom, p_filiere: d.filiere, p_annee: d.annee, p_matricule: d.matricule, p_device: MPP.device(), p_consent: !!d.consent,
          p_hp: d.website || '', p_elapsed: Math.floor((Date.now() - t0) / 1000),
          p_point_id: stand ? stand.id : null, p_point_code: stand ? stand.code : null, p_operateur: stand ? d.operateur : null, p_carte_verifiee: stand ? !!d.carte : false
        });
        if (r.ok) {
          form.innerHTML = '<div class="center" style="padding:10px 0"><div class="ti" style="margin:0 auto 12px;background:var(--green);color:#fff;width:64px;height:64px;font-size:1.8rem">' + icon('check') + '</div><h2>' + (r.statut === 'a_verifier' ? 'Inscription reçue' : 'C\'est fait !') + '</h2><p>' + esc(r.message) + '</p>' +
            '<p class="muted small">Revenez chaque jour sur la page <a href="gagnant.html">Gagnant du jour</a> pour voir le résultat du tirage.</p>' +
            (stand ? '<button class="btn" type="button" id="again">Inscrire un autre étudiant</button>' : '<div class="row" style="justify-content:center"><a class="btn" href="gagnant.html">' + icon('trophy') + ' Gagnant du jour</a><a class="btn btn-ghost" href="idees.html">' + icon('bulb') + ' Boîte à idées</a></div>') + '</div>';
          const again = $('#again'); if (again) again.addEventListener('click', () => location.reload());
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else say('error', esc(r.message) + dupHelp(r.code));
      } catch (err) { say('error', 'Envoi impossible : ' + esc(err.message)); } finally { MPP.busy(btn, false); }
    });
  }

  /* ---------------- Promesse de vote (formulaire séparé du tirage) ---------------- */
  async function soutenir() {
    if (camp.closed || S.promesse_active === false) { el.innerHTML = closedBox('Les promesses de vote sont closes'); return; }
    el.innerHTML = head('Soutenir le MPPE', 'Dites-nous que vous comptez sur nous. C\'est facultatif et sans engagement.') + wrap(
      '<div class="grid c2" style="align-items:start"><form id="f" class="card form-card" novalidate><h2 style="font-size:1.2rem">Ma promesse de soutien</h2>' + identityFields() +
      '<label class="check"><input type="checkbox" name="consent" required><span>J\'accepte que ces informations soient enregistrées à part, <b>visibles du seul président du MPPE</b>, et supprimées à la clôture de la campagne. Voir la <a href="confidentialite.html" target="_blank">politique de confidentialité</a>.</span></label>' +
      hp + '<div id="msg"></div><button class="btn btn-block" type="submit">' + icon('heart') + ' Je soutiens le MPPE</button></form>' +
      '<aside class="stack"><div class="quote"><b>Cette promesse n\'engage à rien :</b> le vote officiel a lieu en présentiel, dans une salle de classe de l\'université ; il est libre et secret.</div>' +
      '<div class="card"><p style="margin:0"><b>Vos noms ne sont jamais publics.</b> Aucun compteur n\'est affiché sur le site. Seul le président peut consulter la liste.</p></div></aside></div>');
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault(); const form = e.target; const btn = $('button[type=submit]', form); const d = fdata(form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      MPP.busy(btn, true);
      try {
        const r = await MPP.rpc('submit_promise', { p_nom: d.nom, p_prenom: d.prenom, p_filiere: d.filiere, p_annee: d.annee, p_matricule: d.matricule, p_device: MPP.device(), p_consent: !!d.consent, p_hp: d.website || '', p_elapsed: Math.floor((Date.now() - t0) / 1000) });
        if (r.ok) { form.innerHTML = '<div class="center" style="padding:10px 0"><div class="ti" style="margin:0 auto 12px;background:var(--green);color:#fff;width:64px;height:64px;font-size:1.8rem">' + icon('heart') + '</div><h2>Merci pour votre soutien !</h2><p>' + esc(r.message) + '</p><a class="btn btn-ghost" href="index.html">Retour à l\'accueil</a></div>'; window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else say('error', esc(r.message));
      } catch (err) { say('error', 'Envoi impossible : ' + esc(err.message)); } finally { MPP.busy(btn, false); }
    });
  }

  /* ---------------- Besoin d'aide ---------------- */
  async function aide() {
    const type = new URLSearchParams(location.search).get('type') || '';
    const TYPES = [['doublon', 'Mon inscription est bloquée ou « à vérifier »'], ['message_supprime', 'Un de mes messages a été supprimé à tort'], ['tirage', 'Une question ou une réclamation sur le tirage'], ['suppression_donnees', 'Je veux accéder à mes données ou les supprimer'], ['autre', 'Autre demande']];
    el.innerHTML = head("Besoin d'aide ?", 'Décrivez votre situation : un membre du bureau vous répond sous 24 heures.') + wrap(
      '<form id="f" class="card form-card" novalidate><label class="field"><span>Votre demande concerne</span><select name="type">' + TYPES.map(([v, l]) => '<option value="' + v + '"' + (v === type ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label>' +
      '<label class="field"><span>Décrivez votre situation</span><textarea name="message" required minlength="10" maxlength="1500" placeholder="Que s\'est-il passé ? Donnez le plus de détails possible (sans mot de passe ni numéro de carte)."></textarea></label>' +
      '<label class="field"><span>Moyen de vous répondre (facultatif)</span><input name="contact" maxlength="120" placeholder="Numéro WhatsApp ou e-mail"><div class="hint">Facultatif. Sans contact, nous ne pourrons pas vous répondre directement : la réponse sera publique si elle concerne les règles.</div></label>' +
      hp + '<div id="msg"></div><button class="btn btn-block" type="submit">' + icon('send') + ' Envoyer ma demande</button></form>' +
      '<p class="muted small mt">Pour une réponse rapide, vous pouvez aussi <a target="_blank" rel="noopener noreferrer" href="' + esc(MPP.waLink(S)) + '">écrire au bureau sur WhatsApp</a>.</p>');
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault(); const form = e.target; const btn = $('button[type=submit]', form); const d = fdata(form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      MPP.busy(btn, true);
      try {
        const r = await MPP.rpc('submit_aide', { p_device: MPP.device(), p_type: d.type, p_message: d.message, p_contact: d.contact, p_hp: d.website || '', p_elapsed: Math.floor((Date.now() - t0) / 1000) });
        if (r.ok) { form.innerHTML = '<div class="center" style="padding:10px 0"><div class="ti" style="margin:0 auto 12px;background:var(--green);color:#fff;width:64px;height:64px;font-size:1.8rem">' + icon('check') + '</div><h2>Demande envoyée</h2><p>' + esc(r.message) + '</p><a class="btn btn-ghost" href="index.html">Retour à l\'accueil</a></div>'; }
        else say('error', esc(r.message));
      } catch (err) { say('error', 'Envoi impossible : ' + esc(err.message)); } finally { MPP.busy(btn, false); }
    });
  }

  /* ---------------- Rejoindre l'équipe de campagne ---------------- */
  async function rejoindre() {
    const DOM = ['affiches', 'modération', 'logistique', 'réseaux sociaux', 'technique', 'autre'];
    el.innerHTML = head("Rejoindre l'équipe de campagne", "Un coup de main pendant la campagne ? Merci d'avance !") + wrap(
      '<form id="f" class="card form-card" novalidate>' +
      '<div class="alert warn"><b>À lire avant de continuer :</b> « Rejoindre l\'équipe de campagne ne veut pas dire rejoindre le bureau des étudiants. Les bénévoles sont des associés qui aident ponctuellement, sans poste, sans droits sur la plateforme et sans pouvoir de décision. »</div>' +
      '<label class="check"><input type="checkbox" name="accord" required><span>J\'ai lu et je comprends ce message.</span></label>' + identityFields().replace(/<label class="field"><span>Numéro de matricule<\/span>.*?<\/label>/, '') +
      '<label class="field"><span>Numéro WhatsApp</span><input name="whatsapp" type="tel" required maxlength="20" placeholder="+226 70 00 00 00" autocomplete="tel"><div class="hint">Utilisé uniquement pour vous recontacter, supprimé à la clôture.</div></label>' +
      '<fieldset style="border:0;padding:0;margin:0 0 14px"><legend style="font-weight:700;margin-bottom:6px">Je peux aider pour</legend><div class="row">' + DOM.map((d) => '<label class="chip" style="cursor:pointer"><input type="checkbox" name="dom" value="' + d + '" style="width:auto;min-height:0"> ' + d + '</label>').join('') + '</div></fieldset>' +
      '<label class="field"><span>Mes disponibilités</span><input name="dispo" maxlength="200" placeholder="Ex. : après 15 h, le week-end"></label>' +
      '<label class="field"><span>Un mot pour nous (facultatif)</span><textarea name="message" maxlength="600" style="min-height:80px"></textarea></label>' +
      '<label class="check"><input type="checkbox" name="consent" required><span>J\'accepte que ces informations soient utilisées pour me contacter et supprimées à la clôture. Voir la <a href="confidentialite.html" target="_blank">politique de confidentialité</a>.</span></label>' +
      hp + '<div id="msg"></div><button class="btn btn-block" type="submit">' + icon('users') + ' Je propose mon aide</button></form>');
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault(); const form = e.target; const btn = $('button[type=submit]', form); const d = fdata(form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      MPP.busy(btn, true);
      try {
        const r = await MPP.rpc('submit_benevole', { p_nom: d.nom, p_prenom: d.prenom, p_filiere: d.filiere, p_annee: d.annee, p_whatsapp: d.whatsapp, p_domaines: new FormData(form).getAll('dom'), p_dispo: d.dispo || '', p_message: d.message || '', p_consent: !!d.consent, p_accord: !!d.accord, p_device: MPP.device(), p_hp: d.website || '', p_elapsed: Math.floor((Date.now() - t0) / 1000) });
        if (r.ok) { form.innerHTML = '<div class="center" style="padding:10px 0"><div class="ti" style="margin:0 auto 12px;background:var(--green);color:#fff;width:64px;height:64px;font-size:1.8rem">' + icon('check') + '</div><h2>Merci !</h2><p>' + esc(r.message) + '</p><a class="btn btn-ghost" href="index.html">Retour à l\'accueil</a></div>'; }
        else say('error', esc(r.message));
      } catch (err) { say('error', 'Envoi impossible : ' + esc(err.message)); } finally { MPP.busy(btn, false); }
    });
  }

  await { inscription, soutenir, aide, rejoindre }[page]();
});

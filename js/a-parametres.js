/* Dashboard : paramètres de campagne (tout se règle ici, sans toucher au code) et comptes du bureau */
MPP.admin.page({ nav: 'parametres', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const isPres = A.allowed(me.role, 'president');
  const lines = { from: (v) => (Array.isArray(v) ? v.join('\n') : v || ''), to: (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean) };

  const SECTIONS = [
    { id: 'campagne', title: 'Campagne', sub: 'Dates de la campagne (3 jours par défaut). Le tirage n\'est possible que pendant ces dates.', fields: [
      { k: 'campagne_debut', l: 'Premier jour de la campagne', t: 'date' }, { k: 'campagne_fin', l: 'Dernier jour de la campagne', t: 'date' }, { k: 'promesse_active', l: 'Promesse de vote activée', t: 'check' }] },
    { id: 'tirage', title: 'Tirage et gagnant', sub: 'Le numéro et le texte du bandeau s\'affichent en bas du site dès qu\'un gagnant est désigné.', fields: [
      { k: 'numero_gagnant', l: 'Numéro à appeler par le gagnant', t: 'tel', req: true }, { k: 'heure_tirage', l: 'Heure du tirage quotidien', t: 'time', req: true },
      { k: 'tirage_auto', l: 'Tirage automatique à cette heure', t: 'check', hint: 'Nécessite la tâche planifiée décrite dans backend/schema.sql (pg_cron). Sinon, lancez le tirage à la main depuis la page Tirage.' },
      { k: 'creneaux_repas', l: 'Créneaux de repas proposés (séparés par des virgules)', t: 'tags', req: true }, { k: 'validite_repas_jours', l: 'Validité du repas (jours après le tirage)', t: 'number', min: 0, req: true, hint: '1 = jusqu\'à la fin du jour suivant.' },
      { k: 'texte_bandeau', l: 'Texte du bandeau gagnant', t: 'textarea', rows: 3, hint: 'Utilisez {numero} pour insérer le numéro ci-dessus.' }] },
    { id: 'chat', title: 'Chat et signalements', sub: 'Hors horaires, le chat est en lecture seule.', fields: [
      { k: 'chat_debut', l: 'Ouverture du chat', t: 'time', req: true }, { k: 'chat_fin', l: 'Fermeture du chat', t: 'time', req: true },
      { k: 'chat_force', l: 'Mode du chat', t: 'select', req: true, opts: [['auto', 'Automatique (selon les horaires)'], ['ouvert', 'Toujours ouvert'], ['ferme', 'Fermé (lecture seule)']] },
      { k: 'chat_exige_moderateur', l: 'Lecture seule si aucun modérateur n\'est connecté', t: 'check', hint: 'Recommandé pendant la campagne (§7 bis).' },
      { k: 'seuil_signalements', l: 'Signalements (appareils différents) avant masquage', t: 'number', min: 1, req: true }, { k: 'limite_messages_active', l: 'Limiter la fréquence des messages', t: 'check', hint: 'Désactivé par défaut (décision du bureau).' }, { k: 'limite_messages_secondes', l: 'Délai minimal entre deux messages (secondes)', t: 'number', min: 1 }] },
    { id: 'avis', title: 'Avis mensuel sur le bureau', sub: 'La zone se déverrouille automatiquement pendant les derniers jours de chaque mois.', fields: [
      { k: 'avis_derniers_jours', l: 'Nombre de derniers jours du mois où la zone est ouverte', t: 'number', min: 1, req: true }, { k: 'avis_force_ouvert', l: 'Ouverture forcée (ignore le calendrier)', t: 'check' }, { k: 'avis_afficher_moyenne', l: 'Afficher la note moyenne au public', t: 'check' }] },
    { id: 'contact', title: 'Contact WhatsApp du bureau', sub: 'Contact principal : la secrétaire générale. À modifier avec l\'accord de la personne. Indiquez des horaires de réponse pour éviter le harcèlement.', fields: [
      { k: 'whatsapp_affiche', l: 'Numéro affiché', t: 'text' }, { k: 'whatsapp_numero', l: 'Numéro pour le lien (chiffres, avec indicatif)', t: 'text', hint: 'Ex. : 22674820674' }, { k: 'whatsapp_message', l: 'Message pré-rempli', t: 'text' }, { k: 'whatsapp_horaires', l: 'Horaires de réponse', t: 'text', ph: 'de 9 h à 18 h' }] },
    { id: 'etudiants', title: 'Listes des étudiants', sub: 'Listes fermées utilisées dans les formulaires. Un par ligne.', fields: [
      { k: 'filieres', l: 'Filières', t: 'textarea', rows: 7, req: true, conv: lines }, { k: 'annees', l: 'Années', t: 'textarea', rows: 5, req: true, conv: lines },
      { k: 'matricule_regex', l: 'Format des matricules (expression régulière, facultatif)', t: 'text', hint: 'À fournir par l\'UTM. Ex. : ^UTM[0-9]{6}$ . Vide = format libre (lettres, chiffres, / . _ -).' }] },
    { id: 'legal', title: 'Informations légales', sub: 'Utilisées automatiquement dans les pages légales.', fields: [
      { k: 'representant', l: 'Responsable de la publication (nom du président)', t: 'text' }, { k: 'contact_public', l: 'Contact public du bureau (e-mail ou numéro)', t: 'text' }, { k: 'hebergeur', l: "Nom de l'hébergeur", t: 'text' }] }
  ];
  if (isPres) SECTIONS.push({ id: 'securite', title: 'Sécurité (président)', sub: 'Réservé au président.', fields: [{ k: 'require_2fa', l: 'Authentification à deux facteurs obligatoire pour le dashboard', t: 'check', hint: 'À ne désactiver qu\'en dépannage.' }] });

  el.innerHTML = A.head('Paramètres', 'Dates, horaires, numéros et seuils : tout se modifie ici, sans toucher au code. Chaque modification est tracée.') +
    (S.campagne_cloturee ? '<div class="alert warn"><b>Campagne clôturée.</b> Voir la page <a href="cloture.html">Clôture</a>.</div>' : '') + '<div id="secs"></div><div id="staff"></div>';
  $('#secs').innerHTML = SECTIONS.map((s) => '<form class="panel" data-sec="' + s.id + '" novalidate><h2>' + esc(s.title) + '</h2><p class="sub">' + s.sub + '</p>' +
    A.formHtml(s.fields.map((f) => f.conv ? Object.assign({}, f, { t: 'textarea' }) : f), Object.fromEntries(s.fields.map((f) => [f.k, f.conv ? f.conv.from(S[f.k]) : S[f.k]]))) + '<button class="btn" type="submit">Enregistrer</button></form>').join('');
  $('#secs').addEventListener('submit', async (e) => {
    e.preventDefault(); const form = e.target; if (!form.checkValidity()) return form.reportValidity();
    const sec = SECTIONS.find((s) => s.id === form.dataset.sec); const raw = A.readForm(form, sec.fields.map((f) => (f.conv ? Object.assign({}, f, { t: 'textarea' }) : f))); const out = {};
    sec.fields.forEach((f) => { out[f.k] = f.conv ? f.conv.to(raw[f.k]) : raw[f.k]; if (out[f.k] === null && f.t !== 'date' && f.t !== 'number') out[f.k] = ''; });
    if (out.campagne_debut && out.campagne_fin && out.campagne_fin < out.campagne_debut) return MPP.toast('Le dernier jour doit être après le premier jour.', 'error');
    if (sec.id === 'tirage' && out.validite_repas_jours === '') out.validite_repas_jours = 1;
    try { await A.saveParams(out); MPP.toast('Paramètres enregistrés', 'ok'); } catch (err) { A.err(err); }
  });
  // la fin de campagne se propose automatiquement (3 jours) quand on choisit le premier jour
  const d1 = $('[name=campagne_debut]'), d2 = $('[name=campagne_fin]');
  if (d1 && d2) d1.addEventListener('change', () => { if (d1.value && (!d2.value || d2.value < d1.value)) { const d = MPP.parseDate(d1.value); d.setDate(d.getDate() + 2); d2.value = MPP.ymd(d); } });

  if (isPres) await staff();
  async function staff() {
    const rows = await MPP.q(sb.from('admins').select('*').order('created_at'));
    $('#staff').innerHTML = '<div class="panel"><h2>Comptes du bureau (président)</h2><p class="sub">Le compte du président est protégé : aucun autre compte ne peut le supprimer, le masquer, changer son rôle ni réinitialiser son accès. Pour ajouter un membre, créez d\'abord son compte (Supabase → Authentication → Users → Invite), puis attribuez-lui un rôle ici.</p>' +
      A.tbl([{ l: 'Compte', fn: (r) => '<b>' + esc(r.nom_affiche || r.email) + '</b><div class="small muted">' + esc(r.email) + (r.poste ? ' · ' + esc(r.poste) : '') + '</div>', cls: 'wide' }, { l: 'Rôle', fn: (r) => (r.role === 'president' ? '<span class="chip gold">' + icon('shield') + ' Président</span>' : '<select data-role="' + esc(r.email) + '" style="min-height:36px;width:auto"><option value="admin"' + (r.role === 'admin' ? ' selected' : '') + '>Administrateur</option><option value="moderateur"' + (r.role === 'moderateur' ? ' selected' : '') + '>Modérateur</option></select>') }],
        rows, (r) => (r.role === 'president' ? '' : A.btn('Retirer', 'data-rm="' + r.user_id + '"', 'btn-ghost', 'trash') + A.btn('Passer le rôle de président', 'data-pass="' + r.user_id + '"')), 'Aucun compte.') +
      '<form id="af" class="toolbar" style="margin-top:14px" novalidate><input name="email" type="email" required placeholder="E-mail du compte" class="grow"><select name="role"><option value="moderateur">Modérateur</option><option value="admin">Administrateur</option></select><input name="nom" placeholder="Nom affiché"><input name="poste" placeholder="Poste"><button class="btn btn-sm" type="submit">' + icon('plus') + ' Attribuer</button></form></div>';
    $('#af').addEventListener('submit', async (e) => { e.preventDefault(); const f = e.target; if (!f.checkValidity()) return f.reportValidity(); try { const r = await MPP.rpc('staff_add', { p_email: f.email.value, p_role: f.role.value, p_nom: f.nom.value || null, p_poste: f.poste.value || null }); if (!r.ok) throw new Error(r.message); MPP.toast('Compte enregistré', 'ok'); staff(); } catch (err) { A.err(err); } });
  }
  $('#staff').addEventListener('change', async (e) => { const t = e.target.closest('[data-role]'); if (!t) return; try { const r = await MPP.rpc('staff_add', { p_email: t.dataset.role, p_role: t.value }); if (!r.ok) throw new Error(r.message); MPP.toast('Rôle modifié', 'ok'); } catch (err) { A.err(err); staff(); } });
  $('#staff').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.rm && await MPP.confirm('Retirer ce compte du dashboard ?', { ok: 'Retirer', danger: true })) { const r = await MPP.rpc('staff_remove', { p_user: b.dataset.rm }); if (!r.ok) throw new Error(r.message); MPP.toast('Compte retiré'); staff(); }
      else if (b.dataset.pass) { const w = await MPP.confirm('Passation : vous deviendrez simple administrateur et ce compte deviendra président. Tapez PASSATION pour confirmer.', { input: 'PASSATION', ok: 'Transmettre', danger: true }); if (w !== 'PASSATION') return; const r = await MPP.rpc('transfer_presidency', { p_to: b.dataset.pass }); if (!r.ok) throw new Error(r.message); MPP.toast('Passation effectuée', 'ok'); setTimeout(() => location.reload(), 800); }
    } catch (err) { A.err(err); }
  });
});

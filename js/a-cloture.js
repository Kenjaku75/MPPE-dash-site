/* Dashboard : assistant de clôture de la campagne (président) */
MPP.admin.page({ nav: 'cloture', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;

  if (S.campagne_cloturee) {
    const t = S.cloture_totaux || {};
    const logs = await MPP.q(sb.from('audit_logs').select('*').eq('action', 'cloture').order('id', { ascending: false }).limit(1));
    el.innerHTML = A.head('Clôture de la campagne', '') + '<div class="alert ok"><b>' + icon('check') + ' La campagne est clôturée.</b> Les inscriptions, le tirage, la promesse de vote, le bandeau et la page « Gagnant du jour » sont désactivés.</div>' +
      '<div class="cols-auto"><div class="panel"><h2>Totaux anonymes conservés</h2><dl class="kv"><dt>Inscrits au tirage</dt><dd><b>' + esc(t.participants != null ? t.participants : '—') + '</b></dd><dt>Promesses de vote</dt><dd><b>' + esc(t.promesses != null ? t.promesses : '—') + '</b></dd><dt>Tirages</dt><dd>' + esc(t.tirages != null ? t.tirages : '—') + '</dd></dl>' +
      '<h3 style="margin-top:14px;font-size:.95rem">Par filière</h3>' + A.hbars(t.par_filiere || {}) + '<h3 style="margin-top:14px;font-size:.95rem">Par année</h3>' + A.hbars(t.par_annee || {}) + '</div>' +
      '<div class="panel"><h2>Journal de suppression</h2>' + (t.date ? '<dl class="kv"><dt>Date</dt><dd>' + A.when(t.date) + '</dd>' + (logs[0] ? '<dt>Effectuée par</dt><dd>' + esc(logs[0].acteur_email || '—') + '</dd>' : '') + '<dt>Participants supprimés</dt><dd>' + esc(t.participants) + '</dd><dt>Promesses supprimées</dt><dd>' + esc(t.promesses) + '</dd><dt>Numéros WhatsApp supprimés</dt><dd>' + esc(t.whatsapp_supprimes != null ? t.whatsapp_supprimes : '—') + '</dd><dt>Clôture forcée</dt><dd>' + (t.forcee ? 'Oui (repas non remis)' : 'Non') + '</dd></dl>' : '<p class="muted">Aucune entrée.</p>') +
      '<p class="small muted" style="margin-top:12px">Reste actif : présentation, projets, équipe, annonces, FAQ, boîte à idées, sondages, avis mensuels sur le bureau et chat (selon les horaires). Pensez à supprimer les sauvegardes et exports conservés hors de la plateforme.</p></div></div>';
    return;
  }

  const [nPart, nProm, tirages, benev] = await Promise.all([
    sb.from('participants').select('id', { count: 'exact', head: true }), sb.from('promesses').select('id', { count: 'exact', head: true }),
    MPP.q(sb.from('tirages').select('*').eq('statut', 'actif')), sb.from('benevoles').select('id', { count: 'exact', head: true }).not('whatsapp', 'is', null)]);
  const pending = tirages.filter((t) => t.statut_repas === 'en_attente' && (!t.valide_jusqu_au || t.valide_jusqu_au > new Date().toISOString()));

  el.innerHTML = A.head('Clôture de la campagne', 'À la date de fin (ou manuellement), les modules de campagne sont désactivés et les données nominatives sont supprimées. Seuls des totaux anonymes sont conservés.') +
    (pending.length ? '<div class="alert warn"><b>' + icon('alert') + ' ' + pending.length + ' repas ne sont pas encore remis.</b> La suppression doit avoir lieu <u>après</u> la remise des repas : sans les noms, plus aucun gagnant ne pourra être vérifié. <a href="tirage.html">Voir les tirages</a></div>' : '<div class="alert ok">' + icon('check') + ' Tous les repas sont remis (ou expirés).</div>') +
    '<div class="cols-auto"><div class="panel"><h2>1. Sauvegarder avant de supprimer</h2><p class="sub">Exportez ce dont vous avez besoin. Ces fichiers contiennent des données nominatives : conservez-les en lieu sûr puis supprimez-les.</p><div class="stack">' +
    A.btn('Participants (CSV)', 'data-ex="part"', 'btn-ghost', 'download') + ' ' + A.btn('Tirages (CSV)', 'data-ex="tir"', 'btn-ghost', 'download') + ' ' + A.btn('Messages du chat (CSV)', 'data-ex="chat"', 'btn-ghost', 'download') + '</div></div>' +
    '<div class="panel danger-zone"><h2>2. Ce qui sera supprimé</h2><ul class="small" style="padding-left:1.1em;margin:0"><li><b>' + (nPart.count || 0) + '</b> participants (noms, prénoms, matricules chiffrés, appareils)</li><li><b>' + (nProm.count || 0) + '</b> promesses de vote nominatives</li><li>Les noms des gagnants dans l\'historique des tirages</li><li><b>' + (benev.count || 0) + '</b> numéros WhatsApp de bénévoles et les contacts des demandes d\'aide</li></ul>' +
    '<h2 style="margin-top:14px">Ce qui est désactivé</h2><p class="small" style="margin:0">Inscriptions, tirage, promesse de vote, bandeau du gagnant, page « Gagnant du jour ».</p></div></div>' +
    '<div class="panel danger-zone"><h2>3. Clôturer</h2><p class="sub">Action <b>irréversible</b>. Un journal de suppression est généré.</p><form id="cf" class="toolbar" novalidate><input name="w" class="grow" placeholder="Tapez CLOTURER pour confirmer" autocomplete="off"><button class="btn btn-danger" type="submit">' + icon('archive') + ' Clôturer la campagne</button></form></div>';

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-ex]'); if (!b) return;
    try {
      if (b.dataset.ex === 'part') { const r = await A.fetchAll(() => sb.from('participants').select('*').order('created_at')); A.csv('participants', ['Nom', 'Prénom', 'Filière', 'Année', 'Statut', 'Canal', 'Inscrit le'], r.map((x) => [x.nom, x.prenom, x.filiere, x.annee, x.statut, x.canal, x.created_at])); }
      else if (b.dataset.ex === 'tir') A.csv('tirages', ['Jour', 'Gagnant', 'Éligibles', 'Créneau', 'Repas', 'Statut'], tirages.concat(await MPP.q(sb.from('tirages').select('*').eq('statut', 'annule'))).map((t) => [t.jour, t.gagnant_label, t.nb_eligibles, t.creneau_repas, t.statut_repas, t.statut]));
      else { const r = await A.fetchAll(() => sb.from('chat_messages').select('*').order('id')); A.csv('chat', ['Date', 'Pseudo', 'Message', 'Statut', 'Signalements'], r.map((m) => [m.created_at, m.pseudo, m.contenu, m.statut, m.nb_signalements])); }
      MPP.toast('Export prêt', 'ok');
    } catch (err) { A.err(err); }
  });
  $('#cf').addEventListener('submit', async (e) => {
    e.preventDefault(); if (e.target.w.value.trim().toUpperCase() !== 'CLOTURER') return MPP.toast('Tapez CLOTURER pour confirmer.', 'error');
    try {
      let r = await MPP.rpc('close_campaign', { p_force: false });
      if (!r.ok && r.code === 'repas_en_attente') {
        if (!(await MPP.confirm(r.message + ' Clôturer quand même supprimera les noms des gagnants non servis. Continuer ?', { ok: 'Clôturer quand même', danger: true }))) return;
        r = await MPP.rpc('close_campaign', { p_force: true });
      }
      if (!r.ok) throw new Error(r.message);
      MPP.toast('Campagne clôturée', 'ok'); setTimeout(() => location.reload(), 600);
    } catch (err) { A.err(err); }
  });
});

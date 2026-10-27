/* Dashboard : tirage au sort quotidien */
MPP.admin.page({ nav: 'tirage', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const camp = MPP.campaign(S);
  const REPAS = { en_attente: ['En attente', 'gold'], remis: ['Remis', 'green'], expire: ['Expiré', ''] };
  let hist = [], eligibles = 0;

  async function load() {
    hist = await MPP.q(sb.from('tirages').select('*').order('created_at', { ascending: false }));
    const ok = await sb.from('participants').select('id', { count: 'exact', head: true }).in('statut', ['valide', 'verifie']);
    const won = hist.filter((t) => t.gagnant_id != null).length;
    eligibles = Math.max(0, (ok.count || 0) - won);
    draw();
  }
  function draw() {
    const today = hist.find((t) => t.jour === camp.today && t.statut === 'actif');
    const can = camp.set && camp.phase === 'en_cours' && !camp.closed;
    const why = camp.closed ? 'La campagne est clôturée.' : !camp.set ? 'Renseignez les dates de la campagne dans les paramètres.' : camp.phase !== 'en_cours' ? 'Aujourd\'hui est en dehors des dates de la campagne.' : '';
    el.innerHTML = A.head('Tirage au sort', 'Un seul tirage par jour, aléatoire côté serveur, parmi les inscrits valides n\'ayant jamais gagné. Chaque tirage est tracé dans le journal.',
      A.btn('Liste des éligibles (CSV)', 'id="elig"', 'btn-ghost', 'download')) +
      '<div class="cols-auto"><div class="panel"><h2>Aujourd\'hui · ' + esc(MPP.fmtDay(camp.today)) + '</h2>' +
      '<dl class="kv"><dt>Participants éligibles</dt><dd><b>' + eligibles + '</b></dd><dt>Heure prévue</dt><dd>' + esc(MPP.hhmm(S.heure_tirage || '12:00')) + (S.tirage_auto ? ' <span class="chip green">automatique</span>' : ' <span class="chip">manuel</span>') + '</dd><dt>Numéro du gagnant</dt><dd>' + esc(S.numero_gagnant) + '</dd></dl><div style="margin-top:14px">' +
      (today ? '<div class="alert ok" style="margin:0"><b>' + icon('trophy') + ' Gagnant du jour : ' + esc(today.gagnant_label) + '</b><br><span class="small">Tiré parmi ' + today.nb_eligibles + ' éligibles à ' + esc(MPP.fmtTime(today.created_at)) + '.</span></div><div class="row" style="margin-top:10px">' + A.btn('Re-tirage (gagnant absent ou non conforme)', 'id="redraw"', 'btn-ghost') + '</div>'
        : can ? '<button class="btn btn-gold btn-block" id="go" type="button">' + icon('trophy') + ' Lancer le tirage du jour</button>' : '<div class="alert warn" style="margin:0">' + esc(why) + '</div>') + '</div></div>' +
      '<div class="panel"><h2>Rappels</h2><ul class="small" style="margin:0;padding-left:1.1em"><li>Les inscriptions « à vérifier » ne sont pas tirées au sort tant qu\'elles ne sont pas validées.</li><li>Le gagnant ne peut pas regagner, même après un re-tirage.</li><li>Le nom et le prénom du gagnant sont publiés sur le site avec le bandeau d\'appel.</li><li>Vérifier la pièce d\'identité (carte d\'étudiant ou CNIB) avant de remettre le repas.</li></ul></div></div>' +
      '<div class="panel"><h2>Historique</h2>' + A.tbl([
        { l: 'Jour', fn: (t) => esc(MPP.fmtDate(t.jour, { weekday: 'short', day: 'numeric', month: 'short' })), cls: 'nowrap' },
        { l: 'Gagnant', fn: (t) => '<b>' + esc(t.gagnant_label || '(supprimé à la clôture)') + '</b>' + (t.statut === 'annule' ? ' <span class="chip red">Annulé</span><div class="small muted">' + esc(t.motif_annulation || '') + '</div>' : '') },
        { l: 'Éligibles', fn: (t) => t.nb_eligibles }, { l: 'Créneau', fn: (t) => (t.statut === 'annule' ? '—' : '<select data-slot="' + t.id + '" style="min-height:36px;width:auto"><option value="">—</option>' + (S.creneaux_repas || []).map((c) => '<option' + (c === t.creneau_repas ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>') },
        { l: 'Repas', fn: (t) => (t.statut === 'annule' ? '—' : A.chip(REPAS, t.statut_repas)) },
        { l: 'Valable jusqu\'au', fn: (t) => (t.valide_jusqu_au ? A.when(t.valide_jusqu_au) : '—'), cls: 'nowrap' }
      ], hist, (t) => (t.statut === 'actif' && t.statut_repas !== 'remis' ? A.btn('Marquer « remis »', 'data-remis="' + t.id + '"', 'btn-primary', 'check') : '') + (t.statut === 'actif' && t.statut_repas === 'en_attente' ? A.btn('Expiré', 'data-exp="' + t.id + '"', 'btn-ghost') : ''), 'Aucun tirage pour le moment.') + '</div>';
  }

  async function run(redraw) {
    let motif = null;
    if (redraw) { motif = await MPP.confirm('Un nouveau gagnant sera tiré et l\'ancien sera annulé. Motif du re-tirage :', { input: 'Motif (ex. gagnant absent, pièce non conforme)', ok: 'Re-tirer', danger: true }); if (!motif) return; }
    else if (!(await MPP.confirm('Lancer le tirage du jour ? Cette action est irréversible (un seul tirage par jour).', { ok: 'Lancer le tirage' }))) return;
    try {
      const r = await MPP.rpc('run_draw', { p_redraw: !!redraw, p_motif: motif });
      if (!r.ok) { MPP.toast(r.message, 'error'); return; }
      const m = A.modal('Le gagnant du jour est…', '<div class="center" style="padding:10px 0"><div class="winner-name" style="font-size:2.2rem">' + esc(r.gagnant) + '</div><p class="muted">Tiré parmi ' + r.eligibles + ' participants.</p><p>Le nom est déjà publié sur le site. Appelez ou faites appeler le gagnant : <b>' + esc(S.numero_gagnant) + '</b></p><button class="btn" data-x type="button">Terminer</button></div>', { noFocus: true });
      await load();
    } catch (err) { A.err(err); }
  }
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.id === 'go') run(false);
      else if (b.id === 'redraw') run(true);
      else if (b.dataset.remis) { const r = await sb.from('tirages').update({ statut_repas: 'remis' }).eq('id', b.dataset.remis); if (r.error) throw new Error(r.error.message); MPP.toast('Repas marqué comme remis', 'ok'); await load(); }
      else if (b.dataset.exp) { const r = await sb.from('tirages').update({ statut_repas: 'expire' }).eq('id', b.dataset.exp); if (r.error) throw new Error(r.error.message); await load(); }
      else if (b.id === 'elig') {
        const winners = new Set(hist.map((t) => t.gagnant_id).filter((x) => x != null));
        const all = (await A.fetchAll(() => sb.from('participants').select('*').in('statut', ['valide', 'verifie']).order('nom'))).filter((p) => !winners.has(p.id));
        A.csv('eligibles-tirage', ['N°', 'Nom', 'Prénom', 'Filière', 'Année'], all.map((p, i) => [i + 1, p.nom, p.prenom, p.filiere, p.annee]));
        await sb.rpc('log_audit', { p_action: 'export.eligibles', p_cible: null, p_detail: { lignes: all.length } }); MPP.toast('Liste exportée (plan de secours)', 'ok');
      }
    } catch (err) { A.err(err); }
  });
  el.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-slot]'); if (!s) return;
    const r = await sb.from('tirages').update({ creneau_repas: s.value || null }).eq('id', s.dataset.slot); if (r.error) A.err(r.error); else MPP.toast('Créneau enregistré', 'ok');
  });
  await load();
});

/* Dashboard : sondages (création, ouverture, résultats, export) */
MPP.admin.page({ nav: 'sondages', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const TYPES = [['unique', 'Choix unique'], ['multiple', 'Choix multiple'], ['echelle', 'Échelle de 1 à 5']];
  let polls = [], res = {};

  el.innerHTML = A.head('Sondages', 'Seuls les administrateurs créent des questions. Formulez-les de façon neutre. Une réponse par appareil.', A.btn('Nouveau sondage', 'id="new"', 'btn-primary', 'plus')) + '<div id="list"></div>';
  const state = (p) => { const n = new Date().toISOString(); return !p.ouvre_at || p.ouvre_at > n ? ['Programmé', ''] : p.ferme_at && p.ferme_at < n ? ['Terminé', 'red'] : ['Ouvert', 'green']; };

  async function load() {
    polls = await MPP.q(sb.from('sondages').select('*').order('created_at', { ascending: false }));
    res = {}; await Promise.all(polls.map(async (p) => { res[p.id] = await MPP.rpc('poll_results', { p_id: p.id }); }));
    draw();
  }
  function draw() {
    $('#list').innerHTML = polls.length ? polls.map((p) => {
      const s = state(p); const r = res[p.id] || { counts: [], total: 0 };
      const labels = p.type === 'echelle' ? ['1', '2', '3', '4', '5'] : p.options; const tot = r.counts.reduce((a, b) => a + b, 0) || 1;
      return '<article class="panel"><div class="row between"><div class="row"><span class="chip ' + s[1] + '">' + s[0] + '</span><span class="chip">' + esc((TYPES.find((t) => t[0] === p.type) || [])[1]) + '</span>' + (p.afficher_resultats ? '<span class="chip green">Résultats publics</span>' : '<span class="chip">Résultats privés</span>') + '</div><span class="muted small">' + (p.ouvre_at ? 'Du ' + A.when(p.ouvre_at) : '') + (p.ferme_at ? ' au ' + A.when(p.ferme_at) : '') + '</span></div>' +
        '<h2 style="margin:10px 0">' + esc(p.question) + '</h2>' + (r.counts || []).map((c, i) => { const pc = Math.round((c / tot) * 100); return '<div class="res-row"><i style="width:' + pc + '%"></i><span><span>' + esc(labels[i]) + '</span><b>' + c + ' · ' + pc + ' %</b></span></div>'; }).join('') +
        '<p class="small muted">' + r.total + ' réponse' + (r.total > 1 ? 's' : '') + (r.moyenne ? ' · moyenne ' + String(r.moyenne).replace('.', ',') + ' / 5' : '') + '</p>' +
        '<div class="row">' + A.btn('Modifier', 'data-edit="' + p.id + '"', 'btn-ghost', 'edit') + (s[0] === 'Ouvert' ? A.btn('Fermer maintenant', 'data-close="' + p.id + '"') : s[0] !== 'Terminé' ? A.btn('Ouvrir maintenant', 'data-open="' + p.id + '"', 'btn-primary') : A.btn('Rouvrir 7 jours', 'data-reopen="' + p.id + '"')) + A.btn('Exporter', 'data-csv="' + p.id + '"', 'btn-ghost', 'download') + A.btn('', 'data-del="' + p.id + '" aria-label="Supprimer"', 'btn-ghost', 'trash') + '</div></article>';
    }).join('') : '<div class="empty">Aucun sondage. Créez le premier !</div>';
  }
  function edit(p) {
    const locked = p && res[p.id] && res[p.id].total > 0;
    const fields = [{ k: 'question', l: 'Question', t: 'text', req: true, max: 200 }, { k: 'type', l: 'Type de réponse', t: 'select', req: true, opts: TYPES }, { k: 'options', l: 'Choix de réponse (un par ligne)', t: 'textarea', rows: 5, hint: 'Ignoré pour l\'échelle de 1 à 5.' },
      { k: 'ouvre_at', l: "Date d'ouverture", t: 'datetime', req: true, def: new Date().toISOString() }, { k: 'ferme_at', l: 'Date de fermeture', t: 'datetime' }, { k: 'afficher_resultats', l: 'Publier les résultats en pourcentage', t: 'check' }];
    const v = p ? Object.assign({}, p, { options: (p.options || []).join('\n') }) : { type: 'unique', afficher_resultats: true };
    const m = A.modal(p ? 'Modifier le sondage' : 'Nouveau sondage', '<form novalidate>' + (locked ? '<div class="alert warn">Ce sondage a déjà des réponses : le type et les choix sont verrouillés.</div>' : '') + A.formHtml(fields, v) + '<div class="row end"><button type="button" class="btn btn-ghost" data-x>Annuler</button><button class="btn" type="submit">Enregistrer</button></div></form>', { wide: true });
    if (locked) { m.$('[name=type]').disabled = true; m.$('[name=options]').disabled = true; }
    m.$('form').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) return f.reportValidity();
      const d = A.readForm(f, fields); const type = locked ? p.type : d.type;
      const options = locked ? p.options : type === 'echelle' ? [] : String(d.options || '').split('\n').map((s) => s.trim()).filter(Boolean);
      if (type !== 'echelle' && options.length < 2) return MPP.toast('Indiquez au moins deux choix (un par ligne).', 'error');
      const row = { question: d.question, type, options, ouvre_at: d.ouvre_at, ferme_at: d.ferme_at, afficher_resultats: d.afficher_resultats };
      try { const r = p ? await sb.from('sondages').update(row).eq('id', p.id) : await sb.from('sondages').insert(row); if (r.error) throw new Error(r.error.message); m.close(); MPP.toast('Sondage enregistré', 'ok'); await load(); } catch (err) { A.err(err); }
    });
  }
  async function patch(id, v, msg) { const r = await sb.from('sondages').update(v).eq('id', id); if (r.error) throw new Error(r.error.message); MPP.toast(msg, 'ok'); await load(); }
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.dataset.edit || b.dataset.close || b.dataset.open || b.dataset.reopen || b.dataset.csv || b.dataset.del;
    try {
      if (b.id === 'new') edit(null);
      else if (b.dataset.edit) edit(polls.find((p) => String(p.id) === id));
      else if (b.dataset.close) await patch(id, { ferme_at: new Date().toISOString() }, 'Sondage fermé');
      else if (b.dataset.open) await patch(id, { ouvre_at: new Date().toISOString() }, 'Sondage ouvert');
      else if (b.dataset.reopen) await patch(id, { ferme_at: new Date(Date.now() + 7 * 864e5).toISOString() }, 'Sondage rouvert pour 7 jours');
      else if (b.dataset.csv) { const p = polls.find((x) => String(x.id) === id); const r = res[p.id]; const labels = p.type === 'echelle' ? ['1', '2', '3', '4', '5'] : p.options; A.csv('sondage-' + p.id, ['Question', 'Réponse', 'Nombre', 'Pourcentage'], r.counts.map((c, i) => [p.question, labels[i], c, Math.round((c / (r.counts.reduce((a, b2) => a + b2, 0) || 1)) * 100) + ' %'])); }
      else if (b.dataset.del && await MPP.confirm('Supprimer ce sondage et toutes ses réponses ?', { ok: 'Supprimer', danger: true })) { const r = await sb.from('sondages').delete().eq('id', id); if (r.error) throw new Error(r.error.message); MPP.toast('Sondage supprimé'); await load(); }
    } catch (err) { A.err(err); }
  });
  await load();
});

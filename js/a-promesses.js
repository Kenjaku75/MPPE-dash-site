/* Dashboard : liste nominative des promesses de vote (réservée au président, accès journalisé) */
MPP.admin.page({ nav: 'promesses', need: 'president' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const PER = 40; let page = 0, total = 0, rows = [], q = '';
  sb.rpc('log_audit', { p_action: 'promesses.consultation', p_cible: null, p_detail: {} });
  const all = await A.fetchAll(() => sb.from('promesses').select('filiere,annee'));
  const by =(k) => { const o = {}; all.forEach((r) => { o[r[k]] = (o[r[k]] || 0) + 1; }); return o; };

  el.innerHTML = A.head('Promesses de vote', 'Liste nominative <b>visible du seul président</b> : le reste du bureau ne voit que des totaux. Chaque consultation est inscrite au journal d\'audit. Les noms sont supprimés à la clôture.', A.btn('Exporter', 'id="csv"', 'btn-ghost', 'download')) +
    '<div class="alert warn">' + icon('lock') + ' Ces informations sont confidentielles. Aucun compteur n\'est affiché au public (risque de faux comptes). Les promesses n\'ont aucune valeur officielle : le vote est libre et secret.</div>' +
    '<div class="stats"><div class="stat"><b>' + all.length + '</b><span>Promesses au total</span></div></div><div class="cols-auto"><div class="panel"><h2>Par filière</h2>' + A.hbars(by('filiere')) + '</div><div class="panel"><h2>Par année</h2>' + A.hbars(by('annee')) + '</div></div>' +
    '<div class="toolbar"><input class="grow" id="q" type="search" placeholder="Rechercher un nom…"></div><div id="list"></div><div class="pager" id="pager"></div>';

  async function load() {
    let query = sb.from('promesses').select('*', { count: 'exact' }); if (q) query = query.or('nom.ilike.%' + q + '%,prenom.ilike.%' + q + '%');
    const r = await query.order('created_at', { ascending: false }).range(page * PER, page * PER + PER - 1); if (r.error) throw new Error(r.error.message);
    rows = r.data; total = r.count != null ? r.count : rows.length;
    $('#list').innerHTML = A.tbl([{ l: 'Nom', fn: (r2) => '<b>' + esc(r2.nom) + '</b> ' + esc(r2.prenom) }, { l: 'Filière', fn: (r2) => esc(r2.filiere) }, { l: 'Année', fn: (r2) => esc(r2.annee) }, { l: 'Date', fn: (r2) => A.when(r2.created_at) }], rows, null, 'Aucune promesse.');
    const pages = Math.max(1, Math.ceil(total / PER));
    $('#pager').innerHTML = '<span class="muted small">' + total + ' résultat' + (total > 1 ? 's' : '') + '</span><div class="row">' + A.btn('← Précédent', (page === 0 ? 'disabled' : '') + ' data-p="-1"') + '<span class="small">Page ' + (page + 1) + ' / ' + pages + '</span>' + A.btn('Suivant →', (page + 1 >= pages ? 'disabled' : '') + ' data-p="1"') + '</div>';
  }
  let t; $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { q = e.target.value.trim().replace(/[%,]/g, ''); page = 0; load().catch(A.err); }, 250); });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.p) { page += Number(b.dataset.p); load().catch(A.err); }
    else if (b.id === 'csv') { const full = await A.fetchAll(() => sb.from('promesses').select('*').order('created_at')); A.csv('promesses', ['Nom', 'Prénom', 'Filière', 'Année', 'Date'], full.map((r) => [r.nom, r.prenom, r.filiere, r.annee, r.created_at])); sb.rpc('log_audit', { p_action: 'promesses.export', p_cible: null, p_detail: { lignes: full.length } }); }
  });
  await load();
});

/* Dashboard : participants au tirage */
MPP.admin.page({ nav: 'participants', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const PER = 40;
  const ST = { valide: ['Valide', 'green'], a_verifier: ['À vérifier', 'gold'], verifie: ['Vérifié', 'green'], rejete: ['Rejeté', 'red'] };
  let page = 0, total = 0, rows = [], q = '', fst = '', fcanal = '';

  el.innerHTML = A.head('Participants', 'Inscrits au tirage au sort. Les matricules sont chiffrés : ils ne peuvent pas être relus.', A.btn('Exporter en CSV', 'id="csv"', 'btn-ghost', 'download')) +
    '<div class="toolbar"><input class="grow" type="search" id="q" placeholder="Rechercher un nom ou un prénom…"><select id="fst"><option value="">Tous les statuts</option>' + Object.entries(ST).map(([k, v]) => '<option value="' + k + '">' + v[0] + '</option>').join('') + '</select><select id="fcanal"><option value="">Site et stand</option><option value="site">Site</option><option value="stand">Stand</option></select></div>' +
    '<div id="list"></div><div class="pager" id="pager"></div>';

  async function load() {
    let query = sb.from('participants').select('*', { count: 'exact' });
    if (q) query = query.or('nom.ilike.%' + q + '%,prenom.ilike.%' + q + '%');
    if (fst) query = query.eq('statut', fst); if (fcanal) query = query.eq('canal', fcanal);
    const r = await query.order('created_at', { ascending: false }).range(page * PER, page * PER + PER - 1);
    if (r.error) throw new Error(r.error.message);
    rows = r.data; total = r.count != null ? r.count : rows.length; draw();
  }
  function draw() {
    $('#list').innerHTML = A.tbl([
      { l: 'Nom', fn: (r) => '<b>' + esc(r.nom) + '</b> ' + esc(r.prenom) + (r.note ? '<div class="small muted">' + icon('alert') + ' ' + esc(r.note) + '</div>' : ''), cls: 'wide' },
      { l: 'Filière', fn: (r) => esc(r.filiere) }, { l: 'Année', fn: (r) => esc(r.annee) },
      { l: 'Statut', fn: (r) => A.chip(ST, r.statut) + (r.carte_verifiee ? ' <span class="chip green">Carte vue</span>' : '') },
      { l: 'Canal', fn: (r) => (r.canal === 'stand' ? 'Stand' + (r.operateur ? ' (' + esc(r.operateur) + ')' : '') : 'Site') }, { l: 'Inscrit', fn: (r) => A.when(r.created_at), cls: 'nowrap' }
    ], rows, (r) => (r.statut === 'a_verifier' ? A.btn('Valider', 'data-a="verifie" data-id="' + r.id + '"', 'btn-primary') + A.btn('Rejeter', 'data-a="rejete" data-id="' + r.id + '"', 'btn-ghost') : r.statut === 'rejete' ? A.btn('Rétablir', 'data-a="verifie" data-id="' + r.id + '"', 'btn-ghost') : '') + A.btn('', 'data-a="del" data-id="' + r.id + '" aria-label="Supprimer"', 'btn-ghost', 'trash'), 'Aucun participant.');
    const pages = Math.max(1, Math.ceil(total / PER));
    $('#pager').innerHTML = '<span class="muted small">' + total + ' participant' + (total > 1 ? 's' : '') + '</span><div class="row">' + A.btn('← Précédent', (page === 0 ? 'disabled' : '') + ' data-p="-1"') + '<span class="small">Page ' + (page + 1) + ' / ' + pages + '</span>' + A.btn('Suivant →', (page + 1 >= pages ? 'disabled' : '') + ' data-p="1"') + '</div>';
  }
  let timer; $('#q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { q = e.target.value.trim().replace(/[%,]/g, ''); page = 0; load().catch(A.err); }, 250); });
  $('#fst').addEventListener('change', (e) => { fst = e.target.value; page = 0; load().catch(A.err); });
  $('#fcanal').addEventListener('change', (e) => { fcanal = e.target.value; page = 0; load().catch(A.err); });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.p) { page += Number(b.dataset.p); load().catch(A.err); return; }
    if (b.id === 'csv') {
      const all = await A.fetchAll(() => sb.from('participants').select('*').order('created_at'));
      A.csv('participants', ['Nom', 'Prénom', 'Filière', 'Année', 'Statut', 'Canal', 'Opérateur', 'Carte vérifiée', 'Note', 'Inscrit le'], all.map((r) => [r.nom, r.prenom, r.filiere, r.annee, r.statut, r.canal, r.operateur, r.carte_verifiee ? 'oui' : 'non', r.note, r.created_at]));
      MPP.toast('Export prêt (' + all.length + ' lignes)', 'ok'); return;
    }
    const act = b.dataset.a; if (!act) return; const id = b.dataset.id;
    try {
      if (act === 'del') {
        if (!(await MPP.confirm('Supprimer cette inscription ? Le participant pourra se réinscrire.', { ok: 'Supprimer', danger: true }))) return;
        const r = await sb.from('participants').delete().eq('id', id); if (r.error) throw new Error(r.error.message);
      } else { const r = await sb.from('participants').update({ statut: act }).eq('id', id); if (r.error) throw new Error(r.error.message); }
      MPP.toast('Mis à jour', 'ok'); await load();
    } catch (err) { A.err(err); }
  });
  await load();
});

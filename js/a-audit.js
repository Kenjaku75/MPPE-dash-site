/* Dashboard : journal d'audit (président) */
MPP.admin.page({ nav: 'audit', need: 'president' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  let logs = [], q = '', only = '';
  el.innerHTML = A.head("Journal d'audit", 'Toutes les actions sensibles : tirages, modération, modifications de contenus et de paramètres, exports, clôture, et les tentatives refusées.', A.btn('Actualiser', 'id="rf"', 'btn-ghost') + A.btn('Exporter', 'id="csv"', 'btn-ghost', 'download')) +
    '<div class="toolbar"><input class="grow" id="q" type="search" placeholder="Filtrer (action, acteur, cible)…"><label class="chip red" style="cursor:pointer"><input type="checkbox" id="only" style="width:auto;min-height:0"> Tentatives refusées seulement</label></div><div id="list"></div>';
  async function load() { logs = await MPP.q(sb.from('audit_logs').select('*').order('id', { ascending: false }).limit(400)); draw(); }
  function draw() {
    const l = logs.filter((x) => (!only || x.action === 'tentative_refusee') && (!q || (x.action + ' ' + (x.acteur_email || '') + ' ' + (x.cible || '')).toLowerCase().includes(q)));
    $('#list').innerHTML = A.tbl([{ l: 'Date', fn: (x) => A.when(x.at), cls: 'nowrap' }, { l: 'Acteur', fn: (x) => esc(x.acteur_email || 'Système / public') + (x.role ? ' <span class="chip">' + esc(A.ROLES[x.role] || x.role) + '</span>' : '') },
      { l: 'Action', fn: (x) => (x.action === 'tentative_refusee' ? '<span class="chip red">' + icon('alert') + ' Tentative refusée</span>' : '<code>' + esc(x.action) + '</code>') }, { l: 'Cible', fn: (x) => esc(x.cible || '—') },
      { l: 'Détail', fn: (x) => '<span class="small muted">' + esc(Object.keys(x.detail || {}).length ? JSON.stringify(x.detail) : '') + '</span>', cls: 'wide' }], l, null, 'Aucune entrée.') + '<p class="muted small">Affichage des 400 dernières entrées.</p>';
  }
  $('#q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  $('#only').addEventListener('change', (e) => { only = e.target.checked ? 1 : ''; draw(); });
  el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'rf') load().catch(A.err); else if (b.id === 'csv') A.csv('journal-audit', ['Date', 'Acteur', 'Rôle', 'Action', 'Cible', 'Détail'], logs.map((x) => [x.at, x.acteur_email, x.role, x.action, x.cible, JSON.stringify(x.detail || {})])); });
  await load();
});

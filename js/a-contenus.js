/* Dashboard : contenus du site (présentation, projets, annonces, FAQ, liens, pages légales, remerciements, QR code) */
MPP.admin.page({ nav: 'contenus', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const isPres = A.allowed(me.role, 'president');
  const TABS = [['mouvement', 'Le mouvement'], ['projets', 'Projets'], ['annonces', 'Annonces'], ['faq', 'FAQ'], ['liens', 'Liens officiels'], ['legales', 'Pages légales'], ['merci', 'Remerciements'], ['qr', 'QR code']];
  let tab = TABS.some((t) => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'mouvement';
  const STP = [['prevu', 'Prévu'], ['en_cours', 'En cours'], ['realise', 'Réalisé']];

  el.innerHTML = A.head('Contenus', 'Tout le contenu du site est modifiable ici, sans toucher au code. Le texte accepte **gras**, *italique*, des listes (« - ») et des titres (« ## »).') + '<div class="tabs-adm" id="tabs"></div><div id="pane"></div>';
  const pane = () => $('#pane');

  async function pagesEditor(table, slugs, note) {
    const rows = await MPP.q(sb.from(table).select('*')); const by = Object.fromEntries(rows.map((r) => [r.slug, r]));
    pane().innerHTML = (note ? '<div class="alert info">' + note + '</div>' : '') + slugs.map((s) => { const r = by[s[0]] || { slug: s[0], titre: s[1], corps: '' };
      return '<form class="panel" data-slug="' + s[0] + '" novalidate><h2>' + esc(s[1]) + '</h2><label class="field"><span>Titre</span><input name="titre" required value="' + esc(r.titre) + '"></label><label class="field"><span>Texte</span><textarea name="corps" rows="' + (table === 'pages_legales' ? 12 : 6) + '" required>' + esc(r.corps) + '</textarea></label><div class="row between"><span class="muted small">' + (r.maj_at ? 'Dernière mise à jour : ' + A.when(r.maj_at) : 'Pas encore enregistré') + '</span><button class="btn btn-sm" type="submit">Enregistrer</button></div></form>'; }).join('');
    pane().querySelectorAll('form').forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(f).entries());
      const r = await sb.from(table).upsert({ slug: f.dataset.slug, titre: d.titre.trim(), corps: d.corps.trim() }, { onConflict: 'slug' });
      if (r.error) A.err(r.error); else { MPP.toast('Enregistré', 'ok'); pagesEditor(table, slugs, note); }
    }));
  }

  const VIEW = {
    mouvement: () => pagesEditor('pages_contenu', [['mouvement', 'Présentation'], ['valeurs', 'Valeurs'], ['histoire', 'Histoire du bureau']]),
    legales: () => pagesEditor('pages_legales', [['mentions-legales', 'Mentions légales'], ['regles-tirage', 'Règles du tirage'], ['confidentialite', 'Politique de confidentialité'], ['charte', 'Charte du chat et de la boîte à idées']],
      'Variables remplies automatiquement : <code>{{campagne_debut}}</code> <code>{{campagne_fin}}</code> <code>{{heure_tirage}}</code> <code>{{numero_gagnant}}</code> <code>{{validite}}</code> <code>{{chat_horaires}}</code> <code>{{representant}}</code> <code>{{contact_public}}</code> <code>{{hebergeur}}</code> (réglées dans <a href="parametres.html">Paramètres</a>). Ajoutez <code>|texte</code> pour le texte affiché si la valeur est vide.'),
    projets: async () => { pane().innerHTML = '<div id="c"></div>'; await A.crud($('#c'), { table: 'projets', label: 'Projet', order: [['ordre', true]], empty: 'Aucun projet.',
      cols: [{ l: 'Projet', fn: (r) => '<b>' + esc(r.titre) + '</b><div class="small muted">' + esc((r.description || '').slice(0, 90)) + '</div>', cls: 'wide' }, { l: 'Statut', fn: (r) => A.chip(MPP.STATUT_PROJET, r.statut) }, { l: 'Ordre', fn: (r) => r.ordre }, { l: 'Visible', fn: (r) => (r.visible ? 'Oui' : '<span class="muted">Non</span>') }],
      fields: [{ k: 'titre', l: 'Titre', t: 'text', req: true }, { k: 'description', l: 'Description', t: 'textarea' }, { k: 'objectif', l: 'Objectif', t: 'text' }, { k: 'statut', l: 'Statut', t: 'select', req: true, opts: STP }, { k: 'ordre', l: "Ordre d'affichage", t: 'number', def: 0 }, { k: 'visible', l: 'Visible sur le site', t: 'check', def: true }], defaults: { statut: 'prevu', ordre: 0, visible: true } }); },
    annonces: async () => { pane().innerHTML = '<div id="c"></div>'; await A.crud($('#c'), { table: 'annonces', label: 'Annonce', order: [['publie_at', false]], empty: 'Aucune annonce.',
      cols: [{ l: 'Annonce', fn: (r) => '<b>' + esc(r.titre) + '</b><div class="small muted">' + esc((r.corps || '').slice(0, 90)) + '</div>', cls: 'wide' }, { l: 'Publiée', fn: (r) => A.when(r.publie_at) }, { l: 'Visible', fn: (r) => (r.visible ? 'Oui' : '<span class="muted">Non</span>') }],
      fields: [{ k: 'titre', l: 'Titre', t: 'text', req: true }, { k: 'corps', l: 'Texte', t: 'md', rows: 6 }, { k: 'publie_at', l: 'Date de publication', t: 'datetime', def: new Date().toISOString() }, { k: 'visible', l: 'Visible sur le site', t: 'check', def: true }], defaults: { visible: true } }); },
    faq: async () => { pane().innerHTML = '<div id="c"></div>'; await A.crud($('#c'), { table: 'faq', label: 'Question', order: [['ordre', true]], empty: 'Aucune question.',
      cols: [{ l: 'Question', fn: (r) => '<b>' + esc(r.question) + '</b>', cls: 'wide' }, { l: 'Ordre', fn: (r) => r.ordre }, { l: 'Visible', fn: (r) => (r.visible ? 'Oui' : '<span class="muted">Non</span>') }],
      fields: [{ k: 'question', l: 'Question', t: 'text', req: true }, { k: 'reponse', l: 'Réponse', t: 'md', req: true, rows: 5 }, { k: 'ordre', l: 'Ordre', t: 'number', def: 0 }, { k: 'visible', l: 'Visible', t: 'check', def: true }], defaults: { ordre: 99, visible: true } }); },
    liens: async () => { pane().innerHTML = '<div id="c"></div>'; await A.crud($('#c'), { table: 'liens_officiels', label: 'Lien', order: [['ordre', true]], intro: 'Liens officiels de l\'UTM, affichés dans le pied de page et la page « Liens utiles ». Ils s\'ouvrent dans un nouvel onglet.', empty: 'Aucun lien.',
      cols: [{ l: 'Libellé', fn: (r) => '<b>' + esc(r.libelle) + '</b>' }, { l: 'Adresse', fn: (r) => '<a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.url.replace(/^https?:\/\//, '')) + '</a>', cls: 'wide' }, { l: 'Visible', fn: (r) => (r.visible ? 'Oui' : '<span class="muted">Non</span>') }],
      fields: [{ k: 'libelle', l: 'Libellé', t: 'text', req: true }, { k: 'url', l: 'Adresse (https://…)', t: 'url', req: true }, { k: 'ordre', l: 'Ordre', t: 'number', def: 0 }, { k: 'visible', l: 'Visible', t: 'check', def: true }], defaults: { ordre: 99, visible: true } }); },
    merci: () => {
      pane().innerHTML = '<form class="panel" id="mf" novalidate><h2>Page « Remerciements et résultats »</h2><p class="sub">À préparer avant la fin de la campagne. Les résultats sont saisis à la main, <b>uniquement après leur annonce officielle par l\'université</b> : le site ne calcule rien.</p>' +
        '<label class="check"><input type="checkbox" name="act"' + (S.merci_active ? ' checked' : '') + (isPres ? '' : ' disabled') + '><span><b>Page activée</b> (visible par tous)<br><span class="muted small">' + (isPres ? 'Réservé au président : à activer après le scrutin.' : 'Seul le président peut activer cette page.') + '</span></span></label>' +
        '<label class="field"><span>Remerciements du bureau</span><textarea name="t" rows="5">' + esc(S.merci_texte || '') + '</textarea></label><label class="field"><span>Résultats officiels</span><textarea name="r" rows="5" placeholder="À saisir après l\'annonce officielle par l\'université.">' + esc(S.merci_resultats || '') + '</textarea></label><button class="btn" type="submit">Enregistrer</button></form>';
      $('#mf').addEventListener('submit', async (e) => { e.preventDefault(); const f = e.target; const o = { merci_texte: f.t.value.trim(), merci_resultats: f.r.value.trim() }; if (isPres) o.merci_active = f.act.checked; try { await A.saveParams(o); MPP.toast('Enregistré', 'ok'); } catch (err) { A.err(err); } });
    },
    qr: async () => {
      const def = (MPP.cfg.siteUrl ? MPP.cfg.siteUrl.replace(/\/$/, '') + '/' : location.href.replace(/admin\/[^/]*$/, '').split('?')[0]);
      pane().innerHTML = '<div class="panel"><h2>QR code pour les affiches et les tracts</h2><p class="sub">Il renvoie vers le site. Téléchargez-le en PNG et imprimez-le en grand (au moins 3 cm de côté).</p><label class="field"><span>Adresse du site</span><input id="qu" type="url" value="' + esc(def) + '"></label><div class="qr-box"><canvas id="qc" width="10" height="10"></canvas></div><div class="row" style="margin-top:12px">' + A.btn('Télécharger le PNG', 'id="qd"', 'btn-primary', 'download') + '</div><p class="small muted" id="qn"></p></div>';
      if (!window.qrcode) { try { await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); } catch (e) { $('#qn').textContent = 'Le générateur de QR code n\'a pas pu être chargé (connexion internet requise).'; return; } }
      const draw = () => { const u = $('#qu').value.trim(); if (!u) return; const qr = window.qrcode(0, 'M'); qr.addData(u); qr.make(); const n = qr.getModuleCount(); const cell = Math.max(4, Math.floor(480 / (n + 8))); const size = cell * (n + 8); const c = $('#qc'); c.width = c.height = size; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.fillStyle = '#073d1d'; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) x.fillRect((k + 4) * cell, (r + 4) * cell, cell, cell); c.style.maxWidth = '100%'; };
      draw(); $('#qu').addEventListener('input', draw);
      $('#qd').addEventListener('click', () => { const a = document.createElement('a'); a.href = $('#qc').toDataURL('image/png'); a.download = 'qr-mpp.png'; a.click(); });
    }
  };

  async function render() { $('#tabs').innerHTML = TABS.map(([k, l]) => '<button role="tab" data-tab="' + k + '" aria-selected="' + (k === tab) + '">' + l + '</button>').join(''); location.hash = tab; pane().innerHTML = '<div class="loading">Chargement…</div>'; try { await VIEW[tab](); } catch (e) { A.err(e); } }
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); } });
  await render();
});

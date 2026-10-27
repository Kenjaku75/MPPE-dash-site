/* Dashboard : points d'inscription sur le campus (mode « stand ») */
MPP.admin.page({ nav: 'points', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const stand = MPP.store.get('stand', null);
  el.innerHTML = A.head("Points d'inscription", "Pour que le tirage ne favorise pas ceux qui ont un smartphone, des membres du bureau tiennent un stand avec un appareil du bureau. Le mode « stand » lève la limite d'inscriptions par appareil mais garde l'unicité du matricule. Le stand ne propose jamais la promesse de vote.") +
    (stand ? '<div class="alert warn"><b>Cet appareil est en mode stand : ' + esc(stand.nom) + '.</b> ' + A.btn('Quitter le mode stand', 'id="off"') + '</div>' : '') +
    '<div class="alert info">' + icon('shield') + ' Chaque inscription au stand est marquée « faite au stand » avec le point et l\'opérateur, dans le journal. L\'étudiant remplit lui-même le formulaire et coche lui-même le consentement ; le membre du bureau vérifie sa carte d\'étudiant.</div><div id="c"></div>';
  const off = $('#off'); if (off) off.addEventListener('click', () => { MPP.store.set('stand', null); location.reload(); });
  await A.crud($('#c'), {
    table: 'points_inscription', label: "Point d'inscription", order: [['id', true]], empty: "Aucun point d'inscription. Créez-en un, puis définissez son code d'activation.",
    cols: [{ l: 'Point', fn: (r) => '<b>' + esc(r.nom) + '</b>' }, { l: 'Lieu', fn: (r) => esc(r.lieu || '—') }, { l: 'Horaires', fn: (r) => esc(r.horaires || '—') }, { l: 'Statut', fn: (r) => (r.actif ? '<span class="chip green">Actif</span>' : '<span class="chip">Inactif</span>') + (r.code_hash ? '' : ' <span class="chip gold">Sans code</span>') }],
    fields: [{ k: 'nom', l: 'Nom du point', t: 'text', req: true }, { k: 'lieu', l: 'Lieu', t: 'text' }, { k: 'horaires', l: 'Horaires', t: 'text', ph: '9 h – 14 h' }, { k: 'actif', l: 'Actif', t: 'check', def: true }], defaults: { actif: true },
    rowActs: (r) => A.btn('Définir le code', 'data-act="code" data-id="' + r.id + '"') + A.btn('Activer sur cet appareil', 'data-act="on" data-id="' + r.id + '"', 'btn-primary'),
    actions: {
      async code(r, reload) {
        const c = await MPP.confirm('Choisissez un code d\'activation (4 caractères minimum) à remettre aux membres qui tiennent ce stand.', { input: 'Code du point « ' + r.nom + ' »', ok: 'Enregistrer' }); if (!c || c === true) return;
        const res = await MPP.rpc('point_set_code', { p_id: r.id, p_code: c }); if (!res.ok) throw new Error(res.message); MPP.toast('Code enregistré', 'ok'); await reload();
      },
      async on(r) {
        if (!r.code_hash) throw new Error("Définissez d'abord le code de ce point.");
        const c = await MPP.confirm('Activer le mode stand « ' + r.nom + ' » sur cet appareil. Saisissez le code du point :', { input: 'Code', ok: 'Continuer' }); if (!c || c === true) return;
        const op = await MPP.confirm("Nom de l'opérateur (membre du bureau qui tient le stand) :", { input: 'Opérateur', ok: 'Activer' }); if (!op || op === true) return;
        // Le mode stand se règle sur le SITE PUBLIC (autre adresse possible) : les infos passent dans le fragment de l'adresse,
        // qui n'est jamais envoyé à un serveur, puis la page d'inscription les enregistre et efface l'adresse.
        const dest = MPP.siteLink('inscription.html');
        if (!dest) throw new Error("Renseignez l'adresse du site public (siteUrl) dans js/config.js pour activer le mode stand.");
        location.href = dest + '#stand=' + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ id: r.id, nom: r.nom, code: c, operateur: op })))));
      }
    }
  });
});

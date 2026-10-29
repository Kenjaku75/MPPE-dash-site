/* Mode démo : imite le client Supabase (from / rpc / auth / storage) avec des données locales (localStorage).
   Les règles métier reproduisent celles de backend/schema.sql. Aucune donnée ne quitte le navigateur. */
(function (root) {
  'use strict';
  const NODE = typeof module !== 'undefined' && module.exports;
  const F = NODE ? require('./filters.js') : root.MPP_FILTERS;
  const SEED = NODE ? require('./seed-data.js') : root.MPP_SEED;

  const KEY = 'mpp_demo_v1';
  const BLOB_KEY = 'mpp_demo_v1_blobs';
  const SESSION_KEY = 'mpp_demo_session_v1';

  const TABLES = ['parametres', 'admins', 'membres_bureau', 'projets', 'annonces', 'faq', 'liens_officiels', 'evenements',
    'pages_legales', 'pages_contenu', 'points_inscription', 'participants', 'tirages', 'promesses', 'chat_messages',
    'signalements', 'idees', 'idees_votes', 'sondages', 'sondage_reponses', 'avis_bureau', 'avis_reponses',
    'bilans_mensuels', 'demandes_aide', 'benevoles', 'creneaux_moderation', 'mots_interdits', 'appareils_bloques',
    'presence_moderateurs', 'visites', 'audit_logs'];
  const PK = { parametres: 'cle', pages_legales: 'slug', pages_contenu: 'slug', appareils_bloques: 'device_hash', presence_moderateurs: 'user_id', admins: 'user_id' };
  const COMPOSITE = { idees_votes: ['idee_id', 'device_hash'], sondage_reponses: ['sondage_id', 'device_hash'], visites: ['jour', 'page'] };
  const UNIQUE = { mots_interdits: ['mot'], participants: ['matricule_hash'], promesses: ['matricule_hash'], avis_bureau: ['mois', 'device_hash'] };
  const AUDITED = ['parametres', 'projets', 'annonces', 'faq', 'liens_officiels', 'evenements', 'pages_legales', 'pages_contenu',
    'points_inscription', 'participants', 'tirages', 'chat_messages', 'idees', 'sondages', 'avis_bureau', 'avis_reponses',
    'bilans_mensuels', 'demandes_aide', 'benevoles', 'creneaux_moderation', 'mots_interdits', 'appareils_bloques'];

  // Droits d'accès : 'pub' (tout le monde), 'staff' (tout le bureau, modérateurs compris), 'admin', 'president', null (personne)
  const pubVisible = (r) => r.visible !== false;
  const ACL = {
    parametres: { r: 'pub', w: 'admin' },
    admins: { r: 'staff', self: true, w: null },
    membres_bureau: { r: 'pub', pub: pubVisible, all: 'admin', w: null },
    projets: { r: 'pub', pub: pubVisible, all: 'admin', w: 'admin' },
    annonces: { r: 'pub', pub: pubVisible, all: 'admin', w: 'admin' },
    faq: { r: 'pub', pub: pubVisible, all: 'admin', w: 'admin' },
    liens_officiels: { r: 'pub', pub: pubVisible, all: 'admin', w: 'admin' },
    evenements: { r: 'pub', pub: pubVisible, all: 'admin', w: 'admin' },
    pages_legales: { r: 'pub', w: 'admin' },
    pages_contenu: { r: 'pub', w: 'admin' },
    points_inscription: { r: 'admin', w: 'admin' },
    participants: { r: 'admin', w: 'admin' },
    tirages: { r: 'admin', w: 'admin' },
    promesses: { r: 'president', w: null },
    chat_messages: { r: 'staff', w: 'staff', ins: null, del: null },
    signalements: { r: 'staff', w: null },
    idees: { r: 'staff', w: 'staff', ins: null, del: 'admin' },
    idees_votes: { r: 'staff', w: null },
    sondages: { r: 'pub', pub: (r, m) => r.ouvre_at && r.ouvre_at <= m.nowISO(), all: 'admin', w: 'admin' },
    sondage_reponses: { r: 'admin', w: null },
    avis_bureau: { r: 'staff', w: 'admin', ins: null },
    avis_reponses: { r: 'pub', w: 'admin' },
    bilans_mensuels: { r: 'pub', w: 'admin' },
    demandes_aide: { r: 'admin', w: 'admin', ins: null },
    benevoles: { r: 'admin', w: 'admin', ins: null },
    creneaux_moderation: { r: 'staff', w: 'admin' },
    mots_interdits: { r: 'staff', w: 'admin' },
    appareils_bloques: { r: 'staff', w: 'staff' },
    presence_moderateurs: { r: null, w: null },
    visites: { r: 'admin', w: null },
    audit_logs: { r: 'president', w: null },
    chat_public: { r: 'pub', view: true }, idees_public: { r: 'pub', view: true },
    gagnants_public: { r: 'pub', view: true }, avis_public: { r: 'pub', view: true }
  };

  // ---------- utilitaires ----------
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const hm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const err = (message, code) => ({ message, code: code || 'P0001' });
  const fail = (message, extra) => Object.assign({ ok: false, message }, extra || {});
  const cap = (s) => String(s).toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (c) => c.toUpperCase());
  const cleanTxt = (s, n) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ').slice(0, n);
  const normNom = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleNom = (a, b) => { const x = normNom(a), y = normNom(b); return (x < y ? x : y) + '|' + (x < y ? y : x); };
  const BAD_NAME = /[0-9<>{}[\]\\|^~`"=;:/@#$%*+_()!?]/;

  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  // Empreinte phonétique très simple (équivalent démo de dmetaphone)
  function phon(s) {
    return normNom(s).replace(/ph/g, 'f').replace(/[ckq]/g, 'k').replace(/[wv]/g, 'v').replace(/h/g, '').replace(/y/g, 'i')
      .replace(/ou/g, 'u').replace(/[aeiou]/g, '').replace(/(.)\1+/g, '$1').slice(0, 5);
  }
  const clePhon = (a, b) => { const x = phon(a), y = phon(b); return (x < y ? x : y) + '|' + (x < y ? y : x); };

  function hash(db, s) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    const str = db.salt + String(s);
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }

  // ---------- données de départ ----------
  function seedDb() {
    const now = new Date();
    const db = { rev: 1, seq: {}, t: {}, salt: Math.random().toString(36).slice(2), users: [], tent: [] };
    TABLES.forEach((t) => { db.t[t] = []; });
    const add = (t, row) => {
      const pk = PK[t];
      if (!pk && !COMPOSITE[t] && row.id == null) row.id = db.seq[t] = (db.seq[t] || 0) + 1;
      db.t[t].push(row); return row;
    };
    const H = (s) => hash(db, s);
    const P = clone(SEED.core.parametres);
    Object.assign(P, {
      campagne_debut: ymd(now), campagne_fin: ymd(addDays(now, 2)),
      chat_exige_moderateur: false, chat_force: 'ouvert', parking_jours: [ymd(addDays(now, 1)), ymd(addDays(now, 2))],
      parking_lieu: "Parking de l'université (lieu à préciser)", parking_compteur: true, parking_restantes: 100,
      whatsapp_horaires: 'de 9 h à 18 h', representant: 'Le président du MPPE (démo)', contact_public: 'bureau@mppe.exemple (démo)',
      hebergeur: 'Hébergeur gratuit (démo)'
    });
    Object.entries(P).forEach(([cle, valeur]) => add('parametres', { cle, valeur, maj_at: now.toISOString() }));
    SEED.core.pages_contenu.forEach((p) => add('pages_contenu', Object.assign({ maj_at: now.toISOString() }, p)));
    SEED.core.pages_legales.forEach((p) => add('pages_legales', Object.assign({ maj_at: now.toISOString() }, p)));
    SEED.core.faq.forEach((f) => add('faq', clone(f)));
    SEED.core.liens_officiels.forEach((l) => add('liens_officiels', clone(l)));
    SEED.core.mots_interdits.forEach((m) => add('mots_interdits', { mot: m }));
    SEED.demo.membres_bureau.forEach((m) => add('membres_bureau', Object.assign({ photo_url: null, updated_at: now.toISOString() }, m)));
    SEED.demo.projets.forEach((p) => add('projets', clone(p)));
    SEED.demo.annonces.forEach((a, i) => add('annonces', Object.assign({}, a, { publie_at: new Date(now - i * 36e5 * 5).toISOString() })));
    SEED.demo.evenements.forEach((e) => {
      const d = addDays(now, e.jours); const [h, mi] = e.heure.split(':');
      d.setHours(+h, +mi, 0, 0);
      add('evenements', { titre: e.titre, debut: d.toISOString(), fin: null, lieu: e.lieu, description: e.description, categorie: e.categorie, visible: true });
    });

    // comptes de démonstration
    const users = [
      { id: 'u-president', email: 'president@demo.mpp', password: 'demo1234', role: 'president', nom_affiche: 'Président (démo)', poste: 'Président' },
      { id: 'u-bureau', email: 'bureau@demo.mpp', password: 'demo1234', role: 'admin', nom_affiche: 'Membre du bureau (démo)', poste: 'Secrétaire générale' },
      { id: 'u-moderateur', email: 'moderateur@demo.mpp', password: 'demo1234', role: 'moderateur', nom_affiche: 'Modérateur (démo)', poste: 'Modérateur' }
    ];
    db.users = users.map((u) => ({ id: u.id, email: u.email, password: u.password }));
    users.forEach((u) => add('admins', { user_id: u.id, email: u.email, nom_affiche: u.nom_affiche, poste: u.poste, role: u.role, created_at: now.toISOString() }));

    add('points_inscription', { nom: 'Stand de la cantine', lieu: 'Devant la cantine', horaires: '9 h – 14 h', actif: true, code_hash: H('pt:STAND1') });

    // participants fictifs
    SEED.demo.participants_noms.forEach(([nom, prenom, filiere, annee], i) => {
      add('participants', {
        nom, prenom, filiere, annee, matricule_hash: H('mat:UTM24' + (100 + i)), nom_cle: cleNom(nom, prenom), phon_cle: clePhon(nom, prenom),
        device_hash: H('seed-device-' + i), ip_hash: null, consentement_at: now.toISOString(),
        statut: i === 3 ? 'a_verifier' : 'valide', note: i === 3 ? 'Nom très proche d\'un participant existant' : null,
        canal: i % 4 === 0 ? 'stand' : 'site', point_id: null, operateur: null, carte_verifiee: false,
        created_at: new Date(now - (i + 1) * 36e5 * 2).toISOString()
      });
    });
    for (let i = 0; i < 8; i++) {
      add('promesses', { nom: 'Promesse' + i, prenom: 'Démo', filiere: 'Gestion', annee: 'Licence 1', matricule_hash: H('prom' + i), device_hash: H('pd' + i), consentement_at: now.toISOString(), created_at: now.toISOString() });
    }

    // chat
    SEED.demo.chat.forEach((m, i) => {
      const t = new Date(now - (SEED.demo.chat.length - i) * 6 * 6e4).toISOString();
      add('chat_messages', { pseudo: m.pseudo, contenu: m.contenu, device_hash: H('chat-seed-' + i), statut: 'visible', nb_signalements: 0, motif_suppression: null, supprime_par: null, officiel: false, poste: null, epingle: false, retabli: false, created_at: t, maj_at: t });
    });
    add('chat_messages', { pseudo: 'Bureau MPPE', contenu: 'Bienvenue sur le chat ! Ici on échange librement, dans le respect de la charte. Le bureau lit vos messages.', device_hash: null, statut: 'visible', nb_signalements: 0, motif_suppression: null, supprime_par: null, officiel: true, poste: 'Secrétaire générale', epingle: true, retabli: false, created_at: new Date(now - 40 * 6e4).toISOString(), maj_at: new Date(now - 40 * 6e4).toISOString() });

    // idées
    SEED.demo.idees.forEach((it, i) => {
      const t = new Date(now - (i + 1) * 36e5 * 7).toISOString();
      const row = add('idees', { titre: it.titre, description: it.description, categorie: it.categorie, auteur: it.auteur, photo_url: null, device_hash: H('idee-seed-' + i), statut: it.statut, motif: null, projet_id: null, masquee: false, retablie: false, nb_signalements: 0, created_at: t, maj_at: t });
      for (let k = 0; k < it.likes; k++) add('idees_votes', { idee_id: row.id, device_hash: H('v+' + i + '-' + k), valeur: 1, created_at: t });
      for (let k = 0; k < it.dislikes; k++) add('idees_votes', { idee_id: row.id, device_hash: H('v-' + i + '-' + k), valeur: -1, created_at: t });
    });

    // sondages
    SEED.demo.sondages.forEach((s) => {
      const row = add('sondages', { question: s.question, type: s.type, options: s.options, ouvre_at: new Date(now - 36e5).toISOString(), ferme_at: addDays(now, 7).toISOString(), afficher_resultats: s.afficher_resultats, created_at: now.toISOString() });
      const n = s.type === 'echelle' ? 5 : s.options.length;
      for (let k = 0; k < 14; k++) add('sondage_reponses', { sondage_id: row.id, device_hash: H('sr' + row.id + '-' + k), reponse: [s.type === 'echelle' ? 1 + (k % n) : k % n], created_at: now.toISOString() });
    });

    // avis du mois précédent (publics) + une réponse du bureau
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 20);
    const pm = prev.getFullYear() + '-' + pad(prev.getMonth() + 1);
    [[4, 'Les actions sont visibles, continuez.', 'Plus de communication sur les projets en cours.'], [3, 'Bon début mais il manque du suivi.', 'Un compte rendu mensuel.'], [5, '', 'Rien, bravo à l\'équipe.']].forEach((a, i) => {
      const row = add('avis_bureau', { mois: pm, note_globale: a[0], notes_themes: { travail: a[0], communication: Math.max(1, a[0] - 1), ecoute: a[0], promesses: Math.max(1, a[0] - 1) }, commentaire: a[1], attente_mois_suivant: a[2], device_hash: H('avis-seed-' + i), statut: 'visible', motif_masquage: null, retabli: false, nb_signalements: 0, created_at: prev.toISOString() });
      if (i === 1) add('avis_reponses', { avis_id: row.id, auteur_id: 'u-bureau', auteur_nom: 'Membre du bureau (démo)', auteur_poste: 'Secrétaire générale', texte: 'Merci pour ce retour : nous publierons un compte rendu mensuel.', created_at: now.toISOString(), modifie_at: null });
    });
    add('bilans_mensuels', { mois: pm, texte: 'Ce mois-ci : mise en ligne de la plateforme et premières rencontres. Le mois prochain : suite des projets retenus dans la boîte à idées.', publie_par: 'u-bureau', publie_at: now.toISOString() });
    add('demandes_aide', { type: 'doublon', message: 'Mon inscription est « à vérifier » alors que je suis le seul de ma famille à l\'UTM.', contact: '', statut: 'nouveau', traite_par: null, note: null, created_at: now.toISOString() });
    add('benevoles', { nom: 'Démo', prenom: 'Bénévole', filiere: 'Marketing', annee: 'Licence 2', whatsapp: '+226 70 00 00 00', domaines: ['affiches', 'réseaux sociaux'], disponibilites: 'Après les cours', message: 'Je veux aider pour les affiches.', statut: 'nouveau', notes: null, consentement_at: now.toISOString(), created_at: now.toISOString() });
    add('creneaux_moderation', { jour: ymd(now), debut: '08:00', fin: '12:00', moderateur: 'Modérateur (démo)', remplacant: 'Membre du bureau (démo)' });
    return db;
  }

  // ---------- le « serveur » ----------
  function create(opts) {
    opts = opts || {};
    let store = opts.storage || (root.localStorage ? root.localStorage : null);
    if (!store) { const mem = {}; store = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } }; }
    const sess = opts.sessionStorage || (root.sessionStorage || store);
    const M = { now: opts.now || (() => new Date()) };
    let raw = null; let db = null;

    M.nowISO = () => M.now().toISOString();
    M.today = () => ymd(M.now());
    function load() {
      let cur = null;
      try { cur = store.getItem(KEY); } catch (e) { /* ignore */ }
      if (cur === raw && db) return;
      if (cur) { try { db = JSON.parse(cur); raw = cur; return; } catch (e) { /* reseed */ } }
      db = seedDb(); save();
    }
    function save() {
      db.rev++;
      raw = JSON.stringify(db);
      try { store.setItem(KEY, raw); } catch (e) { console.warn('Stockage démo saturé', e); }
    }
    M.reset = () => { try { store.removeItem(KEY); store.removeItem(BLOB_KEY); sess.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } raw = null; db = null; load(); };
    M.db = () => { load(); return db; };

    // session
    function session() {
      try { const s = JSON.parse(sess.getItem(SESSION_KEY) || 'null'); return s; } catch (e) { return null; }
    }
    const uid = () => { const s = session(); return s ? s.user.id : null; };
    function roleOf() {
      const u = uid(); if (!u) return null;
      const a = db.t.admins.find((x) => x.user_id === u); return a ? a.role : null;
    }
    const is = {
      staff: () => !!roleOf(),
      admin: () => ['president', 'admin'].includes(roleOf()),
      president: () => roleOf() === 'president'
    };
    const can = (need) => need === 'pub' || (need === 'staff' && is.staff()) || (need === 'admin' && is.admin()) || (need === 'president' && is.president());

    const param = (k, d) => { const r = db.t.parametres.find((p) => p.cle === k); return r && r.valeur !== null && r.valeur !== undefined ? r.valeur : d; };
    const setParam = (k, v) => { const r = db.t.parametres.find((p) => p.cle === k); if (r) { r.valeur = v; r.maj_at = M.nowISO(); } else db.t.parametres.push({ cle: k, valeur: v, maj_at: M.nowISO() }); };
    const H = (s) => hash(db, s);
    function nextId(t) { return (db.seq[t] = (db.seq[t] || 0) + 1); }
    function audit(action, cible, detail) {
      const u = uid(); const a = u ? db.t.admins.find((x) => x.user_id === u) : null;
      db.t.audit_logs.push({ id: nextId('audit_logs'), at: M.nowISO(), acteur: u, acteur_email: a ? a.email : null, role: a ? a.role : null, action, cible: cible == null ? null : String(cible), detail: detail || {} });
    }
    function rateOk(dh, action, max, windowMs) {
      const t = M.now().getTime();
      db.tent = db.tent.filter((x) => t - x.at < 2 * 864e5);
      if (db.tent.filter((x) => x.dh === dh && x.a === action && t - x.at < windowMs).length >= max) return false;
      db.tent.push({ dh, a: action, at: t }); return true;
    }
    const chatMotifFerme = () => {
      const f = param('chat_force', 'auto');
      if (f === 'ferme') return 'ferme_manuel';
      if (param('chat_exige_moderateur', true)) {
        const lim = M.now().getTime() - 3 * 6e4;
        if (!db.t.presence_moderateurs.some((p) => new Date(p.vu_at).getTime() > lim)) return 'pas_de_moderateur';
      }
      if (f === 'ouvert') return null;
      const h = hm(M.now());
      return h < param('chat_debut', '08:00') || h > param('chat_fin', '20:00') ? 'hors_horaires' : null;
    };
    const wordsList = () => db.t.mots_interdits.map((m) => m.mot);
    const refus = (motif) => ({ ok: false, code: motif, message: F.messages[motif] || F.messages.insulte });
    const robotCheck = (a) => (a.p_hp || (a.p_elapsed || 0) < 3 || String(a.p_device || '').length < 8);

    function avisStatus() {
      const d = M.now(); const ld = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const n = param('avis_derniers_jours', 5);
      const debut = addDays(ld, -(n - 1));
      const ouvert = param('avis_force_ouvert', false) || ymd(d) >= ymd(debut);
      return { ouvert, mois: d.getFullYear() + '-' + pad(d.getMonth() + 1), debut: ymd(debut), fin: ymd(ld) };
    }

    // ----- fonctions (RPC) -----
    const RPC = {
      hit(a) {
        const j = M.today(); const p = String(a.p_page || 'index').slice(0, 40);
        let r = db.t.visites.find((v) => v.jour === j && v.page === p);
        if (!r) { r = { jour: j, page: p, n: 0 }; db.t.visites.push(r); }
        r.n++; return null;
      },
      chat_status() { const m = chatMotifFerme(); return { ouvert: !m, raison: m, debut: param('chat_debut', '08:00'), fin: param('chat_fin', '20:00') }; },
      avis_status() { return avisStatus(); },
      heartbeat() {
        if (!is.staff()) return null;
        const u = uid(); const r = db.t.presence_moderateurs.find((p) => p.user_id === u);
        if (r) r.vu_at = M.nowISO(); else db.t.presence_moderateurs.push({ user_id: u, vu_at: M.nowISO() });
        return null;
      },
      log_audit(a) { if (is.staff()) audit(a.p_action, a.p_cible, a.p_detail); return null; },
      claim_president() { return fail('Non disponible en démo.'); },

      register_participant(a) {
        if (param('campagne_cloturee', false)) return { ok: false, code: 'ferme', message: 'Les inscriptions sont closes.' };
        if (robotCheck(a)) return { ok: false, code: 'robot', message: 'Vérification échouée, veuillez réessayer.' };
        if (a.p_consent !== true) return { ok: false, code: 'consentement', message: 'Le consentement est obligatoire.' };
        const nom = cleanTxt(a.p_nom, 60), prenom = cleanTxt(a.p_prenom, 60), mat = cleanTxt(a.p_matricule, 30).toUpperCase();
        if (nom.length < 2 || prenom.length < 2 || BAD_NAME.test(nom) || BAD_NAME.test(prenom)) return { ok: false, code: 'invalide', message: 'Nom ou prénom invalide.' };
        if (!param('filieres', []).includes(a.p_filiere) || !param('annees', []).includes(a.p_annee)) return { ok: false, code: 'invalide', message: 'Filière ou année invalide.' };
        const rx = param('matricule_regex', '');
        if (!/^[A-Z0-9/_.-]{4,30}$/.test(mat) || (rx && !new RegExp(rx).test(mat))) return { ok: false, code: 'invalide', message: 'Numéro de matricule invalide.' };
        const dh = H(a.p_device);
        if (db.t.appareils_bloques.some((b) => b.device_hash === dh)) return { ok: false, code: 'bloque', message: "Cet appareil ne peut pas s'inscrire." };
        if (!rateOk(dh, 'register', 10, 10 * 6e4)) return { ok: false, code: 'limite', message: 'Trop de tentatives, réessayez dans quelques minutes.' };
        const mh = H('mat:' + mat);
        if (db.t.participants.some((p) => p.matricule_hash === mh)) return { ok: false, code: 'doublon_matricule', message: "Ce matricule est déjà inscrit. Si c'est une erreur, utilisez « Besoin d'aide ? »." };
        const cle = cleNom(nom, prenom);
        if (db.t.participants.some((p) => p.nom_cle === cle)) return { ok: false, code: 'doublon_nom', message: "Une inscription existe déjà à ce nom. Si c'est une erreur, utilisez « Besoin d'aide ? »." };
        let canal = 'site', car = false, pointId = null;
        if (a.p_point_id != null) {
          const pt = db.t.points_inscription.find((p) => p.id === Number(a.p_point_id) && p.actif && p.code_hash === H('pt:' + (a.p_point_code || '')));
          if (!pt) return { ok: false, code: 'point_invalide', message: "Code du point d'inscription invalide." };
          canal = 'stand'; car = !!a.p_carte_verifiee; pointId = pt.id;
        }
        const ph = clePhon(nom, prenom); const notes = []; let st = 'valide';
        if (db.t.participants.some((p) => (cle.length >= 6 && Math.abs(p.nom_cle.length - cle.length) <= 1 && lev(p.nom_cle, cle) <= 1) || (ph.length > 1 && p.phon_cle === ph))) {
          st = 'a_verifier'; notes.push("Nom très proche d'un participant existant");
        }
        if (canal === 'site' && db.t.participants.filter((p) => p.device_hash === dh && p.canal === 'site').length >= 3) {
          st = 'a_verifier'; notes.push('Plus de 3 inscriptions depuis cet appareil');
        }
        if (car && st === 'valide') st = 'verifie';
        db.t.participants.push({
          id: nextId('participants'), nom, prenom, filiere: a.p_filiere, annee: a.p_annee, matricule_hash: mh, nom_cle: cle, phon_cle: ph, device_hash: dh, ip_hash: null,
          consentement_at: M.nowISO(), statut: st, note: notes.join(' · ') || null, canal, point_id: pointId, operateur: canal === 'stand' ? cleanTxt(a.p_operateur, 60) : null,
          carte_verifiee: car, created_at: M.nowISO()
        });
        return { ok: true, statut: st, message: st === 'valide' || st === 'verifie' ? 'Inscription enregistrée. Bonne chance !' : 'Inscription enregistrée, elle sera vérifiée par le bureau avant le tirage.' };
      },

      submit_promise(a) {
        if (param('campagne_cloturee', false) || !param('promesse_active', true)) return { ok: false, code: 'ferme', message: 'Les promesses de vote sont closes.' };
        if (robotCheck(a)) return { ok: false, code: 'robot', message: 'Vérification échouée, veuillez réessayer.' };
        if (a.p_consent !== true) return { ok: false, code: 'consentement', message: 'Le consentement est obligatoire.' };
        const nom = cleanTxt(a.p_nom, 60), prenom = cleanTxt(a.p_prenom, 60), mat = cleanTxt(a.p_matricule, 30).toUpperCase();
        if (nom.length < 2 || prenom.length < 2 || BAD_NAME.test(nom) || BAD_NAME.test(prenom)) return { ok: false, code: 'invalide', message: 'Nom ou prénom invalide.' };
        if (!param('filieres', []).includes(a.p_filiere) || !param('annees', []).includes(a.p_annee)) return { ok: false, code: 'invalide', message: 'Filière ou année invalide.' };
        const rx = param('matricule_regex', '');
        if (!/^[A-Z0-9/_.-]{4,30}$/.test(mat) || (rx && !new RegExp(rx).test(mat))) return { ok: false, code: 'invalide', message: 'Numéro de matricule invalide.' };
        const dh = H(a.p_device);
        if (!rateOk(dh, 'promise', 10, 10 * 6e4)) return { ok: false, code: 'limite', message: 'Trop de tentatives, réessayez dans quelques minutes.' };
        const mh = H('mat:' + mat);
        if (db.t.promesses.some((p) => p.matricule_hash === mh)) return { ok: false, code: 'doublon', message: 'Une promesse existe déjà pour ce matricule.' };
        db.t.promesses.push({ id: nextId('promesses'), nom, prenom, filiere: a.p_filiere, annee: a.p_annee, matricule_hash: mh, device_hash: dh, consentement_at: M.nowISO(), created_at: M.nowISO() });
        return { ok: true, message: "Merci pour votre soutien ! Cette promesse n'engage à rien." };
      },

      run_draw(a) {
        if (!is.admin()) return fail('Accès refusé.');
        return doDraw(uid(), !!a.p_redraw, a.p_motif);
      },

      send_message(a) {
        if (String(a.p_device || '').length < 8) return { ok: false, code: 'appareil', message: 'Appareil non reconnu.' };
        const dh = H(a.p_device);
        if (db.t.appareils_bloques.some((b) => b.device_hash === dh)) return { ok: false, code: 'bloque', message: 'Votre appareil a été bloqué par la modération.' };
        const c = String(a.p_content == null ? '' : a.p_content).trim();
        if (!c || c.length > 500) return { ok: false, code: 'taille', message: 'Le message doit faire entre 1 et 500 caractères.' };
        const m = chatMotifFerme();
        if (m) return { ok: false, code: 'ferme', raison: m, message: 'Le chat est en lecture seule pour le moment.' };
        if (param('limite_messages_active', false)) {
          const last = db.t.chat_messages.filter((x) => x.device_hash === dh).map((x) => new Date(x.created_at).getTime()).sort().pop();
          if (last && M.now().getTime() - last < param('limite_messages_secondes', 10) * 1000) return { ok: false, code: 'limite', message: 'Doucement, patientez quelques secondes entre deux messages.' };
        }
        const motif = F.check(c, wordsList());
        if (motif) return refus(motif);
        const id = nextId('chat_messages'); const t = M.nowISO();
        db.t.chat_messages.push({ id, pseudo: 'Anonyme-' + dh.slice(0, 4).toUpperCase(), contenu: c, device_hash: dh, statut: 'visible', nb_signalements: 0, motif_suppression: null, supprime_par: null, officiel: false, poste: null, epingle: false, retabli: false, created_at: t, maj_at: t });
        return { ok: true, id };
      },

      post_official(a) {
        if (!is.admin()) return fail('Accès refusé.');
        const c = String(a.p_content == null ? '' : a.p_content).trim();
        if (!c || c.length > 800) return fail('Le message doit faire entre 1 et 800 caractères.');
        const adm = db.t.admins.find((x) => x.user_id === uid()); const id = nextId('chat_messages'); const t = M.nowISO();
        db.t.chat_messages.push({ id, pseudo: 'Bureau MPPE', contenu: c, device_hash: null, statut: 'visible', nb_signalements: 0, motif_suppression: null, supprime_par: null, officiel: true, poste: adm.poste || adm.nom_affiche, epingle: !!a.p_epingle, retabli: false, created_at: t, maj_at: t });
        audit('chat.message_officiel', id);
        return { ok: true, id };
      },

      report_content(a) {
        const type = a.p_type; const id = Number(a.p_id);
        if (!['chat', 'idee', 'avis'].includes(type) || String(a.p_device || '').length < 8) return fail('Signalement invalide.');
        const dh = H(a.p_device);
        if (!rateOk(dh, 'report', 10, 36e5)) return fail('Trop de signalements, réessayez plus tard.');
        const tb = { chat: 'chat_messages', idee: 'idees', avis: 'avis_bureau' }[type];
        const row = db.t[tb].find((r) => r.id === id);
        const ok = row && (type === 'chat' ? row.statut === 'visible' && !row.officiel && !row.retabli : type === 'idee' ? !row.masquee && !row.retablie : row.statut === 'visible' && !row.retabli);
        if (!ok) return fail('Ce contenu ne peut plus être signalé.');
        if (db.t.signalements.some((s) => s.type === type && s.cible_id === id && s.device_hash === dh)) return { ok: true, deja: true, message: 'Vous avez déjà signalé ce contenu.' };
        db.t.signalements.push({ id: nextId('signalements'), type, cible_id: id, device_hash: dh, created_at: M.nowISO() });
        const nb = db.t.signalements.filter((s) => s.type === type && s.cible_id === id).length;
        const seuil = param('seuil_signalements', 2);
        row.nb_signalements = nb;
        if (type === 'chat') { if (nb >= seuil) row.statut = 'masque'; row.maj_at = M.nowISO(); }
        else if (type === 'idee') { row.masquee = nb >= seuil; row.maj_at = M.nowISO(); }
        else if (nb >= seuil) row.statut = 'a_examiner';
        return { ok: true, masque: nb >= seuil, message: 'Merci, le signalement a été transmis à la modération.' };
      },

      create_idea(a) {
        if (String(a.p_device || '').length < 8) return fail('Appareil non reconnu.');
        const dh = H(a.p_device);
        if (db.t.appareils_bloques.some((b) => b.device_hash === dh)) return fail('Votre appareil a été bloqué par la modération.');
        const titre = cleanTxt(a.p_titre, 120), desc = String(a.p_description || '').trim(), auteur = cleanTxt(a.p_auteur, 60);
        if (titre.length < 4 || desc.length < 10 || desc.length > 1000) return fail('Titre (4 caractères min.) et description (10 à 1000 caractères) requis.');
        if (!['vie académique', 'infrastructures', 'restauration', 'vie associative', 'numérique', 'autre'].includes(a.p_categorie)) return fail('Catégorie invalide.');
        if (!rateOk(dh, 'idee', 5, 864e5)) return fail("Limite quotidienne d'idées atteinte.");
        const motif = F.check(titre + ' ' + desc + ' ' + auteur, wordsList());
        if (motif) return refus(motif);
        const id = nextId('idees'); const t = M.nowISO();
        db.t.idees.push({ id, titre, description: desc, categorie: a.p_categorie, auteur: auteur || null, photo_url: a.p_photo && /^(https?:|data:image\/)/.test(a.p_photo) ? a.p_photo : null, device_hash: dh, statut: 'recue', motif: null, projet_id: null, masquee: false, retablie: false, nb_signalements: 0, created_at: t, maj_at: t });
        return { ok: true, id };
      },

      vote_idea(a) {
        const v = Number(a.p_valeur);
        if (![-1, 0, 1].includes(v) || String(a.p_device || '').length < 8) return fail('Vote invalide.');
        const dh = H(a.p_device); const id = Number(a.p_id);
        if (!rateOk(dh, 'vote', 60, 10 * 6e4)) return fail('Trop de votes, patientez un instant.');
        if (!db.t.idees.some((i) => i.id === id && !i.masquee)) return fail('Idée introuvable.');
        db.t.idees_votes = db.t.idees_votes.filter((x) => !(x.idee_id === id && x.device_hash === dh));
        if (v !== 0) db.t.idees_votes.push({ idee_id: id, device_hash: dh, valeur: v, created_at: M.nowISO() });
        const all = db.t.idees_votes.filter((x) => x.idee_id === id);
        return { ok: true, likes: all.filter((x) => x.valeur === 1).length, dislikes: all.filter((x) => x.valeur === -1).length };
      },

      answer_poll(a) {
        if (String(a.p_device || '').length < 8) return fail('Appareil non reconnu.');
        const dh = H(a.p_device); const s = db.t.sondages.find((x) => x.id === Number(a.p_id)); const nowI = M.nowISO();
        if (!s || !s.ouvre_at || s.ouvre_at > nowI || (s.ferme_at && s.ferme_at < nowI)) return fail("Ce sondage n'est pas ouvert.");
        const r = a.p_reponse;
        if (!Array.isArray(r) || !r.length) return fail('Réponse invalide.');
        const nb = s.options.length;
        for (const v of r) {
          if (!Number.isInteger(v)) return fail('Réponse invalide.');
          if (s.type === 'echelle' ? v < 1 || v > 5 : v < 0 || v >= nb) return fail('Réponse invalide.');
        }
        if (s.type !== 'multiple' && r.length !== 1) return fail('Une seule réponse est attendue.');
        if (db.t.sondage_reponses.some((x) => x.sondage_id === s.id && x.device_hash === dh)) return { ok: false, code: 'deja', message: 'Vous avez déjà répondu à ce sondage.' };
        db.t.sondage_reponses.push({ sondage_id: s.id, device_hash: dh, reponse: r, created_at: nowI });
        return { ok: true };
      },

      poll_results(a) {
        const s = db.t.sondages.find((x) => x.id === Number(a.p_id));
        if (!s) return { ok: false };
        if (!(is.staff() || (s.afficher_resultats && s.ouvre_at && s.ouvre_at <= M.nowISO()))) return fail('Résultats non publiés.');
        const rows = db.t.sondage_reponses.filter((x) => x.sondage_id === s.id);
        const n = s.type === 'echelle' ? 5 : s.options.length; const counts = Array(n).fill(0); let sum = 0, cnt = 0;
        rows.forEach((x) => x.reponse.forEach((v) => { counts[s.type === 'echelle' ? v - 1 : v]++; sum += v; cnt++; }));
        return { ok: true, total: rows.length, counts, moyenne: s.type === 'echelle' && cnt ? Math.round((sum / cnt) * 100) / 100 : null };
      },

      submit_avis(a) {
        if (String(a.p_device || '').length < 8) return fail('Appareil non reconnu.');
        const dh = H(a.p_device); const st = avisStatus();
        if (!st.ouvert) return { ok: false, code: 'ferme', message: "La période d'avis n'est pas ouverte." };
        const note = Number(a.p_note);
        if (!(note >= 1 && note <= 5)) return fail('Donnez une note globale de 1 à 5.');
        const themes = {};
        ['travail', 'communication', 'ecoute', 'promesses'].forEach((k) => { const v = Number(a.p_themes && a.p_themes[k]); if (v >= 1 && v <= 5) themes[k] = v; });
        const com = String(a.p_commentaire || '').trim().slice(0, 1000), att = String(a.p_attente || '').trim().slice(0, 500);
        const motif = F.check(com + ' ' + att, wordsList());
        if (motif) return refus(motif);
        if (db.t.avis_bureau.some((x) => x.mois === st.mois && x.device_hash === dh)) return { ok: false, code: 'deja', message: 'Vous avez déjà donné votre avis ce mois-ci.' };
        db.t.avis_bureau.push({ id: nextId('avis_bureau'), mois: st.mois, note_globale: note, notes_themes: themes, commentaire: com || null, attente_mois_suivant: att || null, device_hash: dh, statut: 'visible', motif_masquage: null, retabli: false, nb_signalements: 0, created_at: M.nowISO() });
        return { ok: true };
      },

      submit_aide(a) {
        if (robotCheck(a)) return fail('Vérification échouée, veuillez réessayer.');
        if (!rateOk(H(a.p_device), 'aide', 5, 36e5)) return fail('Trop de demandes, réessayez plus tard.');
        const msg = String(a.p_message || '').trim().slice(0, 1500);
        if (msg.length < 10) return fail('Décrivez votre situation (10 caractères min.).');
        const type = ['doublon', 'message_supprime', 'tirage', 'suppression_donnees', 'autre'].includes(a.p_type) ? a.p_type : 'autre';
        db.t.demandes_aide.push({ id: nextId('demandes_aide'), type, message: msg, contact: cleanTxt(a.p_contact, 120) || null, statut: 'nouveau', traite_par: null, note: null, created_at: M.nowISO() });
        return { ok: true, message: 'Demande envoyée. Réponse sous 24 heures.' };
      },

      submit_benevole(a) {
        if (robotCheck(a)) return fail('Vérification échouée, veuillez réessayer.');
        if (a.p_consent !== true || a.p_accord !== true) return fail("Confirmez le message d'information et le consentement.");
        if (!rateOk(H(a.p_device), 'benevole', 3, 864e5)) return fail('Trop de demandes, réessayez plus tard.');
        const nom = cleanTxt(a.p_nom, 60), prenom = cleanTxt(a.p_prenom, 60);
        if (nom.length < 2 || prenom.length < 2 || !/^\+?[0-9 .-]{8,20}$/.test(a.p_whatsapp || '')) return fail('Nom, prénom et numéro WhatsApp valides requis.');
        db.t.benevoles.push({ id: nextId('benevoles'), nom, prenom, filiere: cleanTxt(a.p_filiere, 60), annee: cleanTxt(a.p_annee, 30), whatsapp: a.p_whatsapp, domaines: (a.p_domaines || []).map((d) => String(d).slice(0, 30)), disponibilites: cleanTxt(a.p_dispo, 200), message: cleanTxt(a.p_message, 600), statut: 'nouveau', notes: null, consentement_at: M.nowISO(), created_at: M.nowISO() });
        return { ok: true, message: 'Merci ! Le bureau vous recontactera.' };
      },

      stats_dashboard() {
        if (!is.staff()) return { ok: false };
        const T = db.t; const grp = (rows, f) => rows.reduce((o, r) => { const k = f(r); o[k] = (o[k] || 0) + 1; return o; }, {});
        const cut = ymd(addDays(M.now(), -7));
        const vj = {}; T.visites.filter((v) => v.jour > cut).forEach((v) => { vj[v.jour] = (vj[v.jour] || 0) + v.n; });
        return {
          ok: true, participants: T.participants.length, a_verifier: T.participants.filter((p) => p.statut === 'a_verifier').length,
          par_filiere: grp(T.participants, (p) => p.filiere), par_annee: grp(T.participants, (p) => p.annee),
          par_jour: grp(T.participants, (p) => p.created_at.slice(0, 10)), stand: T.participants.filter((p) => p.canal === 'stand').length,
          promesses: T.promesses.length, idees: T.idees.length, idees_signalees: T.idees.filter((i) => i.masquee && !i.retablie).length,
          votes: T.idees_votes.length, reponses_sondages: T.sondage_reponses.length,
          messages: T.chat_messages.filter((m) => !m.officiel).length, messages_masques: T.chat_messages.filter((m) => m.statut === 'masque').length,
          messages_supprimes: T.chat_messages.filter((m) => m.statut === 'supprime').length,
          aides_nouvelles: T.demandes_aide.filter((d) => d.statut === 'nouveau').length,
          avis_mois: T.avis_bureau.filter((a) => a.mois === avisStatus().mois).length, avis_a_examiner: T.avis_bureau.filter((a) => a.statut === 'a_examiner').length,
          benevoles_nouveaux: T.benevoles.filter((b) => b.statut === 'nouveau').length,
          pages_vues: T.visites.reduce((s, v) => s + v.n, 0), visites_jour: vj
        };
      },

      team_save(a) {
        if (!is.admin()) return fail('Accès refusé.');
        const p = a.p || {}; const id = p.id ? Number(p.id) : null;
        const pick = (k, cur) => (p[k] === undefined || p[k] === null ? cur : p[k]);
        if (id) {
          const m = db.t.membres_bureau.find((x) => x.id === id);
          if (!m) return fail('Membre introuvable.');
          if (m.est_president && !is.president()) { audit('tentative_refusee', 'membres_bureau:' + id, { motif: 'modification de la fiche du président' }); return fail('Seul le président peut modifier ses informations.'); }
          m.prenom = pick('prenom', m.prenom); m.nom = pick('nom', m.nom); m.poste = pick('poste', m.poste);
          if ('presentation' in p) m.presentation = p.presentation; if ('photo_url' in p) m.photo_url = p.photo_url;
          m.ordre = pick('ordre', m.ordre); m.visible = pick('visible', m.visible); m.mis_a_jour_par = uid(); m.updated_at = M.nowISO();
          audit('membres_bureau.update', id); return { ok: true, id };
        }
        if (p.est_president && !is.president()) { audit('tentative_refusee', 'membres_bureau', { motif: "création d'une fiche président" }); return fail('Seul le président peut créer sa fiche.'); }
        if (p.est_president && db.t.membres_bureau.some((x) => x.est_president)) return fail('Une fiche président existe déjà.');
        const nid = nextId('membres_bureau');
        db.t.membres_bureau.push({ id: nid, prenom: p.prenom, nom: p.nom, poste: p.poste, photo_url: p.photo_url || null, presentation: p.presentation || '', ordre: p.ordre || 0, visible: p.visible !== false, est_president: !!p.est_president, mis_a_jour_par: uid(), updated_at: M.nowISO() });
        audit('membres_bureau.insert', nid); return { ok: true, id: nid };
      },
      team_delete(a) {
        if (!is.admin()) return fail('Accès refusé.');
        const id = Number(a.p_id); const m = db.t.membres_bureau.find((x) => x.id === id);
        if (!m) return fail('Membre introuvable.');
        if (m.est_president) { audit('tentative_refusee', 'membres_bureau:' + id, { motif: 'suppression du président' }); return fail('La fiche du président ne peut pas être supprimée.'); }
        db.t.membres_bureau = db.t.membres_bureau.filter((x) => x.id !== id); audit('membres_bureau.delete', id); return { ok: true };
      },
      team_reorder(a) {
        if (!is.admin()) return fail('Accès refusé.');
        (a.p_ids || []).forEach((id, i) => { const m = db.t.membres_bureau.find((x) => x.id === Number(id)); if (m) m.ordre = i + 1; });
        audit('membres_bureau.ordre'); return { ok: true };
      },

      staff_add(a) {
        if (!is.president()) return fail('Réservé au président.');
        if (!['admin', 'moderateur'].includes(a.p_role)) return fail('Rôle invalide.');
        const email = String(a.p_email || '').trim().toLowerCase();
        let u = db.users.find((x) => x.email === email);
        if (!u) { u = { id: 'u-' + Math.random().toString(36).slice(2, 8), email, password: 'demo1234' }; db.users.push(u); }
        const ex = db.t.admins.find((x) => x.user_id === u.id);
        if (ex && ex.role === 'president') { audit('tentative_refusee', u.id, { motif: 'rôle du président' }); return fail('Le rôle du président ne peut pas être modifié.'); }
        if (ex) { ex.role = a.p_role; if (a.p_nom) ex.nom_affiche = a.p_nom; if (a.p_poste) ex.poste = a.p_poste; }
        else db.t.admins.push({ user_id: u.id, email, nom_affiche: a.p_nom || email, poste: a.p_poste || null, role: a.p_role, created_at: M.nowISO() });
        audit('admins.ajout', u.id, { role: a.p_role }); return { ok: true };
      },
      staff_remove(a) {
        if (!is.admin()) return fail('Accès refusé.');
        const t = db.t.admins.find((x) => x.user_id === a.p_user);
        if (t && t.role === 'president') { audit('tentative_refusee', a.p_user, { motif: 'retrait du président' }); return fail('Le compte du président ne peut pas être retiré.'); }
        if (!is.president()) { audit('tentative_refusee', a.p_user, { motif: "retrait d'un compte sans être président" }); return fail('Réservé au président.'); }
        db.t.admins = db.t.admins.filter((x) => x.user_id !== a.p_user); audit('admins.retrait', a.p_user); return { ok: true };
      },
      transfer_presidency(a) {
        if (!is.president()) return fail('Seul le président peut transmettre son rôle.');
        const to = db.t.admins.find((x) => x.user_id === a.p_to); if (!to) return fail('Compte introuvable.');
        db.t.admins.find((x) => x.user_id === uid()).role = 'admin'; to.role = 'president';
        audit('admins.passation', a.p_to); return { ok: true };
      },
      point_set_code(a) {
        if (!is.admin()) return fail('Accès refusé.');
        if (String(a.p_code || '').length < 4) return fail('Code trop court (4 caractères min.).');
        const p = db.t.points_inscription.find((x) => x.id === Number(a.p_id)); if (!p) return fail('Point introuvable.');
        p.code_hash = H('pt:' + a.p_code); audit('points_inscription.code', a.p_id); return { ok: true };
      },

      close_campaign(a) {
        if (!is.admin()) return fail('La clôture est réservée au bureau (président et administrateurs).');
        const nowI = M.nowISO();
        const attente = db.t.tirages.filter((t) => t.statut === 'actif' && t.statut_repas === 'en_attente' && (!t.valide_jusqu_au || t.valide_jusqu_au > nowI)).length;
        if (attente > 0 && !a.p_force) return { ok: false, code: 'repas_en_attente', attente, message: attente + ' repas ne sont pas encore remis.' };
        const grp = (rows, f) => rows.reduce((o, r) => { const k = f(r); o[k] = (o[k] || 0) + 1; return o; }, {});
        const np = db.t.participants.length, nr = db.t.promesses.length, nb = db.t.benevoles.filter((b) => b.whatsapp).length;
        setParam('cloture_totaux', { date: nowI, participants: np, promesses: nr, whatsapp_supprimes: nb, forcee: !!a.p_force, par_filiere: grp(db.t.participants, (p) => p.filiere), par_annee: grp(db.t.participants, (p) => p.annee), tirages: db.t.tirages.filter((t) => t.statut === 'actif').length });
        db.t.promesses = []; db.t.participants = [];
        db.t.tirages.forEach((t) => { t.gagnant_label = null; t.gagnant_id = null; });
        db.t.benevoles.forEach((b) => { b.whatsapp = null; });
        db.t.demandes_aide.forEach((d) => { d.contact = null; });
        db.tent = []; setParam('campagne_cloturee', true);
        audit('cloture', null, { participants_supprimes: np, promesses_supprimees: nr, numeros_whatsapp_supprimes: nb, forcee: !!a.p_force });
        return { ok: true, participants: np, promesses: nr, benevoles: nb };
      }
    };

    function doDraw(actor, redraw, motif) {
      if (param('campagne_cloturee', false)) return fail('La campagne est clôturée.');
      const debut = param('campagne_debut', null), fin = param('campagne_fin', null);
      if (!debut || !fin) return fail("Renseignez d'abord les dates de la campagne dans les paramètres.");
      const d = M.today();
      if (d < debut || d > fin) return fail("Aujourd'hui est en dehors des dates de la campagne.");
      const old = db.t.tirages.find((t) => t.jour === d && t.statut === 'actif');
      if (old && !redraw) return fail("Un tirage a déjà eu lieu aujourd'hui.");
      const won = new Set(db.t.tirages.map((t) => t.gagnant_id).filter((x) => x != null));
      const el = db.t.participants.filter((p) => ['valide', 'verifie'].includes(p.statut) && !won.has(p.id));
      if (!el.length) return fail('Aucun participant éligible.');
      if (old) { old.statut = 'annule'; old.motif_annulation = String(motif || 'Re-tirage').slice(0, 200); }
      let k; const c = root.crypto || (typeof require === 'function' ? require('crypto').webcrypto : null);
      if (c && c.getRandomValues) { const u = new Uint32Array(1); c.getRandomValues(u); k = u[0] % el.length; } else k = Math.floor(Math.random() * el.length);
      const w = el[k]; const label = cap(w.prenom) + ' ' + w.nom.toUpperCase();
      const until = new Date(M.now().getFullYear(), M.now().getMonth(), M.now().getDate() + param('validite_repas_jours', 1) + 1, 0, 0, -1);
      const id = nextId('tirages');
      db.t.tirages.push({ id, jour: d, gagnant_id: w.id, gagnant_label: label, nb_eligibles: el.length, creneau_repas: null, statut_repas: 'en_attente', valide_jusqu_au: until.toISOString(), statut: 'actif', motif_annulation: null, declenche_par: actor, created_at: M.nowISO() });
      audit(redraw ? 'tirage.re-tirage' : 'tirage.lance', id, { jour: d, eligibles: el.length, auto: !actor, motif: motif || null });
      return { ok: true, id, gagnant: label, eligibles: el.length };
    }

    // ----- vues -----
    const VIEWS = {
      chat_public: () => db.t.chat_messages.map((m) => ({ id: m.id, pseudo: m.pseudo, contenu: m.statut === 'visible' ? m.contenu : null, statut: m.statut, officiel: m.officiel, poste: m.poste, epingle: m.epingle, retabli: m.retabli, created_at: m.created_at, maj_at: m.maj_at })),
      idees_public: () => db.t.idees.filter((i) => !i.masquee).map((i) => {
        const v = db.t.idees_votes.filter((x) => x.idee_id === i.id); const likes = v.filter((x) => x.valeur === 1).length, dislikes = v.filter((x) => x.valeur === -1).length;
        return { id: i.id, titre: i.titre, description: i.description, categorie: i.categorie, auteur: i.auteur, photo_url: i.photo_url, statut: i.statut, motif: i.motif, projet_id: i.projet_id, retablie: i.retablie, created_at: i.created_at, likes, dislikes, score: likes - dislikes };
      }),
      gagnants_public: () => (param('campagne_cloturee', false) ? [] : db.t.tirages.filter((t) => t.statut === 'actif' && t.gagnant_label).map((t) => ({ id: t.id, jour: t.jour, nom_affiche: t.gagnant_label, statut_repas: t.statut_repas, valide_jusqu_au: t.valide_jusqu_au }))),
      avis_public: () => db.t.avis_bureau.filter((a) => a.statut === 'visible').map((a) => ({ id: a.id, mois: a.mois, note_globale: a.note_globale, notes_themes: a.notes_themes, commentaire: a.commentaire, attente_mois_suivant: a.attente_mois_suivant, created_at: a.created_at }))
    };

    // ----- requêtes (imite le constructeur de supabase-js) -----
    const like = (pattern) => new RegExp('^' + String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
    const eqv = (a, b) => (a == null || b == null ? a == b : String(a) === String(b));
    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

    class Query {
      constructor(table) { this.table = table; this.op = 'select'; this.f = []; this.ord = []; this.lim = null; this.rng = null; this.one = null; this.head = false; this.count = null; this.ret = false; }
      select(cols, o) { if (this.op === 'select') { if (o) { this.count = o.count || null; this.head = !!o.head; } } else this.ret = true; return this; }
      insert(r) { this.op = 'insert'; this.payload = Array.isArray(r) ? r : [r]; return this; }
      upsert(r, o) { this.op = 'upsert'; this.payload = Array.isArray(r) ? r : [r]; this.conflict = o && o.onConflict; return this; }
      update(v) { this.op = 'update'; this.payload = v; return this; }
      delete() { this.op = 'delete'; return this; }
      eq(c, v) { this.f.push((r) => eqv(r[c], v)); return this; }
      neq(c, v) { this.f.push((r) => !eqv(r[c], v)); return this; }
      gt(c, v) { this.f.push((r) => r[c] > v); return this; }
      gte(c, v) { this.f.push((r) => r[c] >= v); return this; }
      lt(c, v) { this.f.push((r) => r[c] < v); return this; }
      lte(c, v) { this.f.push((r) => r[c] <= v); return this; }
      in(c, arr) { this.f.push((r) => arr.some((v) => eqv(r[c], v))); return this; }
      is(c, v) { this.f.push((r) => (v === null ? r[c] == null : r[c] === v)); return this; }
      not(c, op, v) { if (op === 'is') this.f.push((r) => (v === null ? r[c] != null : r[c] !== v)); else if (op === 'eq') this.f.push((r) => !eqv(r[c], v)); return this; }
      ilike(c, p) { const rx = like(p); this.f.push((r) => rx.test(String(r[c] == null ? '' : r[c]))); return this; }
      or(expr) { // seulement « col.ilike.%x%,col2.ilike.%x% »
        const parts = String(expr).split(',').map((s) => s.split('.')); const rxs = parts.map(([c, , ...p]) => [c, like(p.join('.'))]);
        this.f.push((r) => rxs.some(([c, rx]) => rx.test(String(r[c] == null ? '' : r[c])))); return this;
      }
      order(c, o) { this.ord.push([c, !(o && o.ascending === false)]); return this; }
      limit(n) { this.lim = n; return this; }
      range(a, b) { this.rng = [a, b]; return this; }
      single() { this.one = 'single'; return this; }
      maybeSingle() { this.one = 'maybe'; return this; }
      then(ok, ko) { return Promise.resolve().then(() => this.run()).then(ok, ko); }

      run() {
        load();
        const t = this.table; const acl = ACL[t];
        if (!acl) return { data: null, error: err('relation "' + t + '" does not exist', '42P01') };
        const out = (data, extra) => Object.assign({ data, error: null, count: null }, extra || {});
        const rows = () => (acl.view ? VIEWS[t]() : db.t[t]);
        if (this.op === 'select') {
          let list;
          if (!can(acl.r)) {
            if (acl.self && uid()) list = db.t[t].filter((r) => r.user_id === uid());
            else list = [];
          } else if (acl.pub && !can(acl.all || 'admin')) list = rows().filter((r) => acl.pub(r, M));
          else list = rows();
          list = list.filter((r) => this.f.every((fn) => fn(r)));
          this.ord.slice().reverse().forEach(([c, asc]) => { list = list.slice().sort((x, y) => (asc ? 1 : -1) * cmp(x[c] == null ? '' : x[c], y[c] == null ? '' : y[c])); });
          const total = list.length;
          if (this.rng) list = list.slice(this.rng[0], this.rng[1] + 1); else if (this.lim != null) list = list.slice(0, this.lim);
          if (this.head) return out(null, { count: total });
          list = clone(list);
          if (this.one) {
            if (list.length === 1) return out(list[0]);
            if (this.one === 'maybe' && !list.length) return out(null);
            return { data: null, error: err('JSON object requested, multiple (or no) rows returned', 'PGRST116'), count: null };
          }
          return out(list, this.count ? { count: total } : {});
        }
        // écritures
        const kind = this.op === 'delete' ? 'del' : this.op === 'update' ? 'upd' : 'ins';
        const need = kind in acl ? acl[kind] : acl.w;
        if (acl.view || !can(need)) {
          if (kind === 'ins') return { data: null, error: err('new row violates row-level security policy for table "' + t + '"', '42501'), count: null };
          return out(this.ret ? [] : null);
        }
        const pk = PK[t];
        const dup = (row) => (UNIQUE[t] || [[]]).some((cols) => cols.length && db.t[t].some((x) => cols.every((c) => eqv(x[c], row[c]))));
        const stamp = (row) => {
          if (t === 'mots_interdits') row.mot = String(row.mot).trim().toLowerCase();
          if (t === 'avis_reponses') { const a = db.t.admins.find((x) => x.user_id === uid()); row.auteur_id = uid(); row.auteur_nom = a ? (a.nom_affiche || a.email) : null; row.auteur_poste = a ? a.poste : null; row.created_at = row.created_at || M.nowISO(); }
          if (t === 'appareils_bloques') { row.bloque_par = uid(); row.created_at = row.created_at || M.nowISO(); }
          if (['annonces'].includes(t)) row.publie_at = row.publie_at || M.nowISO();
          if (['bilans_mensuels'].includes(t)) { row.publie_par = uid(); row.publie_at = row.publie_at || M.nowISO(); }
          if (t === 'pages_legales' || t === 'pages_contenu') row.maj_at = M.nowISO();
          if (t === 'parametres') row.maj_at = M.nowISO();
          if (row.visible === undefined && ['projets', 'annonces', 'faq', 'liens_officiels', 'evenements'].includes(t)) row.visible = true;
          return row;
        };
        const guard = (row) => {
          if (t === 'parametres' && ['require_2fa', 'campagne_cloturee', 'merci_active'].includes(row.cle) && !is.president()) return 'Ce paramètre est réservé au président.';
          return null;
        };
        if (this.op === 'insert' || this.op === 'upsert') {
          const made = [];
          for (const src of this.payload) {
            const row = stamp(clone(src));
            const g = guard(row); if (g) return { data: null, error: err(g), count: null };
            if (pk) {
              const ex = db.t[t].find((x) => eqv(x[pk], row[pk]));
              if (ex) { if (this.op === 'upsert') { Object.assign(ex, row); made.push(ex); continue; } return { data: null, error: err('duplicate key value violates unique constraint', '23505'), count: null }; }
            } else if (COMPOSITE[t]) {
              const ex = db.t[t].find((x) => COMPOSITE[t].every((c) => eqv(x[c], row[c])));
              if (ex) { if (this.op === 'upsert') { Object.assign(ex, row); made.push(ex); continue; } return { data: null, error: err('duplicate key value violates unique constraint', '23505'), count: null }; }
            } else {
              if (dup(row)) return { data: null, error: err('duplicate key value violates unique constraint', '23505'), count: null };
              if (row.id == null) row.id = nextId(t);
            }
            db.t[t].push(row); made.push(row);
            if (AUDITED.includes(t)) audit(t + '.insert', row.id || row[pk]);
          }
          save();
          return out(this.ret ? clone(made) : null);
        }
        let target = db.t[t].filter((r) => this.f.every((fn) => fn(r)));
        if (this.op === 'update') {
          const patch = clone(this.payload);
          for (const r of target) { const g = guard(Object.assign({}, r, patch)); if (g) return { data: null, error: err(g), count: null }; }
          target.forEach((r) => {
            const cols = Object.keys(patch).filter((k) => JSON.stringify(r[k]) !== JSON.stringify(patch[k]));
            Object.assign(r, patch);
            if ('maj_at' in r || ['chat_messages', 'idees', 'pages_legales', 'pages_contenu', 'parametres'].includes(t)) r.maj_at = M.nowISO();
            if (t === 'avis_reponses') r.modifie_at = M.nowISO();
            if (cols.length && AUDITED.includes(t)) audit(t + '.update', r.id || r[pk], { colonnes: cols });
          });
          save(); return out(this.ret ? clone(target) : null);
        }
        // delete
        const ids = new Set(target);
        db.t[t] = db.t[t].filter((r) => !ids.has(r));
        if (t === 'idees') db.t.idees_votes = db.t.idees_votes.filter((v) => db.t.idees.some((i) => i.id === v.idee_id));
        if (t === 'avis_bureau') db.t.avis_reponses = db.t.avis_reponses.filter((v) => db.t.avis_bureau.some((i) => i.id === v.avis_id));
        if (AUDITED.includes(t)) target.forEach((r) => audit(t + '.delete', r.id || r[pk]));
        save(); return out(this.ret ? clone(target) : null);
      }
    }

    // ----- authentification -----
    const auth = {
      async signInWithPassword({ email, password }) {
        load();
        const u = db.users.find((x) => x.email === String(email).trim().toLowerCase() && x.password === password);
        if (!u) return { data: { session: null, user: null }, error: { message: 'Identifiants invalides' } };
        const s = { access_token: 'demo', user: { id: u.id, email: u.email } };
        sess.setItem(SESSION_KEY, JSON.stringify(s));
        return { data: { session: s, user: s.user }, error: null };
      },
      async getSession() { return { data: { session: session() }, error: null }; },
      async getUser() { const s = session(); return { data: { user: s ? s.user : null }, error: null }; },
      async signOut() { sess.removeItem(SESSION_KEY); return { error: null }; },
      onAuthStateChange() { return { data: { subscription: { unsubscribe() { } } } }; },
      mfa: {
        async getAuthenticatorAssuranceLevel() { return { data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null }; },
        async listFactors() { return { data: { totp: [], all: [] }, error: null }; }
      }
    };

    // ----- stockage d'images (data URL en démo) -----
    const storage = {
      from(bucket) {
        const blobs = () => { try { return JSON.parse(store.getItem(BLOB_KEY) || '{}'); } catch (e) { return {}; } };
        return {
          async upload(path, file) {
            const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
            const b = blobs(); b[bucket + '/' + path] = data;
            try { store.setItem(BLOB_KEY, JSON.stringify(b)); } catch (e) { return { data: null, error: { message: 'Stockage démo saturé (image trop lourde).' } }; }
            return { data: { path }, error: null };
          },
          getPublicUrl(path) { return { data: { publicUrl: blobs()[bucket + '/' + path] || '' } }; },
          async remove(paths) { const b = blobs(); paths.forEach((p) => { delete b[bucket + '/' + p]; }); store.setItem(BLOB_KEY, JSON.stringify(b)); return { data: [], error: null }; }
        };
      }
    };

    const client = {
      isMock: true,
      from: (t) => new Query(t),
      rpc(name, args) {
        return Promise.resolve().then(() => {
          load();
          const fn = RPC[name];
          if (!fn) return { data: null, error: err('function ' + name + ' does not exist', '42883') };
          let data; try { data = fn(args || {}); } catch (e) { return { data: null, error: err(e.message) }; }
          save();
          return { data: data === undefined ? null : clone(data), error: null };
        });
      },
      auth, storage,
      // Fonctions serveur : en démo, « inviter-membre » crée le compte localement (aucun e-mail réel n'est envoyé)
      functions: {
        async invoke(name, opts) {
          if (name !== 'inviter-membre') return { data: null, error: { message: 'Function not found' } };
          const b = (opts && opts.body) || {};
          const r = (await client.rpc('staff_add', { p_email: b.email, p_role: b.role, p_nom: b.nom || null, p_poste: b.poste || null })).data;
          return { data: r && r.ok ? { ok: true, mode: 'invitation', envoye: true, message: 'Invitation envoyée à ' + String(b.email).toLowerCase() + ' (démo : aucun e-mail réel).' } : r, error: null };
        }
      },
      __reset: M.reset, __db: M.db, __sessionRole: () => { load(); return roleOf(); }
    };
    load();
    return client;
  }

  const api = { create, ymd };
  if (NODE) module.exports = api; else root.MPP_MOCK = api;
})(typeof window !== 'undefined' ? window : globalThis);

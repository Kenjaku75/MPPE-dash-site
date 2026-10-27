// Tests de la logique métier (mode démo). Lancer : node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const Mock = require('../js/mock.js');

function mem() {
  const m = {};
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } };
}
function setup(nowFn) {
  const sb = Mock.create({ storage: mem(), sessionStorage: mem(), now: nowFn });
  return sb;
}
const dev = (n) => 'device-' + n + '-xxxxxxxx';
const reg = (sb, o) => sb.rpc('register_participant', Object.assign({
  p_nom: 'Dupont', p_prenom: 'Jean', p_filiere: 'Gestion', p_annee: 'Licence 1', p_matricule: 'UTM2501', p_device: dev(1),
  p_consent: true, p_hp: '', p_elapsed: 10
}, o)).then((r) => r.data);
const login = (sb, who) => sb.auth.signInWithPassword({ email: who + '@demo.mpp', password: 'demo1234' });

test('un visiteur ne lit ni les participants ni les promesses', async () => {
  const sb = setup();
  assert.deepEqual((await sb.from('participants').select('*')).data, []);
  assert.deepEqual((await sb.from('promesses').select('*')).data, []);
  assert.deepEqual((await sb.from('audit_logs').select('*')).data, []);
  const r = await sb.from('projets').select('*');
  assert.ok(r.data.length > 0);
});

test('inscription : consentement, robot, doublons de matricule et de nom', async () => {
  const sb = setup();
  assert.equal((await reg(sb, { p_consent: false })).code, 'consentement');
  assert.equal((await reg(sb, { p_hp: 'x' })).code, 'robot');
  assert.equal((await reg(sb, { p_elapsed: 1 })).code, 'robot');
  assert.equal((await reg(sb, { p_filiere: 'Inconnue' })).code, 'invalide');
  const ok = await reg(sb, {});
  assert.equal(ok.ok, true);
  assert.equal(ok.statut, 'valide');
  assert.equal((await reg(sb, { p_nom: 'Autre', p_prenom: 'Gens', p_matricule: 'utm2501' })).code, 'doublon_matricule');
  // même identité : accents, ordre nom/prénom, tirets
  assert.equal((await reg(sb, { p_nom: 'Jean', p_prenom: 'Dupont', p_matricule: 'UTM2502' })).code, 'doublon_nom');
  assert.equal((await reg(sb, { p_nom: 'DÚPONT', p_prenom: 'jean-', p_matricule: 'UTM2503' })).code, 'doublon_nom');
});

test('ouedraogo / Ouédraogo sont reconnus identiques', async () => {
  const sb = setup();
  assert.equal((await reg(sb, { p_nom: 'Ouédraogo', p_prenom: 'Issa', p_matricule: 'UTM3001' })).ok, true);
  assert.equal((await reg(sb, { p_nom: 'Ouedraogo', p_prenom: 'Issa', p_matricule: 'UTM3002' })).code, 'doublon_nom');
});

test('quasi-doublon → à vérifier ; 4e inscription du même appareil → à vérifier', async () => {
  const sb = setup();
  await reg(sb, { p_nom: 'Sawadogo', p_prenom: 'Fatimata', p_matricule: 'UTM4001', p_device: dev(7) });
  const near = await reg(sb, { p_nom: 'Sawadogo', p_prenom: 'Fatimatta', p_matricule: 'UTM4002', p_device: dev(8) });
  assert.equal(near.statut, 'a_verifier');
  await reg(sb, { p_nom: 'Aaaa', p_prenom: 'Bbbb', p_matricule: 'UTM5001', p_device: dev(9) });
  await reg(sb, { p_nom: 'Cccc', p_prenom: 'Dddd', p_matricule: 'UTM5002', p_device: dev(9) });
  await reg(sb, { p_nom: 'Eeee', p_prenom: 'Ffff', p_matricule: 'UTM5003', p_device: dev(9) });
  const fourth = await reg(sb, { p_nom: 'Gggg', p_prenom: 'Hhhh', p_matricule: 'UTM5004', p_device: dev(9) });
  assert.equal(fourth.statut, 'a_verifier');
});

test('mode stand : lève la limite par appareil, exige le bon code', async () => {
  const sb = setup();
  const bad = await reg(sb, { p_point_id: 1, p_point_code: 'FAUX', p_device: dev(3) });
  assert.equal(bad.code, 'point_invalide');
  for (let i = 0; i < 5; i++) {
    const r = await reg(sb, { p_nom: 'Stand' + 'abcde'[i] + 'xx', p_prenom: 'Nom' + 'fghij'[i] + 'yy', p_matricule: 'UTM6' + i + '00', p_device: dev(3), p_point_id: 1, p_point_code: 'STAND1', p_operateur: 'Op', p_carte_verifiee: true });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.statut, 'verifie');
  }
});

test('tirage : réservé au bureau, un seul par jour, jamais un ancien gagnant, re-tirage tracé', async () => {
  const sb = setup();
  assert.equal((await sb.rpc('run_draw', {})).data.ok, false);          // anonyme refusé
  await login(sb, 'moderateur');
  assert.equal((await sb.rpc('run_draw', {})).data.ok, false);          // modérateur refusé
  await login(sb, 'bureau');
  const a = (await sb.rpc('run_draw', {})).data;
  assert.equal(a.ok, true, JSON.stringify(a));
  assert.equal((await sb.rpc('run_draw', {})).data.ok, false);          // déjà fait aujourd'hui
  const b = (await sb.rpc('run_draw', { p_redraw: true, p_motif: 'Absent' })).data;
  assert.equal(b.ok, true);
  assert.notEqual(a.gagnant, b.gagnant);
  const t = (await sb.from('tirages').select('*')).data;
  assert.equal(t.filter((x) => x.statut === 'actif').length, 1);
  assert.equal(t.filter((x) => x.statut === 'annule').length, 1);
  // les « à vérifier » ne sont jamais tirés
  const eligibles = (await sb.from('participants').select('*')).data.filter((p) => ['valide', 'verifie'].includes(p.statut));
  assert.ok(eligibles.length >= 10);
  // la vue publique n'expose que le nom
  await sb.auth.signOut();
  const pub = (await sb.from('gagnants_public').select('*')).data;
  assert.equal(pub.length, 1);
  assert.deepEqual(Object.keys(pub[0]).sort(), ['id', 'jour', 'nom_affiche', 'statut_repas', 'valide_jusqu_au']);
});

test('tirage hors dates de campagne refusé', async () => {
  const sb = setup(() => new Date(2031, 0, 15, 10, 0, 0));
  await login(sb, 'bureau');
  const r = (await sb.rpc('run_draw', {})).data;
  assert.equal(r.ok, false);
  assert.match(r.message, /dates de la campagne/);
});

test('chat : filtres, signalements, rétablissement', async () => {
  const sb = setup();
  const send = (device, content) => sb.rpc('send_message', { p_device: device, p_content: content }).then((r) => r.data);
  assert.equal((await send(dev(1), 'Bonjour tout le monde')).ok, true);
  assert.equal((await send(dev(1), 'appelle moi au 70 12 34 56')).code, 'numero');
  assert.equal((await send(dev(1), 'ecris sur whatsapp')).code, 'messagerie');
  assert.equal((await send(dev(1), 'espèce de c0nn4rd')).code, 'insulte');
  const m = await send(dev(2), 'Message à signaler');
  assert.equal(m.ok, true);
  // un signalement : toujours visible ; deux appareils différents : masqué
  assert.equal((await sb.rpc('report_content', { p_type: 'chat', p_id: m.id, p_device: dev(3) })).data.masque, false);
  assert.equal((await sb.rpc('report_content', { p_type: 'chat', p_id: m.id, p_device: dev(3) })).data.deja, true);
  assert.equal((await sb.rpc('report_content', { p_type: 'chat', p_id: m.id, p_device: dev(4) })).data.masque, true);
  let vue = (await sb.from('chat_public').select('*').eq('id', m.id)).data[0];
  assert.equal(vue.statut, 'masque');
  assert.equal(vue.contenu, null);
  // le modérateur rétablit : plus de signalement possible
  await login(sb, 'moderateur');
  await sb.from('chat_messages').update({ statut: 'visible', retabli: true }).eq('id', m.id);
  await sb.auth.signOut();
  const r5 = (await sb.rpc('report_content', { p_type: 'chat', p_id: m.id, p_device: dev(5) })).data;
  assert.equal(r5.ok, false);
  vue = (await sb.from('chat_public').select('*').eq('id', m.id)).data[0];
  assert.equal(vue.statut, 'visible');
  assert.equal(vue.contenu, 'Message à signaler');
});

test('chat en lecture seule hors horaires et sans modérateur', async () => {
  const sb = setup();
  await login(sb, 'president');
  await sb.from('parametres').update({ valeur: true }).eq('cle', 'chat_exige_moderateur');
  await sb.auth.signOut();
  let r = (await sb.rpc('send_message', { p_device: dev(1), p_content: 'salut' })).data;
  assert.equal(r.raison, 'pas_de_moderateur');
  await login(sb, 'moderateur');
  await sb.rpc('heartbeat');
  await sb.auth.signOut();
  r = (await sb.rpc('send_message', { p_device: dev(1), p_content: 'salut' })).data;
  assert.equal(r.ok, true);
});

test('chat : horaires paramétrables, lecture seule en dehors', async () => {
  let clock = new Date(2026, 9, 27, 23, 0, 0);
  const sb = setup(() => clock);
  await login(sb, 'president');
  await sb.from('parametres').update({ valeur: 'auto' }).eq('cle', 'chat_force');
  await sb.auth.signOut();
  assert.equal((await sb.rpc('send_message', { p_device: dev(1), p_content: 'salut' })).data.raison, 'hors_horaires');
  assert.equal((await sb.rpc('chat_status')).data.ouvert, false);
  clock = new Date(2026, 9, 27, 10, 30, 0);
  assert.equal((await sb.rpc('send_message', { p_device: dev(1), p_content: 'salut' })).data.ok, true);
});

test("message officiel : réservé aux administrateurs, badge attribué par le serveur", async () => {
  const sb = setup();
  assert.equal((await sb.rpc('post_official', { p_content: 'Je suis du bureau' })).data.ok, false);
  assert.equal((await sb.from('chat_messages').insert({ pseudo: 'Bureau MPPE', contenu: 'x', officiel: true })).error.code, '42501');
  await login(sb, 'moderateur');
  assert.equal((await sb.rpc('post_official', { p_content: 'Annonce' })).data.ok, false);
  await login(sb, 'bureau');
  assert.equal((await sb.rpc('post_official', { p_content: 'Annonce', p_epingle: true })).data.ok, true);
  await sb.auth.signOut();
  const o = (await sb.from('chat_public').select('*').eq('officiel', true)).data;
  assert.ok(o.some((x) => x.contenu === 'Annonce' && x.pseudo === 'Bureau MPPE' && x.epingle));
});

test('idées : like / dislike, un vote par appareil, changement de vote', async () => {
  const sb = setup();
  const add = (await sb.rpc('create_idea', { p_device: dev(1), p_titre: 'Une bonne idée', p_description: 'Une description suffisamment longue.', p_categorie: 'numérique', p_auteur: '' })).data;
  assert.equal(add.ok, true);
  const vote = (d, v) => sb.rpc('vote_idea', { p_id: add.id, p_device: d, p_valeur: v }).then((r) => r.data);
  assert.deepEqual([(await vote(dev(2), 1)).likes, (await vote(dev(2), 1)).likes], [1, 1]);
  const v2 = await vote(dev(3), -1);
  assert.equal(v2.dislikes, 1);
  assert.equal((await vote(dev(2), -1)).dislikes, 2);       // changement de vote
  assert.equal((await vote(dev(2), 0)).dislikes, 1);        // retrait
  const row = (await sb.from('idees_public').select('*').eq('id', add.id)).data[0];
  assert.equal(row.score, -1);
  assert.equal((await sb.rpc('create_idea', { p_device: dev(1), p_titre: 'Idée', p_description: 'Contactez-moi sur whatsapp svp', p_categorie: 'autre' })).data.code, 'messagerie');
});

test('avis sur le bureau : verrouillé en début de mois, ouvert les derniers jours', async () => {
  let clock = new Date(2026, 9, 10, 12, 0, 0);       // 10 octobre : fermé
  const sb = setup(() => clock);
  const send = (d) => sb.rpc('submit_avis', { p_device: d, p_note: 4, p_themes: { travail: 5, ecoute: 3 }, p_commentaire: 'Bon travail', p_attente: '' }).then((r) => r.data);
  assert.equal((await sb.rpc('avis_status')).data.ouvert, false);
  assert.equal((await send(dev(1))).code, 'ferme');
  clock = new Date(2026, 9, 27, 12, 0, 0);           // 27 octobre : 5 derniers jours (27-31)
  const st = (await sb.rpc('avis_status')).data;
  assert.equal(st.ouvert, true);
  assert.equal(st.debut, '2026-10-27');
  assert.equal(st.fin, '2026-10-31');
  assert.equal((await send(dev(1))).ok, true);
  assert.equal((await send(dev(1))).code, 'deja');   // un avis par appareil et par mois
  assert.equal((await send(dev(2))).ok, true);
  clock = new Date(2026, 9, 26, 12, 0, 0);           // 26 octobre : fermé
  assert.equal((await sb.rpc('avis_status')).data.ouvert, false);
  clock = new Date(2026, 10, 27, 12, 0, 0);          // 27 novembre : 30 jours → ouvre le 26
  assert.equal((await sb.rpc('avis_status')).data.debut, '2026-11-26');
});

test('sondages : une réponse par appareil, résultats', async () => {
  const sb = setup();
  const s = (await sb.from('sondages').select('*').eq('type', 'unique')).data[0];
  assert.equal((await sb.rpc('answer_poll', { p_id: s.id, p_device: dev(1), p_reponse: [1] })).data.ok, true);
  assert.equal((await sb.rpc('answer_poll', { p_id: s.id, p_device: dev(1), p_reponse: [2] })).data.code, 'deja');
  assert.equal((await sb.rpc('answer_poll', { p_id: s.id, p_device: dev(2), p_reponse: [9] })).data.ok, false);
  const r = (await sb.rpc('poll_results', { p_id: s.id })).data;
  assert.equal(r.total, 15);
  assert.equal(r.counts.reduce((a, b) => a + b, 0), 15);
});

test('le président est protégé : refus et journal', async () => {
  const sb = setup();
  await login(sb, 'bureau');
  const pres = (await sb.from('membres_bureau').select('*').eq('est_president', true)).data[0];
  const r = (await sb.rpc('team_save', { p: { id: pres.id, poste: 'Piraté' } })).data;
  assert.equal(r.ok, false);
  assert.equal((await sb.rpc('team_save', { p: { id: pres.id, visible: false } })).data.ok, false);
  assert.equal((await sb.rpc('team_delete', { p_id: pres.id })).data.ok, false);
  const presAdmin = (await sb.from('admins').select('*').eq('role', 'president')).data[0];
  assert.equal((await sb.rpc('staff_remove', { p_user: presAdmin.user_id })).data.ok, false);
  assert.equal((await sb.rpc('staff_add', { p_email: 'president@demo.mpp', p_role: 'moderateur' })).data.ok, false);
  assert.equal((await sb.from('audit_logs').select('*')).data.length, 0);   // le bureau ne lit pas le journal
  await sb.auth.signOut(); await login(sb, 'president');
  const log = (await sb.from('audit_logs').select('*').eq('action', 'tentative_refusee')).data;
  assert.ok(log.length >= 3, 'les tentatives doivent être journalisées');
  assert.equal((await sb.rpc('team_save', { p: { id: pres.id, poste: 'Président(e)' } })).data.ok, true);
});

test('liste des promesses : président seulement', async () => {
  const sb = setup();
  await login(sb, 'bureau');
  assert.equal((await sb.from('promesses').select('*')).data.length, 0);
  await sb.auth.signOut(); await login(sb, 'president');
  assert.equal((await sb.from('promesses').select('*')).data.length, 8);
});

test('paramètres sensibles : réservés au président', async () => {
  const sb = setup();
  await login(sb, 'bureau');
  const r = await sb.from('parametres').update({ valeur: false }).eq('cle', 'require_2fa');
  assert.ok(r.error);
  assert.equal((await sb.from('parametres').update({ valeur: '09:00' }).eq('cle', 'chat_debut')).error, null);
});

test('clôture : président ou administrateur (pas le modérateur), supprime les données nominatives, désactive les modules', async () => {
  const sb = setup();
  assert.equal((await sb.rpc('close_campaign', {})).data.ok, false);          // visiteur
  await login(sb, 'moderateur');
  assert.equal((await sb.rpc('close_campaign', {})).data.ok, false);          // modérateur
  await sb.auth.signOut(); await login(sb, 'bureau');                         // administrateur
  // on ne peut pas « clôturer » en bricolant le paramètre : il faut passer par l'assistant
  assert.ok((await sb.from('parametres').update({ valeur: true }).eq('cle', 'campagne_cloturee')).error);
  await sb.rpc('run_draw', {});
  const pending = (await sb.rpc('close_campaign', {})).data;
  assert.equal(pending.code, 'repas_en_attente');
  const done = (await sb.rpc('close_campaign', { p_force: true })).data;
  assert.equal(done.ok, true);
  assert.equal((await sb.from('participants').select('*')).data.length, 0);
  assert.equal((await reg(sb, { p_matricule: 'UTM9999' })).code, 'ferme');
  await sb.auth.signOut();
  assert.equal((await sb.from('gagnants_public').select('*')).data.length, 0);
  const tot = (await sb.from('parametres').select('*').eq('cle', 'cloture_totaux')).data[0].valeur;
  assert.equal(tot.participants, 12);
  assert.equal(tot.promesses, 8);
  assert.equal(tot.forcee, true);
  await login(sb, 'president');
  assert.equal((await sb.from('promesses').select('*')).data.length, 0);
  assert.ok((await sb.from('audit_logs').select('*').eq('action', 'cloture')).data.length === 1);
});

test('clôture par le président également autorisée', async () => {
  const sb = setup();
  await login(sb, 'president');
  assert.equal((await sb.rpc('close_campaign', { p_force: true })).data.ok, true);
});

test('stockage : les données persistent et se rechargent', async () => {
  const storage = mem();
  const a = Mock.create({ storage, sessionStorage: mem() });
  await reg(a, { p_matricule: 'UTM7777' });
  const b = Mock.create({ storage, sessionStorage: mem() });
  await b.auth.signInWithPassword({ email: 'bureau@demo.mpp', password: 'demo1234' });
  assert.equal((await b.from('participants').select('*', { count: 'exact', head: true })).count, 13);
});

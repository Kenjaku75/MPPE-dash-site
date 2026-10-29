// Teste la fonction Edge « inviter-membre » avec un faux serveur Supabase. Lancer : node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'backend', 'functions', 'inviter-membre', 'index.ts'), 'utf8')
  .replace(/^import \{ createClient \} from .*$/m, 'const createClient = globalThis.__createClient;');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (claims) => 'h.' + b64(claims) + '.s';

function setup(over) {
  over = over || {};
  const db = {
    admins: [
      { user_id: 'u-pres', email: 'Pres@exemple.com', role: 'president', nom_affiche: 'Président', poste: 'Président' },
      { user_id: 'u-adm', email: 'adm@exemple.com', role: 'admin', nom_affiche: 'Alice', poste: 'Secrétaire' },
      { user_id: 'u-mod', email: 'mod@exemple.com', role: 'moderateur', nom_affiche: null, poste: null }
    ],
    parametres: [{ cle: 'require_2fa', valeur: over.require2fa === false ? false : true }],
    audit: [], upserts: [], invites: [], resets: [],
    authUsers: over.authUsers || []
  };
  const tokens = {
    'T-PRES2': { user: { id: 'u-pres', email: 'pres@exemple.com' }, aal: 'aal2' },
    'T-PRES1': { user: { id: 'u-pres', email: 'pres@exemple.com' }, aal: 'aal1' },
    'T-ADM2': { user: { id: 'u-adm', email: 'adm@exemple.com' }, aal: 'aal2' },
    'T-ANON': { user: { id: 'u-inconnu', email: 'x@exemple.com' }, aal: 'aal2' }
  };
  const tok = (name) => { const t = tokens[name]; return t ? jwt({ aal: t.aal, sub: t.user.id }) + '#' + name : 'jeton.' + b64({}) + '.invalide'; };
  const byRaw = {};
  Object.keys(tokens).forEach((n) => { byRaw[tok(n)] = tokens[n]; });

  const rows = (t) => (t === 'admins' ? db.admins : t === 'parametres' ? db.parametres : []);
  function createClient() {
    return {
      auth: {
        getUser: async (token) => (byRaw[token] ? { data: { user: byRaw[token].user }, error: null } : { data: null, error: { message: 'jeton invalide' } }),
        admin: {
          inviteUserByEmail: async (email, opts) => {
            db.invites.push({ email, redirectTo: opts && opts.redirectTo });
            if (over.inviteError) return { data: null, error: { message: over.inviteError } };
            return { data: { user: { id: 'u-new-' + email } }, error: null };
          },
          listUsers: async () => ({ data: { users: db.authUsers }, error: null })
        },
        resetPasswordForEmail: async (email) => { db.resets.push(email); return { error: over.resetError || null }; }
      },
      from(t) {
        const q = { f: [] };
        q.select = () => q;
        q.eq = (c, v) => { q.f.push([c, v]); return q; };
        q.maybeSingle = async () => ({ data: rows(t).filter((r) => q.f.every(([c, v]) => r[c] === v))[0] || null, error: null });
        q.then = (ok, ko) => Promise.resolve({ data: rows(t), error: null }).then(ok, ko);
        q.upsert = async (row) => { db.upserts.push(row); return { error: over.upsertError || null }; };
        q.insert = async (row) => { db.audit.push(row); return { error: null }; };
        return q;
      }
    };
  }
  let handler;
  const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv', SUPABASE_ANON_KEY: 'anon' };
  globalThis.__createClient = createClient;
  new Function('Deno', SRC)({ env: { get: (k) => (k in env ? env[k] : undefined) }, serve: (fn) => { handler = fn; } });
  const call = async (method, tokenName, body) => {
    const headers = { 'Content-Type': 'application/json' };
    if (tokenName) headers.Authorization = 'Bearer ' + tok(tokenName);
    const res = await handler(new Request('https://x.supabase.co/functions/v1/inviter-membre', { method, headers, body: body ? JSON.stringify(body) : undefined }));
    let data = null; try { data = await res.json(); } catch (e) { /* ignore */ }
    return { status: res.status, data, headers: res.headers };
  };
  return { db, call };
}
const OK = { email: 'Nouveau@Exemple.com', role: 'moderateur', nom: 'Awa', poste: 'Modératrice' };

test('préparation CORS et méthodes', async () => {
  const { call } = setup();
  const o = await call('OPTIONS', null);
  assert.equal(o.status, 200);
  assert.equal(o.headers.get('access-control-allow-origin'), 'https://mppe-dash.vercel.app');
  assert.equal((await call('GET', 'T-PRES2')).status, 405);
});

test('refus sans connexion ou avec un jeton invalide', async () => {
  const { call, db } = setup();
  assert.equal((await call('POST', null, OK)).status, 401);                // aucun jeton
  assert.equal((await call('POST', 'T-INCONNU', OK)).status, 401);         // jeton que le serveur d'authentification refuse
  assert.equal(db.invites.length, 0);
  assert.equal((await call('POST', 'T-PRES2', OK)).status, 200);           // contrôle : le bon jeton passe
});

test("refus d'un administrateur ou d'un inconnu, avec trace au journal", async () => {
  const { call, db } = setup();
  const a = await call('POST', 'T-ADM2', OK);
  assert.equal(a.status, 403);
  assert.match(a.data.message, /Seul le président/);
  const i = await call('POST', 'T-ANON', OK);
  assert.equal(i.status, 403);
  assert.equal(db.invites.length, 0);
  assert.equal(db.upserts.length, 0);
  assert.equal(db.audit.filter((x) => x.action === 'tentative_refusee').length, 2);
});

test('double authentification exigée du président (sauf si désactivée)', async () => {
  let s = setup();
  const r1 = await s.call('POST', 'T-PRES1', OK);
  assert.equal(r1.status, 403);
  assert.match(r1.data.message, /double authentification/i);
  assert.equal(s.db.invites.length, 0);
  s = setup({ require2fa: false });
  assert.equal((await s.call('POST', 'T-PRES1', OK)).status, 200);
});

test('validation des saisies', async () => {
  const { call, db } = setup();
  assert.equal((await call('POST', 'T-PRES2', { ...OK, email: 'pas-un-email' })).status, 400);
  assert.equal((await call('POST', 'T-PRES2', { ...OK, role: 'president' })).status, 400);
  assert.equal((await call('POST', 'T-PRES2', { ...OK, role: '' })).status, 400);
  assert.equal(db.invites.length, 0);
});

test('invitation réussie : e-mail envoyé vers le dashboard, rôle attribué, journal', async () => {
  const { call, db } = setup();
  const r = await call('POST', 'T-PRES2', OK);
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.mode, 'invitation');
  assert.deepEqual(db.invites, [{ email: 'nouveau@exemple.com', redirectTo: 'https://mppe-dash.vercel.app/connexion.html' }]);
  assert.deepEqual(db.upserts[0], { user_id: 'u-new-nouveau@exemple.com', email: 'nouveau@exemple.com', nom_affiche: 'Awa', poste: 'Modératrice', role: 'moderateur' });
  const j = db.audit.find((x) => x.action === 'admins.invitation');
  assert.equal(j.cible, 'nouveau@exemple.com');
  assert.equal(j.acteur, 'u-pres');
});

test("compte déjà existant : lien de réinitialisation, rôle mis à jour, nom conservé", async () => {
  const { call, db } = setup({ inviteError: 'A user with this email address has already been registered', authUsers: [{ id: 'u-adm', email: 'ADM@exemple.com' }] });
  const r = await call('POST', 'T-PRES2', { email: 'adm@exemple.com', role: 'moderateur' });
  assert.equal(r.status, 200);
  assert.equal(r.data.mode, 'recuperation');
  assert.deepEqual(db.resets, ['adm@exemple.com']);
  assert.equal(db.upserts[0].role, 'moderateur');
  assert.equal(db.upserts[0].nom_affiche, 'Alice');       // non écrasé
  assert.equal(db.upserts[0].poste, 'Secrétaire');
});

test("échec d'envoi du lien : le rôle est quand même attribué, avec un message clair", async () => {
  const { call, db } = setup({ inviteError: 'exists', authUsers: [{ id: 'u-mod', email: 'mod@exemple.com' }], resetError: { message: 'rate limit' } });
  const r = await call('POST', 'T-PRES2', { email: 'mod@exemple.com', role: 'admin' });
  assert.equal(r.status, 200);
  assert.equal(r.data.envoye, false);
  assert.match(r.data.message, /n'a pas pu être envoyé/);
  assert.equal(db.upserts[0].role, 'admin');
});

test('invitation impossible et compte introuvable : erreur 400', async () => {
  const { call, db } = setup({ inviteError: 'Email rate limit exceeded', authUsers: [] });
  const r = await call('POST', 'T-PRES2', OK);
  assert.equal(r.status, 400);
  assert.match(r.data.message, /rate limit/i);
  assert.equal(db.upserts.length, 0);
});

test("le compte du président est intouchable, même par le président", async () => {
  const { call, db } = setup();
  const r = await call('POST', 'T-PRES2', { email: 'PRES@exemple.com', role: 'moderateur' });
  assert.equal(r.status, 403);
  assert.match(r.data.message, /président ne peut pas/);
  assert.equal(db.upserts.length, 0);
  assert.equal(db.invites.length, 0);
});

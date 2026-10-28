/* Connexion au dashboard : e-mail + mot de passe, puis authentification à deux facteurs (code à 6 chiffres) */
(async () => {
  const { esc, $ } = MPP;
  // Type de lien reçu par e-mail (invitation, réinitialisation…) : à lire AVANT que la bibliothèque n'efface l'adresse
  const mailType = ((location.hash.match(/[#&]type=(\w+)/) || [])[1]) || '';
  await MPP.ready;
  const sb = MPP.sb;
  const app = $('#app');
  let S = {};
  try { S = await MPP.settings(true); } catch (e) { /* ignore */ }
  const next = (new URLSearchParams(location.search).get('next') || 'index.html').replace(/[^\w.\-]/g, '') || 'index.html';
  const view = (inner) => { app.innerHTML = '<div class="login"><img src="' + MPP.root + 'assets/logo.svg" width="72" height="72" alt=""><h1>Dashboard MPPE</h1><p class="muted center small" style="margin-top:0">Accès réservé au bureau et aux modérateurs.</p>' + inner + '</div>'; };
  const msg = (kind, html) => { const m = $('#m'); if (m) m.innerHTML = MPP.alert(kind, html); };
  const go = () => location.replace(next);

  async function afterLogin() {
    const { data } = await sb.auth.getSession();
    if (!data || !data.session) return loginForm();
    const rows = await MPP.q(sb.from('admins').select('*').eq('user_id', data.session.user.id));
    if (!rows[0]) { await sb.auth.signOut(); loginForm(); msg('error', "Ce compte n'a pas accès au dashboard."); return; }
    if (MPP.demo || S.require_2fa === false) return go();
    const aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.data && aal.data.currentLevel === 'aal2') return go();
    const f = await sb.auth.mfa.listFactors();
    const verified = ((f.data && f.data.totp) || []).filter((x) => x.status === 'verified');
    if (verified.length) return mfaChallenge(verified[0].id);
    // retire les tentatives d'activation abandonnées
    for (const x of ((f.data && f.data.all) || []).filter((y) => y.status === 'unverified')) await sb.auth.mfa.unenroll({ factorId: x.id });
    return mfaEnroll();
  }

  function loginForm() {
    view('<form id="f" novalidate><label class="field"><span>Adresse e-mail</span><input type="email" name="email" required autocomplete="username"></label>' +
      '<label class="field"><span>Mot de passe</span><input type="password" name="password" required autocomplete="current-password"></label><div id="m"></div>' +
      '<button class="btn btn-block" type="submit">Se connecter</button><p class="center small" style="margin:12px 0 0">' + (MPP.demo ? '' : '<button class="link-btn" type="button" id="forgot">Mot de passe oublié ?</button>') + '</p></form>' +
      (MPP.demo ? '<div class="alert warn" style="margin-top:16px"><b>Mode démo.</b> Comptes d\'essai (mot de passe : <code>demo1234</code>) :<div class="row" style="margin-top:8px">' +
        [['president', 'Président'], ['bureau', 'Bureau'], ['moderateur', 'Modérateur']].map(([k, l]) => '<button type="button" class="btn btn-sm btn-ghost" data-demo="' + k + '">' + l + '</button>').join('') + '</div><p class="small" style="margin:8px 0 0">La double authentification est désactivée en démo.</p></div>' : ''));
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(e.target).entries()); const btn = $('button[type=submit]', e.target);
      MPP.busy(btn, true, 'Connexion…');
      const { error } = await sb.auth.signInWithPassword({ email: d.email, password: d.password });
      MPP.busy(btn, false);
      if (error) { msg('error', 'E-mail ou mot de passe incorrect.'); return; }
      try { await afterLogin(); } catch (err) { msg('error', esc(err.message)); }
    });
    app.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', async () => {
      await sb.auth.signInWithPassword({ email: b.dataset.demo + '@demo.mpp', password: 'demo1234' }); await afterLogin();
    }));
    const fg = $('#forgot');
    if (fg) fg.addEventListener('click', async () => {
      const email = $('[name=email]').value.trim();
      if (!email) { msg('warn', "Saisissez d'abord votre adresse e-mail ci-dessus."); return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('?')[0] });
      msg(error ? 'error' : 'ok', error ? esc(error.message) : 'Si ce compte existe, un e-mail de réinitialisation vient d\'être envoyé.');
    });
  }

  function codeForm(title, intro, onSubmit, extra) {
    view('<h2 style="font-size:1.1rem;text-align:center">' + title + '</h2><p class="small muted center">' + intro + '</p>' + (extra || '') +
      '<form id="c" novalidate><label class="field"><span>Code à 6 chiffres</span><input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code" style="font-size:1.4rem;letter-spacing:.3em;text-align:center"></label><div id="m"></div><button class="btn btn-block" type="submit">Valider</button></form><p class="center small"><button class="link-btn" type="button" id="back">Annuler</button></p>');
    $('#back').addEventListener('click', async () => { await sb.auth.signOut(); loginForm(); });
    $('#c').addEventListener('submit', async (e) => { e.preventDefault(); const code = new FormData(e.target).get('code'); const btn = $('button[type=submit]', e.target); MPP.busy(btn, true, 'Vérification…'); try { await onSubmit(String(code).trim()); } catch (err) { msg('error', esc(err.message)); } MPP.busy(btn, false); });
    $('[name=code]').focus();
  }
  async function verify(factorId, code) {
    const ch = await sb.auth.mfa.challenge({ factorId });
    if (ch.error) throw new Error(ch.error.message);
    const v = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
    if (v.error) throw new Error('Code incorrect ou expiré.');
    go();
  }
  function mfaChallenge(factorId) { codeForm('Vérification en deux étapes', "Ouvrez votre application d'authentification (Google Authenticator, Aegis…) et saisissez le code affiché.", (code) => verify(factorId, code)); }
  async function mfaEnroll() {
    const r = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'MPPE ' + Date.now() });
    if (r.error) { loginForm(); msg('error', esc(r.error.message)); return; }
    const { id, totp } = r.data;
    codeForm('Activer la double authentification', "Obligatoire pour les comptes du bureau. Scannez ce QR code avec une application d'authentification, puis saisissez le code affiché. Président : activez-la sur <b>deux appareils</b> pour garder un accès de secours.",
      (code) => verify(id, code), '<div class="qr-box"><img src="' + esc(totp.qr_code) + '" alt="QR code d\'activation" width="180" height="180"></div><p class="small center muted">Ou saisissez cette clé : <code>' + esc(totp.secret) + '</code></p>');
  }

  // Choix du mot de passe : après une invitation (première connexion) ou une réinitialisation
  function newPassword(first) {
    view('<h2 style="font-size:1.1rem;text-align:center">' + (first ? 'Bienvenue ! Choisissez votre mot de passe' : 'Nouveau mot de passe') + '</h2><form id="p" novalidate><label class="field"><span>Mot de passe (12 caractères minimum)</span><input type="password" name="pw" required minlength="12" autocomplete="new-password"></label><div id="m"></div><button class="btn btn-block" type="submit">Enregistrer</button></form>');
    $('#p').addEventListener('submit', async (e) => {
      e.preventDefault(); const pw = new FormData(e.target).get('pw');
      if (String(pw).length < 12) return msg('warn', '12 caractères minimum.');
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) msg('error', esc(error.message)); else { msg('ok', 'Mot de passe enregistré.'); setTimeout(afterLogin, 800); }
    });
  }
  let pwShown = false;
  sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY' && !pwShown) { pwShown = true; newPassword(false); } });
  const { data } = await sb.auth.getSession();
  if (data && data.session && mailType === 'invite') { pwShown = true; newPassword(true); }
  else if (data && data.session) { try { await afterLogin(); } catch (e) { loginForm(); } }
  else loginForm();
})();

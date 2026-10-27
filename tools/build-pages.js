// Génère un fichier HTML distinct pour chaque page du site et du dashboard (cahier des charges §15 ter).
// Usage : node tools/build-pages.js
// Chaque page a son propre titre, sa description et son image de partage WhatsApp (Open Graph).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// Adresse publique du site (aperçus WhatsApp og:image / og:url) : lue dans js/config.js (siteUrl), à défaut un repère à remplacer
const cfgSrc = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
const SITE = ((cfgSrc.match(/siteUrl:\s*'([^']*)'/) || [])[1] || '__SITE_URL__').replace(/\/+$/, '');

// [fichier, titre, description, script de page, entrée de menu active]
const PUBLIC = [
  ['index', 'MPPE — La force de la jeunesse, l\'avenir du Faso', "Site de campagne du Mouvement Patriotique pour le Progrès Estudiantin (UTM) : tirage au sort quotidien, boîte à idées, sondages et chat anonyme.", 'p-home', 'index'],
  ['mouvement', 'Le mouvement — MPPE', "Qui sommes-nous ? Présentation, valeurs et histoire du bureau du MPPE.", 'p-info', 'mouvement'],
  ['projets', 'Vision et projets — MPPE', "La vision du MPPE et ses projets pour les étudiants de l'UTM, avec leur avancement.", 'p-info', 'projets'],
  ['equipe', "L'équipe — MPPE", "Les membres du bureau du MPPE.", 'p-info', 'equipe'],
  ['annonces', 'Annonces — MPPE', "Les dernières actualités du MPPE : meetings, rencontres, parking, résultats de sondages.", 'p-info', 'annonces'],
  ['agenda', 'Agenda — MPPE', "Les prochains événements du MPPE : rencontres, tirages, parking, points d'inscription.", 'p-info', 'agenda'],
  ['faq', 'FAQ et règles — MPPE', "Comment participer au tirage, au chat, à la boîte à idées : questions fréquentes.", 'p-info', 'faq'],
  ['liens', 'Liens utiles — MPPE', "Le site et les réseaux sociaux officiels de l'UTM, et le contact WhatsApp du bureau.", 'p-info', 'liens'],
  ['parking', 'Parking gratuit — MPPE', "Opération parking gratuit : jours, heure d'ouverture, 100 premières places, conditions.", 'p-info', 'parking'],
  ['merci', 'Remerciements et résultats — MPPE', "Remerciements du bureau et résultats officiels de l'élection.", 'p-info', 'merci'],
  ['mentions-legales', 'Mentions légales — MPPE', "Mentions légales du site de campagne du MPPE.", 'p-info', 'mentions-legales'],
  ['regles-tirage', 'Règles du tirage au sort — MPPE', "Règles du tirage au sort quotidien d'un repas gratuit.", 'p-info', 'regles-tirage'],
  ['confidentialite', 'Politique de confidentialité — MPPE', "Quelles données sont collectées, pourquoi, et quand elles sont supprimées.", 'p-info', 'confidentialite'],
  ['charte', 'Charte du chat et de la boîte à idées — MPPE', "Les règles de bonne conduite du chat, des idées et des avis.", 'p-info', 'charte'],
  ['inscription', 'Tirage au sort — Inscription — MPPE', "Inscrivez-vous au tirage au sort quotidien et tentez de gagner un repas gratuit à la cantine.", 'p-forms', 'inscription'],
  ['gagnant', 'Gagnant du jour — MPPE', "Le gagnant du tirage au sort du jour et l'historique des gagnants.", 'p-winner', 'gagnant'],
  ['soutenir', 'Soutenir le MPPE — Promesse de vote', "Faites une promesse de soutien au MPPE. Elle n'engage à rien : le vote officiel a lieu en présentiel.", 'p-forms', 'soutenir'],
  ['aide', "Besoin d'aide ? — MPPE", "Un souci avec votre inscription, un message supprimé, le tirage ? Écrivez au bureau.", 'p-forms', 'aide'],
  ['rejoindre', "Rejoindre l'équipe de campagne — MPPE", "Aidez le MPPE pendant la campagne : affiches, modération, logistique, réseaux sociaux.", 'p-forms', 'rejoindre'],
  ['chat', 'Chat anonyme — MPPE', "Discutez librement et anonymement avec les autres étudiants. Chat modéré.", 'p-chat', 'chat'],
  ['idees', 'Boîte à idées — MPPE', "Proposez vos idées pour l'UTM et likez celles que vous préférez.", 'p-ideas', 'idees'],
  ['sondages', 'Sondages — MPPE', "Répondez aux sondages du bureau et consultez les résultats.", 'p-polls', 'sondages'],
  ['avis', 'Avis sur le bureau — MPPE', "Chaque mois, jugez le travail du bureau : ce qui va, ce qui ne va pas.", 'p-avis', 'avis']
];

// [fichier, titre, script, icône]
const ADMIN = [
  ['index', "Vue d'ensemble", 'a-home'],
  ['participants', 'Participants', 'a-participants'],
  ['tirage', 'Tirage au sort', 'a-tirage'],
  ['chat', 'Chat et modération', 'a-chat'],
  ['idees', 'Idées', 'a-idees'],
  ['sondages', 'Sondages', 'a-sondages'],
  ['avis', 'Avis sur le bureau', 'a-avis'],
  ['contenus', 'Contenus', 'a-contenus'],
  ['equipe', "Équipe", 'a-equipe'],
  ['agenda', 'Agenda', 'a-crud'],
  ['parking', 'Parking', 'a-parking'],
  ['points', "Points d'inscription", 'a-points'],
  ['benevoles', 'Bénévoles', 'a-crud'],
  ['aide', "Demandes d'aide", 'a-crud'],
  ['promesses', 'Promesses de vote', 'a-promesses'],
  ['parametres', 'Paramètres', 'a-parametres'],
  ['audit', "Journal d'audit", 'a-audit'],
  ['cloture', 'Clôture de la campagne', 'a-cloture']
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function publicPage([file, title, desc, script, nav]) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MPPE — Mouvement Patriotique pour le Progrès Estudiantin">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/assets/share.png">
<meta property="og:url" content="${SITE}/${file}.html">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0F7A3A">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="assets/logo.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/icon-192.png">
<link rel="stylesheet" href="css/style.css">
</head>
<body data-page="${file}" data-nav="${nav}">
<a class="sr-only" href="#app">Aller au contenu</a>
<main id="app"><div class="loading">Chargement…</div></main>
<noscript><div class="wrap section"><p class="alert warn">Ce site a besoin de JavaScript pour fonctionner. Activez-le puis actualisez la page.</p></div></noscript>
<script src="js/config.js"></script>
<script src="js/core.js"></script>
<script src="js/${script}.js"></script>
</body>
</html>
`;
}

function adminPage([file, title, script]) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard — ${esc(title)} — MPPE</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#073d1d">
<link rel="icon" href="../assets/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="../css/style.css">
<link rel="stylesheet" href="../css/admin.css">
</head>
<body data-admin="1" data-page="admin-${file}" data-nav="${file}">
<div id="app"><div class="loading">Chargement…</div></div>
<noscript><p class="alert warn">JavaScript est requis.</p></noscript>
<script src="../js/config.js"></script>
<script src="../js/core.js"></script>
<script src="../js/admin-core.js"></script>
<script src="../js/${script}.js"></script>
</body>
</html>
`;
}

function loginPage() {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard — Connexion — MPPE</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#073d1d">
<link rel="icon" href="../assets/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="../css/style.css">
<link rel="stylesheet" href="../css/admin.css">
</head>
<body data-admin="1" data-page="admin-connexion">
<main id="app" class="login-wrap"><div class="loading">Chargement…</div></main>
<script src="../js/config.js"></script>
<script src="../js/core.js"></script>
<script src="../js/admin-core.js"></script>
<script src="../js/a-connexion.js"></script>
</body>
</html>
`;
}

function notFound() {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page introuvable — MPPE</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0F7A3A">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 "Segoe UI",system-ui,sans-serif;background:#fbf9f3;color:#111a14;text-align:center;padding:24px}
.c{max-width:420px}.n{font-size:5rem;font-weight:800;color:#0f7a3a;line-height:1}
a{display:inline-block;margin-top:18px;background:#0f7a3a;color:#fff;padding:14px 22px;border-radius:12px;font-weight:700;text-decoration:none}
.s{height:6px;background:linear-gradient(90deg,#d91e18 33%,#f2b705 33% 66%,#0f7a3a 66%);border-radius:3px;margin:0 auto 22px;width:120px}
</style>
</head>
<body>
<div class="c"><div class="s"></div><div class="n">404</div><h1>Page introuvable</h1><p>Cette page n'existe pas ou a été déplacée.</p><a href="/">Retour à l'accueil</a></div>
</body>
</html>
`;
}

// Version des fichiers (date de génération) : ajoutée aux adresses des styles et scripts pour que les navigateurs
// rechargent toujours la dernière version après une mise à jour.
const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
const V = '' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + p2(d.getHours()) + p2(d.getMinutes());
const ver = (html) => html.replace(/(href|src)="((?:\.\.\/)?(?:css|js)\/[^"?]+\.(?:css|js))"/g, '$1="$2?v=' + V + '"');

for (const p of PUBLIC) fs.writeFileSync(path.join(root, p[0] + '.html'), ver(publicPage(p)), 'utf8');
fs.writeFileSync(path.join(root, '404.html'), notFound(), 'utf8');
fs.mkdirSync(path.join(root, 'admin'), { recursive: true });
for (const p of ADMIN) fs.writeFileSync(path.join(root, 'admin', p[0] + '.html'), ver(adminPage(p)), 'utf8');
fs.writeFileSync(path.join(root, 'admin', 'connexion.html'), ver(loginPage()), 'utf8');
console.log('Pages générées : ' + (PUBLIC.length + 1) + ' publiques, ' + (ADMIN.length + 1) + ' pour le dashboard.');
module.exports = { ADMIN };

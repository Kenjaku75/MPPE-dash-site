// Renseigne l'adresse publique du site dans les balises de partage WhatsApp (og:image, og:url) de toutes les pages
// et dans js/config.js. Usage : node tools/set-domain.js https://mpp-campagne.pages.dev
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const url = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\/[^\s/]+/.test(url)) { console.error('Usage : node tools/set-domain.js https://votre-adresse'); process.exit(1); }

let n = 0;
const rx = /(property="og:(?:image|url)" content=")[^"]*?(\/(?:assets\/share\.png|[a-z0-9-]+\.html))"/g;
for (const f of fs.readdirSync(root).filter((x) => x.endsWith('.html'))) {
  const p = path.join(root, f); const before = fs.readFileSync(p, 'utf8'); const after = before.replace(rx, '$1' + url + '$2"');
  if (after !== before) { fs.writeFileSync(p, after, 'utf8'); n++; }
}
const cfg = path.join(root, 'js', 'config.js');
fs.writeFileSync(cfg, fs.readFileSync(cfg, 'utf8').replace(/siteUrl: '[^']*'/, "siteUrl: '" + url + "'"), 'utf8');
console.log('Adresse ' + url + ' appliquée à ' + n + ' pages et à js/config.js.');

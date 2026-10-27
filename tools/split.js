// Prépare un déploiement SÉPARÉ du site public et du dashboard (deux adresses, même base de données).
//   node tools/split.js site   -> dist/site : pages publiques uniquement (aucun code du dashboard)
//   node tools/split.js dash   -> dist/dash : pages d'administration uniquement, à la racine (connexion.html, index.html…)
// Sur Vercel : « Build Command » = node tools/split.js site (ou dash) ; « Output Directory » = dist/site (ou dist/dash).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const target = process.argv[2];
if (!['site', 'dash'].includes(target)) { console.error('Usage : node tools/split.js site|dash'); process.exit(1); }

const out = path.join(root, 'dist', target);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const put = (rel, destRel) => {
  const from = path.join(root, rel); const to = path.join(out, destRel || rel);
  fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to);
};
const ls = (dir, test) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).filter((e) => e.isFile() && test(e.name)).map((e) => e.name);

if (target === 'site') {
  ls('.', (f) => f.endsWith('.html')).forEach((f) => put(f));                      // pages publiques + 404
  put('css/style.css');
  ls('js', (f) => f.endsWith('.js') && !/^(admin-core|a-.*)\.js$/.test(f)).forEach((f) => put('js/' + f));
  ls('assets', () => true).forEach((f) => put('assets/' + f));
  ['manifest.webmanifest', 'sw.js'].forEach((f) => put(f));
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n');
} else {
  // Les pages du dashboard sont dans admin/ avec des liens « ../ » : à la racine de dist/dash, on retire ce « ../ ».
  ls('admin', (f) => f.endsWith('.html')).forEach((f) => {
    const html = fs.readFileSync(path.join(root, 'admin', f), 'utf8').replace(/(href|src)="\.\.\//g, '$1="');
    fs.writeFileSync(path.join(out, f), html, 'utf8');
  });
  put('404.html');
  ['css/style.css', 'css/admin.css', 'assets/logo.svg'].forEach((f) => put(f));
  const keep = new Set(['config.js', 'core.js', 'filters.js', 'mock.js', 'seed-data.js', 'admin-core.js']);
  ls('js', (f) => keep.has(f) || /^a-.*\.js$/.test(f)).forEach((f) => put('js/' + f));
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');   // le dashboard ne doit pas être indexé
}

// Vérification : chaque fichier local référencé par une page doit exister dans le dossier produit
let missing = 0, pages = 0;
for (const f of ls(path.relative(root, out), (n) => n.endsWith('.html'))) {
  pages++;
  const html = fs.readFileSync(path.join(out, f), 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"#?:]+)(?:\?[^"]*)?"/g)) {
    const ref = m[1]; if (/^(https?:|\/\/|data:|mailto:|tel:|__SITE_URL__)/.test(ref) || ref.startsWith('/') || /\.html$/.test(ref) && false) continue;
    if (!fs.existsSync(path.join(out, ref))) { console.error('MANQUANT dans ' + f + ' : ' + ref); missing++; }
  }
}
if (missing) { console.error(missing + ' fichier(s) référencé(s) introuvable(s).'); process.exit(1); }
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log('dist/' + target + ' : ' + count(out) + ' fichiers, ' + pages + ' pages, toutes les références locales résolues.');

// Génère backend/seed.sql à partir de js/seed-data.js (partie « core »).
// Usage : node tools/make-seed.js
const fs = require('fs');
const path = require('path');
const { core } = require('../js/seed-data.js');

const q = (v) => (v === null || v === undefined ? 'null' : "'" + String(v).replace(/'/g, "''") + "'");
const out = ['-- Contenu de base de la plateforme. Généré par tools/make-seed.js — ne pas modifier à la main.', 'begin;', ''];

out.push('-- Paramètres');
for (const [k, v] of Object.entries(core.parametres)) {
  out.push(`insert into public.parametres (cle, valeur) values (${q(k)}, ${q(JSON.stringify(v))}::jsonb) on conflict (cle) do nothing;`);
}

out.push('', '-- Textes du mouvement');
for (const p of core.pages_contenu) {
  out.push(`insert into public.pages_contenu (slug, titre, corps) values (${q(p.slug)}, ${q(p.titre)}, ${q(p.corps)}) on conflict (slug) do nothing;`);
}

out.push('', '-- Pages légales');
for (const p of core.pages_legales) {
  out.push(`insert into public.pages_legales (slug, titre, corps) values (${q(p.slug)}, ${q(p.titre)}, ${q(p.corps)}) on conflict (slug) do nothing;`);
}

out.push('', '-- FAQ');
for (const f of core.faq) {
  out.push(`insert into public.faq (question, reponse, ordre, visible) values (${q(f.question)}, ${q(f.reponse)}, ${f.ordre}, ${f.visible});`);
}

out.push('', "-- Liens officiels de l'UTM");
for (const l of core.liens_officiels) {
  out.push(`insert into public.liens_officiels (libelle, url, ordre, visible) values (${q(l.libelle)}, ${q(l.url)}, ${l.ordre}, ${l.visible});`);
}

out.push('', '-- Mots interdits du chat');
for (const m of core.mots_interdits) {
  out.push(`insert into public.mots_interdits (mot) values (${q(m)}) on conflict (mot) do nothing;`);
}

out.push('', 'commit;', '');
const file = path.join(__dirname, '..', 'backend', 'seed.sql');
fs.writeFileSync(file, out.join('\n'), 'utf8');
console.log('Écrit : ' + file + ' (' + out.length + ' lignes)');

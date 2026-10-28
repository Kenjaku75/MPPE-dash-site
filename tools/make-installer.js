// Assemble backend/installer.sql = schema.sql + seed.sql en un seul fichier à coller dans le « SQL Editor » de Supabase.
// Usage : node tools/make-installer.js   (à relancer si schema.sql ou seed.sql changent)
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'backend');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
const head = `-- =====================================================================
--  INSTALLATION COMPLÈTE de la base du MPPE (schéma + contenu de base) — à coller UNE FOIS dans Supabase > SQL Editor > Run
--
--  >>> AVANT DE LANCER : cherchez la ligne  'president@exemple.com'  plus bas et remplacez-la par l'e-mail réel du PRÉSIDENT. <<<
--  Puis, dans Authentication > Users, invitez cette adresse : ce compte devient automatiquement « président ».
--  Fichier généré par tools/make-installer.js — ne pas modifier à la main (modifier schema.sql / seed.sql puis relancer l'outil).
-- =====================================================================

`;
fs.writeFileSync(path.join(dir, 'installer.sql'), head + read('schema.sql') + '\n\n-- =====================================================================\n--  Contenu de base (seed.sql)\n-- =====================================================================\n' + read('seed.sql'), 'utf8');
console.log('Écrit : backend/installer.sql');

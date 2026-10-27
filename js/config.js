/* Configuration de la plateforme.
   - Laisser supabaseUrl / supabaseKey vides = MODE DÉMO (données locales, rien n'est envoyé nulle part).
   - Pour la mise en production : créer un projet Supabase dédié, exécuter backend/schema.sql puis backend/seed.sql,
     et coller ici l'URL du projet et la clé « anon / publishable » (jamais la clé « service_role »). */
window.MPP_CONFIG = {
  supabaseUrl: '',
  supabaseKey: '',
  // Déploiement séparé du site public et du dashboard (deux adresses, même base de données) :
  // renseigner ici l'adresse de chacun (sans « / » final). Vide = tout est servi depuis la même adresse.
  siteUrl: 'https://mppe-site.vercel.app',   // aussi utilisée pour les liens de partage WhatsApp
  dashUrl: 'https://mppe-dash.vercel.app'
};

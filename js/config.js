/* Configuration de la plateforme.
   - Laisser supabaseUrl / supabaseKey vides = MODE DÉMO (données locales, rien n'est envoyé nulle part).
   - Pour la mise en production : créer un projet Supabase dédié, exécuter backend/schema.sql puis backend/seed.sql,
     et coller ici l'URL du projet et la clé « anon / publishable » (jamais la clé « service_role »). */
window.MPP_CONFIG = {
  supabaseUrl: '',
  supabaseKey: '',
  // Adresse publique du site (sans « / » final), utilisée pour les liens de partage. Vide = adresse courante.
  siteUrl: ''
};

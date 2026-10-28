/* Configuration de la plateforme.
   - Laisser supabaseUrl / supabaseKey vides = MODE DÉMO (données locales, rien n'est envoyé nulle part).
   - Mise en production : projet Supabase du MPPE (backend/installer.sql exécuté), URL du projet et clé « publishable »
     ci-dessous (jamais la clé « service_role » / « secret »). Ces deux valeurs sont publiques par conception.
   - En local (localhost), le site reste en mode démo ; ajouter ?live=1 à l'adresse pour utiliser la vraie base (?live=0 pour revenir). */
window.MPP_CONFIG = {
  supabaseUrl: 'https://fctpcvkmfvqqxahxlcqm.supabase.co',
  supabaseKey: 'sb_publishable_h50R9HwLh8TGtkyq8N8ulA_Fys3P2wB',
  // Déploiement séparé du site public et du dashboard (deux adresses, même base de données) :
  // renseigner ici l'adresse de chacun (sans « / » final). Vide = tout est servi depuis la même adresse.
  siteUrl: 'https://mppe-site.vercel.app',   // aussi utilisée pour les liens de partage WhatsApp
  dashUrl: 'https://mppe-dash.vercel.app'
};

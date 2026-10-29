# Plateforme de campagne du MPPE

Site public + dashboard d'administration, construits d'après le *Cahier des charges v1.0* et les *notes orales du 27 octobre 2026*
(dossier parent). HTML/CSS/JavaScript sans framework, un fichier HTML par page, PWA installable, budget numérique zéro.

## 1. L'essayer tout de suite (mode démo)

Double-cliquez sur **`lancer-demo.bat`** (nécessite Python). Le site s'ouvre sur <http://localhost:8080/index.html>.

- Le mode démo garde toutes les données **dans votre navigateur** (rien n'est envoyé nulle part) et reproduit les règles du serveur.
- Dashboard : <http://localhost:8080/admin/connexion.html> → boutons de connexion rapide
  (`president@demo.mpp`, `bureau@demo.mpp`, `moderateur@demo.mpp`, mot de passe `demo1234`).
- La campagne démo démarre aujourd'hui et dure 3 jours : essayez **Tirage au sort** dans le dashboard après quelques inscriptions.
- « Réinitialiser la démo » (bandeau noir en haut) remet tout à zéro.

## 2. Mise en ligne

1. **Backend** — créez un projet Supabase **dédié au MPPE** (gratuit). Dans l'éditeur SQL, exécutez `backend/schema.sql`, puis `backend/seed.sql`.
2. **Comptes** — Supabase → Authentication : désactivez les inscriptions publiques (*Allow new users to sign up*), activez la **MFA TOTP**,
   puis invitez l'e-mail du président (celui que vous avez mis à la ligne `president_email` au début de `backend/schema.sql`, à modifier **avant** d'exécuter le script) : ce compte devient automatiquement **président** à sa création
   (si le compte existait déjà : se connecter puis exécuter `select public.claim_president();`).
   Les autres membres : le **président les invite par e-mail depuis le dashboard** (*Paramètres → Comptes du bureau → Inviter par e-mail*), une fois la fonction d'invitation installée (voir ci-dessous).
   Chaque personne choisit elle-même son mot de passe, puis active la double authentification : personne ne connaît le mot de passe d'un autre.

   **Installer la fonction d'invitation (une seule fois).** L'envoi d'une invitation exige la clé secrète de Supabase, qui ne doit jamais se trouver dans le site : elle reste dans une petite fonction serveur.
   1. Supabase → **Edge Functions** → *Deploy a new function* → *Via Editor*. Nom exact : `inviter-membre`.
   2. Collez tout le contenu de `backend/functions/inviter-membre/index.ts` puis *Deploy*.
   3. Ouvrez la fonction → *Details* → désactivez **Verify JWT** (la fonction vérifie elle-même que l'appelant est le président et qu'il a validé la double authentification).
   4. Supabase → Authentication → *URL Configuration* : `https://adresse-du-dashboard/**` doit figurer dans les *Redirect URLs*. Si l'adresse du dashboard change, ajoutez aussi le secret `DASH_URL` de la fonction.
   Sans cette fonction, le dashboard affiche « La fonction d'invitation n'est pas encore installée ». L'envoi d'e-mails du plan gratuit est limité à quelques messages par heure.
3. **Configuration** — dans `js/config.js`, renseignez `supabaseUrl` et `supabaseKey` (clé *anon / publishable*, **jamais** la clé `service_role`).
   Tant que ces deux champs sont vides, le site reste en mode démo.
4. **Hébergement : le site public et le dashboard sont deux déploiements séparés** (deux adresses), qui partagent la **même base de données**
   (la même `supabaseUrl` / `supabaseKey` dans `js/config.js`). Sur Vercel, créez **deux projets à partir du même dépôt GitHub** :

   | | Projet « site » | Projet « dashboard » |
   |---|---|---|
   | Root Directory | `./` | `./` |
   | Application Preset | Other | Other |
   | Build Command (Override) | `node tools/split.js site` | `node tools/split.js dash` |
   | Output Directory (Override) | `dist/site` | `dist/dash` |

   Une fois les deux adresses connues, renseignez-les dans `js/config.js` (`siteUrl` et `dashUrl`) : le site affiche alors le lien « Espace bureau »
   vers le dashboard, et le dashboard le lien « Voir le site ». Le site ne contient **aucun code du dashboard**, et le dashboard n'est pas indexé.
   Puis `node tools/set-domain.js https://adresse-du-site` pour les aperçus WhatsApp.
   *Attention : en mode démo, chaque adresse garde ses données dans son propre navigateur ; le site et le dashboard ne se « parlent » qu'avec la vraie base Supabase.*
5. **Avant le lancement** — renseignez dans *Paramètres* : dates de la campagne, horaires du chat, parking, représentant légal, hébergeur, contact public ;
   remplacez le logo provisoire (`assets/logo.svg`, puis régénérez les PNG avec les modèles de `tools/assets-src/`) ; faites la **séance de formation des modérateurs** ;
   hébergez la page `secours/` ailleurs (plan de secours §22) ; faites un test de charge ; utilisez le projet quelques jours avant le lancement (un projet gratuit inactif est mis en pause).
6. *Facultatif* — tirage automatique : activez `pg_cron` et la ligne commentée en fin de `backend/schema.sql`.

Le fuseau du serveur est UTC, identique à Ouagadougou (UTC+0).

## 3. Écarts entre le cahier et les notes : ce qui a été retenu (les notes l'emportent)

| Sujet | Cahier des charges | Notes orales → **retenu** |
|---|---|---|
| Durée de la campagne | « la semaine de campagne » | **3 jours** (dates modifiables ; la fin se propose à début + 2 jours) |
| Avis sur le bureau | s'ouvre en début de mois (ex. du 1er au 10) | **se déverrouille les derniers jours de chaque mois** (5 derniers jours, réglable) |
| Votes | un vote simple par idée | **j'aime / je n'aime pas** sur les idées, qui peuvent porter une **photo** |

## 4. Autres décisions à valider

- **Clôture : président ET administrateurs** (pas les modérateurs). L'assistant demande de taper « CLOTURER » et prévient si des repas ne sont pas encore remis. Le paramètre `campagne_cloturee` ne peut pas être modifié à la main : seul l'assistant de clôture le change.
- **Journal d'audit et gestion des comptes : président seul** (promesses de vote aussi).
- Le lien « Soutenir le MPPE » est dans le menu *Le MPPE* (pas à côté du tirage), pour garder les deux démarches visiblement séparées (§5.2).
- Les gagnants dont le repas n'est pas encore remis bloquent la clôture sauf confirmation explicite.
- Les inscriptions « à vérifier » (nom très proche, plus de 3 inscriptions par appareil) ne sont jamais tirées au sort avant validation par le bureau.

## 5. Ce qui n'est pas inclus, ou à connaître

- **Captcha (Cloudflare Turnstile)** : non branché. Il exige une vérification côté serveur (Edge Function). Protections actuelles : champ piège, délai minimal de remplissage, limitation de débit, limite par appareil, alerte par IP.
- **Codes de secours 2FA** : Supabase n'en propose pas pour le TOTP. Le président doit enregistrer la double authentification sur **deux appareils**.
- **Exports PDF** (V2) : seuls les exports CSV sont fournis.
- **Visiteurs uniques** : seules les pages vues sont comptées (sans cookie ni donnée personnelle).
- **Temps réel du chat** : actualisation toutes les 5 secondes (mode de secours prévu au §15 bis), pour rester dans les limites du plan gratuit.
- **Pages légales** : textes de l'annexe A à faire relire par le président ; vérifier la conformité avec la réglementation burkinabè.
- Le SQL a été **vérifié syntaxiquement** (parseur PostgreSQL) mais n'a **pas encore été exécuté sur un serveur réel** : l'appliquer d'abord sur un projet de test.

## 6. Outils et tests

```
node --test tests/mock.test.js tests/edge-inviter.test.js   # 30 tests : logique métier (démo) et fonction d'invitation
node tools/build-pages.js          # régénère les 43 pages HTML
node tools/make-seed.js            # régénère backend/seed.sql depuis js/seed-data.js
node tools/set-domain.js <url>     # adresse publique pour les aperçus WhatsApp
node tools/split.js site|dash      # produit dist/site ou dist/dash (déploiements séparés)
```

`tests/e2e.html` rejoue un parcours complet (inscription, chat, idées, avis, tirage, clôture) dans un navigateur.

## 7. Carte du projet

```
index.html … merci.html      pages publiques (23) + 404.html
admin/*.html                 dashboard (19 pages, connexion.html incluse)
css/ js/                     styles et scripts (core.js, admin-core.js, un script par page)
js/mock.js, seed-data.js     mode démo
backend/schema.sql, seed.sql base de données, sécurité (RLS) et fonctions serveur
secours/index.html           page de secours statique
manifest.webmanifest, sw.js  application installable, pages principales hors ligne
```

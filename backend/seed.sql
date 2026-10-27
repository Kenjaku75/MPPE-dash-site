-- Contenu de base de la plateforme. Généré par tools/make-seed.js — ne pas modifier à la main.
begin;

-- Paramètres
insert into public.parametres (cle, valeur) values ('campagne_debut', 'null'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('campagne_fin', 'null'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('campagne_cloturee', 'false'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('parking_jours', '[]'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('parking_lieu', '""'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('parking_heure', '"07:00"'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('parking_places', '100'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('parking_restantes', 'null'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('parking_compteur', 'false'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('chat_debut', '"08:00"'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('chat_fin', '"20:00"'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('chat_force', '"auto"'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('chat_exige_moderateur', 'true'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('limite_messages_active', 'false'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('limite_messages_secondes', '10'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('seuil_signalements', '2'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('numero_gagnant', '"+226 06014444"'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('heure_tirage', '"12:00"'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('tirage_auto', 'false'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('creneaux_repas', '["midi","pause","soir"]'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('validite_repas_jours', '1'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('promesse_active', 'true'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('texte_bandeau', '"Si vous êtes le gagnant du jour, contactez le {numero} et présentez-vous avec une pièce justificative (carte d''étudiant ou CNIB) pour prouver votre identité et recevoir votre repas gratuit à la cantine."'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('whatsapp_numero', '"22674820674"'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('whatsapp_affiche', '"+226 74 82 06 74"'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('whatsapp_message', '"Bonjour, je vous écris depuis le site de campagne du MPPE."'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('whatsapp_horaires', '""'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('avis_derniers_jours', '5'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('avis_force_ouvert', 'false'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('avis_afficher_moyenne', 'true'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('merci_active', 'false'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('merci_texte', '"Merci à toutes et à tous pour votre confiance et votre participation. Le MPPE continue de travailler pour la jeunesse de l''UTM."'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('merci_resultats', '""'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('filieres', '["Informatique","Gestion","Marketing","Comptabilité-Finance","Droit","Commerce international","Réseaux et télécoms","Autre"]'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('annees', '["Licence 1","Licence 2","Licence 3","Master 1","Master 2"]'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('matricule_regex', '""'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('representant', '""'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('contact_public', '""'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('hebergeur', '""'::jsonb) on conflict (cle) do nothing;
insert into public.parametres (cle, valeur) values ('require_2fa', 'true'::jsonb) on conflict (cle) do nothing;

-- Textes du mouvement
insert into public.pages_contenu (slug, titre, corps) values ('mouvement', 'Qui sommes-nous ?', 'Le **Mouvement Patriotique pour le Progrès Estudiantin (MPPE)** présente son bureau à l''élection du délégué général de l''Université de Technologies et de Management (UTM).

Cette plateforme est la nôtre et la vôtre : elle sert à présenter notre vision, à vous donner la parole (boîte à idées, sondages, chat anonyme) et à animer la semaine de campagne.

*Texte à compléter par le bureau depuis le dashboard.*') on conflict (slug) do nothing;
insert into public.pages_contenu (slug, titre, corps) values ('valeurs', 'Nos valeurs', '- **Jeunesse** : une équipe d''étudiants, au service des étudiants.
- **Patriotisme** : la force de la jeunesse, l''avenir du Faso.
- **Progrès** : des projets concrets, suivis et rendus publics.
- **Écoute** : vos idées, vos avis, vos critiques comptent.
- **Transparence** : un bilan régulier de ce qui est fait, et de ce qui reste à faire.') on conflict (slug) do nothing;
insert into public.pages_contenu (slug, titre, corps) values ('histoire', 'Histoire du bureau', '*Présentez ici l''histoire du bureau : comment l''équipe s''est formée, ses premières actions, ce qui la motive.*') on conflict (slug) do nothing;

-- Pages légales
insert into public.pages_legales (slug, titre, corps) values ('mentions-legales', 'Mentions légales', '**Éditeur du site.** Mouvement Patriotique pour le Progrès Estudiantin (MPPE), mouvement étudiant candidat à l''élection du délégué général de l''Université de Technologies et de Management (UTM), Ouagadougou, Burkina Faso.

**Responsable de la publication.** {{representant|nom du président du MPPE}}

**Contact.** {{contact_public|e-mail ou numéro public du bureau}}

**Hébergeur.** {{hebergeur|nom de l''hébergeur}}

**Indépendance.** Ce site est un site de campagne du MPPE. Il est indépendant de l''administration de l''UTM, qui n''en est ni l''éditeur ni le garant. Le site officiel de l''université est www.utmbf.com.

**Propriété intellectuelle.** Le nom, le logo et les contenus du MPPE appartiennent au mouvement. Leur reproduction nécessite son accord.

**Contenus des utilisateurs.** Les messages du chat et les idées engagent leurs auteurs. Le bureau modère après publication et supprime les contenus contraires à la charte. Tout contenu peut être signalé.

**Liens externes.** Les liens vers l''UTM et ses réseaux sociaux sont fournis pour information. Le MPPE n''est pas responsable de leur contenu.') on conflict (slug) do nothing;
insert into public.pages_legales (slug, titre, corps) values ('regles-tirage', 'Règles du tirage au sort', '- **Objet.** Du {{campagne_debut|date de début}} au {{campagne_fin|date de fin}}, un étudiant est tiré au sort chaque jour et reçoit un repas gratuit.
- **Qui peut participer.** Tout étudiant de l''UTM, gratuitement. Participer n''oblige à rien : le tirage est totalement indépendant de toute promesse de vote et n''a aucun lien avec le scrutin.
- **Inscription.** Nom, prénom, filière, année et matricule. Une seule inscription par étudiant, sur le site ou à un point d''inscription sur le campus. Les doublons et les fausses informations entraînent l''exclusion.
- **Tirage.** Un tirage aléatoire par jour, à {{heure_tirage|heure}}, parmi les inscrits n''ayant pas encore gagné. Chaque tirage est enregistré dans un journal.
- **Annonce.** Le nom et le prénom du gagnant sont publiés sur le site, avec le consentement donné à l''inscription.
- **Lot.** Un seul repas par jour. Le gagnant choisit son créneau parmi ceux proposés (midi, pause ou soir). Le lot est personnel, non échangeable et non remplaçable par de l''argent.
- **Retrait.** Le gagnant contacte le numéro {{numero_gagnant|numéro}} et se présente avec une pièce justificative (carte d''étudiant ou CNIB). Le nom doit correspondre à celui annoncé.
- **Délai.** Le lot est valable jusqu''à {{validite|délai}}. Passé ce délai, ou si l''identité n''est pas confirmée, un nouveau tirage peut avoir lieu.
- **Exclusion.** Toute fraude (faux comptes, fausse identité) entraîne l''exclusion et peut annuler le lot.
- **Vote.** Le vote officiel a lieu en présentiel, dans une salle de classe de l''université. Il est libre et secret : recevoir un repas ne vous engage à rien.
- **Réclamations.** Via le formulaire « Besoin d''aide ? », avec une réponse sous 24 heures.
- **Modification.** Ces règles peuvent être modifiées en cas de force majeure, avec une annonce publique.') on conflict (slug) do nothing;
insert into public.pages_legales (slug, titre, corps) values ('confidentialite', 'Politique de confidentialité', '**Qui est responsable ?** Le MPPE, éditeur du site (voir les mentions légales).

## Quelles données ?
- **Inscription au tirage :** nom, prénom, filière, année, matricule. Le matricule n''est conservé que sous forme chiffrée irréversible (hachée), pour empêcher les doublons.
- **Promesse de vote (facultative, formulaire séparé) :** mêmes champs, stockés à part.
- **Chat, idées, sondages et avis sur le bureau :** aucun nom ni compte. Un identifiant technique d''appareil, chiffré, sert uniquement à limiter les abus.
- Aucun numéro de téléphone ni adresse e-mail n''est demandé pour participer. Seul le formulaire facultatif « Rejoindre l''équipe » demande un numéro WhatsApp, utilisé uniquement pour vous contacter et supprimé à la clôture.

**Pourquoi ?** Organiser le tirage, éviter la fraude, modérer les contenus et mesurer la participation. Les données ne servent à aucune autre finalité et ne sont ni vendues ni transmises à des tiers.

**Qui y accède ?** Les membres du bureau habilités. La liste nominative des promesses n''est visible que par le président. Le public voit uniquement le nom et le prénom du gagnant du jour, avec son consentement. Les données sont hébergées chez {{hebergeur|hébergeur}}.

**Combien de temps ?** Les noms liés au tirage et aux promesses sont supprimés à la clôture de la campagne ({{campagne_fin|date de clôture}}). Seuls des totaux anonymes sont conservés.

**Vos droits.** Vous pouvez demander l''accès à vos données, leur correction ou leur suppression à tout moment via le formulaire « Besoin d''aide ? ».

**Sécurité.** Connexion chiffrée (HTTPS), accès restreints, authentification à deux facteurs pour les administrateurs, journal des actions.

**Stockage local.** Le site n''utilise que ce qui est nécessaire à son fonctionnement, sans cookie publicitaire ni suivi.') on conflict (slug) do nothing;
insert into public.pages_legales (slug, titre, corps) values ('charte', 'Charte du chat et de la boîte à idées', '**Bienvenue.** Ici, on débat, on critique et on propose, dans le respect des autres. La critique est autorisée, y compris contre le MPPE.

## Sont interdits
- les insultes, menaces, harcèlement, propos haineux ou discriminatoires ;
- les accusations non prouvées et la diffamation visant une personne ;
- les numéros de téléphone, adresses, liens et moyens de contact (le chat bloque leur envoi) ;
- les informations personnelles sur quelqu''un d''autre ;
- le spam, la publicité et les messages répétés en boucle.

**Modération.** Les messages sont modérés après publication. Deux signalements d''appareils différents masquent automatiquement un message, qu''un modérateur examine ensuite. Un message supprimé est remplacé par la mention « Message supprimé par la modération ». Un message rétabli par la modération ne peut plus être signalé.

**Anonymat.** Le chat ne demande aucun nom et n''est lié à aucun compte. Un appareil abusif peut être bloqué.

**Recours.** Si vous pensez qu''un message a été supprimé à tort, utilisez « Besoin d''aide ? » : réponse sous 24 heures.

**Horaires.** Le chat est ouvert {{chat_horaires|horaires}}. Hors horaires, il est en lecture seule.

**Responsabilité.** Chacun répond de ses propos. Les mêmes règles s''appliquent aux avis mensuels sur le bureau.') on conflict (slug) do nothing;

-- FAQ
insert into public.faq (question, reponse, ordre, visible) values ('Comment participer au tirage au sort ?', 'Rendez-vous sur la page « Tirage » et remplissez le formulaire (nom, prénom, filière, année, numéro de matricule). Chaque jour de la campagne, un inscrit est tiré au sort et gagne son repas à la cantine. Vous pouvez aussi vous inscrire à un point d''inscription sur le campus.', 1, true);
insert into public.faq (question, reponse, ordre, visible) values ('Dois-je soutenir le MPPE pour participer ?', 'Non. Le tirage est ouvert à tous les inscrits, qu''ils soutiennent le MPPE ou non. L''inscription au tirage et la promesse de vote sont deux démarches totalement séparées.', 2, true);
insert into public.faq (question, reponse, ordre, visible) values ('Je suis le gagnant du jour, que dois-je faire ?', 'Appelez le numéro affiché sur la page « Gagnant du jour » et présentez-vous avec votre carte d''étudiant ou votre CNIB : le nom doit correspondre à celui annoncé. Un membre du bureau vous accompagne à la cantine. Vous choisissez votre créneau (midi, pause ou soir).', 3, true);
insert into public.faq (question, reponse, ordre, visible) values ('Que deviennent mes données personnelles ?', 'Seuls votre nom, prénom, filière, année et matricule (conservé sous forme chiffrée irréversible) sont demandés. Aucun téléphone ni e-mail. Les noms liés au tirage et aux promesses sont supprimés à la clôture de la campagne.', 4, true);
insert into public.faq (question, reponse, ordre, visible) values ('Le chat est-il vraiment anonyme ?', 'Oui. Aucun compte, aucun nom : un pseudo automatique vous est attribué. Les numéros de téléphone, liens et insultes sont bloqués. Chaque message peut être signalé ; deux signalements masquent le message en attendant l''avis d''un modérateur.', 5, true);
insert into public.faq (question, reponse, ordre, visible) values ('Mon message a été refusé, pourquoi ?', 'Le chat bloque l''envoi des numéros de téléphone, e-mails, liens, @pseudos, mentions de WhatsApp ou Telegram, ainsi que les insultes. Le motif du refus est affiché. Si vous pensez qu''un message a été supprimé à tort, utilisez « Besoin d''aide ? ».', 6, true);
insert into public.faq (question, reponse, ordre, visible) values ('Mon inscription est bloquée « à vérifier » : que faire ?', 'Certaines inscriptions (nom très proche d''un autre, plusieurs inscriptions depuis le même appareil) sont vérifiées par un membre du bureau. Décrivez votre situation via « Besoin d''aide ? » : un administrateur vérifie et débloque, sous 24 heures.', 7, true);
insert into public.faq (question, reponse, ordre, visible) values ('Le vote se fait-il sur le site ?', 'Non. Le vote officiel a lieu en présentiel, dans une salle de classe de l''université ; il est libre et secret. Le site ne recueille que des promesses de vote, sans valeur officielle.', 8, true);
insert into public.faq (question, reponse, ordre, visible) values ('Comment donner mon avis sur le bureau ?', 'La page « Avis sur le bureau » se déverrouille chaque mois, pendant les derniers jours du mois. Vous notez le travail du bureau, dites ce qui va et ce qui ne va pas ; le bureau répond publiquement.', 9, true);

-- Liens officiels de l'UTM
insert into public.liens_officiels (libelle, url, ordre, visible) values ('Site officiel de l''UTM', 'https://www.utmbf.com', 1, true);
insert into public.liens_officiels (libelle, url, ordre, visible) values ('Facebook', 'https://facebook.com/utm.bf', 2, true);
insert into public.liens_officiels (libelle, url, ordre, visible) values ('Instagram', 'https://instagram.com/utm.bf', 3, true);
insert into public.liens_officiels (libelle, url, ordre, visible) values ('X (ex-Twitter)', 'https://twitter.com/utmouaga', 4, true);
insert into public.liens_officiels (libelle, url, ordre, visible) values ('Actualités estudiantines', 'https://utmbf.com/category/etudiants-fr', 5, true);
insert into public.liens_officiels (libelle, url, ordre, visible) values ('LinkedIn (à renseigner)', 'https://www.linkedin.com/', 6, false);
insert into public.liens_officiels (libelle, url, ordre, visible) values ('YouTube (à renseigner)', 'https://www.youtube.com/', 7, false);

-- Mots interdits du chat
insert into public.mots_interdits (mot) values ('con') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('connard') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('connasse') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('salope') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('pute') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('putain') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('merde') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('enculé') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('enculer') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('fdp') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('ntm') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('batard') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('bâtard') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('abruti') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('crétin') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('imbécile') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('débile') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('idiot') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('ordure') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('salaud') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('pédé') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('nique') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('niquer') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('bouffon') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('trouduc') on conflict (mot) do nothing;
insert into public.mots_interdits (mot) values ('couille') on conflict (mot) do nothing;

commit;

/* Données de départ partagées : mode démo (mock.js) et base réelle (backend/seed.sql, généré par tools/make-seed.js).
   « core » = contenu de base livré avec la plateforme. « demo » = données fictives pour essayer le site. */
(function (root) {
  const S = {};

  S.core = {
    parametres: {
      campagne_debut: null,
      campagne_fin: null,
      campagne_cloturee: false,
      parking_jours: [],
      parking_lieu: '',
      parking_heure: '07:00',
      parking_places: 100,
      parking_restantes: null,
      parking_compteur: false,
      chat_debut: '08:00',
      chat_fin: '20:00',
      chat_force: 'auto',
      chat_exige_moderateur: true,
      limite_messages_active: false,
      limite_messages_secondes: 10,
      seuil_signalements: 2,
      numero_gagnant: '+226 06014444',
      heure_tirage: '12:00',
      tirage_auto: false,
      creneaux_repas: ['midi', 'pause', 'soir'],
      validite_repas_jours: 1,
      promesse_active: true,
      texte_bandeau: "Si vous êtes le gagnant du jour, contactez le {numero} et présentez-vous avec une pièce justificative (carte d'étudiant ou CNIB) pour prouver votre identité et recevoir votre repas gratuit à la cantine.",
      whatsapp_numero: '22674820674',
      whatsapp_affiche: '+226 74 82 06 74',
      whatsapp_message: "Bonjour, je vous écris depuis le site de campagne du MPPE.",
      whatsapp_horaires: '',
      avis_derniers_jours: 5,
      avis_force_ouvert: false,
      avis_afficher_moyenne: true,
      merci_active: false,
      merci_texte: "Merci à toutes et à tous pour votre confiance et votre participation. Le MPPE continue de travailler pour la jeunesse de l'UTM.",
      merci_resultats: '',
      filieres: ['Informatique', 'Gestion', 'Marketing', 'Comptabilité-Finance', 'Droit', 'Commerce international', 'Réseaux et télécoms', 'Autre'],
      annees: ['Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2'],
      matricule_regex: '',
      representant: '',
      contact_public: '',
      hebergeur: '',
      require_2fa: true
    },

    pages_contenu: [
      { slug: 'mouvement', titre: 'Qui sommes-nous ?', corps:
        "Le **Mouvement Patriotique pour le Progrès Estudiantin (MPPE)** présente son bureau à l'élection du délégué général de l'Université de Technologies et de Management (UTM).\n\nCette plateforme est la nôtre et la vôtre : elle sert à présenter notre vision, à vous donner la parole (boîte à idées, sondages, chat anonyme) et à animer la semaine de campagne.\n\n*Texte à compléter par le bureau depuis le dashboard.*" },
      { slug: 'valeurs', titre: 'Nos valeurs', corps:
        "- **Jeunesse** : une équipe d'étudiants, au service des étudiants.\n- **Patriotisme** : la force de la jeunesse, l'avenir du Faso.\n- **Progrès** : des projets concrets, suivis et rendus publics.\n- **Écoute** : vos idées, vos avis, vos critiques comptent.\n- **Transparence** : un bilan régulier de ce qui est fait, et de ce qui reste à faire." },
      { slug: 'histoire', titre: 'Histoire du bureau', corps:
        "*Présentez ici l'histoire du bureau : comment l'équipe s'est formée, ses premières actions, ce qui la motive.*" }
    ],

    faq: [
      { ordre: 1, question: 'Comment participer au tirage au sort ?', reponse: "Rendez-vous sur la page « Tirage » et remplissez le formulaire (nom, prénom, filière, année, numéro de matricule). Chaque jour de la campagne, un inscrit est tiré au sort et gagne son repas à la cantine. Vous pouvez aussi vous inscrire à un point d'inscription sur le campus.", visible: true },
      { ordre: 2, question: 'Dois-je soutenir le MPPE pour participer ?', reponse: "Non. Le tirage est ouvert à tous les inscrits, qu'ils soutiennent le MPPE ou non. L'inscription au tirage et la promesse de vote sont deux démarches totalement séparées.", visible: true },
      { ordre: 3, question: 'Je suis le gagnant du jour, que dois-je faire ?', reponse: "Appelez le numéro affiché sur la page « Gagnant du jour » et présentez-vous avec votre carte d'étudiant ou votre CNIB : le nom doit correspondre à celui annoncé. Un membre du bureau vous accompagne à la cantine. Vous choisissez votre créneau (midi, pause ou soir).", visible: true },
      { ordre: 4, question: 'Que deviennent mes données personnelles ?', reponse: "Seuls votre nom, prénom, filière, année et matricule (conservé sous forme chiffrée irréversible) sont demandés. Aucun téléphone ni e-mail. Les noms liés au tirage et aux promesses sont supprimés à la clôture de la campagne.", visible: true },
      { ordre: 5, question: 'Le chat est-il vraiment anonyme ?', reponse: "Oui. Aucun compte, aucun nom : un pseudo automatique vous est attribué. Les numéros de téléphone, liens et insultes sont bloqués. Chaque message peut être signalé ; deux signalements masquent le message en attendant l'avis d'un modérateur.", visible: true },
      { ordre: 6, question: 'Mon message a été refusé, pourquoi ?', reponse: "Le chat bloque l'envoi des numéros de téléphone, e-mails, liens, @pseudos, mentions de WhatsApp ou Telegram, ainsi que les insultes. Le motif du refus est affiché. Si vous pensez qu'un message a été supprimé à tort, utilisez « Besoin d'aide ? ».", visible: true },
      { ordre: 7, question: "Mon inscription est bloquée « à vérifier » : que faire ?", reponse: "Certaines inscriptions (nom très proche d'un autre, plusieurs inscriptions depuis le même appareil) sont vérifiées par un membre du bureau. Décrivez votre situation via « Besoin d'aide ? » : un administrateur vérifie et débloque, sous 24 heures.", visible: true },
      { ordre: 8, question: 'Le vote se fait-il sur le site ?', reponse: "Non. Le vote officiel a lieu en présentiel, dans une salle de classe de l'université ; il est libre et secret. Le site ne recueille que des promesses de vote, sans valeur officielle.", visible: true },
      { ordre: 9, question: "Comment donner mon avis sur le bureau ?", reponse: "La page « Avis sur le bureau » se déverrouille chaque mois, pendant les derniers jours du mois. Vous notez le travail du bureau, dites ce qui va et ce qui ne va pas ; le bureau répond publiquement.", visible: true }
    ],

    liens_officiels: [
      { ordre: 1, libelle: "Site officiel de l'UTM", url: 'https://www.utmbf.com', visible: true },
      { ordre: 2, libelle: 'Facebook', url: 'https://facebook.com/utm.bf', visible: true },
      { ordre: 3, libelle: 'Instagram', url: 'https://instagram.com/utm.bf', visible: true },
      { ordre: 4, libelle: 'X (ex-Twitter)', url: 'https://twitter.com/utmouaga', visible: true },
      { ordre: 5, libelle: 'Actualités estudiantines', url: 'https://utmbf.com/category/etudiants-fr', visible: true },
      { ordre: 6, libelle: 'LinkedIn (à renseigner)', url: 'https://www.linkedin.com/', visible: false },
      { ordre: 7, libelle: 'YouTube (à renseigner)', url: 'https://www.youtube.com/', visible: false }
    ],

    mots_interdits: ['con', 'connard', 'connasse', 'salope', 'pute', 'putain', 'merde', 'enculé', 'enculer', 'fdp', 'ntm', 'batard', 'bâtard', 'abruti', 'crétin', 'imbécile', 'débile', 'idiot', 'ordure', 'salaud', 'pédé', 'nique', 'niquer', 'bouffon', 'trouduc', 'couille'],

    pages_legales: [
      { slug: 'mentions-legales', titre: 'Mentions légales', corps:
"**Éditeur du site.** Mouvement Patriotique pour le Progrès Estudiantin (MPPE), mouvement étudiant candidat à l'élection du délégué général de l'Université de Technologies et de Management (UTM), Ouagadougou, Burkina Faso.\n\n**Responsable de la publication.** {{representant|nom du président du MPPE}}\n\n**Contact.** {{contact_public|e-mail ou numéro public du bureau}}\n\n**Hébergeur.** {{hebergeur|nom de l'hébergeur}}\n\n**Indépendance.** Ce site est un site de campagne du MPPE. Il est indépendant de l'administration de l'UTM, qui n'en est ni l'éditeur ni le garant. Le site officiel de l'université est www.utmbf.com.\n\n**Propriété intellectuelle.** Le nom, le logo et les contenus du MPPE appartiennent au mouvement. Leur reproduction nécessite son accord.\n\n**Contenus des utilisateurs.** Les messages du chat et les idées engagent leurs auteurs. Le bureau modère après publication et supprime les contenus contraires à la charte. Tout contenu peut être signalé.\n\n**Liens externes.** Les liens vers l'UTM et ses réseaux sociaux sont fournis pour information. Le MPPE n'est pas responsable de leur contenu." },
      { slug: 'regles-tirage', titre: 'Règles du tirage au sort', corps:
"- **Objet.** Du {{campagne_debut|date de début}} au {{campagne_fin|date de fin}}, un étudiant est tiré au sort chaque jour et reçoit un repas gratuit.\n- **Qui peut participer.** Tout étudiant de l'UTM, gratuitement. Participer n'oblige à rien : le tirage est totalement indépendant de toute promesse de vote et n'a aucun lien avec le scrutin.\n- **Inscription.** Nom, prénom, filière, année et matricule. Une seule inscription par étudiant, sur le site ou à un point d'inscription sur le campus. Les doublons et les fausses informations entraînent l'exclusion.\n- **Tirage.** Un tirage aléatoire par jour, à {{heure_tirage|heure}}, parmi les inscrits n'ayant pas encore gagné. Chaque tirage est enregistré dans un journal.\n- **Annonce.** Le nom et le prénom du gagnant sont publiés sur le site, avec le consentement donné à l'inscription.\n- **Lot.** Un seul repas par jour. Le gagnant choisit son créneau parmi ceux proposés (midi, pause ou soir). Le lot est personnel, non échangeable et non remplaçable par de l'argent.\n- **Retrait.** Le gagnant contacte le numéro {{numero_gagnant|numéro}} et se présente avec une pièce justificative (carte d'étudiant ou CNIB). Le nom doit correspondre à celui annoncé.\n- **Délai.** Le lot est valable jusqu'à {{validite|délai}}. Passé ce délai, ou si l'identité n'est pas confirmée, un nouveau tirage peut avoir lieu.\n- **Exclusion.** Toute fraude (faux comptes, fausse identité) entraîne l'exclusion et peut annuler le lot.\n- **Vote.** Le vote officiel a lieu en présentiel, dans une salle de classe de l'université. Il est libre et secret : recevoir un repas ne vous engage à rien.\n- **Réclamations.** Via le formulaire « Besoin d'aide ? », avec une réponse sous 24 heures.\n- **Modification.** Ces règles peuvent être modifiées en cas de force majeure, avec une annonce publique." },
      { slug: 'confidentialite', titre: 'Politique de confidentialité', corps:
"**Qui est responsable ?** Le MPPE, éditeur du site (voir les mentions légales).\n\n## Quelles données ?\n- **Inscription au tirage :** nom, prénom, filière, année, matricule. Le matricule n'est conservé que sous forme chiffrée irréversible (hachée), pour empêcher les doublons.\n- **Promesse de vote (facultative, formulaire séparé) :** mêmes champs, stockés à part.\n- **Chat, idées, sondages et avis sur le bureau :** aucun nom ni compte. Un identifiant technique d'appareil, chiffré, sert uniquement à limiter les abus.\n- Aucun numéro de téléphone ni adresse e-mail n'est demandé pour participer. Seul le formulaire facultatif « Rejoindre l'équipe » demande un numéro WhatsApp, utilisé uniquement pour vous contacter et supprimé à la clôture.\n\n**Pourquoi ?** Organiser le tirage, éviter la fraude, modérer les contenus et mesurer la participation. Les données ne servent à aucune autre finalité et ne sont ni vendues ni transmises à des tiers.\n\n**Qui y accède ?** Les membres du bureau habilités. La liste nominative des promesses n'est visible que par le président. Le public voit uniquement le nom et le prénom du gagnant du jour, avec son consentement. Les données sont hébergées chez {{hebergeur|hébergeur}}.\n\n**Combien de temps ?** Les noms liés au tirage et aux promesses sont supprimés à la clôture de la campagne ({{campagne_fin|date de clôture}}). Seuls des totaux anonymes sont conservés.\n\n**Vos droits.** Vous pouvez demander l'accès à vos données, leur correction ou leur suppression à tout moment via le formulaire « Besoin d'aide ? ».\n\n**Sécurité.** Connexion chiffrée (HTTPS), accès restreints, authentification à deux facteurs pour les administrateurs, journal des actions.\n\n**Stockage local.** Le site n'utilise que ce qui est nécessaire à son fonctionnement, sans cookie publicitaire ni suivi." },
      { slug: 'charte', titre: 'Charte du chat et de la boîte à idées', corps:
"**Bienvenue.** Ici, on débat, on critique et on propose, dans le respect des autres. La critique est autorisée, y compris contre le MPPE.\n\n## Sont interdits\n- les insultes, menaces, harcèlement, propos haineux ou discriminatoires ;\n- les accusations non prouvées et la diffamation visant une personne ;\n- les numéros de téléphone, adresses, liens et moyens de contact (le chat bloque leur envoi) ;\n- les informations personnelles sur quelqu'un d'autre ;\n- le spam, la publicité et les messages répétés en boucle.\n\n**Modération.** Les messages sont modérés après publication. Deux signalements d'appareils différents masquent automatiquement un message, qu'un modérateur examine ensuite. Un message supprimé est remplacé par la mention « Message supprimé par la modération ». Un message rétabli par la modération ne peut plus être signalé.\n\n**Anonymat.** Le chat ne demande aucun nom et n'est lié à aucun compte. Un appareil abusif peut être bloqué.\n\n**Recours.** Si vous pensez qu'un message a été supprimé à tort, utilisez « Besoin d'aide ? » : réponse sous 24 heures.\n\n**Horaires.** Le chat est ouvert {{chat_horaires|horaires}}. Hors horaires, il est en lecture seule.\n\n**Responsabilité.** Chacun répond de ses propos. Les mêmes règles s'appliquent aux avis mensuels sur le bureau." }
    ]
  };

  /* ---------- Données fictives du mode démo uniquement ---------- */
  S.demo = {
    membres_bureau: [
      { prenom: 'Prénom', nom: 'Démo (président)', poste: 'Président', presentation: 'Fiche de démonstration : le président modifie lui-même sa fiche.', ordre: 1, visible: true, est_president: true },
      { prenom: 'Prénom', nom: 'Démo (vice-président)', poste: 'Vice-président', presentation: '', ordre: 2, visible: true, est_president: false },
      { prenom: 'Prénom', nom: 'Démo (secrétaire)', poste: 'Secrétaire générale', presentation: 'Contact principal des associés et bénévoles.', ordre: 3, visible: true, est_president: false },
      { prenom: 'Prénom', nom: 'Démo (trésorier)', poste: 'Trésorier', presentation: '', ordre: 4, visible: true, est_president: false },
      { prenom: 'Prénom', nom: 'Démo (communication)', poste: 'Chargé de communication', presentation: '', ordre: 5, visible: true, est_president: false }
    ],
    projets: [
      { titre: 'Wi-Fi gratuit sur le campus (exemple)', description: 'Étendre la couverture Wi-Fi aux salles de classe et à la cour.', objectif: 'Une connexion stable pour tous les étudiants.', statut: 'prevu', ordre: 1, visible: true },
      { titre: 'Cantine : menus variés (exemple)', description: 'Dialoguer avec la cantine pour diversifier les repas et les prix.', objectif: 'Au moins deux choix de plats par jour.', statut: 'en_cours', ordre: 2, visible: true },
      { titre: 'Club de soutien scolaire (exemple)', description: 'Des séances de révision animées par les étudiants des années supérieures.', objectif: 'Réduire les échecs en première année.', statut: 'prevu', ordre: 3, visible: true },
      { titre: 'Boîte à idées permanente', description: 'Cette plateforme : un lieu pour proposer, voter et suivre les idées retenues.', objectif: 'Chaque idée reçoit une réponse.', statut: 'realise', ordre: 4, visible: true }
    ],
    annonces: [
      { titre: 'Lancement de la plateforme du MPPE', corps: 'La plateforme de campagne est en ligne : tirage quotidien, chat anonyme, boîte à idées et sondages.', publie_at: null, visible: true },
      { titre: 'Opération parking gratuit', corps: "Les 100 premiers étudiants (carte d'étudiant obligatoire) se garent gratuitement. Détails sur la page Parking.", publie_at: null, visible: true }
    ],
    participants_noms: [
      ['Ouédraogo', 'Aïcha', 'Informatique', 'Licence 2'], ['Traoré', 'Moussa', 'Gestion', 'Licence 1'], ['Sawadogo', 'Fatimata', 'Marketing', 'Licence 3'],
      ['Kaboré', 'Issouf', 'Droit', 'Master 1'], ['Zongo', 'Mariam', 'Comptabilité-Finance', 'Licence 2'], ['Compaoré', 'Abdoul', 'Informatique', 'Licence 3'],
      ['Sankara', 'Estelle', 'Commerce international', 'Licence 1'], ['Nikiéma', 'Hamidou', 'Réseaux et télécoms', 'Master 2'], ['Sié', 'Rasmata', 'Gestion', 'Licence 2'],
      ['Bambara', 'Yacouba', 'Informatique', 'Licence 1'], ['Tapsoba', 'Clarisse', 'Marketing', 'Licence 2'], ['Ilboudo', 'Boureima', 'Droit', 'Licence 3']
    ],
    idees: [
      { titre: 'Plus de prises électriques dans les salles', description: 'Beaucoup de laptops, très peu de prises. Quelques multiprises suffiraient.', categorie: 'infrastructures', auteur: '', statut: 'a_etude', likes: 18, dislikes: 1 },
      { titre: 'Un menu étudiant à prix fixe à la cantine', description: 'Plat + boisson à un prix unique, connu à l\'avance.', categorie: 'restauration', auteur: '', statut: 'recue', likes: 24, dislikes: 3 },
      { titre: 'Un hackathon inter-filières', description: 'Un week-end de projets numériques ouvert à toutes les filières.', categorie: 'vie associative', auteur: 'Un étudiant en informatique', statut: 'retenue', likes: 12, dislikes: 0 },
      { titre: 'Annales des examens en ligne', description: 'Un espace où déposer et consulter les anciens sujets.', categorie: 'numérique', auteur: '', statut: 'recue', likes: 9, dislikes: 2 }
    ],
    chat: [
      { pseudo: 'Anonyme-7K2P', contenu: 'Bonjour à tous, quelqu\'un connaît les horaires de la bibliothèque ?' },
      { pseudo: 'Anonyme-Q81X', contenu: 'Ouverte jusqu\'à 18h normalement.' },
      { pseudo: 'Anonyme-M3D9', contenu: 'Le tirage de demain, c\'est à quelle heure ?' }
    ],
    sondages: [
      { question: 'Quelle priorité pour le prochain semestre ?', type: 'unique', options: ['Wi-Fi sur le campus', 'Cantine', 'Soutien scolaire', 'Vie associative'], afficher_resultats: true },
      { question: 'Comment trouvez-vous la communication du bureau ?', type: 'echelle', options: [], afficher_resultats: true }
    ],
    evenements: [
      { titre: 'Rencontre avec les étudiants', lieu: 'Cour principale', description: 'Venez poser vos questions à l\'équipe du MPPE.', categorie: 'rencontre', jours: 1, heure: '10:00' },
      { titre: 'Point d\'inscription au tirage', lieu: 'Devant la cantine', description: 'Inscrivez-vous avec votre carte d\'étudiant.', categorie: 'point_inscription', jours: 0, heure: '09:00' }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = S;
  else root.MPP_SEED = S;
})(typeof window !== 'undefined' ? window : this);

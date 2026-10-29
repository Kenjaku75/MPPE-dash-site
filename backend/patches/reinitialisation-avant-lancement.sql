-- =====================================================================
--  RÉINITIALISATION AVANT LE LANCEMENT
--  À lancer UNE SEULE FOIS, quand les tests sont terminés et AVANT l'ouverture officielle de la campagne
--  (Supabase > SQL Editor > Run).
--
--  ⚠ EFFACE toutes les données de campagne : inscriptions, tirages, promesses, messages du chat, idées et votes,
--    avis et réponses, demandes d'aide, bénévoles, appareils bloqués, compteur de visites et journal d'audit.
--  ✔ CONSERVE tout le reste : paramètres (dates, horaires, numéros), textes et pages légales, FAQ, liens, équipe,
--    projets, annonces, agenda, sondages (sans leurs réponses), mots interdits, points d'inscription, comptes du bureau.
--  ✘ NE JAMAIS LANCER PENDANT LA CAMPAGNE : tout serait perdu, sans retour possible.
-- =====================================================================
begin;
select set_config('mpp.silencieux', '1', true);

truncate table
  public.tirages, public.participants, public.promesses, public.signalements,
  public.chat_messages, public.idees_votes, public.idees,
  public.sondage_reponses, public.avis_reponses, public.avis_bureau, public.bilans_mensuels,
  public.demandes_aide, public.benevoles, public.appareils_bloques, public.presence_moderateurs,
  public.visites, public.audit_logs
  restart identity;

truncate table private.tentatives;

-- Si une clôture de test a été faite : la campagne redevient ouverte et les totaux de test sont retirés
update public.parametres set valeur = 'false'::jsonb where cle = 'campagne_cloturee';
delete from public.parametres where cle = 'cloture_totaux';

commit;

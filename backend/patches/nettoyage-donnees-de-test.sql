-- Supprime les données de TEST créées pendant la mise en service (inscription « Test Verification », idée « Test de mise en service »,
-- demande d'aide, bénévole, avis de test, compteur de visites de test). À coller dans Supabase > SQL Editor > Run, UNE FOIS.
-- Ne touche à aucune autre donnée.
delete from public.signalements where type = 'idee' and cible_id in (select id from public.idees where titre = 'Test de mise en service');
delete from public.idees where titre = 'Test de mise en service';
delete from public.participants where prenom = 'Test' and nom like 'Verificat%';
delete from public.demandes_aide where message like 'Test de mise en service%';
delete from public.benevoles where nom = 'Verification' and prenom = 'Test';
delete from public.signalements where type = 'avis' and cible_id in (select id from public.avis_bureau where commentaire = 'Test de mise en service');
delete from public.avis_bureau where commentaire = 'Test de mise en service';
delete from public.visites where page = 'test';
delete from private.tentatives;

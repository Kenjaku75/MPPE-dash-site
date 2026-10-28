-- =====================================================================
--  INSTALLATION COMPLÈTE de la base du MPPE (schéma + contenu de base) — à coller UNE FOIS dans Supabase > SQL Editor > Run
--
--  >>> AVANT DE LANCER : cherchez la ligne  'president@exemple.com'  plus bas et remplacez-la par l'e-mail réel du PRÉSIDENT. <<<
--  Puis, dans Authentication > Users, invitez cette adresse : ce compte devient automatiquement « président ».
--  Fichier généré par tools/make-installer.js — ne pas modifier à la main (modifier schema.sql / seed.sql puis relancer l'outil).
-- =====================================================================

-- =====================================================================
--  Plateforme de campagne du MPPE — schéma Supabase (PostgreSQL)
--  À exécuter une seule fois dans l'éditeur SQL d'un projet Supabase DÉDIÉ,
--  puis exécuter backend/seed.sql (contenu de base).
--  Fuseau : le serveur est en UTC, ce qui correspond à l'heure de Ouagadougou (UTC+0).
-- =====================================================================

create extension if not exists pgcrypto  with schema extensions;
create extension if not exists unaccent  with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;

create schema if not exists private;

-- ---------------------------------------------------------------------
-- 0. Secrets et outils internes (jamais exposés par l'API)
-- ---------------------------------------------------------------------
create table if not exists private.secrets (key text primary key, value text not null);
insert into private.secrets (key, value) values ('salt', encode(extensions.gen_random_bytes(16), 'hex'))
  on conflict (key) do nothing;

-- >>> À MODIFIER AVANT D'EXÉCUTER CE SCRIPT : remplacez l'adresse ci-dessous par l'e-mail du compte du PRÉSIDENT.
-- Le compte créé avec cette adresse devient automatiquement « président » (adresse volontairement absente du dépôt public).
insert into private.secrets (key, value) values ('president_email', 'president@exemple.com')
  on conflict (key) do nothing;

create table if not exists private.tentatives (
  id bigint generated always as identity primary key,
  device_hash text, action text, at timestamptz not null default now()
);
create index if not exists tentatives_idx on private.tentatives (device_hash, action, at);

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table public.parametres (
  cle text primary key,
  valeur jsonb not null,
  maj_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  email text not null,
  nom_affiche text,
  poste text,
  role text not null check (role in ('president', 'admin', 'moderateur')),
  created_at timestamptz not null default now()
);
create unique index admins_un_president on public.admins ((role)) where role = 'president';

create table public.membres_bureau (
  id bigint generated always as identity primary key,
  prenom text not null,
  nom text not null,
  poste text not null,
  photo_url text,
  presentation text,
  ordre int not null default 0,
  visible boolean not null default true,
  est_president boolean not null default false,
  mis_a_jour_par uuid,
  updated_at timestamptz not null default now()
);
create unique index membres_un_president on public.membres_bureau ((est_president)) where est_president;

create table public.projets (
  id bigint generated always as identity primary key,
  titre text not null,
  description text,
  objectif text,
  statut text not null default 'prevu' check (statut in ('prevu', 'en_cours', 'realise')),
  ordre int not null default 0,
  visible boolean not null default true
);

create table public.annonces (
  id bigint generated always as identity primary key,
  titre text not null,
  corps text,
  publie_at timestamptz not null default now(),
  visible boolean not null default true
);

create table public.faq (
  id bigint generated always as identity primary key,
  question text not null,
  reponse text not null,
  ordre int not null default 0,
  visible boolean not null default true
);

create table public.liens_officiels (
  id bigint generated always as identity primary key,
  libelle text not null,
  url text not null,
  ordre int not null default 0,
  visible boolean not null default true
);

create table public.evenements (
  id bigint generated always as identity primary key,
  titre text not null,
  debut timestamptz not null,
  fin timestamptz,
  lieu text,
  description text,
  categorie text not null default 'autre'
    check (categorie in ('rencontre', 'tirage', 'parking', 'point_inscription', 'autre')),
  visible boolean not null default true
);

create table public.pages_legales (
  slug text primary key,
  titre text not null,
  corps text not null,
  maj_at timestamptz not null default now()
);

create table public.pages_contenu (
  slug text primary key,
  titre text not null,
  corps text not null,
  maj_at timestamptz not null default now()
);

create table public.points_inscription (
  id bigint generated always as identity primary key,
  nom text not null,
  lieu text,
  horaires text,
  actif boolean not null default true,
  code_hash text
);

create table public.participants (
  id bigint generated always as identity primary key,
  nom text not null,
  prenom text not null,
  filiere text not null,
  annee text not null,
  matricule_hash text not null unique,
  nom_cle text not null,
  phon_cle text,
  device_hash text,
  ip_hash text,
  consentement_at timestamptz not null default now(),
  statut text not null default 'valide' check (statut in ('valide', 'a_verifier', 'verifie', 'rejete')),
  note text,
  canal text not null default 'site' check (canal in ('site', 'stand')),
  point_id bigint references public.points_inscription on delete set null,
  operateur text,
  carte_verifiee boolean not null default false,
  created_at timestamptz not null default now()
);
create index participants_cle on public.participants (nom_cle);
create index participants_dev on public.participants (device_hash);

create table public.tirages (
  id bigint generated always as identity primary key,
  jour date not null,
  gagnant_id bigint references public.participants on delete set null,
  gagnant_label text,
  nb_eligibles int not null,
  creneau_repas text,
  statut_repas text not null default 'en_attente' check (statut_repas in ('en_attente', 'remis', 'expire')),
  valide_jusqu_au timestamptz,
  statut text not null default 'actif' check (statut in ('actif', 'annule')),
  motif_annulation text,
  declenche_par uuid,
  created_at timestamptz not null default now()
);
create unique index tirages_un_par_jour on public.tirages (jour) where statut = 'actif';

create table public.promesses (
  id bigint generated always as identity primary key,
  nom text not null,
  prenom text not null,
  filiere text not null,
  annee text not null,
  matricule_hash text not null unique,
  device_hash text,
  consentement_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  pseudo text not null,
  contenu text not null,
  device_hash text,
  statut text not null default 'visible' check (statut in ('visible', 'masque', 'supprime')),
  nb_signalements int not null default 0,
  motif_suppression text,
  supprime_par uuid,
  officiel boolean not null default false,
  poste text,
  epingle boolean not null default false,
  retabli boolean not null default false,
  created_at timestamptz not null default now(),
  maj_at timestamptz not null default now()
);
create index chat_maj on public.chat_messages (maj_at);

create table public.signalements (
  id bigint generated always as identity primary key,
  type text not null check (type in ('chat', 'idee', 'avis')),
  cible_id bigint not null,
  device_hash text not null,
  created_at timestamptz not null default now(),
  unique (type, cible_id, device_hash)
);

create table public.idees (
  id bigint generated always as identity primary key,
  titre text not null,
  description text not null,
  categorie text not null,
  auteur text,
  photo_url text,
  device_hash text,
  statut text not null default 'recue'
    check (statut in ('recue', 'a_etude', 'retenue', 'realisee', 'non_retenue')),
  motif text,
  projet_id bigint references public.projets on delete set null,
  masquee boolean not null default false,
  retablie boolean not null default false,
  nb_signalements int not null default 0,
  created_at timestamptz not null default now(),
  maj_at timestamptz not null default now()
);

create table public.idees_votes (
  idee_id bigint not null references public.idees on delete cascade,
  device_hash text not null,
  valeur smallint not null check (valeur in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (idee_id, device_hash)
);

create table public.sondages (
  id bigint generated always as identity primary key,
  question text not null,
  type text not null check (type in ('unique', 'multiple', 'echelle')),
  options jsonb not null default '[]',
  ouvre_at timestamptz,
  ferme_at timestamptz,
  afficher_resultats boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sondage_reponses (
  sondage_id bigint not null references public.sondages on delete cascade,
  device_hash text not null,
  reponse jsonb not null,
  created_at timestamptz not null default now(),
  primary key (sondage_id, device_hash)
);

create table public.avis_bureau (
  id bigint generated always as identity primary key,
  mois text not null,
  note_globale smallint not null check (note_globale between 1 and 5),
  notes_themes jsonb not null default '{}',
  commentaire text,
  attente_mois_suivant text,
  device_hash text not null,
  statut text not null default 'visible' check (statut in ('visible', 'masque', 'a_examiner')),
  motif_masquage text,
  retabli boolean not null default false,
  nb_signalements int not null default 0,
  created_at timestamptz not null default now(),
  unique (mois, device_hash)
);

create table public.avis_reponses (
  id bigint generated always as identity primary key,
  avis_id bigint not null references public.avis_bureau on delete cascade,
  auteur_id uuid default auth.uid(),
  auteur_nom text,
  auteur_poste text,
  texte text not null,
  created_at timestamptz not null default now(),
  modifie_at timestamptz
);

create table public.bilans_mensuels (
  id bigint generated always as identity primary key,
  mois text not null unique,
  texte text not null,
  publie_par uuid default auth.uid(),
  publie_at timestamptz not null default now()
);

create table public.demandes_aide (
  id bigint generated always as identity primary key,
  type text not null default 'autre'
    check (type in ('doublon', 'message_supprime', 'tirage', 'suppression_donnees', 'autre')),
  message text not null,
  contact text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'traite')),
  traite_par uuid,
  note text,
  created_at timestamptz not null default now()
);

create table public.benevoles (
  id bigint generated always as identity primary key,
  nom text not null,
  prenom text not null,
  filiere text,
  annee text,
  whatsapp text,
  domaines text[] not null default '{}',
  disponibilites text,
  message text,
  statut text not null default 'nouveau' check (statut in ('nouveau', 'contacte', 'accepte', 'refuse')),
  notes text,
  consentement_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.creneaux_moderation (
  id bigint generated always as identity primary key,
  jour date not null,
  debut time not null,
  fin time not null,
  moderateur text not null,
  remplacant text
);

create table public.mots_interdits (
  id bigint generated always as identity primary key,
  mot text not null unique,
  mot_norm text not null default ''
);

create table public.appareils_bloques (
  device_hash text primary key,
  motif text,
  bloque_par uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.presence_moderateurs (
  user_id uuid primary key,
  vu_at timestamptz not null default now()
);

create table public.visites (
  jour date not null,
  page text not null,
  n int not null default 0,
  primary key (jour, page)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  acteur uuid,
  acteur_email text,
  role text,
  action text not null,
  cible text,
  detail jsonb not null default '{}'
);
create index audit_at on public.audit_logs (at desc);

-- ---------------------------------------------------------------------
-- 2. Fonctions utilitaires
-- ---------------------------------------------------------------------
create or replace function private.p_text(k text, d text default null) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select valeur #>> '{}' from parametres where cle = k), d)
$$;

create or replace function private.p_int(k text, d int) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(nullif((select valeur #>> '{}' from parametres where cle = k), '')::int, d)
$$;

create or replace function private.p_bool(k text, d boolean) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(nullif((select valeur #>> '{}' from parametres where cle = k), '')::boolean, d)
$$;

create or replace function private.param_json(k text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select valeur from parametres where cle = k), '[]'::jsonb)
$$;

create or replace function private.hash(p text) returns text
language sql stable security definer set search_path = public, extensions, private, pg_temp as $$
  select encode(extensions.digest((select value from private.secrets where key = 'salt') || coalesce(p, ''), 'sha256'), 'hex')
$$;

create or replace function private.clean(p text, n int) returns text
language sql immutable as $$
  select left(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), n)
$$;

create or replace function private.norm_nom(p text) returns text
language sql stable set search_path = public, extensions, pg_temp as $$
  select regexp_replace(lower(unaccent(coalesce(p, ''))), '[^a-z0-9]', '', 'g')
$$;

-- clé d'identité indépendante de l'ordre nom/prénom, des accents, espaces et tirets
create or replace function private.cle_nom(p_nom text, p_prenom text) returns text
language sql stable set search_path = public, extensions, private, pg_temp as $$
  select least(private.norm_nom(p_nom), private.norm_nom(p_prenom)) || '|' ||
         greatest(private.norm_nom(p_nom), private.norm_nom(p_prenom))
$$;

create or replace function private.cle_phon(p_nom text, p_prenom text) returns text
language sql stable set search_path = public, extensions, private, pg_temp as $$
  select least(dmetaphone(private.norm_nom(p_nom)), dmetaphone(private.norm_nom(p_prenom))) || '|' ||
         greatest(dmetaphone(private.norm_nom(p_nom)), dmetaphone(private.norm_nom(p_prenom)))
$$;

-- Limitation de débit : renvoie false si la limite est atteinte, sinon enregistre la tentative
create or replace function private.rate_ok(p_dev text, p_action text, p_max int, p_window interval) returns boolean
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare n int;
begin
  select count(*) into n from private.tentatives
   where device_hash = p_dev and action = p_action and at > now() - p_window;
  if n >= p_max then return false; end if;
  insert into private.tentatives (device_hash, action) values (p_dev, p_action);
  if random() < 0.02 then delete from private.tentatives where at < now() - interval '2 days'; end if;
  return true;
end $$;

-- Filtre n°1 (contacts) et n°2 (insultes). Renvoie le motif de refus ou null.
create or replace function private.check_text(p_text text, p_contacts boolean default true) returns text
language plpgsql stable security definer set search_path = public, extensions, private, pg_temp as $$
declare
  t text := coalesce(p_text, '');
  n text;
  tokens text[];
  squashed text;
begin
  n := lower(unaccent(t));
  if p_contacts then
    if t ~ '(\+?[0-9][ .()/-]*){7,}' then return 'numero'; end if;
    if n ~ '(\m(zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)\M[ ,.-]*){5,}' then return 'numero'; end if;
    if n ~ '(^|\s)@[a-z0-9_.]{2,}' then return 'pseudo'; end if;
    if n ~ '[a-z0-9._%+-]+ ?(@|\(at\)|\[at\]|arobase) ?[a-z0-9.-]+' then return 'email'; end if;
    if n ~ '(https?://|www\.|wa\.me|t\.me)' or n ~ '\m[a-z0-9-]+\.(com|net|org|bf|fr|io|me|co|app|xyz|info)\M' then return 'lien'; end if;
    if n ~ 'whats? ?app|watsap|telegram' then return 'messagerie'; end if;
  end if;
  n := translate(n, '013457@$!', 'oieastasi');
  tokens := regexp_split_to_array(btrim(regexp_replace(n, '[^a-z]+', ' ', 'g')), ' +');
  squashed := regexp_replace(regexp_replace(n, '[^a-z]', '', 'g'), '(.)\1+', '\1', 'g');
  if exists (
    select 1 from mots_interdits m
     where m.mot_norm <> ''
       and ( exists (select 1 from unnest(tokens) tk
                      where tk <> ''
                        and (regexp_replace(tk, '(.)\1+', '\1', 'g') = m.mot_norm
                             or regexp_replace(regexp_replace(tk, 's$', ''), '(.)\1+', '\1', 'g') = m.mot_norm))
             or (length(m.mot_norm) >= 6 and squashed like '%' || m.mot_norm || '%') )
  ) then
    return 'insulte';
  end if;
  return null;
end $$;

create or replace function private.message_refus(p_motif text) returns text
language sql immutable as $$
  select case p_motif
    when 'numero' then 'Les numéros de téléphone ne sont pas autorisés ici.'
    when 'email' then 'Les adresses e-mail ne sont pas autorisées ici.'
    when 'lien' then 'Les liens ne sont pas autorisés ici.'
    when 'pseudo' then 'Les @pseudos ne sont pas autorisés ici.'
    when 'messagerie' then 'Les mentions de WhatsApp ou Telegram ne sont pas autorisées ici.'
    else 'Ce texte contient des termes interdits par la charte.' end
$$;

-- Raison de fermeture du chat (null = ouvert)
create or replace function private.chat_motif_ferme() returns text
language plpgsql stable security definer set search_path = public, private, pg_temp as $$
declare f text := private.p_text('chat_force', 'auto'); s time; e time;
begin
  if f = 'ferme' then return 'ferme_manuel'; end if;
  if private.p_bool('chat_exige_moderateur', true)
     and not exists (select 1 from presence_moderateurs where vu_at > now() - interval '3 minutes') then
    return 'pas_de_moderateur';
  end if;
  if f = 'ouvert' then return null; end if;
  s := private.p_text('chat_debut', '08:00')::time;
  e := private.p_text('chat_fin', '20:00')::time;
  if localtime < s or localtime > e then return 'hors_horaires'; end if;
  return null;
end $$;

-- Rôles
create or replace function private.role_of() returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select role from admins where user_id = auth.uid()
$$;

create or replace function private.mfa_ok() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select private.p_bool('require_2fa', true) is false or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select private.role_of() is not null and private.mfa_ok()
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select private.role_of() in ('president', 'admin') and private.mfa_ok()
$$;
create or replace function public.is_president() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select private.role_of() = 'president' and private.mfa_ok()
$$;

-- Journal d'audit
create or replace function private.log(p_action text, p_cible text default null, p_detail jsonb default '{}') returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into audit_logs (acteur, acteur_email, role, action, cible, detail)
  select auth.uid(), (select email from admins where user_id = auth.uid()), private.role_of(), p_action, p_cible, coalesce(p_detail, '{}')
$$;

create or replace function public.log_audit(p_action text, p_cible text default null, p_detail jsonb default '{}') returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if public.is_staff() then perform private.log(p_action, p_cible, p_detail); end if;
end $$;

-- Déclencheurs
create or replace function private.audit_trg() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare j_new jsonb; j_old jsonb; cols text[]; cid text;
begin
  if auth.uid() is null or current_setting('mpp.silencieux', true) = '1' then return coalesce(new, old); end if;
  j_new := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  j_old := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  cid := coalesce(j_new ->> 'id', j_old ->> 'id', j_new ->> 'cle', j_old ->> 'cle', j_new ->> 'slug', j_old ->> 'slug', j_new ->> 'device_hash', j_old ->> 'device_hash');
  if tg_op = 'UPDATE' then
    select array_agg(key) into cols from jsonb_each(j_new) where j_old -> key is distinct from value;
    if cols is null then return new; end if;
  end if;
  perform private.log(tg_table_name || '.' || lower(tg_op), cid, jsonb_build_object('colonnes', to_jsonb(cols)));
  return coalesce(new, old);
end $$;

create or replace function private.touch_maj() returns trigger language plpgsql as $$
begin new.maj_at := now(); return new; end $$;

create or replace function private.touch_updated() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function private.guard_param() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_cle text;
begin
  v_cle := case when tg_op = 'DELETE' then old.cle else new.cle end;
  -- « campagne_cloturee » ne change que par la fonction close_campaign (qui lève ce garde-fou le temps de la clôture)
  if auth.uid() is not null and v_cle in ('require_2fa', 'campagne_cloturee', 'merci_active')
     and not (v_cle = 'campagne_cloturee' and current_setting('mpp.cloture', true) = '1')
     and not public.is_president() then
    raise exception 'Ce paramètre est réservé au président.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.maj_at := now();
  return new;
end $$;

create or replace function private.mot_norm_trg() returns trigger
language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  new.mot := btrim(lower(new.mot));
  new.mot_norm := regexp_replace(regexp_replace(translate(lower(unaccent(new.mot)), '013457@$!', 'oieastasi'), '[^a-z]', '', 'g'), '(.)\1+', '\1', 'g');
  return new;
end $$;

create or replace function private.reponse_avis_trg() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    select coalesce(nom_affiche, email), poste into new.auteur_nom, new.auteur_poste from admins where user_id = auth.uid();
    new.auteur_id := auth.uid();
  else
    new.modifie_at := now();
  end if;
  return new;
end $$;

create trigger t_param_guard before insert or update or delete on public.parametres
  for each row execute function private.guard_param();
create trigger t_pages_legales_maj before update on public.pages_legales for each row execute function private.touch_maj();
create trigger t_pages_contenu_maj before update on public.pages_contenu for each row execute function private.touch_maj();
create trigger t_chat_maj before update on public.chat_messages for each row execute function private.touch_maj();
create trigger t_idees_maj before update on public.idees for each row execute function private.touch_maj();
create trigger t_membres_maj before update on public.membres_bureau for each row execute function private.touch_updated();
create trigger t_mots_norm before insert or update on public.mots_interdits for each row execute function private.mot_norm_trg();
create trigger t_reponse_avis before insert or update on public.avis_reponses for each row execute function private.reponse_avis_trg();

do $$
declare t text;
begin
  foreach t in array array['parametres', 'projets', 'annonces', 'faq', 'liens_officiels', 'evenements', 'pages_legales',
    'pages_contenu', 'points_inscription', 'participants', 'tirages', 'chat_messages', 'idees', 'sondages', 'avis_bureau',
    'avis_reponses', 'bilans_mensuels', 'demandes_aide', 'benevoles', 'creneaux_moderation', 'mots_interdits', 'appareils_bloques']
  loop
    execute format('create trigger t_audit after insert or update or delete on public.%I for each row execute function private.audit_trg()', t);
  end loop;
end $$;

-- Le compte du président est reconnu à sa première connexion
create or replace function private.bootstrap_president() returns trigger
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if lower(new.email) = lower((select value from private.secrets where key = 'president_email'))
     and not exists (select 1 from admins where role = 'president') then
    insert into admins (user_id, email, nom_affiche, poste, role)
    values (new.id, new.email, 'Président', 'Président', 'president') on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists mpp_bootstrap_president on auth.users;
create trigger mpp_bootstrap_president after insert on auth.users
  for each row execute function private.bootstrap_president();

-- Si le compte du président existait déjà avant ce script : se connecter puis appeler  select public.claim_president();
create or replace function public.claim_president() returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_email text := (auth.jwt() ->> 'email');
begin
  if auth.uid() is null or lower(coalesce(v_email, '')) <> lower(coalesce((select value from private.secrets where key = 'president_email'), '')) then
    return jsonb_build_object('ok', false, 'message', 'Compte non autorisé.');
  end if;
  if exists (select 1 from admins where role = 'president') then
    return jsonb_build_object('ok', false, 'message', 'Un président est déjà enregistré.');
  end if;
  insert into admins (user_id, email, nom_affiche, poste, role)
  values (auth.uid(), v_email, 'Président', 'Président', 'president')
  on conflict (user_id) do update set role = 'president';
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- 3. Vues publiques (colonnes sûres uniquement)
-- ---------------------------------------------------------------------
create view public.chat_public as
  select id, pseudo,
         case when statut = 'visible' then contenu end as contenu,
         statut, officiel, poste, epingle, retabli, created_at, maj_at
    from public.chat_messages;

create view public.idees_public as
  select i.id, i.titre, i.description, i.categorie, i.auteur, i.photo_url, i.statut, i.motif, i.projet_id,
         i.retablie, i.created_at,
         (select count(*) from public.idees_votes v where v.idee_id = i.id and v.valeur = 1)  as likes,
         (select count(*) from public.idees_votes v where v.idee_id = i.id and v.valeur = -1) as dislikes,
         (select coalesce(sum(v.valeur), 0) from public.idees_votes v where v.idee_id = i.id) as score
    from public.idees i
   where not i.masquee;

create view public.gagnants_public as
  select t.id, t.jour, t.gagnant_label as nom_affiche, t.statut_repas, t.valide_jusqu_au
    from public.tirages t
   where t.statut = 'actif' and t.gagnant_label is not null
     and not private.p_bool('campagne_cloturee', false);

create view public.avis_public as
  select id, mois, note_globale, notes_themes, commentaire, attente_mois_suivant, created_at
    from public.avis_bureau
   where statut = 'visible';

-- ---------------------------------------------------------------------
-- 4. Sécurité au niveau des lignes (RLS)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Lecture publique (contenus visibles)
create policy pub_param on public.parametres for select to anon, authenticated using (true);
create policy pub_membres on public.membres_bureau for select to anon, authenticated using (visible);
create policy pub_projets on public.projets for select to anon, authenticated using (visible);
create policy pub_annonces on public.annonces for select to anon, authenticated using (visible);
create policy pub_faq on public.faq for select to anon, authenticated using (visible);
create policy pub_liens on public.liens_officiels for select to anon, authenticated using (visible);
create policy pub_events on public.evenements for select to anon, authenticated using (visible);
create policy pub_legales on public.pages_legales for select to anon, authenticated using (true);
create policy pub_contenu on public.pages_contenu for select to anon, authenticated using (true);
create policy pub_sondages on public.sondages for select to anon, authenticated using (ouvre_at is not null and ouvre_at <= now());
create policy pub_avis_rep on public.avis_reponses for select to anon, authenticated using (true);
create policy pub_bilans on public.bilans_mensuels for select to anon, authenticated using (true);

-- Administrateurs et président : écriture sur les contenus
do $$
declare t text;
begin
  foreach t in array array['parametres', 'projets', 'annonces', 'faq', 'liens_officiels', 'evenements', 'pages_legales',
    'pages_contenu', 'points_inscription', 'sondages', 'avis_reponses', 'bilans_mensuels', 'demandes_aide', 'benevoles',
    'creneaux_moderation', 'mots_interdits', 'participants', 'tirages', 'avis_bureau']
  loop
    execute format('create policy adm_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Lecture admin de tout le reste
create policy adm_membres on public.membres_bureau for select to authenticated using (public.is_admin());
create policy adm_reponses_sondage on public.sondage_reponses for select to authenticated using (public.is_admin());
create policy adm_visites on public.visites for select to authenticated using (public.is_admin());

-- Modérateurs, administrateurs, président
create policy staff_chat_sel on public.chat_messages for select to authenticated using (public.is_staff());
create policy staff_chat_upd on public.chat_messages for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_idees_sel on public.idees for select to authenticated using (public.is_staff());
create policy staff_idees_upd on public.idees for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy adm_idees_del on public.idees for delete to authenticated using (public.is_admin());
create policy staff_votes on public.idees_votes for select to authenticated using (public.is_staff());
create policy staff_signal on public.signalements for select to authenticated using (public.is_staff());
create policy staff_avis_sel on public.avis_bureau for select to authenticated using (public.is_staff());
create policy staff_mots_sel on public.mots_interdits for select to authenticated using (public.is_staff());
create policy staff_creneaux_sel on public.creneaux_moderation for select to authenticated using (public.is_staff());
create policy staff_bloques_all on public.appareils_bloques for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Comptes du bureau
create policy admins_soi on public.admins for select to authenticated using (user_id = auth.uid() or public.is_staff());

-- Liste nominative des promesses : président uniquement
create policy pres_promesses on public.promesses for select to authenticated using (public.is_president());

-- Journal d'audit : président uniquement
create policy pres_audit on public.audit_logs for select to authenticated using (public.is_president());

-- Vues
grant select on public.chat_public, public.idees_public, public.gagnants_public, public.avis_public to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Fonctions publiques (RPC) — toute écriture anonyme passe par ici
-- ---------------------------------------------------------------------
create or replace function public.hit(p_page text) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into visites (jour, page, n) values (current_date, left(coalesce(p_page, 'index'), 40), 1)
  on conflict (jour, page) do update set n = visites.n + 1
$$;

create or replace function public.chat_status() returns jsonb
language plpgsql stable security definer set search_path = public, private, pg_temp as $$
declare m text := private.chat_motif_ferme();
begin
  return jsonb_build_object('ouvert', m is null, 'raison', m,
    'debut', private.p_text('chat_debut', '08:00'), 'fin', private.p_text('chat_fin', '20:00'));
end $$;

create or replace function public.avis_status() returns jsonb
language plpgsql stable security definer set search_path = public, private, pg_temp as $$
declare
  d date := current_date;
  ld date := (date_trunc('month', d) + interval '1 month' - interval '1 day')::date;
  n int := private.p_int('avis_derniers_jours', 5);
  debut date := ld - (private.p_int('avis_derniers_jours', 5) - 1);
  ouvert boolean;
begin
  ouvert := private.p_bool('avis_force_ouvert', false) or d >= debut;
  return jsonb_build_object('ouvert', ouvert, 'mois', to_char(d, 'YYYY-MM'), 'debut', debut, 'fin', ld);
end $$;

-- ----- Inscription au tirage
create or replace function public.register_participant(
  p_nom text, p_prenom text, p_filiere text, p_annee text, p_matricule text, p_device text,
  p_consent boolean, p_hp text default '', p_elapsed int default 0,
  p_point_id bigint default null, p_point_code text default null, p_operateur text default null,
  p_carte_verifiee boolean default false
) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare
  dh text; mh text; cle text; phon text; v_ip text; iph text; st text := 'valide'; nt text[] := '{}';
  v_canal text := 'site'; v_nb int; v_id bigint; v_regex text; v_car boolean := false;
begin
  if private.p_bool('campagne_cloturee', false) then
    return jsonb_build_object('ok', false, 'code', 'ferme', 'message', 'Les inscriptions sont closes.');
  end if;
  if coalesce(p_hp, '') <> '' or coalesce(p_elapsed, 0) < 3 or coalesce(length(p_device), 0) < 8 then
    return jsonb_build_object('ok', false, 'code', 'robot', 'message', 'Vérification échouée, veuillez réessayer.');
  end if;
  if p_consent is not true then
    return jsonb_build_object('ok', false, 'code', 'consentement', 'message', 'Le consentement est obligatoire.');
  end if;
  p_nom := private.clean(p_nom, 60); p_prenom := private.clean(p_prenom, 60);
  p_matricule := upper(private.clean(p_matricule, 30));
  if length(p_nom) < 2 or length(p_prenom) < 2 or p_nom ~ '[0-9<>{}\[\]\\|^~`"=;:/@#$%*+_()!?]'
     or p_prenom ~ '[0-9<>{}\[\]\\|^~`"=;:/@#$%*+_()!?]' then
    return jsonb_build_object('ok', false, 'code', 'invalide', 'message', 'Nom ou prénom invalide.');
  end if;
  if not exists (select 1 from jsonb_array_elements_text(private.param_json('filieres')) f where f = p_filiere)
     or not exists (select 1 from jsonb_array_elements_text(private.param_json('annees')) a where a = p_annee) then
    return jsonb_build_object('ok', false, 'code', 'invalide', 'message', 'Filière ou année invalide.');
  end if;
  v_regex := private.p_text('matricule_regex', '');
  if p_matricule !~ '^[A-Z0-9/_.-]{4,30}$' or (v_regex <> '' and p_matricule !~ v_regex) then
    return jsonb_build_object('ok', false, 'code', 'invalide', 'message', 'Numéro de matricule invalide.');
  end if;
  dh := private.hash(p_device);
  if exists (select 1 from appareils_bloques where device_hash = dh) then
    return jsonb_build_object('ok', false, 'code', 'bloque', 'message', 'Cet appareil ne peut pas s''inscrire.');
  end if;
  if not private.rate_ok(dh, 'register', 10, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'code', 'limite', 'message', 'Trop de tentatives, réessayez dans quelques minutes.');
  end if;

  mh := private.hash('mat:' || p_matricule);
  if exists (select 1 from participants where matricule_hash = mh) then
    return jsonb_build_object('ok', false, 'code', 'doublon_matricule',
      'message', 'Ce matricule est déjà inscrit. Si c''est une erreur, utilisez « Besoin d''aide ? ».');
  end if;
  cle := private.cle_nom(p_nom, p_prenom);
  if exists (select 1 from participants where nom_cle = cle) then
    return jsonb_build_object('ok', false, 'code', 'doublon_nom',
      'message', 'Une inscription existe déjà à ce nom. Si c''est une erreur, utilisez « Besoin d''aide ? ».');
  end if;

  if p_point_id is not null then
    if exists (select 1 from points_inscription where id = p_point_id and actif and code_hash = private.hash('pt:' || coalesce(p_point_code, ''))) then
      v_canal := 'stand'; v_car := coalesce(p_carte_verifiee, false);
    else
      return jsonb_build_object('ok', false, 'code', 'point_invalide', 'message', 'Code du point d''inscription invalide.');
    end if;
  end if;

  phon := private.cle_phon(p_nom, p_prenom);
  if exists (select 1 from participants
              where (length(cle) >= 6 and abs(length(nom_cle) - length(cle)) <= 1 and levenshtein(nom_cle, cle) <= 1)
                 or (phon is not null and phon not in ('|') and phon_cle = phon)) then
    st := 'a_verifier'; nt := nt || 'Nom très proche d''un participant existant';
  end if;
  if v_canal = 'site' then
    select count(*) into v_nb from participants where device_hash = dh and canal = 'site';
    if v_nb >= 3 then st := 'a_verifier'; nt := nt || 'Plus de 3 inscriptions depuis cet appareil'; end if;
  end if;
  v_ip := split_part(coalesce((nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ''), ',', 1);
  if v_ip <> '' then
    iph := private.hash('ip:' || btrim(v_ip));
    select count(*) into v_nb from participants where ip_hash = iph and created_at > now() - interval '1 day';
    if v_nb >= 20 then nt := nt || 'Alerte : nombreuses inscriptions depuis la même adresse IP'; end if;
  end if;
  if v_car then st := case when st = 'valide' then 'verifie' else st end; end if;

  begin
    insert into participants (nom, prenom, filiere, annee, matricule_hash, nom_cle, phon_cle, device_hash, ip_hash,
                              statut, note, canal, point_id, operateur, carte_verifiee)
    values (p_nom, p_prenom, p_filiere, p_annee, mh, cle, phon, dh, iph, st,
            nullif(array_to_string(nt, ' · '), ''), v_canal, case when v_canal = 'stand' then p_point_id end,
            case when v_canal = 'stand' then left(p_operateur, 60) end, v_car)
    returning id into v_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'doublon_matricule', 'message', 'Ce matricule est déjà inscrit.');
  end;
  return jsonb_build_object('ok', true, 'statut', st,
    'message', case when st = 'valide' then 'Inscription enregistrée. Bonne chance !'
                    else 'Inscription enregistrée, elle sera vérifiée par le bureau avant le tirage.' end);
end $$;

-- ----- Promesse de vote (stockage séparé)
create or replace function public.submit_promise(
  p_nom text, p_prenom text, p_filiere text, p_annee text, p_matricule text, p_device text,
  p_consent boolean, p_hp text default '', p_elapsed int default 0
) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare dh text; mh text; v_regex text;
begin
  if private.p_bool('campagne_cloturee', false) or not private.p_bool('promesse_active', true) then
    return jsonb_build_object('ok', false, 'code', 'ferme', 'message', 'Les promesses de vote sont closes.');
  end if;
  if coalesce(p_hp, '') <> '' or coalesce(p_elapsed, 0) < 3 or coalesce(length(p_device), 0) < 8 then
    return jsonb_build_object('ok', false, 'code', 'robot', 'message', 'Vérification échouée, veuillez réessayer.');
  end if;
  if p_consent is not true then
    return jsonb_build_object('ok', false, 'code', 'consentement', 'message', 'Le consentement est obligatoire.');
  end if;
  p_nom := private.clean(p_nom, 60); p_prenom := private.clean(p_prenom, 60);
  p_matricule := upper(private.clean(p_matricule, 30));
  if length(p_nom) < 2 or length(p_prenom) < 2 or p_nom ~ '[0-9<>{}\[\]\\|^~`"=;:/@#$%*+_()!?]'
     or p_prenom ~ '[0-9<>{}\[\]\\|^~`"=;:/@#$%*+_()!?]' then
    return jsonb_build_object('ok', false, 'code', 'invalide', 'message', 'Nom ou prénom invalide.');
  end if;
  if not exists (select 1 from jsonb_array_elements_text(private.param_json('filieres')) f where f = p_filiere)
     or not exists (select 1 from jsonb_array_elements_text(private.param_json('annees')) a where a = p_annee) then
    return jsonb_build_object('ok', false, 'code', 'invalide', 'message', 'Filière ou année invalide.');
  end if;
  v_regex := private.p_text('matricule_regex', '');
  if p_matricule !~ '^[A-Z0-9/_.-]{4,30}$' or (v_regex <> '' and p_matricule !~ v_regex) then
    return jsonb_build_object('ok', false, 'code', 'invalide', 'message', 'Numéro de matricule invalide.');
  end if;
  dh := private.hash(p_device);
  if not private.rate_ok(dh, 'promise', 10, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'code', 'limite', 'message', 'Trop de tentatives, réessayez dans quelques minutes.');
  end if;
  mh := private.hash('mat:' || p_matricule);
  begin
    insert into promesses (nom, prenom, filiere, annee, matricule_hash, device_hash) values (p_nom, p_prenom, p_filiere, p_annee, mh, dh);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'doublon', 'message', 'Une promesse existe déjà pour ce matricule.');
  end;
  return jsonb_build_object('ok', true, 'message', 'Merci pour votre soutien ! Cette promesse n''engage à rien.');
end $$;

-- ----- Tirage au sort
create or replace function private.do_draw(p_actor uuid, p_redraw boolean, p_motif text) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare
  d date := current_date; v_debut date; v_fin date; v_old tirages; v_a_un boolean; n int; v_p participants;
  v_id bigint; v_label text; v_until timestamptz;
begin
  if private.p_bool('campagne_cloturee', false) then
    return jsonb_build_object('ok', false, 'message', 'La campagne est clôturée.');
  end if;
  v_debut := nullif(private.p_text('campagne_debut'), '')::date;
  v_fin := nullif(private.p_text('campagne_fin'), '')::date;
  if v_debut is null or v_fin is null then
    return jsonb_build_object('ok', false, 'message', 'Renseignez d''abord les dates de la campagne dans les paramètres.');
  end if;
  if d < v_debut or d > v_fin then
    return jsonb_build_object('ok', false, 'message', 'Aujourd''hui est en dehors des dates de la campagne.');
  end if;
  select * into v_old from tirages where jour = d and statut = 'actif';
  v_a_un := found;
  if v_a_un and not p_redraw then
    return jsonb_build_object('ok', false, 'message', 'Un tirage a déjà eu lieu aujourd''hui.');
  end if;
  select count(*) into n from participants p
   where p.statut in ('valide', 'verifie') and not exists (select 1 from tirages t where t.gagnant_id = p.id);
  if n = 0 then
    return jsonb_build_object('ok', false, 'message', 'Aucun participant éligible.');
  end if;
  if v_a_un then
    update tirages set statut = 'annule', motif_annulation = left(coalesce(p_motif, 'Re-tirage'), 200) where id = v_old.id;
  end if;
  select * into v_p from participants p
   where p.statut in ('valide', 'verifie') and not exists (select 1 from tirages t where t.gagnant_id = p.id)
   order by encode(extensions.gen_random_bytes(8), 'hex') limit 1;
  v_label := initcap(v_p.prenom) || ' ' || upper(v_p.nom);
  v_until := (d + private.p_int('validite_repas_jours', 1) + 1)::timestamptz - interval '1 second';
  insert into tirages (jour, gagnant_id, gagnant_label, nb_eligibles, valide_jusqu_au, declenche_par)
  values (d, v_p.id, v_label, n, v_until, p_actor) returning id into v_id;
  insert into audit_logs (acteur, acteur_email, role, action, cible, detail)
  values (p_actor, (select email from admins where user_id = p_actor), (select role from admins where user_id = p_actor),
          case when p_redraw then 'tirage.re-tirage' else 'tirage.lance' end, v_id::text,
          jsonb_build_object('jour', d, 'eligibles', n, 'auto', p_actor is null, 'motif', p_motif));
  return jsonb_build_object('ok', true, 'id', v_id, 'gagnant', v_label, 'eligibles', n);
end $$;

create or replace function public.run_draw(p_redraw boolean default false, p_motif text default null) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'message', 'Accès refusé.'); end if;
  return private.do_draw(auth.uid(), p_redraw, p_motif);
end $$;

-- Tirage automatique : planifier avec pg_cron (voir fin du fichier)
create or replace function public.auto_draw_tick() returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if private.p_bool('tirage_auto', false)
     and localtime >= private.p_text('heure_tirage', '12:00')::time
     and not exists (select 1 from tirages where jour = current_date and statut = 'actif') then
    perform private.do_draw(null, false, null);
  end if;
end $$;
revoke execute on function public.auto_draw_tick() from public, anon, authenticated;

-- ----- Chat
create or replace function public.send_message(p_device text, p_content text) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare dh text; motif text; mid bigint; v_last timestamptz;
begin
  if coalesce(length(p_device), 0) < 8 then
    return jsonb_build_object('ok', false, 'code', 'appareil', 'message', 'Appareil non reconnu.');
  end if;
  dh := private.hash(p_device);
  if exists (select 1 from appareils_bloques where device_hash = dh) then
    return jsonb_build_object('ok', false, 'code', 'bloque', 'message', 'Votre appareil a été bloqué par la modération.');
  end if;
  p_content := btrim(coalesce(p_content, ''));
  if p_content = '' or length(p_content) > 500 then
    return jsonb_build_object('ok', false, 'code', 'taille', 'message', 'Le message doit faire entre 1 et 500 caractères.');
  end if;
  motif := private.chat_motif_ferme();
  if motif is not null then
    return jsonb_build_object('ok', false, 'code', 'ferme', 'raison', motif, 'message', 'Le chat est en lecture seule pour le moment.');
  end if;
  if private.p_bool('limite_messages_active', false) then
    select max(created_at) into v_last from chat_messages where device_hash = dh;
    if v_last is not null and v_last > now() - make_interval(secs => private.p_int('limite_messages_secondes', 10)) then
      return jsonb_build_object('ok', false, 'code', 'limite', 'message', 'Doucement, patientez quelques secondes entre deux messages.');
    end if;
  end if;
  motif := private.check_text(p_content, true);
  if motif is not null then
    return jsonb_build_object('ok', false, 'code', motif, 'message', private.message_refus(motif));
  end if;
  insert into chat_messages (pseudo, contenu, device_hash) values ('Anonyme-' || upper(substr(dh, 1, 4)), p_content, dh)
  returning id into mid;
  return jsonb_build_object('ok', true, 'id', mid);
end $$;

create or replace function public.post_official(p_content text, p_epingle boolean default false) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare mid bigint;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'message', 'Accès refusé.'); end if;
  p_content := btrim(coalesce(p_content, ''));
  if p_content = '' or length(p_content) > 800 then
    return jsonb_build_object('ok', false, 'message', 'Le message doit faire entre 1 et 800 caractères.');
  end if;
  insert into chat_messages (pseudo, contenu, officiel, poste, epingle)
  values ('Bureau MPPE', p_content, true, (select coalesce(poste, nom_affiche) from admins where user_id = auth.uid()), coalesce(p_epingle, false))
  returning id into mid;
  perform private.log('chat.message_officiel', mid::text);
  return jsonb_build_object('ok', true, 'id', mid);
end $$;

-- ----- Signalements (chat, idées, avis)
create or replace function public.report_content(p_type text, p_id bigint, p_device text) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare dh text; v_ok boolean; v_nb int; v_rows int; seuil int := private.p_int('seuil_signalements', 2);
begin
  if p_type not in ('chat', 'idee', 'avis') or coalesce(length(p_device), 0) < 8 then
    return jsonb_build_object('ok', false, 'message', 'Signalement invalide.');
  end if;
  dh := private.hash(p_device);
  if not private.rate_ok(dh, 'report', 10, interval '1 hour') then
    return jsonb_build_object('ok', false, 'message', 'Trop de signalements, réessayez plus tard.');
  end if;
  if p_type = 'chat' then
    select (statut = 'visible' and not officiel and not retabli) into v_ok from chat_messages where id = p_id;
  elsif p_type = 'idee' then
    select (not masquee and not retablie) into v_ok from idees where id = p_id;
  else
    select (statut = 'visible' and not retabli) into v_ok from avis_bureau where id = p_id;
  end if;
  if v_ok is not true then
    return jsonb_build_object('ok', false, 'message', 'Ce contenu ne peut plus être signalé.');
  end if;
  insert into signalements (type, cible_id, device_hash) values (p_type, p_id, dh) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('ok', true, 'deja', true, 'message', 'Vous avez déjà signalé ce contenu.'); end if;
  select count(*) into v_nb from signalements where type = p_type and cible_id = p_id;
  if p_type = 'chat' then
    update chat_messages set nb_signalements = v_nb, statut = case when v_nb >= seuil then 'masque' else statut end where id = p_id;
  elsif p_type = 'idee' then
    update idees set nb_signalements = v_nb, masquee = (v_nb >= seuil) where id = p_id;
  else
    update avis_bureau set nb_signalements = v_nb, statut = case when v_nb >= seuil then 'a_examiner' else statut end where id = p_id;
  end if;
  return jsonb_build_object('ok', true, 'masque', v_nb >= seuil, 'message', 'Merci, le signalement a été transmis à la modération.');
end $$;

-- ----- Boîte à idées
create or replace function public.create_idea(
  p_device text, p_titre text, p_description text, p_categorie text, p_auteur text default '', p_photo text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare dh text; motif text; v_id bigint;
begin
  if coalesce(length(p_device), 0) < 8 then return jsonb_build_object('ok', false, 'message', 'Appareil non reconnu.'); end if;
  dh := private.hash(p_device);
  if exists (select 1 from appareils_bloques where device_hash = dh) then
    return jsonb_build_object('ok', false, 'message', 'Votre appareil a été bloqué par la modération.');
  end if;
  p_titre := private.clean(p_titre, 120); p_description := btrim(coalesce(p_description, '')); p_auteur := private.clean(p_auteur, 60);
  if length(p_titre) < 4 or length(p_description) < 10 or length(p_description) > 1000 then
    return jsonb_build_object('ok', false, 'message', 'Titre (4 caractères min.) et description (10 à 1000 caractères) requis.');
  end if;
  if p_categorie not in ('vie académique', 'infrastructures', 'restauration', 'vie associative', 'numérique', 'autre') then
    return jsonb_build_object('ok', false, 'message', 'Catégorie invalide.');
  end if;
  if p_photo is not null and p_photo !~ '^https?://' then p_photo := null; end if;
  if not private.rate_ok(dh, 'idee', 5, interval '1 day') then
    return jsonb_build_object('ok', false, 'message', 'Limite quotidienne d''idées atteinte.');
  end if;
  motif := private.check_text(p_titre || ' ' || p_description || ' ' || p_auteur, true);
  if motif is not null then
    return jsonb_build_object('ok', false, 'code', motif, 'message', private.message_refus(motif));
  end if;
  insert into idees (titre, description, categorie, auteur, photo_url, device_hash)
  values (p_titre, p_description, p_categorie, nullif(p_auteur, ''), p_photo, dh) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- p_valeur : 1 (j'aime), -1 (je n'aime pas), 0 (retirer mon vote)
create or replace function public.vote_idea(p_id bigint, p_device text, p_valeur int) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare dh text; r record;
begin
  if p_valeur not in (-1, 0, 1) or coalesce(length(p_device), 0) < 8 then
    return jsonb_build_object('ok', false, 'message', 'Vote invalide.');
  end if;
  dh := private.hash(p_device);
  if not private.rate_ok(dh, 'vote', 60, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'message', 'Trop de votes, patientez un instant.');
  end if;
  if not exists (select 1 from idees where id = p_id and not masquee) then
    return jsonb_build_object('ok', false, 'message', 'Idée introuvable.');
  end if;
  if p_valeur = 0 then
    delete from idees_votes where idee_id = p_id and device_hash = dh;
  else
    insert into idees_votes (idee_id, device_hash, valeur) values (p_id, dh, p_valeur)
    on conflict (idee_id, device_hash) do update set valeur = excluded.valeur;
  end if;
  select count(*) filter (where valeur = 1) as likes, count(*) filter (where valeur = -1) as dislikes into r
    from idees_votes where idee_id = p_id;
  return jsonb_build_object('ok', true, 'likes', r.likes, 'dislikes', r.dislikes);
end $$;

-- ----- Sondages
create or replace function public.answer_poll(p_id bigint, p_device text, p_reponse jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare dh text; s sondages; v int; nb int;
begin
  if coalesce(length(p_device), 0) < 8 then return jsonb_build_object('ok', false, 'message', 'Appareil non reconnu.'); end if;
  dh := private.hash(p_device);
  select * into s from sondages where id = p_id;
  if not found or s.ouvre_at is null or s.ouvre_at > now() or (s.ferme_at is not null and s.ferme_at < now()) then
    return jsonb_build_object('ok', false, 'message', 'Ce sondage n''est pas ouvert.');
  end if;
  if jsonb_typeof(p_reponse) <> 'array' or jsonb_array_length(p_reponse) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Réponse invalide.');
  end if;
  nb := jsonb_array_length(s.options);
  for v in select jsonb_array_elements_text(p_reponse)::int loop
    if s.type = 'echelle' then
      if v < 1 or v > 5 then return jsonb_build_object('ok', false, 'message', 'Réponse invalide.'); end if;
    elsif v < 0 or v >= nb then
      return jsonb_build_object('ok', false, 'message', 'Réponse invalide.');
    end if;
  end loop;
  if s.type <> 'multiple' and jsonb_array_length(p_reponse) <> 1 then
    return jsonb_build_object('ok', false, 'message', 'Une seule réponse est attendue.');
  end if;
  begin
    insert into sondage_reponses (sondage_id, device_hash, reponse) values (p_id, dh, p_reponse);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'deja', 'message', 'Vous avez déjà répondu à ce sondage.');
  end;
  return jsonb_build_object('ok', true);
end $$;

-- Résultats : {total, counts[], moyenne}. counts[i] = nb de réponses pour l'option i (ou la note i+1 pour l'échelle)
create or replace function public.poll_results(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public, private, pg_temp as $$
declare s sondages; v_total int; v_counts jsonb; v_moy numeric; v_n int;
begin
  select * into s from sondages where id = p_id;
  if not found then return jsonb_build_object('ok', false); end if;
  if not (public.is_staff() or (s.afficher_resultats and s.ouvre_at is not null and s.ouvre_at <= now())) then
    return jsonb_build_object('ok', false, 'message', 'Résultats non publiés.');
  end if;
  v_n := case when s.type = 'echelle' then 5 else jsonb_array_length(s.options) end;
  select count(*) into v_total from sondage_reponses where sondage_id = p_id;
  select coalesce(jsonb_agg(coalesce(c.n, 0) order by g.i), '[]') into v_counts
    from generate_series(0, greatest(v_n - 1, 0)) as g(i)
    left join (select (case when s.type = 'echelle' then x::int - 1 else x::int end) as idx, count(*) as n
                 from sondage_reponses r, jsonb_array_elements_text(r.reponse) x
                where r.sondage_id = p_id group by 1) c on c.idx = g.i
   where v_n > 0;
  if s.type = 'echelle' then
    select avg(x::int) into v_moy from sondage_reponses r, jsonb_array_elements_text(r.reponse) x where r.sondage_id = p_id;
  end if;
  return jsonb_build_object('ok', true, 'total', v_total, 'counts', v_counts, 'moyenne', round(v_moy, 2));
end $$;

-- ----- Avis mensuel sur le bureau
create or replace function public.submit_avis(
  p_device text, p_note int, p_themes jsonb, p_commentaire text, p_attente text
) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare dh text; st jsonb; motif text; k text; v_themes jsonb := '{}';
begin
  if coalesce(length(p_device), 0) < 8 then return jsonb_build_object('ok', false, 'message', 'Appareil non reconnu.'); end if;
  dh := private.hash(p_device);
  st := public.avis_status();
  if (st ->> 'ouvert')::boolean is not true then
    return jsonb_build_object('ok', false, 'code', 'ferme', 'message', 'La période d''avis n''est pas ouverte.');
  end if;
  if p_note is null or p_note < 1 or p_note > 5 then
    return jsonb_build_object('ok', false, 'message', 'Donnez une note globale de 1 à 5.');
  end if;
  foreach k in array array['travail', 'communication', 'ecoute', 'promesses'] loop
    if (p_themes ->> k) ~ '^[1-5]$' then v_themes := v_themes || jsonb_build_object(k, (p_themes ->> k)::int); end if;
  end loop;
  p_commentaire := left(btrim(coalesce(p_commentaire, '')), 1000);
  p_attente := left(btrim(coalesce(p_attente, '')), 500);
  motif := private.check_text(p_commentaire || ' ' || p_attente, true);
  if motif is not null then
    return jsonb_build_object('ok', false, 'code', motif, 'message', private.message_refus(motif));
  end if;
  begin
    insert into avis_bureau (mois, note_globale, notes_themes, commentaire, attente_mois_suivant, device_hash)
    values (st ->> 'mois', p_note, v_themes, nullif(p_commentaire, ''), nullif(p_attente, ''), dh);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'deja', 'message', 'Vous avez déjà donné votre avis ce mois-ci.');
  end;
  return jsonb_build_object('ok', true);
end $$;

-- ----- Aide, bénévoles
create or replace function public.submit_aide(
  p_device text, p_type text, p_message text, p_contact text default '', p_hp text default '', p_elapsed int default 0
) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare dh text;
begin
  if coalesce(p_hp, '') <> '' or coalesce(p_elapsed, 0) < 3 or coalesce(length(p_device), 0) < 8 then
    return jsonb_build_object('ok', false, 'message', 'Vérification échouée, veuillez réessayer.');
  end if;
  dh := private.hash(p_device);
  if not private.rate_ok(dh, 'aide', 5, interval '1 hour') then
    return jsonb_build_object('ok', false, 'message', 'Trop de demandes, réessayez plus tard.');
  end if;
  p_message := left(btrim(coalesce(p_message, '')), 1500);
  if length(p_message) < 10 then return jsonb_build_object('ok', false, 'message', 'Décrivez votre situation (10 caractères min.).'); end if;
  if p_type not in ('doublon', 'message_supprime', 'tirage', 'suppression_donnees', 'autre') then p_type := 'autre'; end if;
  insert into demandes_aide (type, message, contact) values (p_type, p_message, nullif(left(btrim(coalesce(p_contact, '')), 120), ''));
  return jsonb_build_object('ok', true, 'message', 'Demande envoyée. Réponse sous 24 heures.');
end $$;

create or replace function public.submit_benevole(
  p_nom text, p_prenom text, p_filiere text, p_annee text, p_whatsapp text, p_domaines text[], p_dispo text,
  p_message text, p_consent boolean, p_accord boolean, p_device text, p_hp text default '', p_elapsed int default 0
) returns jsonb
language plpgsql security definer set search_path = public, extensions, private, pg_temp as $$
declare dh text;
begin
  if coalesce(p_hp, '') <> '' or coalesce(p_elapsed, 0) < 3 or coalesce(length(p_device), 0) < 8 then
    return jsonb_build_object('ok', false, 'message', 'Vérification échouée, veuillez réessayer.');
  end if;
  if p_consent is not true or p_accord is not true then
    return jsonb_build_object('ok', false, 'message', 'Confirmez le message d''information et le consentement.');
  end if;
  dh := private.hash(p_device);
  if not private.rate_ok(dh, 'benevole', 3, interval '1 day') then
    return jsonb_build_object('ok', false, 'message', 'Trop de demandes, réessayez plus tard.');
  end if;
  p_nom := private.clean(p_nom, 60); p_prenom := private.clean(p_prenom, 60);
  if length(p_nom) < 2 or length(p_prenom) < 2 or p_whatsapp !~ '^\+?[0-9 .-]{8,20}$' then
    return jsonb_build_object('ok', false, 'message', 'Nom, prénom et numéro WhatsApp valides requis.');
  end if;
  insert into benevoles (nom, prenom, filiere, annee, whatsapp, domaines, disponibilites, message)
  values (p_nom, p_prenom, left(p_filiere, 60), left(p_annee, 30), p_whatsapp,
          (select coalesce(array_agg(left(d, 30)), '{}') from unnest(p_domaines) d),
          left(p_dispo, 200), left(p_message, 600));
  return jsonb_build_object('ok', true, 'message', 'Merci ! Le bureau vous recontactera.');
end $$;

-- ---------------------------------------------------------------------
-- 6. Fonctions réservées au bureau
-- ---------------------------------------------------------------------
create or replace function public.heartbeat() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if public.is_staff() then
    insert into presence_moderateurs (user_id, vu_at) values (auth.uid(), now())
    on conflict (user_id) do update set vu_at = now();
  end if;
end $$;

create or replace function public.stats_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public, private, pg_temp as $$
declare r jsonb;
begin
  if not public.is_staff() then return jsonb_build_object('ok', false); end if;
  select jsonb_build_object(
    'ok', true,
    'participants', (select count(*) from participants),
    'a_verifier', (select count(*) from participants where statut = 'a_verifier'),
    'par_filiere', coalesce((select jsonb_object_agg(filiere, n) from (select filiere, count(*) n from participants group by 1) x), '{}'),
    'par_annee', coalesce((select jsonb_object_agg(annee, n) from (select annee, count(*) n from participants group by 1) x), '{}'),
    'par_jour', coalesce((select jsonb_object_agg(j, n) from (select to_char(created_at, 'YYYY-MM-DD') j, count(*) n from participants group by 1) x), '{}'),
    'stand', (select count(*) from participants where canal = 'stand'),
    'promesses', (select count(*) from promesses),
    'idees', (select count(*) from idees),
    'idees_signalees', (select count(*) from idees where masquee and not retablie),
    'votes', (select count(*) from idees_votes),
    'reponses_sondages', (select count(*) from sondage_reponses),
    'messages', (select count(*) from chat_messages where not officiel),
    'messages_masques', (select count(*) from chat_messages where statut = 'masque'),
    'messages_supprimes', (select count(*) from chat_messages where statut = 'supprime'),
    'aides_nouvelles', (select count(*) from demandes_aide where statut = 'nouveau'),
    'avis_mois', (select count(*) from avis_bureau where mois = to_char(current_date, 'YYYY-MM')),
    'avis_a_examiner', (select count(*) from avis_bureau where statut = 'a_examiner'),
    'benevoles_nouveaux', (select count(*) from benevoles where statut = 'nouveau'),
    'pages_vues', (select coalesce(sum(n), 0) from visites),
    'visites_jour', coalesce((select jsonb_object_agg(jour, n) from (select jour, sum(n) n from visites where jour > current_date - 7 group by 1) x), '{}')
  ) into r;
  return r;
end $$;

-- Équipe : la fiche du président est protégée côté serveur
create or replace function public.team_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_id bigint := nullif(p ->> 'id', '')::bigint; v membres_bureau; v_est boolean := coalesce((p ->> 'est_president')::boolean, false);
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'message', 'Accès refusé.'); end if;
  if v_id is not null then
    select * into v from membres_bureau where id = v_id;
    if not found then return jsonb_build_object('ok', false, 'message', 'Membre introuvable.'); end if;
    if v.est_president and not public.is_president() then
      perform private.log('tentative_refusee', 'membres_bureau:' || v_id, jsonb_build_object('motif', 'modification de la fiche du président'));
      return jsonb_build_object('ok', false, 'message', 'Seul le président peut modifier ses informations.');
    end if;
    update membres_bureau set
      prenom = coalesce(p ->> 'prenom', prenom), nom = coalesce(p ->> 'nom', nom), poste = coalesce(p ->> 'poste', poste),
      presentation = case when p ? 'presentation' then p ->> 'presentation' else presentation end,
      photo_url = case when p ? 'photo_url' then p ->> 'photo_url' else photo_url end,
      ordre = coalesce((p ->> 'ordre')::int, ordre), visible = coalesce((p ->> 'visible')::boolean, visible),
      mis_a_jour_par = auth.uid()
    where id = v_id;
    perform private.log('membres_bureau.update', v_id::text);
    return jsonb_build_object('ok', true, 'id', v_id);
  end if;
  if v_est and not public.is_president() then
    perform private.log('tentative_refusee', 'membres_bureau', jsonb_build_object('motif', 'création d''une fiche président'));
    return jsonb_build_object('ok', false, 'message', 'Seul le président peut créer sa fiche.');
  end if;
  insert into membres_bureau (prenom, nom, poste, presentation, photo_url, ordre, visible, est_president, mis_a_jour_par)
  values (p ->> 'prenom', p ->> 'nom', p ->> 'poste', p ->> 'presentation', p ->> 'photo_url',
          coalesce((p ->> 'ordre')::int, 0), coalesce((p ->> 'visible')::boolean, true), v_est, auth.uid())
  returning id into v_id;
  perform private.log('membres_bureau.insert', v_id::text);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.team_delete(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v membres_bureau;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'message', 'Accès refusé.'); end if;
  select * into v from membres_bureau where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'message', 'Membre introuvable.'); end if;
  if v.est_president then
    perform private.log('tentative_refusee', 'membres_bureau:' || p_id, jsonb_build_object('motif', 'suppression du président'));
    return jsonb_build_object('ok', false, 'message', 'La fiche du président ne peut pas être supprimée.');
  end if;
  delete from membres_bureau where id = p_id;
  perform private.log('membres_bureau.delete', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.team_reorder(p_ids bigint[]) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'message', 'Accès refusé.'); end if;
  update membres_bureau m set ordre = x.ord from unnest(p_ids) with ordinality as x(id, ord) where m.id = x.id;
  perform private.log('membres_bureau.ordre');
  return jsonb_build_object('ok', true);
end $$;

-- Comptes du bureau (réservé au président)
create or replace function public.staff_add(p_email text, p_role text, p_nom text default null, p_poste text default null) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_uid uuid;
begin
  if not public.is_president() then return jsonb_build_object('ok', false, 'message', 'Réservé au président.'); end if;
  if p_role not in ('admin', 'moderateur') then return jsonb_build_object('ok', false, 'message', 'Rôle invalide.'); end if;
  select id into v_uid from auth.users where lower(email) = lower(btrim(p_email));
  if v_uid is null then
    return jsonb_build_object('ok', false, 'message', 'Aucun compte avec cet e-mail. Invitez-le d''abord (Supabase > Authentication > Users > Invite).');
  end if;
  if exists (select 1 from admins where user_id = v_uid and role = 'president') then
    perform private.log('tentative_refusee', v_uid::text, jsonb_build_object('motif', 'rôle du président'));
    return jsonb_build_object('ok', false, 'message', 'Le rôle du président ne peut pas être modifié.');
  end if;
  insert into admins (user_id, email, nom_affiche, poste, role) values (v_uid, lower(btrim(p_email)), p_nom, p_poste, p_role)
  on conflict (user_id) do update set role = excluded.role, nom_affiche = coalesce(excluded.nom_affiche, admins.nom_affiche),
                                       poste = coalesce(excluded.poste, admins.poste);
  perform private.log('admins.ajout', v_uid::text, jsonb_build_object('role', p_role));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.staff_remove(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'message', 'Accès refusé.'); end if;
  if exists (select 1 from admins where user_id = p_user and role = 'president') then
    perform private.log('tentative_refusee', p_user::text, jsonb_build_object('motif', 'retrait du président'));
    return jsonb_build_object('ok', false, 'message', 'Le compte du président ne peut pas être retiré.');
  end if;
  if not public.is_president() then
    perform private.log('tentative_refusee', p_user::text, jsonb_build_object('motif', 'retrait d''un compte sans être président'));
    return jsonb_build_object('ok', false, 'message', 'Réservé au président.');
  end if;
  delete from admins where user_id = p_user;
  perform private.log('admins.retrait', p_user::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.transfer_presidency(p_to uuid) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if not public.is_president() then return jsonb_build_object('ok', false, 'message', 'Seul le président peut transmettre son rôle.'); end if;
  if not exists (select 1 from admins where user_id = p_to) then return jsonb_build_object('ok', false, 'message', 'Compte introuvable.'); end if;
  update admins set role = 'admin' where user_id = auth.uid();
  update admins set role = 'president' where user_id = p_to;
  perform private.log('admins.passation', p_to::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.point_set_code(p_id bigint, p_code text) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'message', 'Accès refusé.'); end if;
  if length(coalesce(p_code, '')) < 4 then return jsonb_build_object('ok', false, 'message', 'Code trop court (4 caractères min.).'); end if;
  update points_inscription set code_hash = private.hash('pt:' || p_code) where id = p_id;
  perform private.log('points_inscription.code', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

-- Clôture : désactive les modules et supprime les données nominatives
create or replace function public.close_campaign(p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_attente int; v_part int; v_prom int; v_ben int; v_totaux jsonb;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'message', 'La clôture est réservée au bureau (président et administrateurs).'); end if;
  select count(*) into v_attente from tirages where statut = 'actif' and statut_repas = 'en_attente' and (valide_jusqu_au is null or valide_jusqu_au > now());
  if v_attente > 0 and not coalesce(p_force, false) then
    return jsonb_build_object('ok', false, 'code', 'repas_en_attente', 'attente', v_attente,
      'message', v_attente::text || ' repas ne sont pas encore remis.');
  end if;
  select count(*) into v_part from participants;
  select count(*) into v_prom from promesses;
  select count(*) into v_ben from benevoles where whatsapp is not null;
  v_totaux := jsonb_build_object('date', now(), 'participants', v_part, 'promesses', v_prom,
    'whatsapp_supprimes', v_ben, 'forcee', coalesce(p_force, false),
    'par_filiere', coalesce((select jsonb_object_agg(filiere, n) from (select filiere, count(*) n from participants group by 1) x), '{}'),
    'par_annee', coalesce((select jsonb_object_agg(annee, n) from (select annee, count(*) n from participants group by 1) x), '{}'),
    'tirages', (select count(*) from tirages where statut = 'actif'));
  perform set_config('mpp.silencieux', '1', true);
  perform set_config('mpp.cloture', '1', true);
  delete from promesses;
  delete from participants;
  update tirages set gagnant_label = null;
  update benevoles set whatsapp = null;
  update demandes_aide set contact = null;
  delete from private.tentatives;
  insert into parametres (cle, valeur) values ('cloture_totaux', v_totaux)
    on conflict (cle) do update set valeur = excluded.valeur;
  update parametres set valeur = 'true'::jsonb where cle = 'campagne_cloturee';
  insert into parametres (cle, valeur) values ('campagne_cloturee', 'true'::jsonb) on conflict (cle) do nothing;
  perform set_config('mpp.silencieux', '0', true);
  perform set_config('mpp.cloture', '0', true);
  perform private.log('cloture', null, jsonb_build_object('participants_supprimes', v_part, 'promesses_supprimees', v_prom,
    'numeros_whatsapp_supprimes', v_ben, 'forcee', coalesce(p_force, false)));
  return jsonb_build_object('ok', true, 'participants', v_part, 'promesses', v_prom, 'benevoles', v_ben);
end $$;

-- ---------------------------------------------------------------------
-- 7. Stockage des images
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipe', 'equipe', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('idees', 'idees', true, 400000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy equipe_ecriture on storage.objects for insert to authenticated with check (bucket_id = 'equipe' and public.is_admin());
create policy equipe_maj on storage.objects for update to authenticated using (bucket_id = 'equipe' and public.is_admin());
create policy equipe_suppr on storage.objects for delete to authenticated using (bucket_id = 'equipe' and public.is_admin());
create policy idees_depot on storage.objects for insert to anon, authenticated with check (bucket_id = 'idees');
create policy idees_suppr on storage.objects for delete to authenticated using (bucket_id = 'idees' and public.is_staff());

-- ---------------------------------------------------------------------
-- 8. Optionnel : tirage automatique toutes les 5 minutes (extension pg_cron)
-- ---------------------------------------------------------------------
-- create extension if not exists pg_cron;
-- select cron.schedule('mpp-tirage-auto', '*/5 * * * *', $$ select public.auto_draw_tick(); $$);


-- =====================================================================
--  Contenu de base (seed.sql)
-- =====================================================================
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

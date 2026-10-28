-- Correctif 001 — inscription : une inscription proche d un participant existant (quasi-doublon) provoquait une erreur.
-- À coller dans Supabase > SQL Editor > Run. Sans danger : remplace uniquement la fonction register_participant (aucune donnée touchée).

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
    st := 'a_verifier'; nt := array_append(nt, 'Nom très proche d''un participant existant'::text);
  end if;
  if v_canal = 'site' then
    select count(*) into v_nb from participants where device_hash = dh and canal = 'site';
    if v_nb >= 3 then st := 'a_verifier'; nt := array_append(nt, 'Plus de 3 inscriptions depuis cet appareil'::text); end if;
  end if;
  v_ip := split_part(coalesce((nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ''), ',', 1);
  if v_ip <> '' then
    iph := private.hash('ip:' || btrim(v_ip));
    select count(*) into v_nb from participants where ip_hash = iph and created_at > now() - interval '1 day';
    if v_nb >= 20 then nt := array_append(nt, 'Alerte : nombreuses inscriptions depuis la même adresse IP'::text); end if;
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

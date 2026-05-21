-- CDM 2026 — Code secret joueur (e-mail + code)
-- Exécuter dans Supabase SQL Editor après supabase_schema.sql

alter table public.grilles add column if not exists code_hash text;

-- Infos auth sans exposer le hash
create or replace function public.grille_auth_info(p_email text)
returns json
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select json_build_object(
      'exists', true,
      'hasCode', (code_hash is not null and code_hash <> '')
    ) from grilles where email = lower(trim(p_email)) limit 1),
    '{"exists":false,"hasCode":false}'::json
  );
$$;

-- Vérifier un code (hash SHA-256 côté client)
create or replace function public.verify_player_code(p_email text, p_code_hash text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from grilles
    where email = lower(trim(p_email))
      and code_hash is not null and code_hash <> ''
      and code_hash = p_code_hash
  );
$$;

-- Définir le code la première fois (import Excel sans code)
create or replace function public.set_player_code_if_empty(p_email text, p_code_hash text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_hash text;
begin
  if v_email = '' or p_code_hash is null or p_code_hash = '' then
    raise exception 'E-mail et code requis.';
  end if;
  select code_hash into v_hash from grilles where email = v_email for update;
  if not found then
    raise exception 'Grille introuvable pour cet e-mail.';
  end if;
  if v_hash is not null and v_hash <> '' then
    raise exception 'Un code existe déjà — utilisez-le pour vous connecter.';
  end if;
  update grilles set code_hash = p_code_hash where email = v_email;
  return json_build_object('ok', true);
end;
$$;

-- Envoi / mise à jour grille avec contrôle du code
create or replace function public.upsert_grille_player(
  p_email text,
  p_prenom text,
  p_nom text,
  p_equipe text,
  p_payload jsonb,
  p_new_code_hash text default null,
  p_auth_code_hash text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_existing record;
begin
  if v_email = '' then
    raise exception 'E-mail obligatoire.';
  end if;
  if trim(coalesce(p_prenom, '')) = '' or trim(coalesce(p_nom, '')) = '' then
    raise exception 'Prénom et nom obligatoires.';
  end if;

  select email, code_hash into v_existing from grilles where email = v_email;

  if not found then
    if p_new_code_hash is null or p_new_code_hash = '' then
      raise exception 'Code secret obligatoire pour la première inscription.';
    end if;
    insert into grilles (email, prenom, nom, equipe, payload, code_hash, updated_at)
    values (
      v_email,
      trim(p_prenom),
      trim(p_nom),
      coalesce(trim(p_equipe), ''),
      p_payload,
      p_new_code_hash,
      now()
    );
    return json_build_object('ok', true, 'created', true);
  end if;

  if v_existing.code_hash is null or v_existing.code_hash = '' then
    if p_new_code_hash is null or p_new_code_hash = '' then
      raise exception 'Définissez votre code secret avant d''envoyer.';
    end if;
    update grilles set
      prenom = trim(p_prenom),
      nom = trim(p_nom),
      equipe = coalesce(trim(p_equipe), ''),
      payload = p_payload,
      code_hash = p_new_code_hash,
      updated_at = now()
    where email = v_email;
    return json_build_object('ok', true, 'created', false);
  end if;

  if p_auth_code_hash is null or p_auth_code_hash <> v_existing.code_hash then
    raise exception 'Code secret incorrect ou session expirée.';
  end if;

  update grilles set
    prenom = trim(p_prenom),
    nom = trim(p_nom),
    equipe = coalesce(trim(p_equipe), ''),
    payload = p_payload,
    code_hash = coalesce(nullif(p_new_code_hash, ''), v_existing.code_hash),
    updated_at = now()
  where email = v_email;

  return json_build_object('ok', true, 'created', false);
end;
$$;

grant execute on function public.grille_auth_info(text) to anon, authenticated;
grant execute on function public.verify_player_code(text, text) to anon, authenticated;
grant execute on function public.set_player_code_if_empty(text, text) to anon, authenticated;
grant execute on function public.upsert_grille_player(text, text, text, text, jsonb, text, text) to anon, authenticated;

-- Changer le code (ancien + nouveau, joueur déverrouillé)
create or replace function public.change_player_code(
  p_email text,
  p_auth_code_hash text,
  p_new_code_hash text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_hash text;
begin
  if v_email = '' then
    raise exception 'E-mail obligatoire.';
  end if;
  if p_new_code_hash is null or p_new_code_hash = '' then
    raise exception 'Nouveau code requis.';
  end if;
  if p_auth_code_hash is null or p_auth_code_hash = '' then
    raise exception 'Ancien code requis.';
  end if;
  select code_hash into v_hash from grilles where email = v_email for update;
  if not found then
    raise exception 'Grille introuvable pour cet e-mail.';
  end if;
  if v_hash is null or v_hash = '' then
    raise exception 'Aucun code défini — utilisez « Définir mon code » dans la bannière.';
  end if;
  if p_auth_code_hash <> v_hash then
    raise exception 'Ancien code incorrect.';
  end if;
  if p_new_code_hash = v_hash then
    raise exception 'Le nouveau code doit être différent de l''ancien.';
  end if;
  update grilles set code_hash = p_new_code_hash where email = v_email;
  return json_build_object('ok', true);
end;
$$;

grant execute on function public.change_player_code(text, text, text) to anon, authenticated;

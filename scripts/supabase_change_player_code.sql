-- CDM 2026 — RPC change_player_code (si supabase_player_code.sql déjà exécuté)
-- Exécuter dans Supabase SQL Editor

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

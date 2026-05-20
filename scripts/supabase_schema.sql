-- CDM 2026 Pains sucés — table grilles joueurs
-- Exécuter dans Supabase : SQL Editor → New query → Run

create table if not exists public.grilles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  prenom text not null default '',
  nom text not null default '',
  equipe text not null default '',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint grilles_email_unique unique (email)
);

create index if not exists grilles_updated_at_idx on public.grilles (updated_at desc);

alter table public.grilles enable row level security;

-- Lecture publique (classement)
drop policy if exists "grilles_select_public" on public.grilles;
create policy "grilles_select_public"
  on public.grilles for select
  using (true);

-- Insert / update anon (envoi grille depuis le site)
drop policy if exists "grilles_insert_anon" on public.grilles;
create policy "grilles_insert_anon"
  on public.grilles for insert
  with check (true);

drop policy if exists "grilles_update_anon" on public.grilles;
create policy "grilles_update_anon"
  on public.grilles for update
  using (true)
  with check (true);

-- =====================================================================
-- Loby v2 : tables + règles d'accès (Row Level Security)
-- Script exécuté une fois dans Supabase > SQL Editor.
-- Principe : par défaut RIEN n'est accessible ; chaque droit est donné
-- explicitement, et vérifié par le serveur (pas par le navigateur).
-- =====================================================================

-- 1) PROFILS : un profil par compte (pseudo + avatar)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (pseudo ~ '^[A-Za-z0-9_]{3,20}$'),
  avatar text check (avatar is null or (avatar like 'data:image/jpeg;base64,%' and length(avatar) < 150000)),
  created_at timestamptz not null default now()
);
-- Pseudo unique sans tenir compte des majuscules (Testeur_1 = testeur_1)
create unique index profiles_pseudo_unique on public.profiles (lower(pseudo));

-- 2) POSTS : une photo et/ou un texte de 280 caractères max
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  texte text not null default '' check (char_length(texte) <= 280),
  image text check (image is null or (image like 'data:image/jpeg;base64,%' and length(image) < 1000000)),
  created_at timestamptz not null default now(),
  -- un post vide est refusé par la base elle-même
  check (char_length(trim(texte)) > 0 or image is not null)
);

-- 3) LIKES : un seul like par personne et par post (clé primaire double)
create table public.likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

-- 4) Activer la sécurité ligne par ligne sur les 3 tables
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.likes    enable row level security;

-- 5) RÈGLES D'ACCÈS (uniquement pour les utilisateurs connectés)
-- Profils : tout connecté peut lire ; chacun ne modifie que le sien
create policy "lire les profils" on public.profiles
  for select to authenticated using (true);
create policy "modifier son profil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Posts : tout connecté peut lire ; on publie et supprime seulement les siens
create policy "lire les posts" on public.posts
  for select to authenticated using (true);
create policy "publier en son nom" on public.posts
  for insert to authenticated with check (auteur_id = auth.uid());
create policy "supprimer ses posts" on public.posts
  for delete to authenticated using (auteur_id = auth.uid());

-- Likes : tout connecté peut lire ; on ajoute et retire seulement SES likes
create policy "lire les likes" on public.likes
  for select to authenticated using (true);
create policy "liker en son nom" on public.likes
  for insert to authenticated with check (user_id = auth.uid());
create policy "retirer son like" on public.likes
  for delete to authenticated using (user_id = auth.uid());

-- 6) DROITS sur les tables (les tables ne sont pas exposées automatiquement)
-- Les visiteurs non connectés (anon) n'ont AUCUN droit.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (avatar) on public.profiles to authenticated;  -- seul l'avatar est modifiable, pas le pseudo
grant select, insert, delete on public.posts to authenticated;
grant select, insert, delete on public.likes to authenticated;

-- 7) Création automatique du profil à l'inscription
-- Le pseudo est envoyé avec l'inscription ; si le pseudo est invalide ou déjà
-- pris, la base refuse et l'inscription entière est annulée.
create function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, pseudo)
  values (new.id, new.raw_user_meta_data ->> 'pseudo');
  return new;
end;
$$;

create trigger a_l_inscription
  after insert on auth.users
  for each row execute function public.creer_profil();

-- Kor4Soft Notes - Database Schema
-- Ejecutar este SQL en Supabase SQL Editor

-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- Tabla de perfiles de usuario
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  avatar_url text,
  role text default 'developer' check (role in ('admin', 'developer')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de notas
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  type text default 'note' check (type in ('task', 'change', 'bug', 'feature', 'note')),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  project text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null not null,
  tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de actividad
create table public.activities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  note_id uuid references public.notes(id) on delete cascade,
  action text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para mejorar rendimiento
create index notes_created_by_idx on public.notes(created_by);
create index notes_type_idx on public.notes(type);
create index notes_status_idx on public.notes(status);
create index notes_created_at_idx on public.notes(created_at desc);
create index activities_user_id_idx on public.activities(user_id);
create index activities_note_id_idx on public.activities(note_id);

-- RLS (Row Level Security) Policies
alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.activities enable row level security;

-- Políticas para profiles
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Políticas para notes (todos los usuarios autenticados pueden ver y crear)
create policy "Notes are viewable by authenticated users"
  on public.notes for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create notes"
  on public.notes for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own notes"
  on public.notes for update
  using (auth.uid() = created_by);

create policy "Users can delete their own notes"
  on public.notes for delete
  using (auth.uid() = created_by);

-- Políticas para activities
create policy "Activities are viewable by authenticated users"
  on public.activities for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create activities"
  on public.activities for insert
  with check (auth.role() = 'authenticated');

-- Trigger para crear perfil automáticamente al registrar usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger para actualizar updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at
  before update on public.notes
  for each row execute procedure public.handle_updated_at();

-- Habilitar Realtime para sincronización
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.activities;

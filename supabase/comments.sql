-- Tabla de comentarios
-- Ejecutar este SQL en Supabase SQL Editor

create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices
create index comments_note_id_idx on public.comments(note_id);
create index comments_user_id_idx on public.comments(user_id);
create index comments_created_at_idx on public.comments(created_at desc);

-- RLS
alter table public.comments enable row level security;

-- Políticas para comments
create policy "Comments are viewable by authenticated users"
  on public.comments for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can create comments"
  on public.comments for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own comments"
  on public.comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- Trigger para updated_at
create trigger set_updated_at
  before update on public.comments
  for each row execute procedure public.handle_updated_at();

-- Habilitar Realtime
alter publication supabase_realtime add table public.comments;

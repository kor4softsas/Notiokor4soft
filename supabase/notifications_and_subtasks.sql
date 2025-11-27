-- Notificaciones y Subtareas
-- Ejecutar este SQL en Supabase SQL Editor

-- =============================================
-- TABLA DE NOTIFICACIONES
-- =============================================
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('comment', 'assignment', 'status_change', 'mention')),
  title text not null,
  message text not null,
  note_id uuid references public.notes(id) on delete cascade,
  from_user_id uuid references public.profiles(id) on delete set null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para notificaciones
create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_read_idx on public.notifications(read);
create index notifications_created_at_idx on public.notifications(created_at desc);

-- RLS para notificaciones
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Authenticated users can create notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- =============================================
-- AGREGAR PARENT_ID A NOTES PARA SUBTAREAS
-- =============================================
alter table public.notes add column if not exists parent_id uuid references public.notes(id) on delete cascade;

-- Índice para subtareas
create index if not exists notes_parent_id_idx on public.notes(parent_id);

-- =============================================
-- HABILITAR REALTIME
-- =============================================
alter publication supabase_realtime add table public.notifications;

-- =============================================
-- FUNCIÓN PARA CREAR NOTIFICACIÓN AL COMENTAR
-- =============================================
create or replace function public.notify_on_comment()
returns trigger as $$
declare
  note_owner_id uuid;
  note_title text;
  commenter_name text;
begin
  -- Obtener el dueño de la nota y el título
  select created_by, title into note_owner_id, note_title
  from public.notes where id = new.note_id;
  
  -- Obtener el nombre del comentador
  select full_name into commenter_name
  from public.profiles where id = new.user_id;
  
  -- Solo notificar si el comentador no es el dueño
  if note_owner_id is not null and note_owner_id != new.user_id then
    insert into public.notifications (user_id, type, title, message, note_id, from_user_id)
    values (
      note_owner_id,
      'comment',
      'Nuevo comentario',
      commenter_name || ' comentó en "' || note_title || '"',
      new.note_id,
      new.user_id
    );
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para notificar al comentar
drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute procedure public.notify_on_comment();

-- =============================================
-- FUNCIÓN PARA CREAR NOTIFICACIÓN AL ASIGNAR
-- =============================================
create or replace function public.notify_on_assignment()
returns trigger as $$
declare
  note_title text;
  assigner_name text;
begin
  -- Solo si se está asignando a alguien nuevo
  if new.assigned_to is not null and (old.assigned_to is null or old.assigned_to != new.assigned_to) then
    -- No notificar si se asigna a sí mismo
    if new.assigned_to != new.created_by then
      -- Obtener el título de la nota
      note_title := new.title;
      
      -- Obtener el nombre del que asigna (el que hace update)
      select full_name into assigner_name
      from public.profiles where id = auth.uid();
      
      insert into public.notifications (user_id, type, title, message, note_id, from_user_id)
      values (
        new.assigned_to,
        'assignment',
        'Nueva tarea asignada',
        coalesce(assigner_name, 'Alguien') || ' te asignó la tarea "' || note_title || '"',
        new.id,
        auth.uid()
      );
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para notificar al asignar
drop trigger if exists on_note_assigned on public.notes;
create trigger on_note_assigned
  after update on public.notes
  for each row execute procedure public.notify_on_assignment();

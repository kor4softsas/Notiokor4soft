import { create } from 'zustand';
import { supabase, isSupabaseConfigured, Note, createNotification } from '../lib/supabase';

interface NotesState {
  notes: Note[];
  isLoading: boolean;
  selectedNote: Note | null;
  _hasFetched: boolean;
  filter: {
    type: string | null;
    status: string | null;
    priority: string | null;
    search: string;
  };

  // Actions
  fetchNotes: (force?: boolean) => Promise<void>;
  createNote: (note: Partial<Note>) => Promise<{ error: string | null }>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<{ error: string | null }>;
  deleteNote: (id: string) => Promise<{ error: string | null }>;
  setSelectedNote: (note: Note | null) => void;
  setFilter: (filter: Partial<NotesState['filter']>) => void;
}

// Generar ID único para modo demo
const generateId = () => `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: [],
  isLoading: false,
  selectedNote: null,
  _hasFetched: false,
  filter: {
    type: null,
    status: null,
    priority: null,
    search: '',
  },

  fetchNotes: async (force = false) => {
    const state = get();
    // Evitar llamadas duplicadas (excepto cuando hay filtros activos)
    const hasActiveFilter = state.filter.type || state.filter.status || state.filter.priority || state.filter.search;
    if (state.isLoading || (state._hasFetched && !force && !hasActiveFilter)) {
      return;
    }

    // En modo demo, las notas ya están en el estado local
    if (!isSupabaseConfigured || !supabase) {
      set({ isLoading: false, _hasFetched: true });
      return;
    }

    set({ isLoading: true });
    try {
      let query = supabase
        .from('notes')
        .select(`
          *,
          creator:profiles!notes_created_by_fkey(full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false });

      const { filter } = get();
      
      if (filter.type) query = query.eq('type', filter.type);
      if (filter.status) query = query.eq('status', filter.status);
      if (filter.priority) query = query.eq('priority', filter.priority);
      if (filter.search) query = query.ilike('title', `%${filter.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      set({ notes: data || [], isLoading: false, _hasFetched: true });
    } catch (error) {
      console.error('Error fetching notes:', error);
      set({ isLoading: false, _hasFetched: true });
    }
  },

  createNote: async (note) => {
    // Asignar fecha actual si no se especifica due_date
    const today = new Date().toISOString().split('T')[0]; // formato yyyy-MM-dd
    const noteWithDate = {
      ...note,
      due_date: note.due_date || today,
    };

    // Modo demo - guardar localmente
    if (!isSupabaseConfigured || !supabase) {
      const newNote: Note = {
        id: generateId(),
        title: noteWithDate.title || '',
        content: noteWithDate.content || '',
        type: noteWithDate.type || 'note',
        status: noteWithDate.status || 'pending',
        priority: noteWithDate.priority || 'medium',
        project: noteWithDate.project,
        due_date: noteWithDate.due_date,
        assigned_to: noteWithDate.assigned_to || [],
        created_by: noteWithDate.created_by || 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: noteWithDate.tags || [],
      };
      set((state) => ({ notes: [newNote, ...state.notes] }));
      return { error: null };
    }

    try {
      // Limpiar campos vacíos - convertir "" a null para campos UUID
      const cleanedNote = {
        ...noteWithDate,
        assigned_to: noteWithDate.assigned_to || null,
        parent_id: noteWithDate.parent_id || null,
        project: noteWithDate.project || null,
      };

      const { data, error } = await supabase
        .from('notes')
        .insert([cleanedNote])
        .select()
        .single();

      if (error) return { error: error.message };

      // Notificar a los usuarios asignados (excepto al creador)
      if (cleanedNote.assigned_to && cleanedNote.assigned_to.length > 0) {
        const currentUser = (await supabase.auth.getUser()).data.user;
        for (const userId of cleanedNote.assigned_to) {
          if (userId !== cleanedNote.created_by) {
            await createNotification({
              userId: userId,
              type: 'assignment',
              title: 'Nueva tarea asignada',
              message: `Te han asignado la tarea "${data.title}"`,
              noteId: data.id,
              fromUserId: currentUser?.id,
            });
          }
        }
      }

      set((state) => ({ notes: [data, ...state.notes] }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  updateNote: async (id, updates) => {
    // Modo demo
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        notes: state.notes.map((n) => 
          n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
        ),
        selectedNote: state.selectedNote?.id === id 
          ? { ...state.selectedNote, ...updates } 
          : state.selectedNote,
      }));
      return { error: null };
    }

    try {
      // Limpiar campos vacíos - convertir "" a null para campos UUID
      const cleanedUpdates = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      // Solo limpiar si el campo está presente en updates
      if ('assigned_to' in updates) {
        cleanedUpdates.assigned_to = updates.assigned_to || null;
      }
      if ('parent_id' in updates) {
        cleanedUpdates.parent_id = updates.parent_id || null;
      }
      if ('project' in updates) {
        cleanedUpdates.project = updates.project || null;
      }

      // Obtener la nota actual para verificar cambios en asignación
      const { data: currentNote } = await supabase
        .from('notes')
        .select('assigned_to, title')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('notes')
        .update(cleanedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) return { error: error.message };

      // Notificar a nuevos usuarios asignados
      if (cleanedUpdates.assigned_to && cleanedUpdates.assigned_to.length > 0) {
        const currentUser = (await supabase.auth.getUser()).data.user;
        const previousAssigned = currentNote?.assigned_to || [];
        
        // Encontrar nuevos asignados que no estaban antes
        for (const userId of cleanedUpdates.assigned_to) {
          if (!previousAssigned.includes(userId)) {
            await createNotification({
              userId: userId,
              type: 'assignment',
              title: 'Tarea asignada',
              message: `Te han asignado la tarea "${data.title}"`,
              noteId: id,
              fromUserId: currentUser?.id,
            });
          }
        }
      }

      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? data : n)),
        selectedNote: state.selectedNote?.id === id ? data : state.selectedNote,
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  deleteNote: async (id) => {
    console.log('[Notes] Intentando eliminar nota:', id);
    
    // Modo demo
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
      }));
      return { error: null };
    }

    try {
      // Obtener usuario actual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Verificar que la nota existe y obtener su creador
      const { data: noteExists } = await supabase
        .from('notes')
        .select('id, created_by')
        .eq('id', id)
        .single();
      
      if (!noteExists) {
        return { error: 'La nota no existe' };
      }

      // Verificar que el usuario actual es el creador
      if (noteExists.created_by !== currentUser?.id) {
        return { error: 'No puedes eliminar una nota creada por otro usuario' };
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);
      
      if (error) {
        return { error: error.message };
      }
      
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
      }));
      
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  setSelectedNote: (note) => set({ selectedNote: note }),

  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
    get().fetchNotes();
  },
}));

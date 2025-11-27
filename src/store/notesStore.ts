import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured, Note } from '../lib/supabase';

interface NotesState {
  notes: Note[];
  isLoading: boolean;
  selectedNote: Note | null;
  filter: {
    type: string | null;
    status: string | null;
    priority: string | null;
    search: string;
  };

  // Actions
  fetchNotes: () => Promise<void>;
  createNote: (note: Partial<Note>) => Promise<{ error: string | null }>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<{ error: string | null }>;
  deleteNote: (id: string) => Promise<{ error: string | null }>;
  setSelectedNote: (note: Note | null) => void;
  setFilter: (filter: Partial<NotesState['filter']>) => void;
}

// Generar ID único para modo demo
const generateId = () => `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      isLoading: false,
      selectedNote: null,
      filter: {
        type: null,
        status: null,
        priority: null,
        search: '',
      },

      fetchNotes: async () => {
        // En modo demo, las notas ya están en el estado local
        if (!isSupabaseConfigured || !supabase) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          let query = supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

          const { filter } = get();
          
          if (filter.type) query = query.eq('type', filter.type);
          if (filter.status) query = query.eq('status', filter.status);
          if (filter.priority) query = query.eq('priority', filter.priority);
          if (filter.search) query = query.ilike('title', `%${filter.search}%`);

          const { data, error } = await query;
          if (error) throw error;
          set({ notes: data || [], isLoading: false });
        } catch (error) {
          console.error('Error fetching notes:', error);
          set({ isLoading: false });
        }
      },

      createNote: async (note) => {
        // Modo demo - guardar localmente
        if (!isSupabaseConfigured || !supabase) {
          const newNote: Note = {
            id: generateId(),
            title: note.title || '',
            content: note.content || '',
            type: note.type || 'note',
            status: note.status || 'pending',
            priority: note.priority || 'medium',
            project: note.project,
            created_by: note.created_by || 'demo-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tags: note.tags || [],
          };
          set((state) => ({ notes: [newNote, ...state.notes] }));
          return { error: null };
        }

        try {
          const { data, error } = await supabase
            .from('notes')
            .insert([note])
            .select()
            .single();

          if (error) return { error: error.message };
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
          const { data, error } = await supabase
            .from('notes')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

          if (error) return { error: error.message };
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
        // Modo demo
        if (!isSupabaseConfigured || !supabase) {
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
            selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
          }));
          return { error: null };
        }

        try {
          const { error } = await supabase.from('notes').delete().eq('id', id);
          if (error) return { error: error.message };
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
    }),
    {
      name: 'notes-storage',
      partialize: (state) => ({ notes: state.notes }),
    }
  )
);

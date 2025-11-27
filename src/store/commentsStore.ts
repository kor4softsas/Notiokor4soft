import { create } from 'zustand';
import { supabase, isSupabaseConfigured, Comment } from '../lib/supabase';

interface CommentsState {
  comments: Comment[];
  isLoading: boolean;
  
  fetchComments: (noteId: string) => Promise<void>;
  addComment: (noteId: string, content: string, userId: string) => Promise<{ error: string | null }>;
  updateComment: (commentId: string, content: string) => Promise<{ error: string | null }>;
  deleteComment: (commentId: string) => Promise<{ error: string | null }>;
  clearComments: () => void;
}

// Generar ID único para modo demo
const generateId = () => `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useCommentsStore = create<CommentsState>((set) => ({
  comments: [],
  isLoading: false,

  fetchComments: async (noteId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      // En modo demo, retornar comentarios vacíos
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles(full_name, email, avatar_url)
        `)
        .eq('note_id', noteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ comments: data || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching comments:', error);
      set({ isLoading: false });
    }
  },

  addComment: async (noteId: string, content: string, userId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      // Modo demo
      const newComment: Comment = {
        id: generateId(),
        note_id: noteId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          full_name: 'Usuario Demo',
          email: 'demo@kor4soft.com',
        },
      };
      set((state) => ({ comments: [...state.comments, newComment] }));
      return { error: null };
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{ note_id: noteId, user_id: userId, content }])
        .select(`
          *,
          user:profiles(full_name, email, avatar_url)
        `)
        .single();

      if (error) return { error: error.message };
      set((state) => ({ comments: [...state.comments, data] }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  updateComment: async (commentId: string, content: string) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId ? { ...c, content, updated_at: new Date().toISOString() } : c
        ),
      }));
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) return { error: error.message };
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId ? { ...c, content, updated_at: new Date().toISOString() } : c
        ),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  deleteComment: async (commentId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        comments: state.comments.filter((c) => c.id !== commentId),
      }));
      return { error: null };
    }

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) return { error: error.message };
      set((state) => ({
        comments: state.comments.filter((c) => c.id !== commentId),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  clearComments: () => set({ comments: [] }),
}));

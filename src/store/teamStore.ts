import { create } from 'zustand';
import { supabase, isSupabaseConfigured, User } from '../lib/supabase';

interface TeamState {
  members: User[];
  isLoading: boolean;
  _hasFetched: boolean;
  fetchMembers: (force?: boolean) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  members: [],
  isLoading: false,
  _hasFetched: false,

  fetchMembers: async (force = false) => {
    const state = get();
    // Evitar llamadas duplicadas
    if (state.isLoading || (state._hasFetched && !force)) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      // Demo mode - usuarios de prueba
      set({
        members: [
          { id: 'demo-1', email: 'carlos@kor4soft.com', full_name: 'Carlos Mendez', role: 'developer', created_at: '' },
          { id: 'demo-2', email: 'ana@kor4soft.com', full_name: 'Ana García', role: 'developer', created_at: '' },
          { id: 'demo-3', email: 'luis@kor4soft.com', full_name: 'Luis Rodríguez', role: 'admin', created_at: '' },
        ],
        isLoading: false,
        _hasFetched: true,
      });
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      set({ members: data || [], isLoading: false, _hasFetched: true });
    } catch (error) {
      console.error('Error fetching team members:', error);
      set({ isLoading: false, _hasFetched: true });
    }
  },
}));

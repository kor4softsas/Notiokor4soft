import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured, User } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  rememberMe: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setRememberMe: (remember: boolean) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: string | null }>;
  register: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  loginDemo: () => void;
  checkRememberMe: () => void;
}

// Usuario demo para probar sin Supabase
const demoUser: User = {
  id: 'demo-user-1',
  email: 'demo@kor4soft.com',
  full_name: 'Usuario Demo',
  role: 'developer',
  created_at: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      isDemoMode: !isSupabaseConfigured,
      rememberMe: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setRememberMe: (remember) => set({ rememberMe: remember }),

      // Login demo sin Supabase
      loginDemo: () => {
        set({
          user: demoUser,
          session: { demo: true },
          isAuthenticated: true,
          isLoading: false,
        });
      },

      login: async (email, password, rememberMe = false) => {
        // Guardar preferencia de sesión
        set({ rememberMe });
        
        // Modo demo si no hay Supabase configurado
        if (!isSupabaseConfigured || !supabase) {
          set({
            user: { ...demoUser, email, full_name: email.split('@')[0] },
            session: { demo: true },
            isAuthenticated: true,
          });
          return { error: null };
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { error: error.message };
          }

          if (data.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            set({
              user: profile,
              session: data.session,
              isAuthenticated: true,
            });
          }

          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      register: async (email, password, fullName) => {
        if (!isSupabaseConfigured || !supabase) {
          // En modo demo, simplemente hacemos login
          set({
            user: { ...demoUser, email, full_name: fullName },
            session: { demo: true },
            isAuthenticated: true,
          });
          return { error: null };
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
            },
          });

          if (error) {
            return { error: error.message };
          }

          // Login automático después del registro
          if (data.user && data.session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            set({
              user: profile || { id: data.user.id, email, full_name: fullName, role: 'developer', created_at: new Date().toISOString() },
              session: data.session,
              isAuthenticated: true,
            });
          }

          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      logout: async () => {
        if (supabase) {
          await supabase.auth.signOut();
        }
        set({ user: null, session: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        if (!isSupabaseConfigured || !supabase) {
          set({ isLoading: false });
          return;
        }

        try {
          set({ isLoading: true });
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            set({
              user: profile,
              session,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      // Verificar si debe mantener la sesión o cerrarla
      checkRememberMe: () => {
        const state = useAuthStore.getState();
        // Si no tiene "Recordarme" activo y hay sesión, cerrar sesión
        if (!state.rememberMe && state.isAuthenticated) {
          // Cerrar sesión porque no quería permanecer logueado
          if (supabase) {
            supabase.auth.signOut();
          }
          set({ user: null, session: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        session: state.session, 
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
      }),
    }
  )
);

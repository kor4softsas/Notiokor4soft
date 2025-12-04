import { create } from 'zustand';
import { supabase, isSupabaseConfigured, ChatChannel, ChatMessage } from '../lib/supabase';

interface ChatState {
  channels: ChatChannel[];
  messages: ChatMessage[];
  currentChannel: ChatChannel | null;
  isLoading: boolean;
  isLoadingMessages: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  _hasFetchedChannels: boolean;
  _hasFetchedUnread: boolean;
  
  fetchChannels: (force?: boolean) => Promise<void>;
  fetchMessages: (channelId: string) => Promise<void>;
  sendMessage: (channelId: string, content: string, messageType?: 'text' | 'code', codeLanguage?: string) => Promise<{ error: string | null }>;
  editMessage: (messageId: string, content: string) => Promise<{ error: string | null }>;
  deleteMessage: (messageId: string) => Promise<{ error: string | null }>;
  createChannel: (name: string, description?: string, type?: 'public' | 'private') => Promise<{ error: string | null }>;
  setCurrentChannel: (channel: ChatChannel | null) => void;
  subscribeToMessages: (channelId: string) => () => void;
  subscribeToAllMessages: () => () => void;
  addMessage: (message: ChatMessage) => void;
  markAsRead: () => void;
  checkUnreadMessages: (force?: boolean) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  messages: [],
  currentChannel: null,
  isLoading: false,
  isLoadingMessages: false,
  unreadCount: 0,
  hasUnreadMessages: false,
  _hasFetchedChannels: false,
  _hasFetchedUnread: false,

  fetchChannels: async (force = false) => {
    const state = get();
    // Evitar llamadas duplicadas
    if (state.isLoading || (state._hasFetchedChannels && !force)) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      // Demo mode
      set({
        channels: [
          { id: 'demo-1', name: 'general', description: 'Canal general para todo el equipo', type: 'public', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'demo-2', name: 'desarrollo', description: 'Discusiones técnicas y de código', type: 'public', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'demo-3', name: 'random', description: 'Conversaciones casuales', type: 'public', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ],
        isLoading: false,
        _hasFetchedChannels: true,
      });
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const channels = data || [];
      set({ 
        channels, 
        isLoading: false,
        _hasFetchedChannels: true,
        currentChannel: get().currentChannel || channels[0] || null,
      });
    } catch (error) {
      console.error('Error fetching channels:', error);
      set({ isLoading: false, _hasFetchedChannels: true });
    }
  },

  fetchMessages: async (channelId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      // Demo mode
      set({
        messages: [
          { 
            id: 'demo-msg-1', 
            channel_id: channelId, 
            user_id: 'demo-user', 
            content: '¡Bienvenidos al chat del equipo! 🎉', 
            message_type: 'text',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            user: { id: 'demo-user', full_name: 'Sistema', email: 'system@kor4soft.com' }
          },
        ],
        isLoadingMessages: false,
      });
      return;
    }

    set({ isLoadingMessages: true });
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          user:profiles!chat_messages_user_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      set({ messages: data || [], isLoadingMessages: false });
    } catch (error) {
      console.error('Error fetching messages:', error);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (channelId, content, messageType = 'text', codeLanguage) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'No autenticado' };

      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          channel_id: channelId,
          user_id: user.id,
          content,
          message_type: messageType,
          code_language: codeLanguage || null,
        }]);

      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  editMessage: async (messageId, content) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) return { error: error.message };
      
      set((state) => ({
        messages: state.messages.map(m => 
          m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m
        ),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  deleteMessage: async (messageId) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) return { error: error.message };
      
      set((state) => ({
        messages: state.messages.filter(m => m.id !== messageId),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  createChannel: async (name, description, type = 'public') => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('chat_channels')
        .insert([{ name, description, type, created_by: user?.id }])
        .select()
        .single();

      if (error) return { error: error.message };
      
      set((state) => ({
        channels: [...state.channels, data],
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  setCurrentChannel: (channel) => {
    set({ currentChannel: channel, messages: [] });
    if (channel) {
      get().fetchMessages(channel.id);
    }
  },

  addMessage: (message) => {
    set((state) => {
      // Evitar duplicados
      if (state.messages.some(m => m.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    });
  },

  subscribeToMessages: (channelId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return () => {};
    }

    const supabaseClient = supabase; // TypeScript narrowing
    let isSubscribed = false;
    const channel = supabaseClient
      .channel(`chat-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Obtener el mensaje con datos del usuario
          const { data } = await supabaseClient
            .from('chat_messages')
            .select(`
              *,
              user:profiles!chat_messages_user_id_fkey(id, full_name, email, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            get().addMessage(data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          set((state) => ({
            messages: state.messages.filter(m => m.id !== payload.old.id),
          }));
        }
      )
      .subscribe((status) => {
        isSubscribed = status === 'SUBSCRIBED';
      });

    return () => {
      if (isSubscribed) {
        supabaseClient.removeChannel(channel);
      }
    };
  },

  // Suscribirse a TODOS los mensajes nuevos (para notificaciones globales)
  subscribeToAllMessages: () => {
    if (!isSupabaseConfigured || !supabase) {
      return () => {};
    }

    const supabaseClient = supabase;
    let isSubscribed = false;
    
    const channel = supabaseClient
      .channel('chat-all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          // Verificar si el mensaje es de otro usuario
          const { data: { user } } = await supabaseClient.auth.getUser();
          if (user && payload.new.user_id !== user.id) {
            // Hay un mensaje nuevo de otro usuario
            set((state) => ({
              unreadCount: state.unreadCount + 1,
              hasUnreadMessages: true,
            }));
          }
        }
      )
      .subscribe((status) => {
        isSubscribed = status === 'SUBSCRIBED';
      });

    return () => {
      if (isSubscribed) {
        supabaseClient.removeChannel(channel);
      }
    };
  },

  // Marcar todos los mensajes como leídos
  markAsRead: () => {
    localStorage.setItem('chat_last_read', new Date().toISOString());
    set({ unreadCount: 0, hasUnreadMessages: false });
  },

  // Verificar mensajes no leídos al iniciar
  checkUnreadMessages: async (force = false) => {
    const state = get();
    // Evitar llamadas duplicadas
    if (state._hasFetchedUnread && !force) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      set({ _hasFetchedUnread: true });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ _hasFetchedUnread: true });
        return;
      }

      const lastRead = localStorage.getItem('chat_last_read');
      const lastReadDate = lastRead ? new Date(lastRead) : new Date(0);

      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .neq('user_id', user.id)
        .gt('created_at', lastReadDate.toISOString());

      if (!error && count && count > 0) {
        set({ unreadCount: count, hasUnreadMessages: true, _hasFetchedUnread: true });
      } else {
        set({ _hasFetchedUnread: true });
      }
    } catch (error) {
      console.error('Error checking unread messages:', error);
      set({ _hasFetchedUnread: true });
    }
  },
}));

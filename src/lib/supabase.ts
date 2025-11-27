import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credenciales de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificar si hay credenciales válidas
export const isSupabaseConfigured = supabaseUrl !== '' && 
  supabaseAnonKey !== '' && 
  !supabaseUrl.includes('your-project');

// Crear cliente solo si hay credenciales
export const supabase: SupabaseClient | null = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Tipos de la base de datos
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'developer';
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'task' | 'change' | 'bug' | 'feature' | 'note';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project?: string | null;
  assigned_to?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  parent_id?: string | null; // Para subtareas
  // Datos del usuario asignado (join)
  assigned_user?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface Activity {
  id: string;
  user_id: string;
  note_id?: string;
  action: string;
  description: string;
  created_at: string;
}

export interface Comment {
  id: string;
  note_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Datos del usuario (join)
  user?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'comment' | 'assignment' | 'status_change' | 'mention';
  title: string;
  message: string;
  note_id?: string;
  from_user_id?: string;
  read: boolean;
  created_at: string;
  // Datos del usuario que envía (join)
  from_user?: {
    full_name: string;
    avatar_url?: string;
  };
}

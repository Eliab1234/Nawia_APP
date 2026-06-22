import { createClient } from '@supabase/supabase-js';

// Leer variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key-here';

// 1. Cliente principal de Supabase (gestiona sesión local e inicio de sesión normal)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Cliente secundario de Supabase (sin persistencia de sesión)
// Permite al Administrador registrar nuevos usuarios médicos usando signUp() sin alterar o cerrar su sesión actual.
export const supabaseRegister = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// 3. URL del backend externo para inferencia de IA
export const IA_API_URL = import.meta.env.VITE_IA_API_URL || 'http://localhost:8000';

import { createClient } from '@supabase/supabase-js';
import { IS_DEMO } from './demo';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// In demo mode (or if env vars are missing) fall back to a harmless placeholder
// so createClient never throws at import time. Demo mode never issues real
// network calls — the data services short-circuit to in-memory sample data.
const url = supabaseUrl || (IS_DEMO ? 'https://demo.supabase.co' : '');
const anonKey = supabaseAnonKey || (IS_DEMO ? 'demo-anon-key' : '');

if (!url || !anonKey) {
  console.warn(
    '[Fios] Supabase env vars are not set. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or run with VITE_DEMO_MODE=true.'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-key');

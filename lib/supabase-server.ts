import { createClient } from '@supabase/supabase-js';
import { runtimeConfig } from './runtime-config';

export function getSupabaseAdmin() {
  if (!runtimeConfig.supabaseUrl || !runtimeConfig.supabaseServiceRoleKey) return null;
  return createClient(runtimeConfig.supabaseUrl, runtimeConfig.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

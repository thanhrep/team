import { createClient } from '@supabase/supabase-js';
import { runtimeConfig } from './runtime-config';

export function getSupabaseAdmin() {
  if (Boolean(runtimeConfig.supabaseUrl) !== Boolean(runtimeConfig.supabaseServiceRoleKey)) throw new Error('Cấu hình Supabase chưa đầy đủ.');
  if (!runtimeConfig.supabaseUrl || !runtimeConfig.supabaseServiceRoleKey) return null;
  return createClient(runtimeConfig.supabaseUrl, runtimeConfig.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

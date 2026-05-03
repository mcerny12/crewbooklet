/**
 * Supabase Admin Client
 * Uses the service role key — bypasses RLS.
 * ONLY import this in server-side code (API routes, Server Components).
 * NEVER expose to the browser.
 */

import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

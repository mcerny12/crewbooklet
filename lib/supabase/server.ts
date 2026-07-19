/**
 * Supabase Server Client
 * Used in Server Components, API routes, and middleware.
 * Reads/writes session from cookies so it stays in sync with the browser client.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  // Cache-Control/Expires/Pragma headers @supabase/ssr asks callers to apply
  // alongside any cookies it sets, so responses carrying a refreshed session
  // are never cached by a CDN/reverse proxy. Route Handlers can forward these
  // via NextResponse's `headers` init; Server Components have no response to
  // attach them to.
  const responseHeaders = new Headers();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
            Object.entries(headers).forEach(([key, value]) =>
              responseHeaders.set(key, value)
            );
          } catch {
            // Called from a Server Component — cookies are read-only, ignore
          }
        },
      },
    }
  );

  return { supabase, responseHeaders };
}

import { createBrowserClient as createBrowser } from '@supabase/ssr';
import { createServerClient as createServer } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser client — for use in Client Components ('use client')
 */
export function createBrowserClient() {
  return createBrowser(supabaseUrl, supabaseAnonKey);
}

/**
 * Server client — for use in Server Components, API routes, middleware
 * @param {import('next/headers').cookies} cookieStore
 */
export function createServerSupabaseClient(cookieStore) {
  return createServer(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore — this is called from Server Components where cookies are read-only
        }
      },
    },
  });
}

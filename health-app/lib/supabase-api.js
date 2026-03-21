import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Create a Supabase client for API routes.
 * Supports BOTH cookie-based auth (health app) and Bearer token auth (extension).
 *
 * @param {Request} request - The incoming request
 * @returns {{ supabase, user }} - Supabase client and authenticated user (or null)
 */
export async function createAuthenticatedClient(request) {
  // Check for Bearer token first (from Chrome extension)
  const authHeader = request?.headers?.get?.('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Create a direct Supabase client with the user's access token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);

    return { supabase, user: error ? null : user };
  }

  // Fallback to cookie-based auth (from health app web UI)
  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch { /* read-only context */ }
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

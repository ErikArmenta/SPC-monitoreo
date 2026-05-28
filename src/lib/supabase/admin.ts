import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin client — usa el service role key.
 * Bypasses Row Level Security. Solo usar en Server Components / Server Actions.
 * NUNCA exponer al cliente browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

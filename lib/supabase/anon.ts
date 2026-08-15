import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cookie-free anonymous client for public reads inside cache scopes.
// The cookie-bound server client (./server) is a request-time API and
// would dynamize anything that calls it; this one is pure.
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

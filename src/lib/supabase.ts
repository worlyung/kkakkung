import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAppEnv } from "./env";

export function createSupabaseServiceClient() {
  const env = getAppEnv();

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

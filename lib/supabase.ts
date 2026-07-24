import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

// Service-role client: bypasses RLS, so every repository query MUST scope by
// the authenticated Clerk user id. Never import this into a client component.
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

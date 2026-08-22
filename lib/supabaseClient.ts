"use client";

import { createClient } from "@supabase/supabase-js";

// Browser-only client, authenticated as whoever is signed in (uses the
// public anon key - safe to expose). Handles magic-link sign-in and keeps
// the session in localStorage between visits.
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);
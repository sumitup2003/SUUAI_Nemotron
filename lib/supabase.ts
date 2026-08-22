import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the service role key so it must NEVER be
// imported from a "use client" component - only from app/api/* route
// handlers (or other server-only code).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

// Verifies the bearer token the browser sends on every API request and
// returns the Supabase user it belongs to, or null if there isn't one /
// it's invalid or expired.
export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
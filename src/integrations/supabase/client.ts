import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient<Database>(url, key) : null;
export function cloudClient() {
  if (!supabase)
    throw new Error(
      "Account services are not configured. You can still use this browser workspace.",
    );
  return supabase;
}

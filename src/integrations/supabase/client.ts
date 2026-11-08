import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import {
  ACCOUNT_EVENT,
  createPurchaseAccount,
  sharedAccountConfig,
} from "../suite/account";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient<Database>(url, key) : null;
const browser = typeof window !== "undefined";
const sourceStorage =
  typeof localStorage !== "undefined"
    ? localStorage
    : { getItem: () => null, setItem: () => {} };
export const sharedAccount = createPurchaseAccount(
  sharedAccountConfig(import.meta.env, browser ? window.location.origin : ""),
  sourceStorage,
  {
    changed: () => {
      if (browser) window.dispatchEvent(new Event(ACCOUNT_EVENT));
    },
  },
);
const suiteDataClient =
  url && key
    ? createClient<Database>(url, key, {
        accessToken: () => sharedAccount.accessToken(),
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;
export function cloudClient() {
  if (!supabase)
    throw new Error(
      "Account services are not configured. You can still use this browser workspace.",
    );
  return sharedAccount.source() === "suite" ? suiteDataClient! : supabase;
}

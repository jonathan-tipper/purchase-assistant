import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import {
  ACCOUNT_EVENT,
  ACCOUNT_SOURCE_KEY,
  createPurchaseAccount,
  sharedAccountConfig,
} from "../suite/account";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient<Database>(url, key) : null;
const browser = typeof window !== "undefined";
const fallbackValues = new Map<string, string>([[ACCOUNT_SOURCE_KEY, "suite"]]);
let sourceStorage: Pick<Storage, "getItem" | "setItem">;
try {
  if (!browser) throw new Error("No browser storage");
  sourceStorage = window.localStorage;
} catch {
  sourceStorage = {
    getItem: (key) => fallbackValues.get(key) ?? null,
    setItem: (key, value) => {
      fallbackValues.set(key, value);
    },
  };
}
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
  url && key && sharedAccount.configured
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
  if (sharedAccount.source() === "suite") {
    if (!suiteDataClient)
      throw new Error(
        "Shared account access is unavailable on this deployment.",
      );
    return suiteDataClient;
  }
  return supabase;
}

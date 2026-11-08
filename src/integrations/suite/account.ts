import {
  browserSuiteStore,
  createSuiteClient,
  safeReturnPath,
  type SuiteClient,
  type SuiteStore,
} from "./suite-client.mjs";

export const ACCOUNT_ORIGIN = "https://www.jonathantipper.com";
export const ACCOUNT_SOURCE_KEY = "pa.account.source.v1";
export const ACCOUNT_EVENT = "pa-account-change";
export const DEFAULT_CALLBACK =
  "https://buyornot.jonathantipper.com/auth/suite/callback";

type Environment = Record<string, string | boolean | undefined>;
export type SharedAccountConfig = {
  enabled: boolean;
  supabaseUrl: string;
  publishableKey: string;
  clientId: string;
  redirectUri: string;
};

/** An app return is local and cannot execute another auth callback. */
export function safePurchaseNext(value: unknown) {
  const next = safeReturnPath(value, "/workspace");
  let decoded = next;
  for (let i = 0; i < 4; i++) {
    if (
      /^\/auth(?:\/|$)/i.test(
        new URL(decoded, "https://purchase.invalid").pathname,
      )
    )
      return "/workspace";
    try {
      const parsed = decodeURIComponent(decoded);
      if (parsed === decoded) break;
      decoded = parsed;
    } catch {
      return "/workspace";
    }
  }
  return next;
}

export function sharedAccountConfig(
  env: Environment,
  appOrigin: string,
): SharedAccountConfig | null {
  try {
    const supabaseUrl = new URL(String(env.VITE_SUPABASE_URL ?? ""));
    const callback = new URL(
      String(env.VITE_SHARED_AUTH_REDIRECT_URI || DEFAULT_CALLBACK),
    );
    const clientId = String(env.VITE_SHARED_AUTH_CLIENT_ID ?? "");
    const publishableKey = String(env.VITE_SUPABASE_ANON_KEY ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(
      callback.hostname,
    );
    if (
      supabaseUrl.pathname !== "/" ||
      supabaseUrl.username ||
      supabaseUrl.password ||
      supabaseUrl.search ||
      supabaseUrl.hash ||
      (supabaseUrl.protocol !== "https:" &&
        !(
          ["localhost", "127.0.0.1", "[::1]"].includes(supabaseUrl.hostname) &&
          supabaseUrl.protocol === "http:"
        )) ||
      callback.origin !== appOrigin ||
      callback.pathname !== "/auth/suite/callback" ||
      callback.search ||
      callback.hash ||
      callback.username ||
      callback.password ||
      (callback.protocol !== "https:" &&
        !(local && callback.protocol === "http:")) ||
      !/^[A-Za-z0-9_-]{8,100}$/.test(clientId) ||
      !publishableKey
    )
      return null;
    return {
      enabled: env.VITE_SHARED_AUTH_ENABLED === "true",
      supabaseUrl: supabaseUrl.origin,
      publishableKey,
      clientId,
      redirectUri: callback.href,
    };
  } catch {
    return null;
  }
}

/**
 * Keep the app's OAuth credentials separate from the legacy Supabase SDK session.
 * A sticky source prevents local sign-out from silently reviving an old account.
 */
export function createPurchaseAccount(
  config: SharedAccountConfig | null,
  sourceStorage: Pick<Storage, "getItem" | "setItem">,
  options: {
    store?: SuiteStore;
    fetch?: typeof fetch;
    now?: () => number;
    changed?: () => void;
  } = {},
) {
  const client: SuiteClient | null = config
    ? createSuiteClient({
        ...config,
        store: options.store ?? browserSuiteStore("pa-account"),
        fetch: options.fetch,
        now: options.now,
      })
    : null;
  const source = () =>
    sourceStorage.getItem(ACCOUNT_SOURCE_KEY) === "suite"
      ? ("suite" as const)
      : ("legacy" as const);
  const changed = () => options.changed?.();
  return {
    enabled: config?.enabled === true,
    configured: client !== null,
    clientId: config?.clientId ?? "",
    supabaseUrl: config?.supabaseUrl ?? "",
    publishableKey: config?.publishableKey ?? "",
    source,
    useLegacySession() {
      sourceStorage.setItem(ACCOUNT_SOURCE_KEY, "legacy");
      changed();
    },
    async begin(next: unknown) {
      if (!config?.enabled || !client)
        throw new Error(
          "Shared sign-in is unavailable on this deployment. You can continue in this browser.",
        );
      const url = await client.authorisationUrl(safePurchaseNext(next));
      sourceStorage.setItem(ACCOUNT_SOURCE_KEY, "suite");
      changed();
      return url;
    },
    async complete(url: string) {
      if (!client)
        throw new Error(
          "This sign-in return is not configured for this deployment.",
        );
      // Completion remains available with the entry flag off for issued requests.
      const result = await client.complete(url);
      sourceStorage.setItem(ACCOUNT_SOURCE_KEY, "suite");
      changed();
      return safePurchaseNext(result.next);
    },
    async accessToken() {
      if (source() !== "suite") return null;
      if (!client)
        throw new Error(
          "Shared account access is unavailable on this deployment.",
        );
      return client.accessToken();
    },
    async signOut() {
      try {
        if (client) await client.signOut({ scope: "local" });
      } finally {
        sourceStorage.setItem(ACCOUNT_SOURCE_KEY, "suite");
        changed();
      }
    },
  };
}

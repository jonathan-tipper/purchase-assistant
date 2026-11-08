import { describe, expect, it } from "vitest";
import {
  ACCOUNT_SOURCE_KEY,
  createPurchaseAccount,
  safePurchaseNext,
  sharedAccountConfig,
  type SharedAccountConfig,
} from "../src/integrations/suite/account";

const origin = "https://buyornot.jonathantipper.com";
const config: SharedAccountConfig = {
  enabled: true,
  supabaseUrl: "https://auth.example.test",
  publishableKey: "public-test",
  clientId: "purchase-client-25",
  redirectUri: origin + "/auth/suite/callback",
};
function fixture(enabled = true) {
  const values = new Map<string, string>();
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let clock = 1_000_000;
  let handler = async (_url: string) =>
    Response.json({
      access_token: "access-one",
      refresh_token: "refresh-one",
      expires_in: 60,
      token_type: "bearer",
    });
  const store = {
    async get(k: string) {
      return values.get(k) ?? null;
    },
    async set(k: string, v: string) {
      values.set(k, v);
    },
    async remove(k: string) {
      values.delete(k);
    },
  };
  const source = {
    getItem(k: string) {
      return values.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      values.set(k, v);
    },
  };
  const options = {
    store,
    now: () => clock,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      return handler(url);
    },
  };
  const account = createPurchaseAccount(
    { ...config, enabled },
    source,
    options,
  );
  return {
    account,
    values,
    requests,
    recreate(enabled: boolean) {
      return createPurchaseAccount({ ...config, enabled }, source, options);
    },
    advance(ms: number) {
      clock += ms;
    },
    respond(fn: typeof handler) {
      handler = fn;
    },
  };
}
async function complete(
  f: ReturnType<typeof fixture>,
  next = "/decisions/one?tab=research#sources",
) {
  const request = new URL(await f.account.begin(next));
  const returned = await f.account.complete(
    config.redirectUri +
      "?code=one-use-code&state=" +
      request.searchParams.get("state"),
  );
  return { request, returned };
}

describe("Purchase shared-account transport", () => {
  it("fails closed when source storage throws, including when shared entry is off", async () => {
    const blocked = {
      getItem(): string | null {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("SecurityError");
      },
    };
    const account = createPurchaseAccount(null, blocked);
    expect(account.enabled).toBe(false);
    expect(account.source()).toBe("suite");
    await expect(account.signOut()).resolves.toBeUndefined();
    expect(account.source()).toBe("suite");
  });
  it("does not revive a stale legacy selection when source writes fail", async () => {
    const values = new Map<string, string>();
    const account = createPurchaseAccount(
      config,
      {
        getItem: () => "legacy",
        setItem() {
          throw new Error("QuotaExceededError");
        },
      },
      {
        store: {
          async get(k) {
            return values.get(k) ?? null;
          },
          async set(k, v) {
            values.set(k, v);
          },
          async remove(k) {
            values.delete(k);
          },
        },
        fetch: async (input) =>
          String(input).includes("/logout")
            ? new Response(null, { status: 204 })
            : Response.json({
                access_token: "access",
                refresh_token: "refresh",
                expires_in: 60,
                token_type: "bearer",
              }),
      },
    );
    expect(account.source()).toBe("legacy");
    const request = new URL(await account.begin("/workspace"));
    expect(account.source()).toBe("suite");
    await account.complete(
      config.redirectUri +
        "?code=code&state=" +
        request.searchParams.get("state"),
    );
    await account.signOut();
    expect(account.source()).toBe("suite");
    expect(await account.accessToken()).toBe(null);
  });
  it("uses a registered PKCE transaction, preserves the local decision return and never replaces legacy credentials", async () => {
    const f = fixture();
    f.values.set("legacy-supabase-session", "keep-original");
    const { request, returned } = await complete(f);
    expect(request.origin).toBe(config.supabaseUrl);
    expect(request.pathname).toBe("/auth/v1/oauth/authorize");
    expect(request.searchParams.get("client_id")).toBe(config.clientId);
    expect(request.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(request.searchParams.get("code_challenge_method")).toBe("S256");
    expect(returned).toBe("/decisions/one?tab=research#sources");
    expect(await f.account.accessToken()).toBe("access-one");
    expect(f.values.get("legacy-supabase-session")).toBe("keep-original");
    const exchange = new URLSearchParams(f.requests[0].init?.body as string);
    expect(exchange.get("grant_type")).toBe("authorization_code");
    expect(exchange.get("client_id")).toBe(config.clientId);
    expect(f.requests[0].init?.credentials).toBe("omit");
  });
  it("rejects missing, foreign and replayed callback state before a second exchange", async () => {
    const f = fixture();
    const request = new URL(await f.account.begin("/workspace"));
    const state = request.searchParams.get("state");
    await expect(
      f.account.complete(
        "https://foreign.example/auth/suite/callback?code=code&state=" + state,
      ),
    ).rejects.toMatchObject({ code: "callback" });
    await expect(
      f.account.complete(config.redirectUri + "?code=code"),
    ).rejects.toMatchObject({ code: "state" });
    const callback = config.redirectUri + "?code=code&state=" + state;
    await f.account.complete(callback);
    await expect(f.account.complete(callback)).rejects.toMatchObject({
      code: "state",
    });
    expect(f.requests).toHaveLength(1);
  });
  it("accepts an outstanding callback with new entry disabled, but cannot initiate another login", async () => {
    const f = fixture();
    const request = new URL(await f.account.begin("/workspace"));
    const disabled = f.recreate(false);
    await expect(disabled.begin("/workspace")).rejects.toThrow("unavailable");
    await expect(
      disabled.complete(
        config.redirectUri +
          "?code=code&state=" +
          request.searchParams.get("state"),
      ),
    ).resolves.toBe("/workspace");
    expect(await disabled.accessToken()).toBe("access-one");
  });
  it("uses the OAuth refresh endpoint and coalesces simultaneous token renewal", async () => {
    const f = fixture();
    await complete(f);
    f.advance(31_000);
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    f.respond(async () => {
      await ready;
      return Response.json({
        access_token: "access-two",
        refresh_token: "refresh-two",
        expires_in: 60,
        token_type: "bearer",
      });
    });
    const a = f.account.accessToken();
    const b = f.account.accessToken();
    await new Promise((resolve) => setTimeout(resolve, 0));
    release();
    expect(await Promise.all([a, b])).toEqual(["access-two", "access-two"]);
    expect(f.requests).toHaveLength(2);
    const refresh = new URLSearchParams(f.requests[1].init?.body as string);
    expect(refresh.get("grant_type")).toBe("refresh_token");
    expect(refresh.get("client_id")).toBe(config.clientId);
    expect(refresh.get("refresh_token")).toBe("refresh-one");
  });
  it("keeps local sign-out sticky even when remote revocation fails", async () => {
    const f = fixture();
    await complete(f);
    f.respond(async () => new Response(null, { status: 503 }));
    await expect(f.account.signOut()).rejects.toMatchObject({
      code: "logout_service",
    });
    expect(f.account.source()).toBe("suite");
    expect(f.values.get(ACCOUNT_SOURCE_KEY)).toBe("suite");
    expect(await f.account.accessToken()).toBe(null);
  });
  it.each([
    "//foreign.example",
    "/.//foreign.example/app",
    "/%2e//foreign.example",
    "/auth/suite/callback?code=unsafe",
    "/%61uth/suite/callback",
    "/%2561uth?next=/workspace",
    "/AUTH",
    "https://foreign.example",
  ])("keeps unsafe or auth-loop returns local: %s", async (value) => {
    expect(safePurchaseNext(value)).toBe("/workspace");
    const f = fixture();
    expect((await complete(f, value)).returned).toBe("/workspace");
  });
});

describe("deployment configuration", () => {
  const env = {
    VITE_SUPABASE_URL: config.supabaseUrl,
    VITE_SUPABASE_ANON_KEY: "public-test",
    VITE_SHARED_AUTH_CLIENT_ID: config.clientId,
    VITE_SHARED_AUTH_ENABLED: "true",
  };
  it("only enables a configured exact-origin callback", () => {
    expect(sharedAccountConfig(env, origin)).toMatchObject({
      enabled: true,
      redirectUri: config.redirectUri,
    });
    expect(sharedAccountConfig(env, "https://preview.example")).toBe(null);
    expect(
      sharedAccountConfig(
        {
          ...env,
          VITE_SHARED_AUTH_REDIRECT_URI: config.redirectUri + "?next=x",
        },
        origin,
      ),
    ).toBe(null);
    expect(
      sharedAccountConfig({ ...env, VITE_SHARED_AUTH_CLIENT_ID: "" }, origin),
    ).toBe(null);
    expect(
      sharedAccountConfig({ ...env, VITE_SHARED_AUTH_ENABLED: "false" }, origin)
        ?.enabled,
    ).toBe(false);
  });
});

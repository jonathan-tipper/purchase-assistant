// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});
describe("real Supabase data transport", () => {
  it.each([false, true])(
    "loads without browser storage when shared entry is disabled (cloud configured: %s)",
    async (configured) => {
      vi.resetModules();
      vi.stubEnv(
        "VITE_SUPABASE_URL",
        configured ? "https://auth.example.test" : "",
      );
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", configured ? "public-test-key" : "");
      vi.stubEnv("VITE_SHARED_AUTH_ENABLED", "false");
      const getter = vi
        .spyOn(window, "localStorage", "get")
        .mockImplementation(() => {
          throw new DOMException("Storage blocked", "SecurityError");
        });
      try {
        const { sharedAccount, supabase, cloudClient } =
          await import("../src/integrations/supabase/client");
        expect(supabase === null).toBe(!configured);
        expect(sharedAccount.enabled).toBe(false);
        expect(sharedAccount.source()).toBe("suite");
        expect(() => cloudClient()).toThrow(/unavailable|not configured/);
      } finally {
        getter.mockRestore();
      }
    },
  );
  it("uses the app OAuth adapter bearer for data and functions without SDK session injection", async () => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    const origin = window.location.origin;
    vi.stubEnv("VITE_SUPABASE_URL", "https://auth.example.test");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-test-key");
    vi.stubEnv("VITE_SHARED_AUTH_ENABLED", "true");
    vi.stubEnv("VITE_SHARED_AUTH_CLIENT_ID", "purchase-client-25");
    vi.stubEnv(
      "VITE_SHARED_AUTH_REDIRECT_URI",
      origin + "/auth/suite/callback",
    );
    const requests: Array<{ url: string; headers: Headers }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, headers: new Headers(init?.headers) });
        if (url.includes("/oauth/token"))
          return Response.json({
            access_token: "purchase-owned-access",
            refresh_token: "purchase-owned-refresh",
            expires_in: 3600,
            token_type: "bearer",
          });
        if (url.includes("/functions/"))
          return Response.json({ extraction: { name: "Fixture" } });
        return Response.json([]);
      }),
    );
    const { sharedAccount, cloudClient, supabase } =
      await import("../src/integrations/supabase/client");
    expect(cloudClient()).toBe(supabase);
    const authorize = new URL(await sharedAccount.begin("/workspace"));
    await sharedAccount.complete(
      origin +
        "/auth/suite/callback?code=fixture-code&state=" +
        authorize.searchParams.get("state"),
    );
    const client = cloudClient();
    expect(client).not.toBe(supabase);
    const rows = await client.from("pa_decisions").select("*");
    expect(rows.error).toBe(null);
    const answer = await client.functions.invoke("decision-assistant", {
      body: { action: "extract", description: "Fixture" },
    });
    expect(answer.error).toBe(null);
    const protectedRequests = requests.filter(
      (r) => r.url.includes("/rest/") || r.url.includes("/functions/"),
    );
    expect(protectedRequests).toHaveLength(2);
    for (const request of protectedRequests)
      expect(request.headers.get("Authorization")).toBe(
        "Bearer purchase-owned-access",
      );
    expect(await supabase!.auth.getSession()).toMatchObject({
      data: { session: null },
    });
  });
});

// @vitest-environment jsdom
import { StrictMode, Suspense, lazy } from "react";
import { webcrypto } from "node:crypto";
import { transferableAbortController } from "node:util";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import SuiteCallback from "../src/pages/SuiteCallback";
import {
  ACCOUNT_EVENT,
  ACCOUNT_SOURCE_KEY,
  createPurchaseAccount,
} from "../src/integrations/suite/account";

const mocks = vi.hoisted(() => ({
  account: null as ReturnType<typeof createPurchaseAccount> | null,
}));
vi.mock("../src/integrations/supabase/client", () => ({
  supabase: null,
  sharedAccount: {
    enabled: true,
    clientId: "purchase-client-25",
    supabaseUrl: "https://auth.example.test",
    publishableKey: "public-fixture",
    source: () => mocks.account!.source(),
    accessToken: () => mocks.account!.accessToken(),
    begin: (next: string) => mocks.account!.begin(next),
    complete: (url: string) => mocks.account!.complete(url),
    signOut: () => mocks.account!.signOut(),
    clearSessionIfCurrent: (token: string) =>
      mocks.account!.clearSessionIfCurrent(token),
  },
}));
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "fixture@example.test",
};
const callbackPath = "/auth/suite/callback";
const profile = vi.fn();
const routers: ReturnType<typeof createBrowserRouter>[] = [];
const token =
  "header." +
  btoa(
    JSON.stringify({
      sub: user.id,
      iss: "https://auth.example.test/auth/v1",
      role: "authenticated",
      aud: "authenticated",
      client_id: "purchase-client-25",
    }),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "") +
  ".signature";

function Destination() {
  const account = useAuth();
  const location = useLocation();
  return (
    <>
      <h1>Account workspace</h1>
      <p>{account.user?.email}</p>
      <p>{location.pathname + location.search + location.hash}</p>
    </>
  );
}
function callbackApp(destination = <Destination />) {
  const router = createBrowserRouter([
    { path: callbackPath, element: <SuiteCallback /> },
    { path: "/workspace", element: destination },
    { path: "/auth", element: <h1>Account entry</h1> },
    { path: "/", element: <h1>Guest workspace</h1> },
  ]);
  routers.push(router);
  return render(
    <StrictMode>
      <AuthProvider>
        <Suspense fallback={<p>Opening account workspace</p>}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </StrictMode>,
  );
}
async function response(next = "/workspace?view=saved#items") {
  const url = new URL(await mocks.account!.begin(next));
  return (
    window.location.origin +
    callbackPath +
    "?code=synthetic-code&state=" +
    url.searchParams.get("state")
  );
}
async function seedAccount() {
  await mocks.account!.complete(await response());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  // Router uses Node's Request in jsdom; use matching native abort primitives.
  const nativeAbort = transferableAbortController();
  vi.stubGlobal("AbortController", nativeAbort.constructor);
  vi.stubGlobal("AbortSignal", nativeAbort.signal.constructor);
  window.localStorage.clear();
  window.localStorage.setItem(ACCOUNT_SOURCE_KEY, "suite");
  const values = new Map<string, string>();
  const transport = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    if (path === "/auth/v1/oauth/token")
      return Response.json({
        access_token: token,
        refresh_token: "synthetic-refresh",
        expires_in: 3600,
        token_type: "bearer",
      });
    expect(path).toBe("/auth/v1/user");
    profile();
    return Response.json(user);
  });
  vi.stubGlobal("fetch", transport);
  mocks.account = createPurchaseAccount(
    {
      enabled: true,
      supabaseUrl: "https://auth.example.test",
      publishableKey: "public-fixture",
      clientId: "purchase-client-25",
      redirectUri: window.location.origin + callbackPath,
    },
    window.localStorage,
    {
      store: {
        get: async (key) => values.get(key) ?? null,
        set: async (key, value) => {
          values.set(key, value);
        },
        remove: async (key) => {
          values.delete(key);
        },
      },
      fetch: transport,
      changed: () => window.dispatchEvent(new Event(ACCOUNT_EVENT)),
    },
  );
});
afterEach(() => {
  cleanup();
  for (const router of routers.splice(0)) router.dispose();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("shared callback browser navigation", () => {
  it("does not rewrite the destination URL when AuthProvider restores during lazy route navigation", async () => {
    const incoming = await response();
    window.history.replaceState(
      { usr: { fixture: true }, key: "callback-key", idx: 3 },
      "",
      incoming,
    );
    const complete = vi.spyOn(mocks.account!, "complete");
    const history = vi.spyOn(window.history, "replaceState");
    let openWorkspace!: () => void;
    const Workspace = lazy(
      () =>
        new Promise<{ default: typeof Destination }>((resolve) => {
          openWorkspace = () => resolve({ default: Destination });
        }),
    );
    callbackApp(<Workspace />);
    expect(window.location.search).toBe("");
    await waitFor(() => expect(window.location.pathname).toBe("/workspace"));
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await act(async () => {
      openWorkspace();
    });
    expect(
      await screen.findByRole("heading", { name: "Account workspace" }),
    ).toBeTruthy();
    expect(screen.getByText(user.email)).toBeTruthy();
    expect(
      window.location.pathname + window.location.search + window.location.hash,
    ).toBe("/workspace?view=saved#items");
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(incoming);
    const scrubs = history.mock.calls.filter(
      (call) => call[2] === callbackPath,
    );
    expect(scrubs).toHaveLength(1);
    expect(scrubs[0][0]).toMatchObject({ key: "callback-key", idx: 3 });
  });

  it("verifies an existing account on a fresh clean callback visit and replaces the route with workspace", async () => {
    await seedAccount();
    window.history.replaceState(null, "", callbackPath);
    const complete = vi.spyOn(mocks.account!, "complete");
    callbackApp();
    expect(
      await screen.findByRole("heading", { name: "Account workspace" }),
    ).toBeTruthy();
    expect(screen.getByText(user.email)).toBeTruthy();
    expect(window.location.pathname).toBe("/workspace");
    expect(profile).toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it.each([
    "?code=synthetic",
    "?state=invalid&code=synthetic",
    "?unknown=synthetic",
    "#fragment",
    "?",
    "#",
  ])(
    "rejects response input %s instead of falling back to an existing account",
    async (suffix) => {
      await seedAccount();
      window.history.replaceState(null, "", callbackPath + suffix);
      const complete = vi.spyOn(mocks.account!, "complete");
      callbackApp();
      expect(
        await screen.findByRole("heading", { name: "Sign in again." }),
      ).toBeTruthy();
      expect(screen.queryByRole("heading", { name: "Account workspace" })).toBe(
        null,
      );
      expect(complete).toHaveBeenCalledTimes(1);
      expect(window.location.pathname).toBe(callbackPath);
      expect(window.location.search + window.location.hash).toBe("");
      expect(
        screen
          .getByRole("link", { name: "Continue in this browser" })
          .getAttribute("href"),
      ).toBe("/");
    },
  );

  it("offers restart on a clean callback without an account", async () => {
    window.history.replaceState(null, "", callbackPath);
    callbackApp();
    expect(
      await screen.findByRole("heading", { name: "Sign in again." }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Start sign-in again" })
        .getAttribute("href"),
    ).toBe("/auth");
    expect(screen.queryByRole("heading", { name: "Account workspace" })).toBe(
      null,
    );
  });
});

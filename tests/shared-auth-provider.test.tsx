// @vitest-environment jsdom
import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { ACCOUNT_EVENT } from "../src/integrations/suite/account";

const mocks = vi.hoisted(() => ({
  token: "",
  complete: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("../src/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
      getSession: async () => ({ data: { session: null } }),
    },
  },
  sharedAccount: {
    enabled: true,
    clientId: "purchase-client-25",
    supabaseUrl: "https://auth.example.test",
    publishableKey: "public-test",
    source: () => "suite",
    accessToken: async () => mocks.token || null,
    begin: vi.fn(),
    complete: mocks.complete,
    signOut: mocks.signOut,
  },
}));
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "fixture@example.test",
};
function token() {
  return (
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
    ".signature"
  );
}
function Probe() {
  const account = useAuth();
  const [next, setNext] = useState("");
  return (
    <>
      <p>{account.loading ? "Loading" : (account.user?.email ?? "Guest")}</p>
      <p>{next}</p>
      <button
        onClick={() => {
          void account.signOut();
        }}
      >
        Sign out fixture
      </button>
      <button
        onClick={() => {
          void account
            .completeSharedSignIn(
              "https://buyornot.jonathantipper.com/auth/suite/callback?code=fixture&state=fixture",
            )
            .then(setNext);
        }}
      >
        Complete fixture
      </button>
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.token = token();
  mocks.signOut.mockImplementation(async () => {
    mocks.token = "";
    window.dispatchEvent(new Event(ACCOUNT_EVENT));
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("shared identity restoration", () => {
  it("coalesces focus-driven verification while a request is pending", async () => {
    let resolve!: (response: Response) => void;
    const transport = vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal("fetch", transport);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
    fireEvent.focus(window);
    fireEvent.focus(window);
    expect(transport).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve(Response.json(user));
    });
    expect(await screen.findByText(user.email)).toBeTruthy();
  });
  it("cannot restore an old response after local sign-out", async () => {
    let resolve!: (response: Response) => void;
    const transport = vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal("fetch", transport);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Sign out fixture" }));
    expect(await screen.findByText("Guest")).toBeTruthy();
    await act(async () => {
      resolve(Response.json(user));
    });
    expect(screen.queryByText(user.email)).toBe(null);
    expect(screen.getByText("Guest")).toBeTruthy();
  });
  it("verifies callback identity once before returning to the protected app", async () => {
    mocks.token = "";
    mocks.complete.mockImplementation(async () => {
      mocks.token = token();
      window.dispatchEvent(new Event(ACCOUNT_EVENT));
      return "/workspace?view=saved#items";
    });
    const transport = vi.fn(async () => Response.json(user));
    vi.stubGlobal("fetch", transport);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("Guest");
    fireEvent.click(screen.getByRole("button", { name: "Complete fixture" }));
    expect(await screen.findByText("/workspace?view=saved#items")).toBeTruthy();
    expect(screen.getByText(user.email)).toBeTruthy();
    expect(transport).toHaveBeenCalledTimes(1);
  });
});

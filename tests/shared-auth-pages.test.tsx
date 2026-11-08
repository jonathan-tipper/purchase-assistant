// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Auth from "../src/pages/Auth";
import SuiteCallback from "../src/pages/SuiteCallback";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  start: vi.fn(),
  complete: vi.fn(),
  update: vi.fn(),
  legacy: vi.fn(),
}));
vi.mock("../src/contexts/AuthContext", () => ({ useAuth: mocks.auth }));
vi.mock("../src/integrations/supabase/client", () => ({
  supabase: { auth: { updateUser: mocks.update } },
  sharedAccount: { useLegacySession: mocks.legacy },
}));
function Destination() {
  const location = useLocation();
  return (
    <p>
      {"Destination: " + location.pathname + location.search + location.hash}
    </p>
  );
}
function authPage(
  entry = "/auth?next=%2Fdecisions%2Fone%3Ftab%3Dresearch%23sources",
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/workspace" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockReturnValue({
    user: null,
    sharedEnabled: true,
    startSharedSignIn: mocks.start,
    completeSharedSignIn: mocks.complete,
  });
  mocks.start.mockResolvedValue(undefined);
  mocks.update.mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe("shared account entry", () => {
  it("offers central sign-in without duplicate credential fields and retains guest use", async () => {
    authPage();
    expect(screen.queryByLabelText("Email")).toBe(null);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with jonathantipper.com" }),
    );
    await waitFor(() =>
      expect(mocks.start).toHaveBeenCalledWith(
        "/decisions/one?tab=research#sources",
      ),
    );
    expect(
      screen
        .getByRole("link", { name: "Continue in this browser" })
        .getAttribute("href"),
    ).toBe("/");
    expect(
      screen
        .getByRole("link", { name: "Reset your shared account password" })
        .getAttribute("href"),
    ).toBe("https://www.jonathantipper.com/forgot-password");
    expect(
      screen
        .getByRole("link", { name: "Manage your account" })
        .getAttribute("href"),
    ).toBe("https://www.jonathantipper.com/account");
  });
  it("falls back to the supported legacy form while new shared entry is disabled", () => {
    mocks.auth.mockReturnValue({ user: null, sharedEnabled: false });
    authPage();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Continue with jonathantipper.com",
      }),
    ).toBe(null);
  });
  it("keeps an already-issued legacy password recovery form accepting", async () => {
    authPage("/auth?mode=recovery");
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "fixture-new-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        password: "fixture-new-password",
      }),
    );
    expect(mocks.legacy).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Destination: /workspace")).toBeTruthy();
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("shows a recoverable central-service error", async () => {
    mocks.start.mockRejectedValue(
      new Error("Sign-in is temporarily unavailable."),
    );
    authPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with jonathantipper.com" }),
    );
    expect(
      await screen.findByText("Sign-in is temporarily unavailable."),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Continue with jonathantipper.com",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});

describe("shared callback presentation", () => {
  it("strips the one-use query immediately and completes only once under StrictMode", async () => {
    window.history.replaceState(
      null,
      "",
      "/auth/suite/callback?code=fixture-code&state=fixture-state",
    );
    let resolve!: (next: string) => void;
    mocks.complete.mockReturnValue(
      new Promise<string>((done) => {
        resolve = done;
      }),
    );
    render(
      <StrictMode>
        <MemoryRouter
          initialEntries={[
            "/auth/suite/callback?code=fixture-code&state=fixture-state",
          ]}
        >
          <Routes>
            <Route path="/auth/suite/callback" element={<SuiteCallback />} />
            <Route path="/workspace" element={<Destination />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );
    expect(window.location.search).toBe("");
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    expect(mocks.complete.mock.calls[0][0]).toContain(
      "?code=fixture-code&state=fixture-state",
    );
    resolve("/workspace?view=saved#items");
    expect(
      await screen.findByText("Destination: /workspace?view=saved#items"),
    ).toBeTruthy();
  });
  it("retains restart and guest navigation after a cancelled or expired transaction", async () => {
    window.history.replaceState(
      null,
      "",
      "/auth/suite/callback?error=access_denied&state=fixture-state",
    );
    mocks.complete.mockRejectedValue(
      new Error("Sign-in was cancelled. Start again."),
    );
    render(
      <MemoryRouter>
        <SuiteCallback />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText("Sign-in was cancelled. Start again."),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Start sign-in again" })
        .getAttribute("href"),
    ).toBe("/auth");
    expect(
      screen
        .getByRole("link", { name: "Continue in this browser" })
        .getAttribute("href"),
    ).toBe("/");
  });
});

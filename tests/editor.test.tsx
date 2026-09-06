// @vitest-environment jsdom
import { transferableAbortController } from "node:util";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import DecisionPage from "../src/pages/Decision";
import {
  coffeeExample,
  markOutcome,
  type Decision,
} from "../src/domain/decision";
const mocks = vi.hoisted(() => ({
  workspace: vi.fn(),
  auth: vi.fn(),
  extract: vi.fn(),
  research: vi.fn(),
}));
vi.mock("../src/features/decisions/WorkspaceContext", () => ({
  useWorkspace: mocks.workspace,
}));
vi.mock("../src/contexts/AuthContext", () => ({ useAuth: mocks.auth }));
vi.mock("../src/services/assistant", () => ({
  extractPurchase: mocks.extract,
  researchDecision: mocks.research,
  imageData: vi.fn(),
}));
let initial: Decision;
let save: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("AbortController", transferableAbortController().constructor);
  initial = coffeeExample();
  initial.revision = 1;
  save = vi.fn(async (d: Decision) => ({ ...d, revision: d.revision + 1 }));
  mocks.workspace.mockReturnValue({
    decisions: [initial],
    save,
    reload: vi.fn(),
    setHasUnsavedChanges: vi.fn(),
  });
  mocks.auth.mockReturnValue({ user: { id: "user" } });
  mocks.extract.mockReset();
});
afterEach(cleanup);
function open() {
  const router = createMemoryRouter(
    [
      { path: "/decisions/:id", element: <DecisionPage /> },
      { path: "/", element: <h1>All decisions destination</h1> },
    ],
    { initialEntries: [`/decisions/${initial.id}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
describe("decision editor behaviour", () => {
  it("requires explicit review and save for atomic AI field updates", async () => {
    mocks.extract.mockResolvedValue({
      name: "Better coffee machine",
      price: 450,
      currency: "GBP",
      lifespanYears: 6,
      usesPerWeek: 5,
      notes: "Explicit fields only.",
      questions: [],
    });
    open();
    fireEvent.click(screen.getByRole("button", { name: "Evidence & AI" }));
    fireEvent.click(screen.getByRole("button", { name: "Read purchase" }));
    await screen.findByText("REVIEW BEFORE APPLYING");
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "A coffee machine",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Apply suggested fields" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "The decision", exact: true }),
    );
    expect(screen.getByLabelText("Purchase price (GBP)")).toHaveValue(450);
    expect(screen.getByLabelText("Useful life (years)")).toHaveValue(6);
    expect(screen.getByLabelText("Realistic uses each week")).toHaveValue(5);
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].candidates[0]).toMatchObject({
      price: 450,
      lifespanYears: 6,
      provenance: "ai",
    });
  });
  it("keeps changes when a route departure is cancelled", async () => {
    open();
    fireEvent.change(screen.getByLabelText("Realistic uses each week"), {
      target: { value: "2" },
    });
    fireEvent.click(
      screen.getByRole("link", { name: "All decisions", exact: true }),
    );
    expect(await screen.findByText("You have unsaved changes.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Realistic uses each week")).toHaveValue(2);
    expect(save).not.toHaveBeenCalled();
  });
  it("keeps the draft visible after a save failure", async () => {
    save.mockRejectedValue(new Error("Connection failed"));
    open();
    fireEvent.change(screen.getByLabelText("Realistic uses each week"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
    expect(await screen.findByText("Connection failed")).toBeVisible();
    expect(screen.getByLabelText("Realistic uses each week")).toHaveValue(2);
    expect(screen.getByText("Unsaved changes")).toBeVisible();
  });
  it("freezes current purchase assumptions on outcome save", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "What happened" }));
    fireEvent.click(screen.getByRole("button", { name: "I bought it" }));
    await screen.findByText("The forecast you saved");
    expect(save.mock.calls[0][0]).toMatchObject({
      status: "bought",
      snapshot: { usesPerWeek: 4, candidate: { price: 600 } },
    });
  });
  it("does not overwrite later edits when an earlier save resolves", async () => {
    let finish!: (d: Decision) => void;
    save.mockImplementation(
      () =>
        new Promise<Decision>((r) => {
          finish = r;
        }),
    );
    open();
    fireEvent.change(screen.getByLabelText("Realistic uses each week"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
    fireEvent.change(screen.getByLabelText("Realistic uses each week"), {
      target: { value: "1" },
    });
    finish({ ...save.mock.calls[0][0], revision: 2 });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save decision" }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText("Realistic uses each week")).toHaveValue(1);
    expect(screen.getByText("Unsaved changes")).toBeVisible();
  });
  it("protects and saves a pending check-in when leaving the route", async () => {
    initial = markOutcome(initial, "bought");
    mocks.workspace.mockReturnValue({
      decisions: [initial],
      save,
      reload: vi.fn(),
      setHasUnsavedChanges: vi.fn(),
    });
    open();
    fireEvent.click(screen.getByRole("button", { name: "What happened" }));
    fireEvent.change(screen.getByLabelText("A note for your future self"), {
      target: { value: "Used less than expected" },
    });
    fireEvent.click(
      screen.getByRole("link", { name: "All decisions", exact: true }),
    );
    await screen.findByText("You have unsaved changes.");
    fireEvent.click(screen.getByRole("button", { name: "Save and leave" }));
    await screen.findByText("All decisions destination");
    expect(save.mock.calls[0][0].checkins).toHaveLength(1);
    expect(save.mock.calls[0][0].checkins[0].notes).toBe(
      "Used less than expected",
    );
  });
});

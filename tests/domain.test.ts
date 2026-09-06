import { describe, it, expect } from "vitest";
import {
  newCandidate,
  newDecision,
  coffeeExample,
  ownership,
  decisionSchema,
  markOutcome,
  researchKey,
  baselineCost,
  moneyText,
} from "../src/domain/decision";
import {
  parseImport,
  exportJSON,
  csvCell,
  legacyDecisions,
} from "../src/domain/portability";
const c = {
  ...newCandidate(),
  price: 100,
  lifespanYears: 2,
  resaleValue: 20,
  annualCost: 10,
  perUseCost: 1,
};
describe("ownership economics", () => {
  it("counts cash, consumption and resale without adding depreciation twice", () => {
    const m = ownership(c, 2, 1)!;
    expect(m.cashCost).toBe(224);
    expect(m.netCost).toBe(204);
    expect(m.replacements).toBe(0);
    expect(m.costPerUse).toBeCloseTo(204 / 104);
  });
  it("includes replacement cycles on a common horizon", () => {
    const m = ownership(c, 5, 1)!;
    expect(m.cashCost).toBe(610);
    expect(m.retainedValue).toBe(60);
    expect(m.netCost).toBe(510);
    expect(m.replacements).toBe(2);
  });
  it("does not buy another item at an exact end boundary", () => {
    expect(ownership(c, 4, 1)?.replacements).toBe(1);
    expect(ownership(c, 4.1, 1)?.replacements).toBe(2);
  });
  it("uses remaining value for a shorter horizon", () =>
    expect(ownership(c, 1, 1)?.netCost).toBe(102));
  it("keeps zero-use, free and missing-price scenarios honest", () => {
    expect(ownership(c, 0, 1)?.costPerUse).toBeNull();
    expect(ownership(c, 2, 0)?.costPerUse).toBeNull();
    expect(ownership(newCandidate(), 2, 1)).toBeNull();
    expect(
      ownership(
        { ...c, price: 0, resaleValue: 0, annualCost: 0, perUseCost: 0 },
        2,
        1,
      )?.netCost,
    ).toBe(0);
    expect(moneyText(Infinity, "GBP")).toBe("Not available");
  });
  it.each([NaN, Infinity, -1, 101])("rejects invalid weekly use %s", (n) =>
    expect(() => ownership(c, 2, n)).toThrow(),
  );
  it("scales replaced spending with usage", () => {
    const d = coffeeExample();
    expect(baselineCost(d)).toBe(2184);
    expect(baselineCost(d, 2)).toBe(1092);
    expect(ownership(d.candidates[0], 3, 4)?.netCost).toBe(762);
  });
});
describe("decision integrity", () => {
  it("captures explicit amounts and keeps missing facts editable", () => {
    expect(newDecision("Headphones £249").candidates[0].price).toBe(249);
    const d = newDecision("https://example.com/product");
    expect(d.candidates[0].price).toBeNull();
    expect(d.candidates[0].sourceUrl).toBe("https://example.com/product");
    expect(decisionSchema.safeParse(d).success).toBe(true);
  });
  it("requires a candidate selection and bounded values", () => {
    const d = coffeeExample();
    expect(
      decisionSchema.safeParse({
        ...d,
        selectedCandidateId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      decisionSchema.safeParse({
        ...d,
        candidates: [{ ...d.candidates[0], resaleValue: 601 }],
      }).success,
    ).toBe(false);
  });
  it("freezes the bought forecast and rejects missing purchase facts", () => {
    const d = markOutcome(coffeeExample(), "bought");
    const forecast = structuredClone(d.snapshot);
    d.candidates[0].price = 800;
    d.usesPerWeek = 1;
    expect(markOutcome(d, "bought").snapshot).toEqual(forecast);
    expect(() => markOutcome(newDecision(), "bought")).toThrow();
    expect(() => markOutcome(newDecision(), "returned")).toThrow();
  });
  it("marks research stale for changes to the scenario but not a save", () => {
    const d = coffeeExample();
    expect(researchKey({ ...d, revision: 12 })).toBe(researchKey(d));
    expect(researchKey({ ...d, usesPerWeek: 1 })).not.toBe(researchKey(d));
    expect(researchKey({ ...d, baselinePerUseCost: 4 })).not.toBe(
      researchKey(d),
    );
  });
});
describe("portability", () => {
  it("round trips full outcomes, currency and alternatives", () => {
    const d = markOutcome(coffeeExample(), "bought");
    expect(parseImport(exportJSON([d]), "USD")).toEqual([d]);
  });
  it("rejects invalid or oversized imports before use", () => {
    expect(() => parseImport("{broken", "GBP")).toThrow();
    expect(() =>
      parseImport(
        JSON.stringify({
          format: "purchase-assistant",
          version: 2,
          decisions: [],
        }),
        "GBP",
      ),
    ).toThrow();
    expect(() => parseImport(" ".repeat(20_000_001), "GBP")).toThrow();
  });
  it("converts legacy depreciation assumptions and UUIDs", () => {
    const [d] = legacyDecisions(
      [
        {
          id: "old-short",
          name: "Camera",
          price: 1000,
          lifespanYears: 5,
          usesPerWeek: 2,
          minutesPerUse: 30,
          depreciationRatePercent: 10,
        },
      ],
      "GBP",
    );
    expect(d.candidates[0].resaleValue).toBe(500);
    expect(d.id).not.toBe("old-short");
    expect(decisionSchema.safeParse(d).success).toBe(true);
  });
  it.each(['=HYPERLINK("https://example.com")', " +cmd", "\t@SUM(1)", "-1+1"])(
    "neutralises spreadsheet formula %s",
    (s) => expect(csvCell(s).startsWith("\"'")).toBe(true),
  );
  it("quotes commas and quotes", () =>
    expect(csvCell('a,"b"')).toBe('"a,""b"""'));
});

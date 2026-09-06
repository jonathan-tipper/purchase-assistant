import { z } from "zod";

export const currencySchema = z.enum(["GBP", "USD", "EUR", "JPY"]);
export type Currency = z.infer<typeof currencySchema>;
const money = z.number().finite().min(0).max(1_000_000);
const text = (max: number) => z.string().trim().max(max);
export const publicUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use a public https:// link");
export const candidateSchema = z
  .object({
    id: z.string().uuid(),
    name: text(120).min(1),
    price: money.nullable(),
    lifespanYears: z.number().finite().min(0.5).max(30),
    annualCost: money,
    perUseCost: money,
    resaleValue: money,
    sourceUrl: z.union([z.literal(""), publicUrl]),
    provenance: z.enum(["starter", "user", "ai", "legacy"]),
  })
  .refine((c) => c.price === null || c.resaleValue <= c.price, {
    message: "Resale cannot exceed the purchase price",
    path: ["resaleValue"],
  });
export type Candidate = z.infer<typeof candidateSchema>;
export const evidenceSchema = z.object({
  id: z.string().min(1).max(80),
  title: text(200).min(1),
  url: publicUrl,
  excerpt: text(1600),
  retrievedAt: z.string().datetime(),
});
export const researchSchema = z.object({
  summary: text(2400),
  considerations: z.array(text(500)).max(5),
  questions: z.array(text(300)).max(3),
  evidence: z.array(evidenceSchema).max(6),
  claims: z
    .array(
      z.object({
        text: text(600),
        sourceIds: z.array(z.string().max(80)).min(1).max(3),
      }),
    )
    .max(8),
  inputKey: z.string().max(30000),
  createdAt: z.string().datetime(),
});
export type Research = z.infer<typeof researchSchema>;
export const checkinSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  usesPerWeek: z.number().finite().min(0).max(100),
  satisfaction: z.number().int().min(1).max(10),
  wouldBuyAgain: z.boolean(),
  notes: text(2000),
});
export const snapshotSchema = z.object({
  candidate: candidateSchema,
  usesPerWeek: z.number().finite().min(0).max(100),
  horizonYears: z.number().finite().min(0.5).max(10),
  currency: currencySchema,
  baselineAnnualCost: money,
  baselinePerUseCost: money,
  date: z.string().datetime(),
});
export const decisionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().uuid(),
    revision: z.number().int().min(0),
    title: text(120).min(1),
    category: z.enum(["home", "technology", "hobby", "other"]),
    currency: currencySchema,
    need: text(1000),
    alternative: text(1000),
    baselineAnnualCost: money,
    baselinePerUseCost: money,
    horizonYears: z.number().finite().min(0.5).max(10),
    usesPerWeek: z.number().finite().min(0).max(100),
    candidates: z.array(candidateSchema).min(1).max(3),
    selectedCandidateId: z.string().uuid(),
    status: z.enum(["considering", "bought", "deferred", "passed", "returned"]),
    snapshot: snapshotSchema.nullable(),
    checkins: z.array(checkinSchema).max(60),
    research: researchSchema.nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((d, ctx) => {
    if (new TextEncoder().encode(JSON.stringify(d)).byteLength > 90_000)
      ctx.addIssue({
        code: "custom",
        message:
          "This decision is too large. Export a backup, then shorten its notes or remove old check-ins.",
      });
    if (!d.candidates.some((c) => c.id === d.selectedCandidateId))
      ctx.addIssue({
        code: "custom",
        path: ["selectedCandidateId"],
        message: "Select an existing candidate",
      });
    if (new Set(d.candidates.map((c) => c.id)).size !== d.candidates.length)
      ctx.addIssue({ code: "custom", message: "Candidate IDs must be unique" });
    if (new Set(d.checkins.map((c) => c.id)).size !== d.checkins.length)
      ctx.addIssue({ code: "custom", message: "Check-in IDs must be unique" });
    if (["bought", "returned"].includes(d.status) && !d.snapshot)
      ctx.addIssue({
        code: "custom",
        message: "A purchase needs a forecast snapshot",
      });
  });
export type Decision = z.infer<typeof decisionSchema>;
export const exportSchema = z
  .object({
    format: z.literal("purchase-assistant"),
    version: z.literal(1),
    decisions: z.array(decisionSchema).max(200),
  })
  .refine(
    (x) => new Set(x.decisions.map((d) => d.id)).size === x.decisions.length,
    "Duplicate decision IDs",
  );

export function ownership(
  candidate: Candidate,
  years: number,
  weeklyUses: number,
) {
  candidateSchema.parse(candidate);
  z.number().finite().min(0).max(10).parse(years);
  z.number().finite().min(0).max(100).parse(weeklyUses);
  if (candidate.price === null) return null;
  if (years === 0)
    return {
      netCost: 0,
      cashCost: 0,
      retainedValue: 0,
      costPerUse: null,
      uses: 0,
      replacements: 0,
    };
  // Replace only when the common comparison horizon extends beyond an item's life.
  const replacements = Math.max(
    0,
    Math.ceil(years / candidate.lifespanYears - 1e-9) - 1,
  );
  const age = years - replacements * candidate.lifespanYears;
  const retainedValue =
    candidate.price +
    ((candidate.resaleValue - candidate.price) * age) / candidate.lifespanYears;
  const uses = weeklyUses * 52 * years;
  const cashCost =
    candidate.price * (replacements + 1) +
    candidate.annualCost * years +
    candidate.perUseCost * uses;
  const netCost = Math.max(
    0,
    cashCost - replacements * candidate.resaleValue - retainedValue,
  );
  return {
    netCost,
    cashCost,
    retainedValue,
    costPerUse: uses > 0 ? netCost / uses : null,
    uses,
    replacements,
  };
}
export function moneyText(value: number | null, currency: Currency) {
  if (value === null || !Number.isFinite(value)) return "Not available";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}
export function researchKey(d: Decision) {
  return JSON.stringify({
    title: d.title,
    category: d.category,
    currency: d.currency,
    need: d.need,
    alternative: d.alternative,
    baselineAnnualCost: d.baselineAnnualCost,
    baselinePerUseCost: d.baselinePerUseCost,
    horizonYears: d.horizonYears,
    usesPerWeek: d.usesPerWeek,
    candidates: d.candidates,
    selectedCandidateId: d.selectedCandidateId,
  });
}
export function newCandidate(name = "Your option"): Candidate {
  return {
    id: crypto.randomUUID(),
    name,
    price: null,
    lifespanYears: 3,
    annualCost: 0,
    perUseCost: 0,
    resaleValue: 0,
    sourceUrl: "",
    provenance: "starter",
  };
}
export function newDecision(
  description = "",
  currency: Currency = "GBP",
): Decision {
  const c = newCandidate();
  const link = description.trim().startsWith("https://")
    ? publicUrl.safeParse(description.trim())
    : null;
  if (link?.success) {
    c.sourceUrl = link.data;
    c.name = "Product to check";
  } else {
    c.name = description.trim().slice(0, 120) || "A new purchase";
    const match = description.match(/(?:£|\$|€|¥)\s*([\d,]+(?:\.\d{1,2})?)/);
    if (match) {
      const price = Number(match[1].replaceAll(",", ""));
      if (price <= 1_000_000) c.price = price;
    }
    if (match)
      currency = description.includes("£")
        ? "GBP"
        : description.includes("€")
          ? "EUR"
          : description.includes("¥")
            ? "JPY"
            : "USD";
  }
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    revision: 0,
    title: c.name,
    category: "other",
    currency,
    need: "",
    alternative: "Keep what I have",
    baselineAnnualCost: 0,
    baselinePerUseCost: 0,
    horizonYears: 3,
    usesPerWeek: 3,
    candidates: [c],
    selectedCandidateId: c.id,
    status: "considering",
    snapshot: null,
    checkins: [],
    research: null,
    createdAt: now,
    updatedAt: now,
  };
}
export function coffeeExample(): Decision {
  const d = newDecision("A coffee machine", "GBP");
  const c = {
    ...d.candidates[0],
    name: "Coffee machine",
    price: 600,
    perUseCost: 0.5,
    annualCost: 40,
    lifespanYears: 5,
    resaleValue: 50,
  };
  return {
    ...d,
    category: "home",
    need: "Make good coffee at home and replace four café visits each week.",
    alternative: "Buy four café coffees a week at £3.50 each",
    baselineAnnualCost: 0,
    baselinePerUseCost: 3.5,
    usesPerWeek: 4,
    candidates: [c],
  };
}
export function markOutcome(d: Decision, status: Decision["status"]): Decision {
  const c = d.candidates.find((c) => c.id === d.selectedCandidateId)!;
  if (status === "bought" && c.price === null)
    throw new Error(
      "Add the actual purchase price before marking this bought.",
    );
  if (status === "returned" && !d.snapshot)
    throw new Error("Record the purchase before recording a return.");
  return {
    ...d,
    status,
    snapshot:
      status === "bought" && !d.snapshot
        ? {
            candidate: structuredClone(c),
            usesPerWeek: d.usesPerWeek,
            horizonYears: d.horizonYears,
            currency: d.currency,
            baselineAnnualCost: d.baselineAnnualCost,
            baselinePerUseCost: d.baselinePerUseCost,
            date: new Date().toISOString(),
          }
        : d.snapshot,
  };
}
export function verdict(d: Decision) {
  const c = d.candidates.find((c) => c.id === d.selectedCandidateId)!;
  const m = ownership(c, d.horizonYears, d.usesPerWeek);
  if (!m)
    return {
      title: "Start with the price.",
      detail:
        "Add a price to see the ownership costs. The other numbers are starting assumptions to check.",
    };
  if (d.usesPerWeek === 0)
    return {
      title: "If you won’t use it, pause.",
      detail:
        "Zero expected use means there is no useful cost per use. Consider borrowing, waiting or keeping what you have.",
    };
  const delta = baselineCost(d) - m.netCost;
  if (baselineCost(d) > 0 && delta > 0)
    return {
      title: "The numbers favour switching.",
      detail: `Estimated ownership costs are ${moneyText(delta, d.currency)} lower over ${d.horizonYears} years. This depends on actually replacing the spending you entered, and the assumed resale value.`,
    };
  if (baselineCost(d) > 0)
    return {
      title: "The extra benefit needs to earn its cost.",
      detail: `This option costs an estimated ${moneyText(-delta, d.currency)} more than your alternative over ${d.horizonYears} years. Decide whether its practical benefits are worth that difference.`,
    };
  return {
    title: "Is the benefit worth the extra spend?",
    detail: `Estimated ownership cost is ${moneyText(m.netCost, d.currency)} over ${d.horizonYears} years. With no alternative spending entered, this is an additional expense. Cost per use alone cannot tell you whether it is a good purchase.`,
  };
}

export function baselineCost(
  d: Pick<
    Decision,
    "baselineAnnualCost" | "baselinePerUseCost" | "usesPerWeek" | "horizonYears"
  >,
  uses = d.usesPerWeek,
  years = d.horizonYears,
) {
  return (
    d.baselineAnnualCost * years + d.baselinePerUseCost * uses * 52 * years
  );
}

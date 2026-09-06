import { z } from "zod";
import {
  currencySchema,
  decisionSchema,
  exportSchema,
  newDecision,
  type Currency,
  type Decision,
} from "./decision";
export const legacySchema = z
  .array(
    z.object({
      id: z.string().min(1).max(100),
      name: z.string().trim().min(1).max(120),
      price: z.number().finite().min(0).max(1_000_000),
      lifespanYears: z.number().finite().min(0.5).max(30),
      usesPerWeek: z.number().finite().min(0).max(100),
      minutesPerUse: z.number().finite().min(0).max(1440),
      depreciationRatePercent: z.number().finite().min(0).max(100),
    }),
  )
  .max(200)
  .refine(
    (a) => new Set(a.map((i) => i.id)).size === a.length,
    "Duplicate item IDs",
  );
export function legacyDecisions(raw: unknown, currency: Currency): Decision[] {
  return legacySchema.parse(raw).map((i) => {
    const d = newDecision(i.name, currency);
    const c = {
      ...d.candidates[0],
      price: i.price,
      lifespanYears: i.lifespanYears,
      resaleValue: Math.max(
        0,
        i.price * (1 - (i.depreciationRatePercent * i.lifespanYears) / 100),
      ),
      provenance: "legacy" as const,
    };
    return decisionSchema.parse({
      ...d,
      horizonYears: Math.min(10, i.lifespanYears),
      usesPerWeek: i.usesPerWeek,
      candidates: [c],
    });
  });
}
export function parseImport(content: string, currency: Currency): Decision[] {
  if (new TextEncoder().encode(content).byteLength > 20_000_000)
    throw new Error("Choose a JSON export smaller than 20 MB.");
  const data: unknown = JSON.parse(content);
  return Array.isArray(data)
    ? legacyDecisions(data, currency)
    : exportSchema.parse(data).decisions;
}
export function exportJSON(decisions: Decision[]) {
  return JSON.stringify(
    exportSchema.parse({ format: "purchase-assistant", version: 1, decisions }),
    null,
    2,
  );
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return `"${s.replaceAll('"', '""')}"`;
}
export function exportCSV(decisions: Decision[]) {
  const headers = [
    "Decision",
    "Status",
    "Currency",
    "Candidate",
    "Price",
    "Years",
    "Uses/week",
    "Source",
  ];
  return [
    headers,
    ...decisions.flatMap((d) =>
      d.candidates.map((c) => [
        d.title,
        d.status,
        d.currency,
        c.name,
        c.price ?? "",
        d.horizonYears,
        d.usesPerWeek,
        c.sourceUrl,
      ]),
    ),
  ]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
}
export function storedCurrency(storage: Storage): Currency {
  return currencySchema.catch("GBP").parse(storage.getItem("userCurrency"));
}

import { decisionSchema, exportSchema, type Decision } from "@/domain/decision";
import {
  exportJSON,
  legacyDecisions,
  storedCurrency,
} from "@/domain/portability";
import { cloudClient } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
export const LOCAL_KEY = "pa.decisions.v1";
export class ConflictError extends Error {
  constructor() {
    super(
      "This decision changed in another tab or device. Reload the saved version before saving again.",
    );
  }
}
export interface Repository {
  list(): Promise<Decision[]>;
  remove(d: Decision): Promise<void>;
  save(d: Decision): Promise<Decision>;
  importAll(items: Decision[]): Promise<void>;
}
export function localRepository(storage: Storage): Repository {
  function read() {
    const raw = storage.getItem(LOCAL_KEY);
    if (raw) return exportSchema.parse(JSON.parse(raw)).decisions;
    const legacy = storage.getItem("purchaseValueItems");
    if (!legacy) return [];
    const migrated = legacyDecisions(
      JSON.parse(legacy),
      storedCurrency(storage),
    );
    // Save new IDs exactly once; retain the original key as a recovery copy.
    storage.setItem(LOCAL_KEY, exportJSON(migrated));
    return migrated;
  }
  return {
    list: async () => read(),
    remove: async (d) => {
      const current = read();
      if (current.find((i) => i.id === d.id)?.revision !== d.revision)
        throw new ConflictError();
      storage.setItem(
        LOCAL_KEY,
        exportJSON(current.filter((i) => i.id !== d.id)),
      );
    },
    save: async (d) => {
      const valid = decisionSchema.parse(d);
      const current = read();
      const old = current.find((i) => i.id === d.id);
      if ((old?.revision ?? 0) !== d.revision) throw new ConflictError();
      if (!old && current.length >= 200)
        throw new Error(
          "This workspace supports 200 decisions. Export a backup before starting another workspace.",
        );
      const saved = {
        ...valid,
        revision: d.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      storage.setItem(
        LOCAL_KEY,
        exportJSON([...current.filter((i) => i.id !== d.id), saved]),
      );
      return saved;
    },
    importAll: async (items) => {
      const incoming = exportSchema.parse({
        format: "purchase-assistant",
        version: 1,
        decisions: items,
      }).decisions;
      const current = read();
      const ids = new Set(current.map((d) => d.id));
      storage.setItem(
        LOCAL_KEY,
        exportJSON([...current, ...incoming.filter((d) => !ids.has(d.id))]),
      );
    },
  };
}
export function cloudRepository(userId: string): Repository {
  const client = cloudClient();
  return {
    remove: async (d) => {
      const { data, error } = await client
        .from("pa_decisions")
        .delete()
        .eq("id", d.id)
        .eq("revision", d.revision)
        .select("id");
      if (error) throw new Error("Could not delete this decision. Try again.");
      if (!data?.length) throw new ConflictError();
    },
    list: async () => {
      const { data, error } = await client
        .from("pa_decisions")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(201);
      if (error)
        throw new Error(
          "Could not load your account decisions. Check your connection and retry.",
        );
      if (data.length > 200)
        throw new Error(
          "More than 200 decisions are stored. Contact support for a full export.",
        );
      return data.map((r) =>
        decisionSchema.parse({
          ...(r.payload as object),
          id: r.id,
          revision: r.revision,
        }),
      );
    },
    save: async (d) => {
      const valid = decisionSchema.parse(d);
      const saved = {
        ...valid,
        revision: valid.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      const payload = saved as unknown as Json;
      const request =
        valid.revision === 0
          ? client
              .from("pa_decisions")
              .insert({ id: valid.id, user_id: userId, payload, revision: 1 })
          : client
              .from("pa_decisions")
              .update({ payload, revision: saved.revision })
              .eq("id", d.id)
              .eq("revision", d.revision);
      const { data, error } = await request.select("id");
      if (error?.code === "23505" || (!error && data?.length === 0))
        throw new ConflictError();
      if (error?.code === "54000")
        throw new Error(
          "This workspace supports 200 decisions. Export and delete an older decision before adding another.",
        );
      if (error)
        throw new Error(
          "Could not save to your account. Your changes are still here. Try again.",
        );
      return saved;
    },
    importAll: async (items) => {
      exportSchema.parse({
        format: "purchase-assistant",
        version: 1,
        decisions: items,
      });
      const { data: existing, error: readError } = await client
        .from("pa_decisions")
        .select("id")
        .limit(201);
      if (readError)
        throw new Error("Could not check existing decisions. Try again.");
      if (
        existing.length +
          items.filter((d) => !existing.some((i) => i.id === d.id)).length >
        200
      )
        throw new Error(
          "An import can contain at most 200 decisions including existing items.",
        );
      const { error } = await client.from("pa_decisions").upsert(
        items.map((d) => ({
          id: d.id,
          user_id: userId,
          payload: { ...d, revision: 1 } as unknown as Json,
          revision: 1,
        })),
        { onConflict: "user_id,id", ignoreDuplicates: true },
      );
      if (error)
        throw new Error("Import failed. Your original data has been kept.");
    },
  };
}
export async function readLegacyCloud(currency: "GBP" | "USD" | "EUR" | "JPY") {
  const client = cloudClient();
  const [items, journal] = await Promise.all([
    client.from("pa_purchase_items").select("*").limit(200),
    client.from("pa_purchase_journal").select("*").limit(200),
  ]);
  if (items.error || journal.error)
    throw new Error(
      "Could not read the previous workspace. No data has been changed.",
    );
  const converted = legacyDecisions(
    items.data.map((i) => ({
      id: i.id,
      name: i.name,
      price: Number(i.price),
      lifespanYears: Number(i.lifespan_years),
      usesPerWeek: Number(i.uses_per_week),
      minutesPerUse: Number(i.minutes_per_use),
      depreciationRatePercent: Number(i.depreciation_rate_percent),
    })),
    currency,
  );
  // Preserve stable database IDs so repeat imports are idempotent.
  return {
    decisions: converted.map((d, i) => ({ ...d, id: items.data[i].id })),
    journal: journal.data,
  };
}

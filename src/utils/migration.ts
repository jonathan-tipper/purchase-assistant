import { supabase } from "@/integrations/supabase/client";
import { PurchaseItem } from "@/types";
import { loadPurchaseItems } from "./storage";

const MIGRATION_KEY = "purchaseDataMigrated";

export async function migrateLocalDataToSupabase(userId: string): Promise<boolean> {
  if (localStorage.getItem(MIGRATION_KEY)) {
    return false;
  }

  const localItems = loadPurchaseItems();
  if (localItems.length === 0) {
    localStorage.setItem(MIGRATION_KEY, "true");
    return false;
  }

  const rows = localItems.map((item: PurchaseItem) => ({
    user_id: userId,
    name: item.name,
    price: item.price,
    lifespan_years: item.lifespanYears,
    uses_per_week: item.usesPerWeek,
    minutes_per_use: item.minutesPerUse,
    depreciation_rate_percent: item.depreciationRatePercent,
  }));

  const { error } = await supabase.from("pa_purchase_items").insert(rows);

  if (error) {
    console.error("Migration failed:", error);
    return false;
  }

  localStorage.setItem(MIGRATION_KEY, "true");
  localStorage.removeItem("purchaseValueItems");
  return true;
}

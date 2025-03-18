
import { PurchaseItem } from "@/types";

const STORAGE_KEY = "purchaseValueItems";

/**
 * Saves purchase items to local storage
 */
export const savePurchaseItems = (items: PurchaseItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Error saving purchase items to local storage:", error);
  }
};

/**
 * Loads purchase items from local storage
 */
export const loadPurchaseItems = (): PurchaseItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading purchase items from local storage:", error);
  }
  return [];
};

/**
 * Exports purchase items as a JSON file for download
 */
export const exportPurchaseItems = (items: PurchaseItem[]): void => {
  const data = JSON.stringify(items, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = "purchase-value-data.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Validates imported data to ensure it matches PurchaseItem structure
 */
export const validateImportData = (data: any): boolean => {
  if (!Array.isArray(data)) return false;
  
  // Check if all items have the required fields
  return data.every((item) => 
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    typeof item.lifespanYears === "number" &&
    typeof item.usesPerWeek === "number" &&
    typeof item.minutesPerUse === "number" &&
    typeof item.depreciationRatePercent === "number"
  );
};

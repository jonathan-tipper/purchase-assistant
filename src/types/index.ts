
export interface PurchaseItem {
  id: string;
  name: string;
  price: number;
  lifespanYears: number;
  usesPerWeek: number;
  minutesPerUse: number;
  depreciationRatePercent: number;
}

export interface PurchaseMetrics {
  costPerUse: number;
  costPerHour: number;
  costPerWeek: number;
  costPerMonth: number;
  costPerYear: number;
  depreciationPerHour: number;
  depreciationPerWeek: number;
  depreciationPerMonth: number;
  depreciationPerYear: number;
  totalLifetimeUses: number;
  totalLifetimeHours: number;
  valueRetainedPercent: number;
}

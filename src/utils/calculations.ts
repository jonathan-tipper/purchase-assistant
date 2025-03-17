
import { PurchaseItem, PurchaseMetrics } from "@/types";

export const calculateMetrics = (item: PurchaseItem): PurchaseMetrics => {
  const totalWeeks = item.lifespanYears * 52;
  const totalUses = totalWeeks * item.usesPerWeek;
  const totalHours = totalUses * (item.minutesPerUse / 60);
  
  // Calculate yearly depreciation amount
  const yearlyDepreciationRate = item.depreciationRatePercent / 100;
  const depreciationPerYear = item.price * yearlyDepreciationRate;
  
  // Calculate total value lost over lifespan
  const valueRetainedPercent = Math.max(0, 100 - (item.depreciationRatePercent * item.lifespanYears));
  
  // Calculate cost per time unit
  const costPerUse = item.price / totalUses;
  const costPerHour = item.price / totalHours;
  const costPerWeek = item.price / totalWeeks;
  const costPerMonth = item.price / (totalWeeks / 4.33); // 4.33 weeks per month average
  const costPerYear = item.price / item.lifespanYears;
  
  // Calculate depreciation per time unit
  const depreciationPerHour = depreciationPerYear / (item.usesPerWeek * item.minutesPerUse * 52 / 60);
  const depreciationPerWeek = depreciationPerYear / 52;
  const depreciationPerMonth = depreciationPerYear / 12;
  
  return {
    costPerUse,
    costPerHour,
    costPerWeek,
    costPerMonth,
    costPerYear,
    depreciationPerHour,
    depreciationPerWeek,
    depreciationPerMonth,
    depreciationPerYear,
    totalLifetimeUses: totalUses,
    totalLifetimeHours: totalHours,
    valueRetainedPercent
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatNumber = (value: number, decimals = 2): string => {
  return value.toFixed(decimals);
};

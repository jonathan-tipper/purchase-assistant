
import React from "react";
import { PurchaseMetrics } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/utils/calculations";

interface ResultsDisplayProps {
  metrics: PurchaseMetrics;
  className?: string;
  currencyCode: string;
}

const MetricItem: React.FC<{
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}> = ({ label, value, subtext, highlight = false }) => (
  <div className={`p-4 rounded-md ${highlight ? 'bg-primary/10' : 'bg-secondary'}`}>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className={`text-xl font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</p>
    {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
  </div>
);

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ metrics, className = "", currencyCode }) => {
  return (
    <Card className={`glass-card animate-scale-in ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl">Value Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricItem 
            label="Cost per use" 
            value={formatCurrency(metrics.costPerUse, currencyCode)}
            highlight={true}
          />
          <MetricItem 
            label="Cost per hour" 
            value={formatCurrency(metrics.costPerHour, currencyCode)}
          />
          <MetricItem 
            label="Cost per week" 
            value={formatCurrency(metrics.costPerWeek, currencyCode)}
          />
          <MetricItem 
            label="Cost per month" 
            value={formatCurrency(metrics.costPerMonth, currencyCode)}
          />
          <MetricItem 
            label="Cost per year" 
            value={formatCurrency(metrics.costPerYear, currencyCode)}
          />
          <MetricItem 
            label="Total uses" 
            value={formatNumber(metrics.totalLifetimeUses, 0)}
            subtext="over lifespan"
          />
        </div>

        <h3 className="font-medium text-lg mt-6 mb-3">Depreciation</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricItem 
            label="Per year" 
            value={formatCurrency(metrics.depreciationPerYear, currencyCode)}
            highlight={true}
          />
          <MetricItem 
            label="Per month" 
            value={formatCurrency(metrics.depreciationPerMonth, currencyCode)}
          />
          <MetricItem 
            label="Per week" 
            value={formatCurrency(metrics.depreciationPerWeek, currencyCode)}
          />
          <MetricItem 
            label="Value retained" 
            value={`${formatNumber(metrics.valueRetainedPercent)}%`}
            subtext="at end of lifespan"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsDisplay;

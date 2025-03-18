
import React from "react";
import { PurchaseItem } from "@/types";
import { calculateMetrics } from "@/utils/calculations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileJson, FileText } from "lucide-react";

interface DataExportProps {
  items: PurchaseItem[];
}

const DataExport = ({ items }: DataExportProps) => {
  const exportJSON = () => {
    // Create a JSON file with all items and their metrics
    const itemsWithMetrics = items.map(item => ({
      ...item,
      metrics: calculateMetrics(item)
    }));
    
    const jsonString = JSON.stringify(itemsWithMetrics, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger it
    const a = document.createElement("a");
    a.href = url;
    a.download = "purchase-value-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    // Create CSV content
    const headers = [
      "Name", "Price", "Lifespan (Years)", "Uses Per Week", 
      "Minutes Per Use", "Depreciation Rate (%)", 
      "Cost Per Use", "Cost Per Hour", "Total Uses"
    ];
    
    const rows = items.map(item => {
      const metrics = calculateMetrics(item);
      return [
        item.name,
        item.price.toFixed(2),
        item.lifespanYears,
        item.usesPerWeek,
        item.minutesPerUse,
        item.depreciationRatePercent,
        metrics.costPerUse.toFixed(2),
        metrics.costPerHour.toFixed(2),
        metrics.totalLifetimeUses
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger it
    const a = document.createElement("a");
    a.href = url;
    a.download = "purchase-value-data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Export Data</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Download your purchase data for use in other applications.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button 
            onClick={exportJSON} 
            className="flex items-center gap-2"
            variant="outline"
          >
            <FileJson className="h-4 w-4" />
            Export as JSON
          </Button>
          <Button 
            onClick={exportCSV} 
            className="flex items-center gap-2"
            variant="outline"
          >
            <FileText className="h-4 w-4" />
            Export as CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataExport;

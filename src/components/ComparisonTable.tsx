
import React from "react";
import { PurchaseItem } from "@/types";
import { calculateMetrics } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ComparisonTableProps {
  items: PurchaseItem[];
}

const ComparisonTable = ({ items }: ComparisonTableProps) => {
  // Calculate metrics for all items
  const itemsWithMetrics = items.map(item => ({
    item,
    metrics: calculateMetrics(item)
  }));

  // Sort items by cost efficiency (cost per use)
  const sortedItems = [...itemsWithMetrics].sort(
    (a, b) => a.metrics.costPerUse - b.metrics.costPerUse
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Purchase Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Compare the efficiency of your different purchases side by side.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Lifespan</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Cost/Use</TableHead>
                <TableHead>Cost/Hour</TableHead>
                <TableHead>Total Uses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map(({ item, metrics }) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>£{item.price.toFixed(2)}</TableCell>
                  <TableCell>{item.lifespanYears} years</TableCell>
                  <TableCell>{item.usesPerWeek}/week</TableCell>
                  <TableCell>£{metrics.costPerUse.toFixed(2)}</TableCell>
                  <TableCell>£{metrics.costPerHour.toFixed(2)}</TableCell>
                  <TableCell>{metrics.totalLifetimeUses}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComparisonTable;

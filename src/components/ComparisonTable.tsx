
import React, { useState, useEffect } from "react";
import { PurchaseItem } from "@/types";
import { calculateMetrics, formatCurrency } from "@/utils/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square, BarChart2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

interface ComparisonTableProps {
  items: PurchaseItem[];
  currencyCode: string;
}

const ComparisonTable = ({ items, currencyCode }: ComparisonTableProps) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  // Initialize with all items selected
  useEffect(() => {
    if (items.length > 0 && selectedItems.length === 0) {
      setSelectedItems(items.map(item => item.id));
    }
  }, [items]);

  // Calculate metrics for all items
  const itemsWithMetrics = items.map(item => ({
    item,
    metrics: calculateMetrics(item)
  }));

  // Filter only selected items for display
  const filteredItems = itemsWithMetrics.filter(({ item }) => 
    selectedItems.includes(item.id)
  );

  // Sort items by cost efficiency (cost per use)
  const sortedItems = [...filteredItems].sort(
    (a, b) => a.metrics.costPerUse - b.metrics.costPerUse
  );

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const toggleItemSelection = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  // Determine if we should show a mobile-optimized version
  const MobileComparisonTable = () => (
    <div className="space-y-3">
      {sortedItems.length > 0 ? (
        sortedItems.map(({ item, metrics }) => (
          <Card key={item.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: calculateEfficiencyColor(metrics.costPerUse, sortedItems) }}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{item.name}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleItemSelection(item.id)}
                  className="h-6 w-6 p-0"
                >
                  <Checkbox checked={selectedItems.includes(item.id)} />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Price:</p>
                  <p>{formatCurrency(item.price, currencyCode)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lifespan:</p>
                  <p>{item.lifespanYears} years</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uses/Week:</p>
                  <p>{item.usesPerWeek}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Minutes/Use:</p>
                  <p>{item.minutesPerUse}</p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t flex justify-between">
                <div>
                  <p className="text-muted-foreground text-xs">Cost per use</p>
                  <p className="font-medium">{formatCurrency(metrics.costPerUse, currencyCode)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cost per hour</p>
                  <p className="font-medium">{formatCurrency(metrics.costPerHour, currencyCode)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total uses</p>
                  <p className="font-medium">{metrics.totalLifetimeUses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-6 text-center">
            <p>No items selected for comparison.</p>
            <p className="text-sm text-muted-foreground mt-1">Please select at least one item.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Card className="glass-card animate-scale-in">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Purchase Comparison</CardTitle>
            {items.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {selectedItems.length} of {items.length}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSelectAll}
            className="gap-2"
          >
            {selectedItems.length === items.length ? (
              <>
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Deselect All</span>
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                <span className="hidden sm:inline">Select All</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-sm mb-4">
          Compare the efficiency of your different purchases side by side.
        </div>
        
        {/* Item selection list for mobile/smaller screens */}
        {items.length > 0 && (
          <div className="md:hidden mb-4 flex flex-wrap gap-2">
            {itemsWithMetrics.map(({ item }) => (
              <Button 
                key={`select-${item.id}`}
                variant={selectedItems.includes(item.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleItemSelection(item.id)}
                className="text-xs"
              >
                {item.name}
              </Button>
            ))}
          </div>
        )}

        {isMobile ? (
          <MobileComparisonTable />
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Lifespan</TableHead>
                  <TableHead>Uses/Week</TableHead>
                  <TableHead className="text-right">Cost/Use</TableHead>
                  <TableHead className="text-right">Cost/Hour</TableHead>
                  <TableHead className="text-right">Total Uses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length > 0 ? (
                  sortedItems.map(({ item, metrics }, index) => (
                    <TableRow key={item.id} className={index === 0 ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{formatCurrency(item.price, currencyCode)}</TableCell>
                      <TableCell>{item.lifespanYears} years</TableCell>
                      <TableCell>{item.usesPerWeek}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(metrics.costPerUse, currencyCode)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(metrics.costPerHour, currencyCode)}</TableCell>
                      <TableCell className="text-right">{metrics.totalLifetimeUses}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      No items selected for comparison. Please select at least one item.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function to calculate color based on efficiency ranking
function calculateEfficiencyColor(costPerUse: number, items: Array<{item: PurchaseItem, metrics: any}>): string {
  if (items.length <= 1) return "#3b82f6"; // Default blue for single item
  
  const lowestCost = items[0].metrics.costPerUse;
  const highestCost = items[items.length - 1].metrics.costPerUse;
  
  if (costPerUse === lowestCost) return "#22c55e"; // Green for best value
  if (costPerUse === highestCost) return "#ef4444"; // Red for worst value
  
  // Calculate where this item falls in the range
  const range = highestCost - lowestCost;
  const position = (costPerUse - lowestCost) / range;
  
  if (position < 0.33) return "#22c55e"; // Green for good value
  if (position < 0.66) return "#f59e0b"; // Amber for medium value
  return "#ef4444"; // Red for poor value
}

export default ComparisonTable;

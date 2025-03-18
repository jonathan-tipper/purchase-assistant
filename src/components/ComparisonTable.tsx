
import React, { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square } from "lucide-react";

interface ComparisonTableProps {
  items: PurchaseItem[];
}

const ComparisonTable = ({ items }: ComparisonTableProps) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Purchase Comparison</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSelectAll}
            className="gap-2"
          >
            {selectedItems.length === items.length ? (
              <>
                <CheckSquare className="h-4 w-4" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                Select All
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Compare the efficiency of your different purchases side by side.
          {items.length > 0 && (
            <span className="ml-2 text-sm">
              Showing {selectedItems.length} of {items.length} items. Click on checkboxes to customize comparison.
            </span>
          )}
        </p>
        
        {/* Item selection list for mobile/smaller screens */}
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 hidden md:table-cell"></TableHead>
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
              {sortedItems.length > 0 ? (
                sortedItems.map(({ item, metrics }) => (
                  <TableRow key={item.id}>
                    <TableCell className="hidden md:table-cell">
                      <Checkbox 
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>£{item.price.toFixed(2)}</TableCell>
                    <TableCell>{item.lifespanYears} years</TableCell>
                    <TableCell>{item.usesPerWeek}/week</TableCell>
                    <TableCell>£{metrics.costPerUse.toFixed(2)}</TableCell>
                    <TableCell>£{metrics.costPerHour.toFixed(2)}</TableCell>
                    <TableCell>{metrics.totalLifetimeUses}</TableCell>
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
      </CardContent>
    </Card>
  );
};

export default ComparisonTable;

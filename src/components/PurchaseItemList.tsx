
import React from "react";
import { PurchaseItem } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/calculations";

interface PurchaseItemListProps {
  items: PurchaseItem[];
  activeItemId: string;
  isEditMode: boolean;
  onSelectItem: (id: string) => void;
  currencyCode?: string;
}

const PurchaseItemList: React.FC<PurchaseItemListProps> = ({
  items,
  activeItemId,
  isEditMode,
  onSelectItem,
  currencyCode = "GBP",
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-md font-medium">Saved Items</h3>
        <Badge variant="outline">{items.length} items</Badge>
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 -mr-1">
        {items.map(item => (
          <div 
            key={item.id} 
            className={cn(
              "p-3 rounded-md cursor-pointer transition-colors duration-200 hover:bg-secondary/80",
              item.id === activeItemId && !isEditMode 
                ? 'bg-primary/10 border border-primary/20' 
                : 'bg-secondary'
            )}
            onClick={() => onSelectItem(item.id)}
          >
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-medium truncate max-w-[180px]">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {item.usesPerWeek}x/week, {item.lifespanYears} years
                </span>
              </div>
              <span className="text-sm font-medium">
                {formatCurrency(item.price, currencyCode)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchaseItemList;


import React from "react";
import { PurchaseItem } from "@/types";
import { cn } from "@/lib/utils";

interface PurchaseItemListProps {
  items: PurchaseItem[];
  activeItemId: string;
  isEditMode: boolean;
  onSelectItem: (id: string) => void;
}

const PurchaseItemList: React.FC<PurchaseItemListProps> = ({
  items,
  activeItemId,
  isEditMode,
  onSelectItem,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-md font-medium mb-3">Saved Items</h3>
      <div className="space-y-2">
        {items.map(item => (
          <div 
            key={item.id} 
            className={cn(
              "p-3 rounded-md cursor-pointer transition-colors duration-200",
              item.id === activeItemId && !isEditMode ? 'bg-primary/10 border border-primary/20' : 'bg-secondary'
            )}
            onClick={() => onSelectItem(item.id)}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">£{item.price.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchaseItemList;

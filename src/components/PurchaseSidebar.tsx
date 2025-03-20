
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PurchaseItem } from "@/types";
import PurchaseForm from "@/components/PurchaseForm";
import PurchaseItemList from "@/components/PurchaseItemList";
import PurchaseItemHeader from "@/components/PurchaseItemHeader";

interface PurchaseSidebarProps {
  currentItem: PurchaseItem;
  purchaseItems: PurchaseItem[];
  activeItemId: string;
  isEditMode: boolean;
  onItemChange: (updatedItem: PurchaseItem) => void;
  onSaveItem: () => void;
  onAddItemClick: () => void;
  onSelectItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onNameChange: (name: string) => void;
}

const PurchaseSidebar: React.FC<PurchaseSidebarProps> = ({
  currentItem,
  purchaseItems,
  activeItemId,
  isEditMode,
  onItemChange,
  onSaveItem,
  onAddItemClick,
  onSelectItem,
  onDeleteItem,
  onNameChange,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Purchase Items</h2>
        <Button onClick={onAddItemClick} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>
      
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <PurchaseItemHeader 
            itemName={currentItem.name}
            isEditMode={isEditMode}
            onNameChange={onNameChange}
            onSave={onSaveItem}
          />
        </CardHeader>
        <CardContent>
          <PurchaseForm 
            item={currentItem} 
            onChange={onItemChange}
            onDelete={() => onDeleteItem(currentItem.id)}
          />
        </CardContent>
      </Card>
      
      <PurchaseItemList 
        items={purchaseItems}
        activeItemId={activeItemId}
        isEditMode={isEditMode}
        onSelectItem={onSelectItem}
      />
    </div>
  );
};

export default PurchaseSidebar;

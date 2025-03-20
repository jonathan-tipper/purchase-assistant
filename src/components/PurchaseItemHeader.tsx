
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PurchaseItemHeaderProps {
  itemName: string;
  isEditMode: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
}

const PurchaseItemHeader: React.FC<PurchaseItemHeaderProps> = ({
  itemName,
  isEditMode,
  onNameChange,
  onSave
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={itemName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Item name"
          className="text-lg font-medium"
        />
        <Button 
          onClick={onSave} 
          size="sm" 
          variant="secondary" 
          className="gap-1 whitespace-nowrap"
        >
          {isEditMode ? (
            <>
              <Plus className="h-4 w-4" />
              Add Item
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>
      <div>
        <Badge variant="outline" className={isEditMode ? "bg-primary/10" : "bg-secondary"}>
          {isEditMode ? "Creating New Item" : "Editing Existing Item"}
        </Badge>
      </div>
    </div>
  );
};

export default PurchaseItemHeader;


import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";

interface PurchaseItemHeaderProps {
  itemName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
}

const PurchaseItemHeader: React.FC<PurchaseItemHeaderProps> = ({
  itemName,
  onNameChange,
  onSave
}) => {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Input
        value={itemName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Item name"
        className="text-lg font-medium"
      />
      <Button onClick={onSave} size="sm" variant="secondary" className="gap-1">
        <Save className="h-4 w-4" />
        Save
      </Button>
    </div>
  );
};

export default PurchaseItemHeader;

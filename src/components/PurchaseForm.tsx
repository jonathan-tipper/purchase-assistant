
import React from "react";
import { PurchaseItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Trash2 } from "lucide-react";

interface PurchaseFormProps {
  item: PurchaseItem;
  onChange: (updatedItem: PurchaseItem) => void;
  onDelete?: () => void;
  className?: string;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ 
  item, 
  onChange, 
  onDelete,
  className = ""
}) => {
  const handleInputChange = (field: keyof PurchaseItem, value: string | number) => {
    const updatedItem = { ...item } as PurchaseItem;
    
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      (updatedItem[field] as number) = parseFloat(value);
    } else if (typeof value === 'number') {
      (updatedItem[field] as number) = value;
    } else if (field === 'name') {
      updatedItem.name = value as string;
    }
    
    onChange(updatedItem);
  };

  return (
    <Card className={`glass-card animate-scale-in ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex justify-between items-center">
          <Input
            value={item.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Item name"
            className="text-lg font-medium bg-transparent border-none shadow-none focus-visible:ring-0 px-0"
          />
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-5 w-5" />
              <span className="sr-only">Delete item</span>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor={`price-${item.id}`}>Purchase Price (£)</Label>
              <span className="text-muted-foreground text-sm">£{item.price.toFixed(2)}</span>
            </div>
            <div className="flex gap-4 items-center">
              <Slider
                id={`price-${item.id}`}
                min={0}
                max={10000}
                step={10}
                value={[item.price]}
                onValueChange={(value) => handleInputChange('price', value[0])}
                className="flex-1"
              />
              <Input
                type="number"
                value={item.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className="w-24"
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor={`lifespan-${item.id}`}>Lifespan (years)</Label>
              <span className="text-muted-foreground text-sm">{item.lifespanYears} years</span>
            </div>
            <div className="flex gap-4 items-center">
              <Slider
                id={`lifespan-${item.id}`}
                min={0.5}
                max={20}
                step={0.5}
                value={[item.lifespanYears]}
                onValueChange={(value) => handleInputChange('lifespanYears', value[0])}
                className="flex-1"
              />
              <Input
                type="number"
                value={item.lifespanYears}
                onChange={(e) => handleInputChange('lifespanYears', e.target.value)}
                className="w-24"
                min={0.5}
                step={0.5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor={`uses-${item.id}`}>Uses per week</Label>
              <span className="text-muted-foreground text-sm">{item.usesPerWeek} uses</span>
            </div>
            <div className="flex gap-4 items-center">
              <Slider
                id={`uses-${item.id}`}
                min={0.1}
                max={30}
                step={0.1}
                value={[item.usesPerWeek]}
                onValueChange={(value) => handleInputChange('usesPerWeek', value[0])}
                className="flex-1"
              />
              <Input
                type="number"
                value={item.usesPerWeek}
                onChange={(e) => handleInputChange('usesPerWeek', e.target.value)}
                className="w-24"
                min={0.1}
                step={0.1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor={`duration-${item.id}`}>Minutes per use</Label>
              <span className="text-muted-foreground text-sm">{item.minutesPerUse} min</span>
            </div>
            <div className="flex gap-4 items-center">
              <Slider
                id={`duration-${item.id}`}
                min={1}
                max={240}
                step={1}
                value={[item.minutesPerUse]}
                onValueChange={(value) => handleInputChange('minutesPerUse', value[0])}
                className="flex-1"
              />
              <Input
                type="number"
                value={item.minutesPerUse}
                onChange={(e) => handleInputChange('minutesPerUse', e.target.value)}
                className="w-24"
                min={1}
                step={1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor={`depreciation-${item.id}`}>Yearly depreciation (%)</Label>
              <span className="text-muted-foreground text-sm">{item.depreciationRatePercent}%</span>
            </div>
            <div className="flex gap-4 items-center">
              <Slider
                id={`depreciation-${item.id}`}
                min={0}
                max={100}
                step={1}
                value={[item.depreciationRatePercent]}
                onValueChange={(value) => handleInputChange('depreciationRatePercent', value[0])}
                className="flex-1"
              />
              <Input
                type="number"
                value={item.depreciationRatePercent}
                onChange={(e) => handleInputChange('depreciationRatePercent', e.target.value)}
                className="w-24"
                min={0}
                max={100}
                step={1}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchaseForm;

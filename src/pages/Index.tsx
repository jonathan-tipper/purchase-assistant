
import React, { useState } from "react";
import Layout from "@/components/Layout";
import PurchaseForm from "@/components/PurchaseForm";
import ResultsDisplay from "@/components/ResultsDisplay";
import MetricsChart from "@/components/MetricsChart";
import { PurchaseItem } from "@/types";
import { calculateMetrics } from "@/utils/calculations";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const generateId = () => Math.random().toString(36).substr(2, 9);

const getDefaultItem = (): PurchaseItem => ({
  id: generateId(),
  name: "New Purchase",
  price: 500,
  lifespanYears: 5,
  usesPerWeek: 3,
  minutesPerUse: 30,
  depreciationRatePercent: 20,
});

const Index = () => {
  const { toast } = useToast();
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([getDefaultItem()]);
  const [activeItemId, setActiveItemId] = useState<string>(purchaseItems[0].id);

  const activeItem = purchaseItems.find(item => item.id === activeItemId) || purchaseItems[0];
  const metrics = calculateMetrics(activeItem);

  const handleItemChange = (updatedItem: PurchaseItem) => {
    setPurchaseItems(prevItems => 
      prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  };

  const handleAddItem = () => {
    const newItem = getDefaultItem();
    setPurchaseItems(prevItems => [...prevItems, newItem]);
    setActiveItemId(newItem.id);
    
    toast({
      title: "New item added",
      description: "You can now configure your new purchase item.",
    });
  };

  const handleDeleteItem = (id: string) => {
    // Don't allow deleting the last item
    if (purchaseItems.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You need at least one purchase item.",
        variant: "destructive",
      });
      return;
    }
    
    setPurchaseItems(prevItems => prevItems.filter(item => item.id !== id));
    
    // If deleting the active item, select another one
    if (id === activeItemId) {
      const remainingItems = purchaseItems.filter(item => item.id !== id);
      setActiveItemId(remainingItems[0].id);
    }
    
    toast({
      title: "Item deleted",
      description: "The purchase item has been removed.",
    });
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Purchase Items</h2>
            <Button onClick={handleAddItem} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
          
          <div className="space-y-4">
            {purchaseItems.map(item => (
              <div 
                key={item.id} 
                className={`cursor-pointer transition-all duration-300 ${item.id === activeItemId ? 'scale-100' : 'scale-95 opacity-75'}`}
                onClick={() => setActiveItemId(item.id)}
              >
                <PurchaseForm 
                  item={item} 
                  onChange={handleItemChange}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <ResultsDisplay metrics={metrics} />
          <MetricsChart item={activeItem} metrics={metrics} />
        </div>
      </div>
    </Layout>
  );
};

export default Index;

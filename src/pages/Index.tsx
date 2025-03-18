
import React, { useState } from "react";
import Layout from "@/components/Layout";
import PurchaseForm from "@/components/PurchaseForm";
import ResultsDisplay from "@/components/ResultsDisplay";
import MetricsChart from "@/components/MetricsChart";
import { PurchaseItem } from "@/types";
import { calculateMetrics } from "@/utils/calculations";
import { Button } from "@/components/ui/button";
import { Plus, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [currentItem, setCurrentItem] = useState<PurchaseItem>(purchaseItems[0]);
  const [isEditMode, setIsEditMode] = useState(true);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);

  const metrics = calculateMetrics(currentItem);

  const handleItemChange = (updatedItem: PurchaseItem) => {
    setCurrentItem(updatedItem);
  };

  const handleSaveItem = () => {
    // If it's a new item, add it to the list
    if (!purchaseItems.some(item => item.id === currentItem.id)) {
      setPurchaseItems(prevItems => [...prevItems, currentItem]);
    } else {
      // Otherwise update existing item
      setPurchaseItems(prevItems => 
        prevItems.map(item => item.id === currentItem.id ? currentItem : item)
      );
    }
    
    setActiveItemId(currentItem.id);
    setIsEditMode(false);
    
    toast({
      title: "Item saved",
      description: `"${currentItem.name}" has been saved successfully.`,
    });
  };

  const checkForUnsavedChanges = () => {
    // Check if we're in edit mode and if there are unsaved changes
    if (isEditMode) {
      setShowAddItemDialog(true);
    } else {
      proceedWithAddItem();
    }
  };

  const proceedWithAddItem = () => {
    const newItem = getDefaultItem();
    setCurrentItem(newItem);
    setIsEditMode(true);
    setShowAddItemDialog(false);
    
    toast({
      title: "Create new item",
      description: "Give your item a name and configure the details.",
    });
  };

  const handleSelectItem = (id: string) => {
    const selectedItem = purchaseItems.find(item => item.id === id);
    if (selectedItem) {
      setCurrentItem(selectedItem);
      setActiveItemId(id);
      setIsEditMode(false);
    }
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
      const newActiveItem = remainingItems[0];
      setActiveItemId(newActiveItem.id);
      setCurrentItem(newActiveItem);
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
            <Button onClick={checkForUnsavedChanges} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
          
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={currentItem.name}
                  onChange={(e) => setCurrentItem({...currentItem, name: e.target.value})}
                  placeholder="Item name"
                  className="text-lg font-medium"
                />
                <Button onClick={handleSaveItem} size="sm" variant="secondary" className="gap-1">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PurchaseForm 
                item={currentItem} 
                onChange={handleItemChange}
                onDelete={() => handleDeleteItem(currentItem.id)}
              />
            </CardContent>
          </Card>
          
          {purchaseItems.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-medium mb-3">Saved Items</h3>
              <div className="space-y-2">
                {purchaseItems.map(item => (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-md cursor-pointer transition-colors duration-200 ${
                      item.id === activeItemId && !isEditMode ? 'bg-primary/10 border border-primary/20' : 'bg-secondary'
                    }`}
                    onClick={() => handleSelectItem(item.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">£{item.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <ResultsDisplay metrics={metrics} />
          <MetricsChart item={currentItem} metrics={metrics} />
        </div>
      </div>

      <AlertDialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to your current item. 
              Would you like to discard these changes and create a new item?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithAddItem}>Discard & Create New</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Index;

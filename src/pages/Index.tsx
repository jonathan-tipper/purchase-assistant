import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ResultsDisplay from "@/components/ResultsDisplay";
import MetricsChart from "@/components/MetricsChart";
import { PurchaseItem } from "@/types";
import { calculateMetrics } from "@/utils/calculations";
import { useToast } from "@/components/ui/use-toast";
import PurchaseSidebar from "@/components/PurchaseSidebar";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { loadPurchaseItems, savePurchaseItems } from "@/utils/storage";

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
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string>("");
  const [currentItem, setCurrentItem] = useState<PurchaseItem>(getDefaultItem());
  const [isEditMode, setIsEditMode] = useState(true);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);

  // Load items from local storage on initial render
  useEffect(() => {
    const storedItems = loadPurchaseItems();
    if (storedItems.length > 0) {
      setPurchaseItems(storedItems);
      setActiveItemId(storedItems[0].id);
      setCurrentItem(storedItems[0]);
      setIsEditMode(false);
    } else {
      // If no stored items, use default item
      const defaultItem = getDefaultItem();
      setPurchaseItems([defaultItem]);
      setActiveItemId(defaultItem.id);
      setCurrentItem(defaultItem);
    }
  }, []);

  // Save items to local storage whenever they change
  useEffect(() => {
    if (purchaseItems.length > 0) {
      savePurchaseItems(purchaseItems);
    }
  }, [purchaseItems]);

  const metrics = calculateMetrics(currentItem);

  const handleItemChange = (updatedItem: PurchaseItem) => {
    setCurrentItem(updatedItem);
  };

  const handleSaveItem = () => {
    // Check if this item already exists in the list by comparing its ID with all items in purchaseItems
    const itemExists = purchaseItems.some(item => item.id === currentItem.id);
    
    if (itemExists) {
      // Update existing item
      setPurchaseItems(prevItems => 
        prevItems.map(item => item.id === currentItem.id ? currentItem : item)
      );
    } else {
      // Add new item to the list
      setPurchaseItems(prevItems => [...prevItems, currentItem]);
    }
    
    setActiveItemId(currentItem.id);
    setIsEditMode(false);
    
    toast({
      title: "Item saved",
      description: `"${currentItem.name}" has been saved successfully.`,
    });
  };

  const handleNameChange = (name: string) => {
    setCurrentItem({...currentItem, name});
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

  const handleImportItems = (importedItems: PurchaseItem[]) => {
    setPurchaseItems(importedItems);
    const firstItem = importedItems[0];
    if (firstItem) {
      setActiveItemId(firstItem.id);
      setCurrentItem(firstItem);
      setIsEditMode(false);
    }
  };

  return (
    <Layout purchaseItems={purchaseItems} onImportItems={handleImportItems}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PurchaseSidebar 
            currentItem={currentItem}
            purchaseItems={purchaseItems}
            activeItemId={activeItemId}
            isEditMode={isEditMode}
            onItemChange={handleItemChange}
            onSaveItem={handleSaveItem}
            onAddItemClick={checkForUnsavedChanges}
            onSelectItem={handleSelectItem}
            onDeleteItem={handleDeleteItem}
            onNameChange={handleNameChange}
          />
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <ResultsDisplay metrics={metrics} />
          <MetricsChart item={currentItem} metrics={metrics} />
        </div>
      </div>

      <UnsavedChangesDialog
        open={showAddItemDialog}
        onOpenChange={setShowAddItemDialog}
        onProceed={proceedWithAddItem}
      />
    </Layout>
  );
};

export default Index;

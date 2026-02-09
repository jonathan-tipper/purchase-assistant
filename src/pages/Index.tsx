
import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ResultsDisplay from "@/components/ResultsDisplay";
import MetricsChart from "@/components/MetricsChart";
import CostTimeline from "@/components/CostTimeline";
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
  const [currencyCode, setCurrencyCode] = useState("GBP");
  const [isInitialized, setIsInitialized] = useState(false);

  // Load items and currency from localStorage on initial mount
  useEffect(() => {
    const storedCurrency = localStorage.getItem("userCurrency");
    if (storedCurrency) {
      setCurrencyCode(storedCurrency);
    }

    const storedItems = loadPurchaseItems();
    console.log("Initial load from storage:", storedItems);
    
    if (storedItems && storedItems.length > 0) {
      setPurchaseItems(storedItems);
      setActiveItemId(storedItems[0].id);
      setCurrentItem(storedItems[0]);
      setIsEditMode(false);
    } else {
      const defaultItem = getDefaultItem();
      setPurchaseItems([defaultItem]);
      setActiveItemId(defaultItem.id);
      setCurrentItem(defaultItem);
    }
    
    setIsInitialized(true);
  }, []);

  // Save currency to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("userCurrency", currencyCode);
  }, [currencyCode]);

  // Save items to localStorage when they change, but only after initial load
  useEffect(() => {
    if (isInitialized && purchaseItems.length > 0) {
      console.log("Saving items to storage:", purchaseItems);
      savePurchaseItems(purchaseItems);
    }
  }, [purchaseItems, isInitialized]);

  const metrics = calculateMetrics(currentItem);

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrencyCode(newCurrency);
    toast({
      title: "Currency updated",
      description: `Currency has been changed successfully.`,
    });
  };

  const handleItemChange = (updatedItem: PurchaseItem) => {
    setCurrentItem(updatedItem);
  };

  const handleSaveItem = () => {
    // Fixed: Check if we're in create mode (new item) or edit mode (existing item)
    if (!isEditMode) {
      // Update existing item
      setPurchaseItems(prevItems => 
        prevItems.map(item => item.id === currentItem.id ? currentItem : item)
      );
      
      toast({
        title: "Item updated",
        description: `"${currentItem.name}" has been updated successfully.`,
      });
    } else {
      // Create new item with a new ID when in create mode
      const newItem = {
        ...currentItem,
        id: generateId() // Always generate a new ID for new items
      };
      
      setPurchaseItems(prevItems => [...prevItems, newItem]);
      setActiveItemId(newItem.id);
      setCurrentItem(newItem);
      
      toast({
        title: "Item created",
        description: `"${newItem.name}" has been created successfully.`,
      });
    }
    
    setIsEditMode(false);
  };

  const handleNameChange = (name: string) => {
    setCurrentItem({...currentItem, name});
  };

  const checkForUnsavedChanges = () => {
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
    if (purchaseItems.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You need at least one purchase item.",
        variant: "destructive",
      });
      return;
    }
    
    setPurchaseItems(prevItems => prevItems.filter(item => item.id !== id));
    
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
    <Layout 
      purchaseItems={purchaseItems} 
      onImportItems={handleImportItems}
      currencyCode={currencyCode}
      onCurrencyChange={handleCurrencyChange}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <PurchaseSidebar
            currentItem={currentItem}
            purchaseItems={purchaseItems}
            activeItemId={activeItemId}
            isEditMode={isEditMode}
            currencyCode={currencyCode}
            onItemChange={handleItemChange}
            onSaveItem={handleSaveItem}
            onAddItemClick={checkForUnsavedChanges}
            onSelectItem={handleSelectItem}
            onDeleteItem={handleDeleteItem}
            onNameChange={handleNameChange}
          />
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <ResultsDisplay metrics={metrics} currencyCode={currencyCode} />
          <MetricsChart item={currentItem} metrics={metrics} currencyCode={currencyCode} />
          <CostTimeline item={currentItem} currencyCode={currencyCode} />
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

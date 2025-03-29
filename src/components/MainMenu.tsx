
import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Import all feature components
import ThemeSelector from "./ThemeSelector";
import ComparisonTable from "./ComparisonTable";
import DataExport from "./DataExport";
import HelpTutorial from "./HelpTutorial";
import ImportExportItems from "./ImportExportItems";
import CurrencySelector from "./CurrencySelector";

// Re-using the same icons from before
import { Palette, FileSpreadsheet, Download, HelpCircle, Save, CreditCard } from "lucide-react";
import { PurchaseItem } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainMenuProps {
  purchaseItems: PurchaseItem[];
  onImportItems: (items: PurchaseItem[]) => void;
  currencyCode: string;
  onCurrencyChange: (currency: string) => void;
}

const MainMenu = ({ purchaseItems, onImportItems, currencyCode, onCurrencyChange }: MainMenuProps) => {
  const { toast } = useToast();
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const handleMenuItemClick = (action: string) => {
    setActiveFeature(action);
  };

  const menuItems = [
    { 
      icon: <Palette className="h-4 w-4 mr-2" />, 
      label: "Change Theme", 
      action: "Change Theme",
      component: <ThemeSelector />
    },
    { 
      icon: <CreditCard className="h-4 w-4 mr-2" />, 
      label: "Change Currency", 
      action: "Change Currency",
      component: <CurrencySelector selectedCurrency={currencyCode} onCurrencyChange={onCurrencyChange} />
    },
    { 
      icon: <FileSpreadsheet className="h-4 w-4 mr-2" />, 
      label: "Show Comparison Table", 
      action: "Comparison Table",
      component: <ComparisonTable items={purchaseItems} currencyCode={currencyCode} />,
      isWide: true
    },
    { 
      icon: <Download className="h-4 w-4 mr-2" />, 
      label: "Export Data", 
      action: "Export Data",
      component: <DataExport items={purchaseItems} />
    },
    { 
      icon: <Save className="h-4 w-4 mr-2" />, 
      label: "Import/Export Items", 
      action: "Import/Export Items",
      component: <ImportExportItems items={purchaseItems} onImport={onImportItems} />
    },
    { 
      icon: <HelpCircle className="h-4 w-4 mr-2" />, 
      label: "Help & Tutorial", 
      action: "Help & Tutorial",
      component: <HelpTutorial />
    },
  ];

  const renderFeatureContent = () => {
    const feature = menuItems.find(item => item.action === activeFeature);
    if (!feature) return null;
    return feature.component;
  };

  // Determine if current feature needs a wider dialog
  const isWideFeature = () => {
    const feature = menuItems.find(item => item.action === activeFeature);
    return feature?.isWide || false;
  };

  const DesktopMenu = () => (
    <div className="hidden md:block">
      <Dialog open={!!activeFeature} onOpenChange={(open) => !open && setActiveFeature(null)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background">
            <DropdownMenuLabel>Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {menuItems.map((item, index) => (
              <DialogTrigger asChild key={index}>
                <DropdownMenuItem 
                  onClick={() => handleMenuItemClick(item.action)}
                  className="flex items-center cursor-pointer"
                >
                  {item.icon}
                  {item.label}
                </DropdownMenuItem>
              </DialogTrigger>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DialogContent className={`${isWideFeature() ? 'sm:max-w-[800px]' : 'sm:max-w-[600px]'}`}>
          <DialogHeader>
            <DialogTitle>
              {activeFeature}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 px-1">
            {renderFeatureContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const MobileMenu = () => (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[350px]">
          <SheetHeader>
            <SheetTitle>Menu Options</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col space-y-3 mt-4">
            {menuItems.map((item, index) => (
              <Button 
                key={index} 
                variant="ghost" 
                onClick={() => {
                  handleMenuItemClick(item.action);
                  document.querySelector('[data-state="open"]')?.dispatchEvent(
                    new KeyboardEvent('keydown', { key: 'Escape' })
                  );
                }}
                className="justify-start"
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      
      {activeFeature && (
        <Dialog open={!!activeFeature} onOpenChange={(open) => !open && setActiveFeature(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-[90vw] max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {activeFeature}
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2 px-1 overflow-y-auto">
              {renderFeatureContent()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  return (
    <div className="flex items-center">
      <DesktopMenu />
      <MobileMenu />
    </div>
  );
};

export default MainMenu;


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
import CurrencySelector from "./CurrencySelector";
import CostTimeline from "./CostTimeline";
import ComparisonTable from "./ComparisonTable";
import DataExport from "./DataExport";
import HelpTutorial from "./HelpTutorial";

// Re-using the same icons from before
import { Palette, CreditCard, LineChart, Download, FileSpreadsheet, HelpCircle } from "lucide-react";

const MainMenu = () => {
  const { toast } = useToast();
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  
  // This would normally come from context/global state
  const dummyItems = [
    {
      id: "item1",
      name: "Example Item",
      price: 500,
      lifespanYears: 5,
      usesPerWeek: 3,
      minutesPerUse: 30,
      depreciationRatePercent: 20,
    }
  ];
  
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
      component: <CurrencySelector />
    },
    { 
      icon: <LineChart className="h-4 w-4 mr-2" />, 
      label: "View as Cost Timeline", 
      action: "Cost Timeline",
      component: <CostTimeline item={dummyItems[0]} />
    },
    { 
      icon: <FileSpreadsheet className="h-4 w-4 mr-2" />, 
      label: "Show Comparison Table", 
      action: "Comparison Table",
      component: <ComparisonTable items={dummyItems} />
    },
    { 
      icon: <Download className="h-4 w-4 mr-2" />, 
      label: "Export Data", 
      action: "Export Data",
      component: <DataExport items={dummyItems} />
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

  // For larger screens - use dropdown menu and dialog
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
          <DropdownMenuContent align="end">
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
        
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {activeFeature}
            </DialogTitle>
          </DialogHeader>
          {renderFeatureContent()}
        </DialogContent>
      </Dialog>
    </div>
  );

  // For mobile - use slide-out sheet
  const MobileMenu = () => (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right">
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
      
      {/* Feature Dialog for Mobile */}
      {activeFeature && (
        <Dialog open={!!activeFeature} onOpenChange={(open) => !open && setActiveFeature(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {activeFeature}
              </DialogTitle>
            </DialogHeader>
            {renderFeatureContent()}
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

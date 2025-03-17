
import React from "react";
import { Menu, Settings, Palette, CreditCard, LineChart, Download, FileSpreadsheet, HelpCircle } from "lucide-react";
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

const MainMenu = () => {
  const { toast } = useToast();
  
  const handleMenuItemClick = (action: string) => {
    toast({
      title: "Feature coming soon",
      description: `The "${action}" feature will be available in a future update.`,
    });
  };

  const menuItems = [
    { 
      icon: <Palette className="h-4 w-4 mr-2" />, 
      label: "Change Theme", 
      action: "Change Theme" 
    },
    { 
      icon: <CreditCard className="h-4 w-4 mr-2" />, 
      label: "Change Currency", 
      action: "Change Currency" 
    },
    { 
      icon: <LineChart className="h-4 w-4 mr-2" />, 
      label: "View as Cost Timeline", 
      action: "Cost Timeline" 
    },
    { 
      icon: <FileSpreadsheet className="h-4 w-4 mr-2" />, 
      label: "Show Comparison Table", 
      action: "Comparison Table" 
    },
    { 
      icon: <Download className="h-4 w-4 mr-2" />, 
      label: "Export Data", 
      action: "Export Data" 
    },
    { 
      icon: <HelpCircle className="h-4 w-4 mr-2" />, 
      label: "Help & Tutorial", 
      action: "Help & Tutorial" 
    },
  ];

  // For larger screens - use dropdown menu
  const DesktopMenu = () => (
    <div className="hidden md:block">
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
            <DropdownMenuItem 
              key={index} 
              onClick={() => handleMenuItemClick(item.action)}
              className="flex items-center cursor-pointer"
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
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
                onClick={() => handleMenuItemClick(item.action)}
                className="justify-start"
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
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

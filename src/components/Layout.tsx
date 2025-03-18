
import React from "react";
import MainMenu from "./MainMenu";
import { PurchaseItem } from "@/types";

interface LayoutProps {
  children: React.ReactNode;
  purchaseItems?: PurchaseItem[];
  onImportItems?: (items: PurchaseItem[]) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  purchaseItems = [], 
  onImportItems = () => {} 
}) => {
  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Purchase Value Calculator</h1>
        <MainMenu purchaseItems={purchaseItems} onImportItems={onImportItems} />
      </header>
      <main>{children}</main>
    </div>
  );
};

export default Layout;

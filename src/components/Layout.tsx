import React from "react";
import { useNavigate } from "react-router-dom";
import MainMenu from "./MainMenu";
import BottomNav from "./BottomNav";
import { PurchaseItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  purchaseItems?: PurchaseItem[];
  onImportItems?: (items: PurchaseItem[]) => void;
  currencyCode: string;
  onCurrencyChange: (currency: string) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  purchaseItems = [],
  onImportItems = () => {},
  currencyCode = "GBP",
  onCurrencyChange
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 px-4 pb-20 md:pb-6 max-w-6xl">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold cursor-pointer" onClick={() => navigate("/")}>
          Purchase Assistant
        </h1>
        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()} title="Sign out">
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} title="Sign in">
              <LogIn className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}
          <MainMenu
            purchaseItems={purchaseItems}
            onImportItems={onImportItems}
            currencyCode={currencyCode}
            onCurrencyChange={onCurrencyChange}
          />
        </div>
      </header>
      <main>{children}</main>
      <BottomNav />
    </div>
  );
};

export default Layout;

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Calculator, MessageCircle, BookOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { path: "/", label: "Calculator", icon: Calculator },
  { path: "/advisor", label: "Advisor", icon: MessageCircle },
  { path: "/journal", label: "Journal", icon: BookOpen },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

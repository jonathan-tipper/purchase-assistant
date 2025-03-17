
import React from "react";
import { ThemeProvider } from "@/hooks/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";

interface AppWrapperProps {
  children: React.ReactNode;
}

const AppWrapper = ({ children }: AppWrapperProps) => {
  return (
    <ThemeProvider>
      {children}
      <Toaster />
    </ThemeProvider>
  );
};

export default AppWrapper;

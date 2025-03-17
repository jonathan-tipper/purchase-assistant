
import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 text-foreground overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
      <header className="px-6 py-8 md:py-12 container max-w-5xl mx-auto">
        <div className="flex justify-center items-center mb-8">
          <div className="animate-entrance" style={{ "--delay": 0 } as React.CSSProperties}>
            <span className="px-3 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full mb-2 inline-block">
              Purchase Value Calculator
            </span>
          </div>
        </div>
        <h1 
          className="font-bold text-3xl md:text-4xl text-center bg-clip-text animate-entrance" 
          style={{ "--delay": 1 } as React.CSSProperties}
        >
          Calculate the true value of your purchases
        </h1>
        <p 
          className="text-muted-foreground text-lg md:text-xl text-center mt-4 max-w-3xl mx-auto animate-entrance" 
          style={{ "--delay": 2 } as React.CSSProperties}
        >
          Understand the cost per use and see the real value of items over their lifespan
        </p>
      </header>
      <main className="container max-w-5xl mx-auto px-4 pb-16">
        {children}
      </main>
      <footer className="container max-w-5xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>Purchase Value Calculator &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Layout;

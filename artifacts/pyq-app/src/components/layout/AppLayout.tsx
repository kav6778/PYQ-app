import React from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Library, 
  BrainCircuit, 
  UploadCloud,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Browse PYQs", path: "/browse", icon: Library },
  { name: "Quiz Mode", path: "/quiz", icon: BrainCircuit },
  { name: "Upload PDF", path: "/upload", icon: UploadCloud },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Auto-close mobile menu on navigation
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden selection:bg-primary/30">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-white/5 bg-card/30 backdrop-blur-xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            PrepMaster AI
          </h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 group relative",
                  isActive 
                    ? "text-white bg-white/10 border border-white/5 shadow-inner" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav-desktop"
                    className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110 text-primary" : "group-hover:scale-110")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <h3 className="font-semibold text-white mb-1 relative z-10">Pro Plan</h3>
            <p className="text-sm text-muted-foreground mb-4 relative z-10">Unlock all subjects and unlimited quizzes.</p>
            <button className="w-full py-2 bg-white text-black rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors">
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header & Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background/80 backdrop-blur-md z-30 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-display font-bold text-lg">PrepMaster</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -mr-2 text-muted-foreground hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-x-0 top-[65px] bg-card border-b border-white/5 shadow-2xl z-20 md:hidden"
            >
              <nav className="p-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 rounded-xl font-medium",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 bg-animated-gradient relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur-xl border-t border-white/5 pb-safe z-30">
          <nav className="flex justify-around items-center p-2">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={cn(
                    "flex flex-col items-center p-2 min-w-[64px] transition-colors relative",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-mobile"
                      className="absolute -top-2 w-10 h-1 bg-primary rounded-full"
                    />
                  )}
                  <item.icon className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium">{item.name.split(' ')[0]}</span>
                </Link>
              );
            })}
          </nav>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import GlobalRail from './GlobalRail';
import WorkspaceSidebar from './WorkspaceSidebar';
import GlobalSearch from './GlobalSearch';
import { WorkspaceProvider } from '@/lib/WorkspaceContext';
import useTheme from '@/hooks/useTheme';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export default function AppLayout() {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-background flex">
        {/* Global Rail - Always visible */}
        <div className="hidden lg:block shrink-0 sticky top-0 h-screen z-50">
          <GlobalRail
            collapsed={railCollapsed}
            onToggle={() => setRailCollapsed(c => !c)}
            theme={theme}
            onToggleTheme={toggleTheme}
            onSearchOpen={() => setSearchOpen(true)}
          />
        </div>

        {/* Workspace Sidebar */}
        <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
          <WorkspaceSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(c => !c)}
            onSearchOpen={() => setSearchOpen(true)}
            onNavigate={() => {}}
          />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0 overflow-hidden">
            <WorkspaceSidebar
              collapsed={false}
              mobile
              onSearchOpen={() => { setSearchOpen(true); setMobileOpen(false); }}
              onNavigate={() => setMobileOpen(false)}
              className="h-full border-r-0"
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
            <Outlet />
          </main>
        </div>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </WorkspaceProvider>
  );
}
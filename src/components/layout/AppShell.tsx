import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { MobileDrawer } from './MobileDrawer';

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bgdark grid-bg">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Topbar onMenuClick={() => setDrawerOpen(true)} />
          <main className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1440px] mx-auto">
            {children}
          </main>
        </div>
      </div>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <MobileNav />
    </div>
  );
}

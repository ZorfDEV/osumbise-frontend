import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import OfflineBanner from './OfflineBanner';

const SIDEBAR_COLLAPSED_KEY = 'osumbise:sidebar-collapsed';

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  return (
    <div className="min-h-screen">
      {/* print:hidden — la sidebar ne doit jamais apparaître sur une facture imprimée */}
      <div className="print:hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((c) => !c)}
        />
      </div>
      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out print:pl-0 ${
          isCollapsed ? 'lg:pl-16' : 'lg:pl-56'
        }`}
      >
        <div className="print:hidden">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
          <OfflineBanner />
        </div>
        <main className="flex-1 overflow-x-auto bg-slate-50 p-4 sm:p-6 print:bg-white print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

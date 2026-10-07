import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';

const SIDEBAR_COLLAPSED_KEY = 'osumbise:sidebar-collapsed';

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Recherche globale : Ctrl+K (Windows/Android) ou ⌘K (Mac/iPad), partout
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Menu mobile ouvert : on bloque le scroll de la page derrière et on permet
  // de le fermer avec Échap.
  useEffect(() => {
    if (!isSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-surface">
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
        className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ease-in-out print:pl-0 ${
          isCollapsed ? 'lg:pl-16' : 'lg:pl-56'
        }`}
      >
        {/* sticky plutôt que fixed : la barre reste en haut au scroll tout en
            suivant la largeur de la colonne (sidebar réduite ou non), sans
            avoir à compenser sa hauteur dans le contenu. */}
        <div className="sticky top-0 z-30 print:hidden">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} onSearchClick={() => setIsSearchOpen(true)} />
        </div>
        <main className="min-w-0 flex-1 p-4 sm:p-6 print:p-0">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { NAV_ITEMS } from '@/config/navigation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const EASE = 'transition-all duration-300 ease-in-out';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: Props) {
  const { user } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <>
      {/* Fond sombre derrière le menu ouvert, mobile/tablette uniquement */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 transition-opacity duration-300 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-56 flex-col border-r border-slate-200 bg-white ${EASE} lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-16' : 'lg:w-56'}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between overflow-hidden border-b border-slate-200 px-4">
          <span
            className={`overflow-hidden whitespace-nowrap text-lg font-semibold text-slate-900 ${EASE} ${
              isCollapsed ? 'lg:max-w-0 lg:opacity-0' : 'max-w-[140px] opacity-100'
            }`}
          >
            Osumbise
          </span>
          <span
            className={`hidden text-lg font-semibold text-slate-900 ${isCollapsed ? 'lg:block' : ''}`}
          >
            O
          </span>
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="text-slate-400 hover:text-slate-600 lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                }
              >
                {/* Icône à gauche */}
                <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                {/* Libellé : s'estompe en largeur + opacité au lieu de
                    disparaître d'un coup */}
                <span
                  className={`overflow-hidden whitespace-nowrap ${EASE} ${
                    isCollapsed ? 'lg:max-w-0 lg:opacity-0' : 'max-w-[160px] opacity-100'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bouton réduire/agrandir — desktop uniquement, le mobile a déjà son
            propre mécanisme d'ouverture/fermeture via le hamburger */}
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          className="hidden items-center justify-center gap-2 border-t border-slate-200 py-3 text-xs font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:flex"
        >
          {isCollapsed ? (
            <ChevronRight size={16} strokeWidth={1.75} />
          ) : (
            <>
              <ChevronLeft size={16} strokeWidth={1.75} />
              Réduire
            </>
          )}
        </button>
      </aside>
    </>
  );
}

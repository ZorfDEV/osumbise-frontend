import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { NAV_ITEMS, NAV_SECTIONS, isNavItemVisible } from '@/config/navigation';
import BrandLogo, { BrandMark } from '@/components/ui/brand-logo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const EASE = 'transition-all duration-300 ease-in-out';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: Props) {
  const { user } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => isNavItemVisible(item, user));
  const sections = NAV_SECTIONS.map((section) => ({
    section,
    items: visibleItems.filter((item) => item.section === section),
  })).filter((s) => s.items.length > 0);

  return (
    <>
      {/* Fond sombre derrière le menu ouvert, mobile/tablette uniquement.
          Toujours monté pour pouvoir animer l'opacité. Ordre des couches :
          topbar (z-30) < fond (z-40) < sidebar (z-50). */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 max-w-[85vw] flex-col border-r border-slate-200 bg-surface ${EASE} lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-16' : 'lg:w-56'}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between overflow-hidden border-b border-slate-200 px-4">
          {/* Logo complet, s'estompe quand le menu est réduit (desktop) */}
          <span
            className={`flex overflow-hidden ${EASE} ${
              isCollapsed ? 'lg:max-w-0 lg:opacity-0' : 'max-w-[150px] opacity-100'
            }`}
          >
            <BrandLogo className="h-8" />
          </span>
          {/* Logo réduit (SVG), seul visible quand le menu est réduit */}
          <span className={`hidden ${isCollapsed ? 'lg:mx-auto lg:block' : ''}`}>
            <BrandMark className="h-8 w-8" />
          </span>
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          {sections.map(({ section, items }, index) => (
            <div key={section} className={index > 0 ? 'mt-4' : ''}>
              {/* Titre de section ; en mode réduit (desktop), un simple trait */}
              <p
                className={`mb-1 px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500 ${
                  isCollapsed ? 'lg:hidden' : ''
                }`}
              >
                {section}
              </p>
              {isCollapsed && index > 0 && (
                <div aria-hidden="true" className="mx-3 mb-2 hidden border-t border-slate-200 lg:block" />
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/dashboard'}
                      onClick={onClose}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 lg:py-2 ${
                          isActive ? 'bg-action text-white' : 'text-slate-600 hover:bg-slate-100'
                        } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                      }
                    >
                      {/* Icône à gauche */}
                      <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                      {/* Libellé : s'estompe en largeur + opacité au lieu de
                          disparaître d'un coup */}
                      <span
                        className={`overflow-hidden whitespace-nowrap ${EASE} ${
                          isCollapsed ? 'lg:max-w-0 lg:opacity-0' : 'max-w-[180px] opacity-100'
                        }`}
                      >
                        {item.label}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bouton réduire/agrandir — desktop uniquement, le mobile a déjà son
            propre mécanisme d'ouverture/fermeture via le hamburger */}
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          className="hidden items-center justify-center gap-2 border-t border-slate-200 py-3 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-600 lg:flex"
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

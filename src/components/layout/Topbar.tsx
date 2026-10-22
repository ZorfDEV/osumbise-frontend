import { LogOut, Maximize, Menu, Minimize, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useFullscreen } from '@/lib/useFullscreen';
import { ROLE_LABELS } from '@/config/roles';
import ConnectionStatus from './ConnectionStatus';
import ThemeToggle from './ThemeToggle';
import EstablishmentSwitcher from './EstablishmentSwitcher';

interface Props {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

// Raccourci affiché selon la plateforme : ⌘K sur Mac/iPad, Ctrl K ailleurs
const SEARCH_SHORTCUT =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';

const ICON_BUTTON =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 border border-slate-200';

export default function Topbar({ onMenuClick, onSearchClick }: Props) {
  const { user, logout } = useAuth();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  const fullscreenLabel = isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran';

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-surface px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button onClick={onMenuClick} aria-label="Ouvrir le menu" className={`${ICON_BUTTON} lg:hidden`}>
          <Menu size={22} />
        </button>
        {/* Établissement en cours ; menu de changement pour un propriétaire */}
        <EstablishmentSwitcher />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Recherche globale : champ factice sur desktop, icône sur mobile */}
        <button
          onClick={onSearchClick}
          aria-label="Rechercher"
          className="hidden h-9 w-56 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 md:flex lg:w-64"
        >
          <Search size={16} className="shrink-0" />
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="rounded border border-slate-300 bg-surface px-1.5 py-0.5 text-[0.7rem] font-medium">
            {SEARCH_SHORTCUT}
          </kbd>
        </button>
        <button onClick={onSearchClick} aria-label="Rechercher" className={`${ICON_BUTTON} md:hidden`}>
          <Search size={18} />
        </button>
        <ConnectionStatus />
        <ThemeToggle className={ICON_BUTTON} />
        {user?.isPlatformAdmin && (
          <Link
            to="/platform-admin"
            title="Administration plateforme"
            aria-label="Administration plateforme"
            className={ICON_BUTTON}
          >
            <ShieldCheck size={18} />
          </Link>
        )}
        <button
          onClick={toggleFullscreen}
          aria-label={fullscreenLabel}
          title={fullscreenLabel}
          className={`border m-2 border-slate-200 ${ICON_BUTTON} hidden sm:flex`}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>

        {user && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
            <div
              title={`${user.name} — ${ROLE_LABELS[user.role]}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden max-w-[160px]  leading-tight md:block">
              <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
              <p className="truncate text-xs text-primary-600">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => logout()}
          aria-label="Déconnexion"
          title="Déconnexion"
          className="btn btn-danger btn-sm h-9 shrink-0 px-2 sm:px-3"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}

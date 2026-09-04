import { Maximize, Minimize } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useFullscreen } from '@/lib/useFullscreen';
import { ROLE_LABELS } from '@/config/roles';

interface Props {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  // Un OWNER sans établissement fixe n'a pas de "logo courant" évident (il en
  // gère potentiellement plusieurs) : on retombe alors sur le nom de
  // l'organisation, sans logo — même simplification que pour la création de
  // commandes/produits ailleurs dans l'app.
  const brandName = user?.establishment?.name ?? user?.organization.name;
  const brandLogo = user?.establishment?.logo ?? null;

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
          className="text-slate-500 hover:text-slate-900 lg:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
        {brandName && (
          <div className="flex items-center gap-2">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="h-7 w-7 rounded object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-400">
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">
              {brandName}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
          title={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
          className="text-slate-400 hover:text-slate-700"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} /> }
        </button>
        <div className="hidden items-center gap-2 border-l border-r border-slate-200 pl-3  pr-3 sm:flex">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-400">{user && ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}

import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export default function PlatformAdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/platform-admin'
      ? location.pathname === '/platform-admin'
      : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-primary-950 bg-[#131414] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-white">⚙ Administration Osumbise</span>
            <nav className="hidden gap-4 sm:flex">
              <Link
                to="/platform-admin"
                className={`text-sm ${isActive('/platform-admin') ? 'font-medium text-white' : 'text-primary-300 hover:text-white'}`}
              >
                Vue d’ensemble
              </Link>
              <Link
                to="/platform-admin/organizations"
                className={`text-sm ${isActive('/platform-admin/organizations') ? 'font-medium text-white' : 'text-primary-300 hover:text-white'}`}
              >
                Organisations
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-primary-300 hover:text-white"
            >
              ← Retour à l’app
            </button>
            <button onClick={() => logout()} className="text-sm text-primary-300 hover:text-white">
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}

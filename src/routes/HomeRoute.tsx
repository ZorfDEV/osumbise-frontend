import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { NAV_ITEMS } from '@/config/navigation';
import DashboardPage from '@/features/dashboard/DashboardPage';

export default function HomeRoute() {
  const { user } = useAuth();

  if (!user) {
    return null; // ProtectedRoute gère déjà le cas non authentifié
  }

  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return <DashboardPage />;
  }

  const firstAccessible = NAV_ITEMS.find(
    (item) => item.to !== '/' && item.roles.includes(user.role)
  );

  // Filet de sécurité si un rôle n'a jamais accès à rien (ne devrait pas arriver) :
  // envoie vers Paramètres, accessible à tous
  return <Navigate to={firstAccessible?.to ?? '/settings'} replace />;
}

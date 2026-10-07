import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { NAV_ITEMS, isNavItemVisible } from '@/config/navigation';
import DashboardPage from '@/features/dashboard/DashboardPage';

export default function HomeRoute() {
  const { user } = useAuth();

  if (!user) {
    return null; // ProtectedRoute gère déjà le cas non authentifié
  }

  // Un OWNER doit avoir choisi une formule avant d'accéder à l'app — sécurité
  // supplémentaire au cas où /subscribe aurait été quitté avant confirmation
  if (user.role === 'OWNER' && !user.hasSubscription) {
    return <Navigate to="/subscribe" replace />;
  }

  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return <DashboardPage />;
  }

  const firstAccessible = NAV_ITEMS.find(
    (item) => item.to !== '/dashboard' && isNavItemVisible(item, user)
  );

  // Filet de sécurité si un rôle n'a jamais accès à rien (ne devrait pas arriver) :
  // envoie vers Paramètres, accessible à tous
  return <Navigate to={firstAccessible?.to ?? '/settings'} replace />;
}

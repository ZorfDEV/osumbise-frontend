import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { canUsePos } from '@/config/navigation';
import { useActiveEstablishment } from '@/features/establishments/ActiveEstablishmentContext';

// Pages du point de vente (plan des tables) : une caissière d'hôtel qui tape
// l'adresse est renvoyée vers sa page d'accueil (Chambres)
export default function PosRoute() {
  const { user } = useAuth();
  const { current } = useActiveEstablishment();
  if (!canUsePos(user, current.type)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

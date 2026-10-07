import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { AppLoader } from '@/components/ui/skeleton';
import LandingPage from '@/features/marketing/LandingPage';

export default function RootRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

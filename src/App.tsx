import { AuthProvider } from '@/features/auth/AuthContext';
import AppRouter from '@/routes/AppRouter';
import OfflineSyncManager from '@/lib/OfflineSyncManager';

export default function App() {
  return (
    <AuthProvider>
      <OfflineSyncManager />
      <AppRouter />
    </AuthProvider>
  );
}

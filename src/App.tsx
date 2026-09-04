import { AuthProvider } from '@/features/auth/AuthContext';
import AppRouter from '@/routes/AppRouter';
import OfflineSyncManager from '@/lib/OfflineSyncManager';
import { ConfirmProvider } from '@/lib/confirm';
import { ToastProvider } from '@/lib/toast';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <OfflineSyncManager />
          <AppRouter />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { getSocket } from '@/lib/socket';
import { useToast } from '@/lib/toast';
import { playReadySound, readReadySoundEnabled } from '@/lib/readySound';

// Postes de la salle : quand la cuisine marque une commande « Prête », un
// carillon retentit et une notification indique la table à servir.
const FLOOR_ROLES = ['OWNER', 'ADMIN', 'SERVER', 'CASHIER'];

export default function OrderReadyNotifier() {
  const { user } = useAuth();
  const toast = useToast();
  const listens = !!user && FLOOR_ROLES.includes(user.role);

  useEffect(() => {
    if (!listens) return;
    const socket = getSocket();
    const handle = (payload: { status?: string; number?: number | null; table?: string | null }) => {
      if (payload.status !== 'PRETE') return;
      if (readReadySoundEnabled()) playReadySound();
      const no = payload.number ? ` N° ${String(payload.number).padStart(4, '0')}` : '';
      toast.success(`Commande${no} prête — ${payload.table ? `Table ${payload.table}` : 'Comptoir'}`);
    };
    socket.on('order:status_changed', handle);
    return () => {
      socket.off('order:status_changed', handle);
    };
  }, [listens, toast]);

  return null;
}

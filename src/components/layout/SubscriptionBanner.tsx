import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { READ_ONLY_EVENT } from '@/lib/axios';
import { useToast } from '@/lib/toast';
import Alert from '@/components/ui/alert';

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Libreville' });

// Abonnement expiré : avertissement pendant le délai de grâce, puis lecture
// seule (le serveur refuse toute modification, voir tenant.middleware.ts)
export default function SubscriptionBanner() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const lastNotice = useRef(0);

  // Une modification vient d'être refusée : on l'explique (une fois toutes les
  // 10 secondes au plus) et on met le bandeau à jour
  useEffect(() => {
    const onRefused = () => {
      if (Date.now() - lastNotice.current < 10_000) return;
      lastNotice.current = Date.now();
      toast.error('Abonnement expiré : l’application est en lecture seule');
      refreshProfile().catch(() => undefined);
    };
    window.addEventListener(READ_ONLY_EVENT, onRefused);
    return () => window.removeEventListener(READ_ONLY_EVENT, onRefused);
  }, [toast, refreshProfile]);

  const access = user?.subscriptionAccess;
  if (!user || !access || access.state === 'OK' || !access.readOnlyAt) return null;

  const readOnly = access.state === 'READ_ONLY';
  const cause = access.endedAt ? `L’abonnement a expiré le ${day(access.endedAt)}.` : 'Aucune formule n’a été choisie.';

  return (
    <Alert
      type={readOnly ? 'error' : 'warning'}
      title={readOnly ? 'Application en lecture seule' : access.endedAt ? 'Abonnement expiré' : 'Formule à choisir'}
      className="mx-4 mt-4 sm:mx-6"
    >
      {cause}{' '}
      {readOnly
        ? 'Vos données restent consultables, mais rien ne peut être vendu ni modifié.'
        : `Sans renouvellement, l’application passera en lecture seule le ${day(access.readOnlyAt)}.`}{' '}
      {user.role !== 'OWNER' ? (
        'Prévenez le propriétaire.'
      ) : (
        <Link to={access.endedAt ? '/establishments' : '/subscribe'} className="font-semibold underline">
          {access.endedAt ? 'Voir mon abonnement' : 'Choisir une formule'}
        </Link>
      )}
    </Alert>
  );
}

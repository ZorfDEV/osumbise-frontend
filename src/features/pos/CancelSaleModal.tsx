import { useState } from 'react';
import { useToast } from '@/lib/toast';
import { cancelOrder } from './api';
import VoidReasonModal from './VoidReasonModal';

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

// Annuler une vente DÉJÀ ENCAISSÉE (commande de test, remboursement) —
// propriétaire et administrateur. Elle sort des rapports ; stock, caisse
// ouverte et compte client sont corrigés côté serveur.
export default function CancelSaleModal({
  orderId,
  total,
  onClose,
  onCancelled,
}: {
  orderId: string;
  total: number;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const toast = useToast();
  const [restock, setRestock] = useState(true);

  return (
    <VoidReasonModal
      title="Annuler la vente encaissée"
      description={`La vente de ${fcfa(total)} sort des rapports et du chiffre d’affaires. Les espèces sont retirées de la caisse si elle est encore ouverte, et le compte client est corrigé.`}
      confirmLabel="Annuler la vente"
      onClose={onClose}
      onConfirm={async (reason) => {
        try {
          const { closedSessionCash } = await cancelOrder(orderId, reason, restock);
          toast.success('Vente annulée');
          if (closedSessionCash > 0) {
            toast.warning(
              `${fcfa(closedSessionCash)} en espèces avaient été encaissés dans une caisse déjà clôturée : elle n’est pas modifiée.`
            );
          }
          onCancelled();
        } catch (err) {
          toast.error(
            (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Annulation impossible'
          );
        }
      }}
    >
      <label className="mb-4 flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          Remettre les produits en stock
          <span className="block text-xs text-slate-500">
            À décocher si les produits ont réellement été consommés (remboursement d’un client).
          </span>
        </span>
      </label>
    </VoidReasonModal>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchPurchaseOrder,
  addPurchaseItem,
  removePurchaseItem,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
} from './api';
import { fetchProducts } from '@/features/products/api';
import { PurchaseOrder, PurchaseOrderStatus } from './types';
import { Product } from '@/features/products/types';
import { useConfirm } from '@/lib/confirm';
import { useToast } from '@/lib/toast';
import { PageSkeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/ui/breadcrumbs';

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  BROUILLON: 'Brouillon',
  COMMANDE: 'Commandée',
  RECU: 'Reçue',
  ANNULE: 'Annulée',
};

const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirm();
  const toast = useToast();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    fetchPurchaseOrder(id).then(setPo);
  }, [id]);

  useEffect(() => {
    reload();
    fetchProducts().then((p) => setProducts(p.filter((prod) => prod.isActive)));
  }, [reload]);

  if (!po) {
    return <PageSkeleton />;
  }

  const isEditable = po.status === 'BROUILLON';

  const handleAddItem = async () => {
    if (!id || !productId || quantity <= 0) return;
    setError(null);
    try {
      await addPurchaseItem(id, { productId, quantity, unitPrice });
      toast.success('Article ajouté');
      setProductId('');
      setQuantity(1);
      setUnitPrice(0);
      reload();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur';
      setError(message);
      toast.error(message);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!id) return;
    await removePurchaseItem(id, itemId);
    toast.success('Article retiré');
    reload();
  };

  const handleSend = async () => {
    if (!id) return;
    await updatePurchaseOrderStatus(id, 'COMMANDE');
    toast.success('Commande envoyée au fournisseur');
    reload();
  };

  const handleCancel = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Annuler la commande',
      message: 'Annuler cette commande ?',
      confirmLabel: 'Annuler la commande',
      danger: true,
    });
    if (!ok) return;
    await updatePurchaseOrderStatus(id, 'ANNULE');
    toast.info('Commande annulée');
    reload();
  };

  const handleReceive = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Confirmer la réception',
      message: 'Confirmer la réception ? Le stock de chaque article sera incrémenté.',
      confirmLabel: 'Confirmer la réception',
    });
    if (!ok) return;
    setError(null);
    try {
      await receivePurchaseOrder(id);
      toast.success('Réception confirmée — stock mis à jour');
      reload();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: 'Achats', to: '/purchase-orders' }, { label: po.supplier.name }]} />

      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-heading">{po.supplier.name}</h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {STATUS_LABELS[po.status]}
        </span>
      </div>
      {po.receivedAt && (
        <p className="mb-6 text-sm text-slate-500">
          Reçue le {new Date(po.receivedAt).toLocaleString('fr-FR')}
        </p>
      )}

      <div className="mb-6 overflow-x-auto rounded-lg border border-slate-200 bg-surface">
        <table className="table-cards w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Produit</th>
              <th className="px-4 py-2 font-medium">Quantité</th>
              <th className="px-4 py-2 font-medium">Prix unitaire</th>
              <th className="px-4 py-2 font-medium">Sous-total</th>
              {isEditable && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {po.items.map((item) => (
              <tr key={item.id}>
                <td data-label="Produit" className="px-4 py-2 text-slate-900">{item.product.name}</td>
                <td data-label="Quantité" className="px-4 py-2 text-slate-600">
                  {Number(item.quantity)} {item.product.unit}
                </td>
                <td data-label="Prix unitaire" className="px-4 py-2 text-slate-600">
                  {formatFcfa(Number(item.unitPrice))}
                </td>
                <td data-label="Sous-total" className="px-4 py-2 text-slate-600">
                  {formatFcfa(Number(item.quantity) * Number(item.unitPrice))}
                </td>
                {isEditable && (
                  <td data-label="" className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-xs text-slate-500 hover:text-danger"
                    >
                      Retirer
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {po.items.length === 0 && (
              <tr>
                <td colSpan={isEditable ? 5 : 4} className="px-4 py-6 text-center text-slate-500">
                  Aucun article
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 font-medium text-slate-900">
              <td className="px-4 py-2" colSpan={3}>
                Total
              </td>
              <td data-label="Produit" className="px-4 py-2">{formatFcfa(Number(po.total))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {isEditable && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-heading-muted">Ajouter un article</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="input px-2"
            >
              <option value="">— Produit —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="Quantité"
              className="input w-24 px-2"
            />
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              placeholder="Prix unitaire"
              className="input w-32 px-2"
            />
            <button
              onClick={handleAddItem}
              className="btn btn-primary px-3"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-3">
        {po.status === 'BROUILLON' && (
          <>
            <button
              onClick={handleSend}
              disabled={po.items.length === 0}
              className="btn btn-primary"
            >
              Envoyer la commande
            </button>
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
            >
              Annuler
            </button>
          </>
        )}
        {po.status === 'COMMANDE' && (
          <>
            <button
              onClick={handleReceive}
              className="btn btn-primary"
            >
              Confirmer la réception
            </button>
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { createEntry, createLoss, createAdjustment, createTransfer } from './api';
import { Product } from '@/features/products/types';
import { useToast } from '@/lib/toast';
import ProductPicker from '@/features/products/ProductPicker';
import type { StockLocation } from './types';

type Mode = 'ENTREE' | 'DESTOCKAGE' | 'PERTE' | 'CASSE' | 'AJUSTEMENT';

interface Props {
  mode: Mode;
  products: Product[];
  onDone: () => void;
  onCancel: () => void;
}

const MODE_LABELS: Record<Mode, string> = {
  ENTREE: 'Entrée de stock',
  DESTOCKAGE: 'Sortie vers la vente (déstockage)',
  PERTE: 'Perte',
  CASSE: 'Casse',
  AJUSTEMENT: 'Ajustement (inventaire)',
};

const LOCATION_LABELS: Record<StockLocation, string> = {
  RESERVE: 'Réserve (magasin)',
  SALES: 'Stock de vente (bar, rayon)',
};

export default function StockMovementForm({ mode, products, onDone, onCancel }: Props) {
  const toast = useToast();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  // Livraison en réserve par défaut ; pertes et inventaire sur le stock de vente
  const [location, setLocation] = useState<StockLocation>(mode === 'ENTREE' ? 'RESERVE' : 'SALES');
  const [direction, setDirection] = useState<'TO_SALES' | 'TO_RESERVE'>('TO_SALES');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdjustment = mode === 'AJUSTEMENT';
  const isTransfer = mode === 'DESTOCKAGE';
  const reasonRequired = isAdjustment;
  const product = products.find((p) => p.id === productId);

  const handleSubmit = async () => {
    if (!productId || quantity < 0) return;
    if (!isAdjustment && quantity <= 0) return setError('Indiquez une quantité.');
    if (reasonRequired && reason.trim().length < 3) return setError('La justification est obligatoire.');
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'ENTREE') {
        await createEntry({ productId, quantity, location, reason: reason || undefined });
      } else if (isTransfer) {
        await createTransfer({ productId, quantity, direction, reason: reason || undefined });
      } else if (mode === 'PERTE' || mode === 'CASSE') {
        await createLoss({ productId, quantity, type: mode, location, reason: reason || undefined });
      } else {
        await createAdjustment({ productId, countedQuantity: quantity, location, reason: reason.trim() });
      }
      toast.success(`${MODE_LABELS[mode]} enregistrée`);
      onDone();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erreur';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-surface p-6 sm:grid-cols-2 lg:grid-cols-4">
      <h3 className="text-sm font-semibold text-slate-900 sm:col-span-2 lg:col-span-4">{MODE_LABELS[mode]}</h3>

      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor="stock-product" className="mb-1 block text-sm font-medium text-slate-700">
          Produit
        </label>
        <ProductPicker id="stock-product" products={products} value={productId} onChange={setProductId} />
        {product && (
          <p className="mt-1 text-xs text-slate-500">
            Réserve : {Number(product.stockReserve ?? 0)} · Vente : {Number(product.stockCurrent)} {product.unit}
          </p>
        )}
      </div>

      {isTransfer ? (
        <div>
          <label htmlFor="stock-direction" className="mb-1 block text-sm font-medium text-slate-700">
            Sens
          </label>
          <select id="stock-direction" value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} className="input w-full">
            <option value="TO_SALES">Réserve → vente</option>
            <option value="TO_RESERVE">Vente → réserve (retour)</option>
          </select>
        </div>
      ) : (
        <div>
          <label htmlFor="stock-location" className="mb-1 block text-sm font-medium text-slate-700">
            Stock concerné
          </label>
          <select id="stock-location" value={location} onChange={(e) => setLocation(e.target.value as StockLocation)} className="input w-full">
            {(Object.keys(LOCATION_LABELS) as StockLocation[]).map((l) => (
              <option key={l} value={l}>
                {LOCATION_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="stock-qty" className="mb-1 block text-sm font-medium text-slate-700">
          {isAdjustment ? 'Quantité réelle comptée' : 'Quantité'}
        </label>
        <input id="stock-qty" type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="input w-full" />
      </div>

      <div>
        <label htmlFor="stock-reason" className="mb-1 block text-sm font-medium text-slate-700">
          {reasonRequired ? 'Justification (obligatoire)' : 'Motif (optionnel)'}
        </label>
        <input id="stock-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input w-full" placeholder={reasonRequired ? 'Ex. inventaire du 22/10' : ''} />
      </div>

      {error && <p className="text-sm text-danger sm:col-span-2 lg:col-span-4">{error}</p>}

      <div className="flex gap-3 sm:col-span-2 lg:col-span-4">
        <button onClick={handleSubmit} disabled={isSubmitting || !productId} aria-busy={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Enregistrement...' : 'Valider'}
        </button>
        <button onClick={onCancel} className="btn btn-secondary">
          Annuler
        </button>
      </div>
    </div>
  );
}

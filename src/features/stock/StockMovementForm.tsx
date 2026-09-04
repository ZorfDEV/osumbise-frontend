import { useState } from 'react';
import { createEntry, createLoss, createAdjustment } from './api';
import { Product } from '@/features/products/types';
import { useToast } from '@/lib/toast';

type Mode = 'ENTREE' | 'PERTE' | 'CASSE' | 'AJUSTEMENT';

interface Props {
  mode: Mode;
  products: Product[];
  onDone: () => void;
  onCancel: () => void;
}

const MODE_LABELS: Record<Mode, string> = {
  ENTREE: 'Entrée de stock',
  PERTE: 'Perte',
  CASSE: 'Casse',
  AJUSTEMENT: 'Ajustement (inventaire)',
};

export default function StockMovementForm({ mode, products, onDone, onCancel }: Props) {
  const toast = useToast();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdjustment = mode === 'AJUSTEMENT';

  const handleSubmit = async () => {
    if (!productId || quantity < 0) return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'ENTREE') {
        await createEntry({ productId, quantity, reason: reason || undefined });
      } else if (mode === 'PERTE' || mode === 'CASSE') {
        await createLoss({ productId, quantity, type: mode, reason: reason || undefined });
      } else {
        await createAdjustment({
          productId,
          countedQuantity: quantity,
          reason: reason || undefined,
        });
      }
      toast.success(`${MODE_LABELS[mode]} enregistrée`);
      onDone();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-3">
      <h3 className="text-sm font-semibold text-slate-900 sm:col-span-3">{MODE_LABELS[mode]}</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Produit</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— Choisir —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({Number(p.stockCurrent)} {p.unit})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {isAdjustment ? 'Stock réel compté' : 'Quantité'}
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Motif (optionnel)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}

      <div className="flex gap-3 sm:col-span-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !productId}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement...' : 'Valider'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

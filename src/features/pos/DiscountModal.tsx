import { useState } from 'react';
import { X } from 'lucide-react';

export interface DiscountPayload {
  mode: 'PERCENT' | 'AMOUNT' | 'NONE';
  value?: number;
  reason?: string;
}

const PRESETS = [5, 10, 15, 20];
const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

// Remise sur une facture (table ou séjour) : en pourcentage ou en montant,
// avec un motif facultatif. Propriétaire / administrateur.
export default function DiscountModal({
  base,
  baseLabel,
  current,
  onClose,
  onSubmit,
}: {
  // Montant sur lequel porte la remise (HT pour une table, hors taxe de séjour pour un séjour)
  base: number;
  baseLabel: string;
  current: { amount: number; rate: number | null; reason: string | null };
  onClose: () => void;
  onSubmit: (payload: DiscountPayload) => Promise<void>;
}) {
  const [mode, setMode] = useState<'PERCENT' | 'AMOUNT'>(current.rate === null && current.amount > 0 ? 'AMOUNT' : 'PERCENT');
  const [value, setValue] = useState(
    current.rate !== null ? String(current.rate) : current.amount > 0 ? String(current.amount) : ''
  );
  const [reason, setReason] = useState(current.reason ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = Number(value) || 0;
  const preview = mode === 'PERCENT' ? Math.round((base * Math.min(n, 100)) / 100) : Math.min(n, base);

  const submit = async (payload: DiscountPayload) => {
    setError(null);
    if (payload.mode !== 'NONE') {
      if (!payload.value || payload.value <= 0) return setError('Indiquez la remise.');
      if (payload.mode === 'PERCENT' && payload.value > 100) return setError('Au plus 100 %.');
      if (payload.mode === 'AMOUNT' && payload.value > base) return setError(`Au plus ${fcfa(base)}.`);
    }
    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Remise impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Remise">
      <div className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Remise sur la facture</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          {baseLabel} : <span className="font-semibold text-heading">{fcfa(base)}</span>
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {(['PERCENT', 'AMOUNT'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${mode === m ? 'border-action bg-primary-50 text-primary-800 ring-1 ring-action' : 'border-slate-200 text-slate-600'}`}
            >
              {m === 'PERCENT' ? 'En pourcentage (%)' : 'En montant (FCFA)'}
            </button>
          ))}
        </div>

        {mode === 'PERCENT' && (
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setValue(String(p))}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${Number(value) === p ? 'border-action bg-primary-50 text-primary-800' : 'border-slate-200 text-slate-600'}`}
              >
                {p} %
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="discount-value" className="mb-1 block text-sm font-medium text-slate-700">
              {mode === 'PERCENT' ? 'Remise (%)' : 'Remise (FCFA)'}
            </label>
            <input id="discount-value" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label htmlFor="discount-reason" className="mb-1 block text-sm font-medium text-slate-700">
              Motif <span className="font-normal text-slate-500">(optionnel)</span>
            </label>
            <input id="discount-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className="input w-full" placeholder="Ex. client fidèle, geste commercial" />
          </div>
          <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success-dark">
            Remise accordée : <span className="font-semibold">{fcfa(preview)}</span>
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(current.amount > 0 || current.rate !== null) && (
            <button onClick={() => submit({ mode: 'NONE' })} disabled={saving} className="btn btn-secondary">
              Retirer la remise
            </button>
          )}
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Annuler
          </button>
          <button
            onClick={() => submit({ mode, value: n, reason: reason.trim() || undefined })}
            disabled={saving}
            aria-busy={saving}
            className="btn btn-primary flex-1"
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}

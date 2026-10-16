import { useState } from 'react';
import { X } from 'lucide-react';

// Motifs les plus courants ; « Autre » impose une précision
export const VOID_REASONS = [
  'Plat non apprécié',
  'Erreur de commande',
  'Attente trop longue',
  'Produit défectueux ou mal préparé',
  'Geste commercial',
  'Client parti sans payer',
  'Autre',
];

// Fenêtre de motif pour retirer un article ou annuler une commande —
// réservée au propriétaire et à l'administrateur
export default function VoidReasonModal({
  title,
  description,
  confirmLabel,
  maxQuantity,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  // Article : quantité à retirer (1 à maxQuantity)
  maxQuantity?: number;
  onConfirm: (reason: string, quantity: number) => Promise<void>;
  onClose: () => void;
}) {
  const [preset, setPreset] = useState('');
  const [detail, setDetail] = useState('');
  const [quantity, setQuantity] = useState(maxQuantity ?? 1);
  const [saving, setSaving] = useState(false);

  const needsDetail = preset === 'Autre';
  const reason = needsDetail ? detail.trim() : [preset, detail.trim()].filter(Boolean).join(' — ');
  const valid = !!preset && (!needsDetail || detail.trim().length >= 3);

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onConfirm(reason, quantity);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">{description}</p>

        {maxQuantity !== undefined && maxQuantity > 1 && (
          <div className="mb-4">
            <label htmlFor="void-qty" className="mb-1 block text-sm font-medium text-slate-700">
              Quantité à retirer
            </label>
            <select id="void-qty" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="input w-full">
              {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} sur {maxQuantity}
                </option>
              ))}
            </select>
          </div>
        )}

        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-medium text-slate-700">Motif (obligatoire)</legend>
          <div className="flex flex-wrap gap-2">
            {VOID_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={preset === r}
                onClick={() => setPreset(r)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  preset === r ? 'border-action bg-primary-50 text-primary-800 ring-1 ring-action' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mb-5">
          <label htmlFor="void-detail" className="mb-1 block text-sm font-medium text-slate-700">
            Précision {needsDetail ? '(obligatoire)' : '(optionnel)'}
          </label>
          <input
            id="void-detail"
            value={detail}
            maxLength={150}
            onChange={(e) => setDetail(e.target.value)}
            className="input w-full"
            placeholder="Ex. viande trop cuite, client de la table 4…"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Retour
          </button>
          <button onClick={submit} disabled={!valid || saving} aria-busy={saving} className="btn btn-danger flex-1">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

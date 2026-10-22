import { useEffect, useMemo, useState } from 'react';
import { Plus, Shirt, Trash2, X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { apiError } from './api';
import { fcfa, formatDay } from './labels';
import { addStayCharge, deleteStayCharge, fetchHotelServices, SERVICE_CATEGORIES, type HotelService } from './servicesApi';
import type { StayDetail } from './types';

const OTHER = '__other__';

// Prestations ajoutées à la facture du séjour (pressing, room service…)
export default function StayChargesCard({ stay, onChanged }: { stay: StayDetail; onChanged: (s: StayDetail) => void }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const editable = stay.status === 'RESERVED' || stay.status === 'CHECKED_IN';
  const charges = stay.charges ?? [];

  const remove = async (chargeId: string, label: string) => {
    try {
      onChanged(await deleteStayCharge(stay.id, chargeId));
      toast.success(`« ${label} » retiré de la facture`);
    } catch (err) {
      toast.error(apiError(err, 'Suppression impossible'));
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-heading-muted">
          <Shirt size={16} />
          Prestations (pressing, room service…)
        </h2>
        {editable && (
          <button onClick={() => setAdding(true)} className="btn btn-primary btn-sm">
            <Plus size={14} />
            Ajouter
          </button>
        )}
      </div>
      {charges.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune prestation. Le pressing ou le room service s’ajoutent ici à la facture de la chambre.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {charges.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 py-2">
              <span>
                <span className="font-medium text-heading">
                  {c.quantity} × {c.label}
                </span>
                <span className="block text-xs text-slate-500">
                  {c.category} · {formatDay(c.createdAt, { day: '2-digit', month: '2-digit' })} · {c.user.name}
                  {c.note ? ` · ${c.note}` : ''}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-heading">{fcfa(c.quantity * Number(c.unitPrice))}</span>
                {editable && (
                  <button
                    onClick={() => remove(c.id, c.label)}
                    aria-label={`Retirer ${c.label}`}
                    className="rounded-md p-1 text-slate-400 hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddChargeDialog
          stay={stay}
          onClose={() => setAdding(false)}
          onAdded={(s) => {
            setAdding(false);
            onChanged(s);
          }}
        />
      )}
    </div>
  );
}

function AddChargeDialog({ stay, onClose, onAdded }: { stay: StayDetail; onClose: () => void; onAdded: (s: StayDetail) => void }) {
  const toast = useToast();
  const [services, setServices] = useState<HotelService[] | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('Pressing');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHotelServices()
      .then((list) => {
        const active = list.filter((s) => s.isActive);
        setServices(active);
        setServiceId(active[0]?.id ?? OTHER);
      })
      .catch(() => {
        setServices([]);
        setServiceId(OTHER);
      });
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<string, HotelService[]>();
    (services ?? []).forEach((s) => map.set(s.category, [...(map.get(s.category) ?? []), s]));
    return [...map.entries()];
  }, [services]);

  const isOther = serviceId === OTHER;
  const service = services?.find((s) => s.id === serviceId);
  const price = isOther ? Number(unitPrice) || 0 : Number(service?.price ?? 0);

  const submit = async () => {
    if (isOther && (label.trim().length < 2 || unitPrice === '')) return toast.error('Indiquez le libellé et le prix');
    setSaving(true);
    try {
      const updated = await addStayCharge(
        stay.id,
        isOther
          ? { label: label.trim(), category, unitPrice: Number(unitPrice), quantity, note: note.trim() || undefined }
          : { serviceId, quantity, note: note.trim() || undefined }
      );
      toast.success('Prestation ajoutée à la facture');
      onAdded(updated);
    } catch (err) {
      toast.error(apiError(err, 'Impossible d’ajouter la prestation'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Ajouter une prestation">
      <div className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Ajouter une prestation</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="charge-service" className="mb-1 block text-sm font-medium text-slate-700">
              Prestation
            </label>
            <select id="charge-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="input w-full">
              {byCategory.map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {fcfa(s.price)}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={OTHER}>Autre (saisie libre)</option>
            </select>
            {services?.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">Astuce : le responsable peut créer un catalogue dans « Chambres et tarifs ».</p>
            )}
          </div>
          {isOther && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label htmlFor="charge-label" className="mb-1 block text-sm font-medium text-slate-700">
                  Libellé
                </label>
                <input id="charge-label" value={label} onChange={(e) => setLabel(e.target.value)} className="input w-full" placeholder="Ex. Costume — nettoyage à sec" />
              </div>
              <div>
                <label htmlFor="charge-category" className="mb-1 block text-sm font-medium text-slate-700">
                  Catégorie
                </label>
                <select id="charge-category" value={category} onChange={(e) => setCategory(e.target.value)} className="input w-full">
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="charge-price" className="mb-1 block text-sm font-medium text-slate-700">
                  Prix unitaire (FCFA)
                </label>
                <input id="charge-price" type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="input w-full" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="charge-qty" className="mb-1 block text-sm font-medium text-slate-700">
                Quantité
              </label>
              <input id="charge-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} className="input w-full" />
            </div>
            <div className="flex items-end">
              <p className="text-sm text-slate-600">
                Total : <span className="font-semibold text-heading">{fcfa(price * quantity)}</span>
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="charge-note" className="mb-1 block text-sm font-medium text-slate-700">
              Note (optionnel)
            </label>
            <input id="charge-note" value={note} onChange={(e) => setNote(e.target.value)} className="input w-full" placeholder="Ex. à rendre demain 10 h" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Annuler
          </button>
          <button onClick={submit} disabled={saving || services === null} aria-busy={saving} className="btn btn-primary flex-1">
            Ajouter à la facture
          </button>
        </div>
      </div>
    </div>
  );
}

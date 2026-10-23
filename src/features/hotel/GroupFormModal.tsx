import { useEffect, useMemo, useState } from 'react';
import { Users, X } from 'lucide-react';
import { fetchCustomers } from '@/features/customers/api';
import type { Customer } from '@/features/customers/types';
import { apiError } from './api';
import { createStayGroup, type StayGroupDetail } from './groupApi';
import { addDaysIso, CATEGORY_LABELS, fcfa, nightsBetween, roomName, todayIso } from './labels';
import type { Room, TaxRate } from './types';
import { lodgingTaxes } from './types';

type Line = { guestName: string; adults: number };

// Réservation de groupe : une entreprise réserve plusieurs chambres aux mêmes
// dates ; une facture unique les regroupe
export default function GroupFormModal({
  rooms,
  taxRates,
  onClose,
  onSaved,
}: {
  rooms: Room[];
  taxRates: TaxRate[];
  onClose: () => void;
  onSaved: (group: StayGroupDetail) => void;
}) {
  const [name, setName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState(todayIso());
  const [checkOutDate, setCheckOutDate] = useState(addDaysIso(todayIso(), 1));
  const [checkInNow, setCheckInNow] = useState(false);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Record<string, Line>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomers()
      .then((list) => setCustomers(list.filter((c) => c.isActive)))
      .catch(() => setCustomers([]));
  }, []);

  const bookable = rooms.filter((r) => r.isActive && r.status !== 'OUT_OF_SERVICE');
  const nights = nightsBetween(checkInNow ? todayIso() : checkInDate, checkOutDate);
  const estimate = useMemo(
    () =>
      Object.keys(selected).reduce((sum, id) => {
        const r = rooms.find((x) => x.id === id);
        return r ? sum + lodgingTaxes(nights * Number(r.nightlyRate), taxRates.find((t) => t.category === r.category)).total : sum;
      }, 0),
    [selected, nights, rooms, taxRates]
  );

  const toggle = (r: Room) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[r.id]) delete next[r.id];
      else next[r.id] = { guestName: '', adults: 1 };
      return next;
    });

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Indiquez le nom du groupe ou de l’entreprise.');
    const ids = Object.keys(selected);
    if (ids.length === 0) return setError('Choisissez au moins une chambre.');
    if (!checkInNow && checkInDate < todayIso()) return setError('Impossible de réserver à une date passée : choisissez aujourd’hui ou une date à venir.');
    if (checkOutDate <= (checkInNow ? todayIso() : checkInDate)) return setError('La date de départ doit être après la date d’arrivée.');
    setSaving(true);
    try {
      const group = await createStayGroup({
        name: name.trim(),
        customerId: customerId || undefined,
        contactPhone: contactPhone.trim() || undefined,
        checkInDate: checkInNow ? todayIso() : checkInDate,
        checkOutDate,
        notes: notes.trim() || undefined,
        checkInNow,
        rooms: ids.map((roomId) => ({
          roomId,
          guestName: selected[roomId].guestName.trim() || undefined,
          adults: selected[roomId].adults,
          children: 0,
        })),
      });
      onSaved(group);
    } catch (err) {
      setError(apiError(err, 'Impossible d’enregistrer la réservation de groupe'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Réservation de groupe">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl bg-surface sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-heading">
            <Users size={20} />
            Réservation de groupe
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="group-name" className="mb-1 block text-sm font-medium text-slate-700">
                Nom du groupe ou de l’entreprise
              </label>
              <input id="group-name" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="Ex. Société ABC — mission Port-Gentil" />
            </div>
            <div>
              <label htmlFor="group-customer" className="mb-1 block text-sm font-medium text-slate-700">
                Compte client payeur <span className="font-normal text-slate-500">(optionnel)</span>
              </label>
              <select id="group-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input w-full">
                <option value="">Aucun</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="group-phone" className="mb-1 block text-sm font-medium text-slate-700">
                Téléphone du contact <span className="font-normal text-slate-500">(optionnel)</span>
              </label>
              <input id="group-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label htmlFor="group-in" className="mb-1 block text-sm font-medium text-slate-700">
                Arrivée
              </label>
              <input id="group-in" type="date" min={todayIso()} value={checkInNow ? todayIso() : checkInDate} disabled={checkInNow} onChange={(e) => setCheckInDate(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label htmlFor="group-out" className="mb-1 block text-sm font-medium text-slate-700">
                Départ
              </label>
              <input id="group-out" type="date" min={addDaysIso(checkInNow ? todayIso() : checkInDate, 1)} value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="input w-full" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={checkInNow} onChange={(e) => setCheckInNow(e.target.checked)} className="h-4 w-4" />
              Le groupe arrive maintenant (arrivée enregistrée tout de suite)
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">
              Chambres ({Object.keys(selected).length} choisie{Object.keys(selected).length > 1 ? 's' : ''})
            </legend>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {bookable.map((r) => {
                const line = selected[r.id];
                return (
                  <div key={r.id} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${line ? 'bg-primary-50/50' : ''}`}>
                    <label className="flex min-w-[11rem] flex-1 cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!line} onChange={() => toggle(r)} className="h-4 w-4" />
                      <span className="font-semibold text-heading">{roomName(r)}</span>
                      <span className="text-xs text-slate-500">
                        {CATEGORY_LABELS[r.category]} · {fcfa(r.nightlyRate)}/nuitée
                      </span>
                    </label>
                    {line && (
                      <>
                        <input
                          aria-label={`Occupant de la chambre ${roomName(r)}`}
                          value={line.guestName}
                          onChange={(e) => setSelected((p) => ({ ...p, [r.id]: { ...line, guestName: e.target.value } }))}
                          placeholder="Occupant (optionnel)"
                          className="input input-sm w-44"
                        />
                        <select
                          aria-label={`Personnes dans la chambre ${roomName(r)}`}
                          value={line.adults}
                          onChange={(e) => setSelected((p) => ({ ...p, [r.id]: { ...line, adults: Number(e.target.value) } }))}
                          className="input input-sm w-20"
                        >
                          {Array.from({ length: r.capacity }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n} pers.
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">Les chambres déjà réservées sur ces dates sont refusées à l’enregistrement.</p>
          </fieldset>

          <div>
            <label htmlFor="group-notes" className="mb-1 block text-sm font-medium text-slate-700">
              Notes <span className="font-normal text-slate-500">(optionnel)</span>
            </label>
            <input id="group-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input w-full" placeholder="Bon de commande, conditions…" />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-600">
            {nights} nuitée{nights > 1 ? 's' : ''} · estimation <span className="font-semibold text-heading">{fcfa(estimate)}</span>
            <span className="block text-xs text-slate-500">Hébergement TTC (TVA et CSS comprises), hors consommations</span>
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={submit} disabled={saving} aria-busy={saving} className="btn btn-primary">
              {checkInNow ? 'Enregistrer l’arrivée du groupe' : 'Réserver pour le groupe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { apiError, createStay, updateStay } from './api';
import { addDaysIso, CATEGORY_LABELS, dayOf, fcfa, nightsBetween, roomName, todayIso } from './labels';
import type { Room, StayDetail, TaxRate } from './types';
import { fetchCustomers } from '@/features/customers/api';
import type { Customer } from '@/features/customers/types';

interface Props {
  rooms: Room[];
  taxRates: TaxRate[];
  // Séjour existant à modifier ; sinon création
  stay?: StayDetail;
  // Pré-remplissage (clic sur une chambre ou une case du planning)
  initialRoomId?: string;
  initialCheckIn?: string;
  // Client sans réservation : arrivée enregistrée tout de suite
  walkIn?: boolean;
  onClose: () => void;
  onSaved: (stay: StayDetail) => void;
}

export default function StayFormModal({ rooms, taxRates, stay, initialRoomId, initialCheckIn, walkIn, onClose, onSaved }: Props) {
  const toast = useToast();
  const isEdit = !!stay;
  const isCheckedIn = stay?.status === 'CHECKED_IN';
  const start = stay ? dayOf(stay.checkInDate) : walkIn ? todayIso() : initialCheckIn ?? todayIso();

  const [roomId, setRoomId] = useState(stay?.roomId ?? initialRoomId ?? '');
  const [customerId, setCustomerId] = useState(stay?.customerId ?? '');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [guestName, setGuestName] = useState(stay?.guestName ?? '');
  const [guestPhone, setGuestPhone] = useState(stay?.guestPhone ?? '');
  const [guestIdNumber, setGuestIdNumber] = useState(stay?.guestIdNumber ?? '');
  const [adults, setAdults] = useState(stay?.adults ?? 1);
  const [children, setChildren] = useState(stay?.children ?? 0);
  const [checkInDate, setCheckInDate] = useState(start);
  const [checkOutDate, setCheckOutDate] = useState(stay ? dayOf(stay.checkOutDate) : addDaysIso(start, 1));
  const [rate, setRate] = useState<string>(stay ? String(Number(stay.nightlyRate)) : '');
  const [notes, setNotes] = useState(stay?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Clients enregistrés (comptes clients communs aux établissements)
  useEffect(() => {
    fetchCustomers()
      .then((list) => setCustomers(list.filter((c) => c.isActive)))
      .catch(() => setCustomers([]));
  }, []);

  // Choisir un client enregistré remplit son nom et son téléphone
  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setGuestName(c.name);
      if (c.phone) setGuestPhone(c.phone);
    }
  };

  const activeRooms = rooms.filter((r) => r.isActive);
  const room = activeRooms.find((r) => r.id === roomId);

  // Tarif de la chambre proposé par défaut (modifiable : tarif négocié)
  useEffect(() => {
    if (!isEdit && room) setRate(String(Number(room.nightlyRate)));
  }, [room, isEdit]);

  // Départ toujours après l'arrivée
  useEffect(() => {
    if (checkOutDate <= checkInDate) setCheckOutDate(addDaysIso(checkInDate, 1));
  }, [checkInDate, checkOutDate]);

  const nights = nightsBetween(checkInDate, checkOutDate);
  const taxPerNight = room ? taxRates.find((t) => t.category === room.category)?.taxPerNight ?? 0 : 0;
  const estimate = useMemo(() => nights * (Number(rate) || 0) + nights * taxPerNight, [nights, rate, taxPerNight]);

  const submit = async () => {
    setError(null);
    if (!roomId) return setError('Choisissez une chambre.');
    if (guestName.trim().length < 2) return setError('Indiquez le nom du client.');
    // Pas de réservation dans le passé (une réservation existante peut garder sa date)
    const checkInChanged = !isEdit || checkInDate !== dayOf(stay.checkInDate);
    if (!isCheckedIn && checkInChanged && checkInDate < todayIso()) {
      return setError('Impossible de réserver à une date passée : choisissez aujourd’hui ou une date à venir.');
    }
    if (checkOutDate <= checkInDate) return setError('La date de départ doit être après la date d’arrivée.');
    if (room && adults + children > room.capacity) {
      return setError(`La chambre ${roomName(room)} accueille ${room.capacity} personne(s) au maximum.`);
    }
    const payload = {
      roomId,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim() || undefined,
      guestIdNumber: guestIdNumber.trim() || undefined,
      adults,
      children,
      checkInDate,
      checkOutDate,
      notes: notes.trim() || undefined,
      nightlyRate: rate === '' ? undefined : Number(rate),
      // Modification : vider le champ détache le client
      customerId: customerId || (isEdit ? null : undefined),
    };
    setSaving(true);
    try {
      const saved = isEdit ? await updateStay(stay.id, payload) : await createStay({ ...payload, checkInNow: walkIn });
      toast.success(isEdit ? 'Séjour modifié' : walkIn ? 'Arrivée enregistrée' : 'Réservation enregistrée');
      onSaved(saved);
    } catch (err) {
      setError(apiError(err, 'Impossible d’enregistrer le séjour'));
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Modifier le séjour' : walkIn ? 'Arrivée sans réservation' : 'Nouvelle réservation';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col rounded-t-xl bg-surface sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="stay-room" className="mb-1 block text-sm font-medium text-slate-700">
              Chambre
            </label>
            <select id="stay-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="input w-full">
              <option value="">Choisir une chambre…</option>
              {activeRooms.map((r) => (
                <option key={r.id} value={r.id} disabled={r.status === 'OUT_OF_SERVICE' && walkIn}>
                  {roomName(r)} — {CATEGORY_LABELS[r.category]} — {fcfa(r.nightlyRate)}/nuitée
                  {r.status === 'OUT_OF_SERVICE' ? ' (hors service)' : r.status === 'OCCUPIED' ? ' (occupée)' : r.status === 'CLEANING' ? ' (à nettoyer)' : ''}
                </option>
              ))}
            </select>
            {walkIn && room?.status === 'CLEANING' && (
              <p className="mt-1 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-dark">
                Cette chambre n’a pas encore été nettoyée.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="stay-customer" className="mb-1 block text-sm font-medium text-slate-700">
              Client enregistré <span className="font-normal text-slate-500">(optionnel)</span>
            </label>
            <select id="stay-customer" value={customerId} onChange={(e) => pickCustomer(e.target.value)} className="input w-full">
              <option value="">Aucun — client de passage</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` — ${c.phone}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Rattache le séjour à son compte : historique, et « Compte client » proposé à l’encaissement.</p>
          </div>

          <div>
            <label htmlFor="stay-guest" className="mb-1 block text-sm font-medium text-slate-700">
              Nom du client
            </label>
            <input id="stay-guest" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="input w-full" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="stay-phone" className="mb-1 block text-sm font-medium text-slate-700">
              Téléphone
            </label>
            <input id="stay-phone" type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="input w-full" placeholder="+241 …" />
          </div>
          <div>
            <label htmlFor="stay-id" className="mb-1 block text-sm font-medium text-slate-700">
              Pièce d’identité (n°)
            </label>
            <input id="stay-id" value={guestIdNumber} onChange={(e) => setGuestIdNumber(e.target.value)} className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="stay-adults" className="mb-1 block text-sm font-medium text-slate-700">
                Adultes
              </label>
              <input id="stay-adults" type="number" min={1} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))} className="input w-full" />
            </div>
            <div>
              <label htmlFor="stay-children" className="mb-1 block text-sm font-medium text-slate-700">
                Enfants
              </label>
              <input id="stay-children" type="number" min={0} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))} className="input w-full" />
            </div>
          </div>

          <div>
            <label htmlFor="stay-in" className="mb-1 block text-sm font-medium text-slate-700">
              Arrivée
            </label>
            <input
              id="stay-in"
              type="date"
              value={checkInDate}
              min={isEdit && dayOf(stay.checkInDate) < todayIso() ? dayOf(stay.checkInDate) : todayIso()}
              onChange={(e) => setCheckInDate(e.target.value)}
              disabled={walkIn || isCheckedIn}
              className="input w-full"
            />
          </div>
          <div>
            <label htmlFor="stay-out" className="mb-1 block text-sm font-medium text-slate-700">
              Départ
            </label>
            <input
              id="stay-out"
              type="date"
              value={checkOutDate}
              min={addDaysIso(checkInDate < todayIso() && isCheckedIn ? todayIso() : checkInDate, 1)}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label htmlFor="stay-rate" className="mb-1 block text-sm font-medium text-slate-700">
              Tarif par nuitée (FCFA)
            </label>
            <input id="stay-rate" type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} className="input w-full" />
            <p className="mt-1 text-xs text-slate-500">Tarif de la chambre par défaut ; modifiable pour un tarif négocié.</p>
          </div>
          <div>
            <label htmlFor="stay-notes" className="mb-1 block text-sm font-medium text-slate-700">
              Remarques
            </label>
            <input id="stay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input w-full" placeholder="Lit bébé, arrivée tardive…" />
          </div>

          {/* Estimation : nuits × (tarif + taxe de séjour), hors consommations */}
          <div className="rounded-lg bg-slate-50 p-4 text-sm sm:col-span-2">
            <div className="flex justify-between text-slate-600">
              <span>
                {nights} nuitée{nights > 1 ? 's' : ''} × {fcfa(Number(rate) || 0)}
              </span>
              <span>{fcfa(nights * (Number(rate) || 0))}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>
                Taxe de séjour ({nights} × {fcfa(taxPerNight)})
              </span>
              <span>{fcfa(nights * taxPerNight)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold text-heading">
              <span>Estimation (hors consommations)</span>
              <span>{fcfa(estimate)}</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-dark sm:col-span-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button onClick={submit} disabled={saving} aria-busy={saving} className="btn btn-primary">
            {isEdit ? 'Enregistrer' : walkIn ? 'Enregistrer l’arrivée' : 'Réserver'}
          </button>
        </div>
      </div>
    </div>
  );
}

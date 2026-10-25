import { useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { apiError, moveStay } from './api';
import { CATEGORY_LABELS, fcfa, roomName } from './labels';
import type { Room, StayDetail } from './types';

// Changer le client de chambre (climatisation en panne, fuite…) sans annuler
// son séjour : même facture, même tarif. Le motif est noté sur le séjour et
// l'ancienne chambre peut être mise hors service avec ce motif.
export default function MoveRoomModal({
  stay,
  rooms,
  onClose,
  onMoved,
}: {
  stay: StayDetail;
  rooms: Room[];
  onClose: () => void;
  onMoved: (s: StayDetail) => void;
}) {
  const toast = useToast();
  const [roomId, setRoomId] = useState('');
  const [reason, setReason] = useState('');
  const [outOfService, setOutOfService] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inHouse = stay.status === 'CHECKED_IN';
  const guests = stay.adults + stay.children;

  // Chambres proposées : en vente, pas hors service, assez grandes ; une
  // chambre occupée ne peut pas accueillir un client déjà arrivé
  const candidates = rooms.filter((r) => r.isActive && r.id !== stay.roomId && r.status !== 'OUT_OF_SERVICE');
  const unavailable = (r: Room) => r.capacity < guests || (inHouse && r.status === 'OCCUPIED');

  const submit = async () => {
    setError(null);
    if (!roomId) return setError('Choisissez la nouvelle chambre.');
    if (reason.trim().length < 3) return setError('Indiquez le motif du changement.');
    setSaving(true);
    try {
      const moved = await moveStay(stay.id, { roomId, reason: reason.trim(), outOfService });
      toast.success(`${stay.guestName} est maintenant en chambre ${roomName(moved.room)}`);
      onMoved(moved);
    } catch (err) {
      setError(apiError(err, 'Changement de chambre impossible'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Changer de chambre">
      <div className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-heading">
            <ArrowLeftRight size={18} />
            Changer de chambre
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          {stay.guestName} · actuellement en chambre <span className="font-semibold text-heading">{roomName(stay.room)}</span>. La facture et
          le tarif ({fcfa(stay.nightlyRate)}/nuitée) ne changent pas.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="move-room" className="mb-1 block text-sm font-medium text-slate-700">
              Nouvelle chambre
            </label>
            <select id="move-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="input w-full">
              <option value="">Choisir une chambre…</option>
              {candidates.map((r) => (
                <option key={r.id} value={r.id} disabled={unavailable(r)}>
                  {roomName(r)} — {CATEGORY_LABELS[r.category]}
                  {r.status === 'OCCUPIED' ? ' (occupée)' : r.status === 'CLEANING' ? ' (à nettoyer)' : ''}
                  {r.capacity < guests ? ` (${r.capacity} pers. max)` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="move-reason" className="mb-1 block text-sm font-medium text-slate-700">
              Motif <span className="font-normal text-slate-500">(obligatoire)</span>
            </label>
            <input
              id="move-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Split en panne, fuite d’eau, flexible…"
              maxLength={200}
              className="input w-full"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={outOfService} onChange={(e) => setOutOfService(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>
              <span className="font-medium text-heading">Mettre la chambre {roomName(stay.room)} hors service</span>
              <span className="block text-xs text-slate-500">
                Avec ce motif : elle ne pourra plus être attribuée tant qu’elle n’est pas remise en service.
                {inHouse && ' Sinon, elle passe « À nettoyer ».'}
              </span>
            </span>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Annuler
          </button>
          <button onClick={submit} disabled={saving} aria-busy={saving} className="btn btn-primary flex-1">
            <ArrowLeftRight size={16} />
            Changer de chambre
          </button>
        </div>
      </div>
    </div>
  );
}

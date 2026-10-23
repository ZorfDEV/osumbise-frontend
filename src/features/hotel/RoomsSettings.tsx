import { useEffect, useState } from 'react';
import { BedDouble, Pencil } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { apiError, createRoom, saveTaxRates, updateRoom } from './api';
import { CATEGORY_LABELS, fcfa, roomName } from './labels';
import type { Room, RoomCategory, RoomPayload, TaxRate } from './types';
import HotelServicesSettings from './HotelServicesSettings';

const CATEGORIES: RoomCategory[] = ['STANDARD', 'VIP', 'SUITE'];
const EMPTY: RoomPayload = { number: '', building: '', category: 'STANDARD', floor: '', capacity: 2, nightlyRate: 0, notes: '' };

// Configuration de l'hôtel (gérant) : chambres et taxe de séjour par type
export default function RoomsSettings({
  rooms,
  taxRates,
  onChanged,
}: {
  rooms: Room[];
  taxRates: TaxRate[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<RoomPayload>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [taxes, setTaxes] = useState<TaxRate[]>(taxRates);
  const [savingTax, setSavingTax] = useState(false);

  useEffect(() => setTaxes(taxRates), [taxRates]);

  const set = <K extends keyof RoomPayload>(key: K, value: RoomPayload[K]) => setForm((f) => ({ ...f, [key]: value }));

  const startEdit = (r: Room) => {
    setEditingId(r.id);
    setForm({
      number: r.number,
      category: r.category,
      floor: r.floor ?? '',
      building: r.building ?? '',
      capacity: r.capacity,
      nightlyRate: Number(r.nightlyRate),
      notes: r.notes ?? '',
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const saveRoom = async () => {
    if (!form.number.trim()) return toast.error('Indiquez le numéro de la chambre');
    setSaving(true);
    try {
      const payload = { ...form, number: form.number.trim(), building: form.building?.trim() ?? '', floor: form.floor?.trim() || undefined, notes: form.notes?.trim() || undefined };
      if (editingId) await updateRoom(editingId, payload);
      else await createRoom(payload);
      toast.success(editingId ? `Chambre ${roomName(payload)} modifiée` : `Chambre ${roomName(payload)} ajoutée`);
      reset();
      onChanged();
    } catch (err) {
      toast.error(apiError(err, 'Impossible d’enregistrer la chambre'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: Room) => {
    try {
      await updateRoom(r.id, { isActive: !r.isActive });
      toast.success(r.isActive ? `Chambre ${r.number} retirée de la vente` : `Chambre ${r.number} remise en vente`);
      onChanged();
    } catch (err) {
      toast.error(apiError(err, 'Action impossible'));
    }
  };

  const saveTaxes = async () => {
    setSavingTax(true);
    try {
      await saveTaxRates(taxes);
      toast.success('Taxe de séjour enregistrée');
      onChanged();
    } catch (err) {
      toast.error(apiError(err, 'Impossible d’enregistrer la taxe de séjour'));
    } finally {
      setSavingTax(false);
    }
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Chambres */}
      <div className="rounded-lg border border-slate-200 bg-surface p-5 lg:col-span-2">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            <BedDouble size={24} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-heading">{editingId ? 'Modifier la chambre' : 'Ajouter une chambre'}</h2>
            <p className="text-xs text-slate-500">Elle apparaît aussitôt sur le plan des chambres de la réception.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <label htmlFor="room-number" className="mb-1 block text-xs font-medium text-slate-600">
              Numéro
            </label>
            <input id="room-number" value={form.number} onChange={(e) => set('number', e.target.value)} className="input w-full" placeholder="101" />
          </div>
          <div>
            <label htmlFor="room-building" className="mb-1 block text-xs font-medium text-slate-600">
              Bâtiment <span className="font-normal text-slate-500">(optionnel)</span>
            </label>
            <input
              id="room-building"
              value={form.building ?? ''}
              onChange={(e) => set('building', e.target.value)}
              list="room-buildings"
              className="input w-full"
              placeholder="Bâtiment A"
            />
            {/* Bâtiments déjà saisis : proposés pour éviter les variantes d'orthographe */}
            <datalist id="room-buildings">
              {[...new Set(rooms.map((r) => r.building).filter(Boolean))].map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="room-category" className="mb-1 block text-xs font-medium text-slate-600">
              Type
            </label>
            <select id="room-category" value={form.category} onChange={(e) => set('category', e.target.value as RoomCategory)} className="input w-full">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="room-floor" className="mb-1 block text-xs font-medium text-slate-600">
              Étage
            </label>
            <input id="room-floor" value={form.floor} onChange={(e) => set('floor', e.target.value)} className="input w-full" placeholder="1" />
          </div>
          <div>
            <label htmlFor="room-capacity" className="mb-1 block text-xs font-medium text-slate-600">
              Personnes max
            </label>
            <input
              id="room-capacity"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => set('capacity', Math.max(1, Number(e.target.value)))}
              className="input w-full"
            />
          </div>
          <div>
            <label htmlFor="room-rate" className="mb-1 block text-xs font-medium text-slate-600">
              Tarif / nuitée (FCFA)
            </label>
            <input
              id="room-rate"
              type="number"
              min={0}
              value={form.nightlyRate}
              onChange={(e) => set('nightlyRate', Number(e.target.value))}
              className="input w-full"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={saveRoom} disabled={saving} aria-busy={saving} className="btn btn-primary">
            {editingId ? 'Enregistrer' : 'Ajouter la chambre'}
          </button>
          {editingId && (
            <button onClick={reset} className="btn btn-secondary">
              Annuler
            </button>
          )}
        </div>

        {rooms.length > 0 && (
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="table-cards w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Chambre</th>
                  <th className="px-3 py-2 font-medium">Bâtiment</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Étage</th>
                  <th className="px-3 py-2 font-medium">Tarif</th>
                  <th className="px-3 py-2 font-medium">Vente</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((r) => (
                  <tr key={r.id} className={r.isActive ? '' : 'opacity-60'}>
                    <td data-label="" className="px-3 py-2 font-semibold text-heading">
                      {r.number}
                    </td>
                    <td data-label="Bâtiment" className="px-3 py-2 text-slate-600">
                      {r.building || '—'}
                    </td>
                    <td data-label="Type" className="px-3 py-2 text-slate-600">
                      {CATEGORY_LABELS[r.category]}
                    </td>
                    <td data-label="Étage" className="px-3 py-2 text-slate-600">
                      {r.floor ?? '—'}
                    </td>
                    <td data-label="Tarif" className="px-3 py-2 text-slate-600">
                      {fcfa(r.nightlyRate)}
                    </td>
                    <td data-label="Vente" className="px-3 py-2">
                      <button onClick={() => toggleActive(r)} className="text-xs font-medium text-primary-700 hover:underline">
                        {r.isActive ? 'En vente — retirer' : 'Retirée — remettre'}
                      </button>
                    </td>
                    <td data-label="" className="px-3 py-2 text-right">
                      <button onClick={() => startEdit(r)} aria-label={`Modifier la chambre ${r.number}`} className="btn btn-edit btn-sm">
                        <Pencil size={14} />
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Taxe de séjour */}
      <div className="rounded-lg border border-slate-200 bg-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-heading-muted">Taxe de séjour</h2>
        <p className="mb-3 text-xs text-slate-500">
          Montant par nuitée et par chambre, selon le type. Appliquée aux nouvelles réservations (les séjours déjà
          enregistrés gardent leur taxe).
        </p>
        <div className="space-y-3">
          {taxes.map((t) => (
            <div key={t.category} className="flex items-center justify-between gap-3">
              <label htmlFor={`tax-${t.category}`} className="text-sm font-medium text-slate-700">
                {CATEGORY_LABELS[t.category]}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`tax-${t.category}`}
                  type="number"
                  min={0}
                  value={t.taxPerNight}
                  onChange={(e) =>
                    setTaxes((list) => list.map((x) => (x.category === t.category ? { ...x, taxPerNight: Number(e.target.value) } : x)))
                  }
                  className="input w-28 text-right"
                />
                <span className="text-xs text-slate-500">FCFA</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={saveTaxes} disabled={savingTax} aria-busy={savingTax} className="btn btn-primary mt-4 w-full">
          Enregistrer la taxe
        </button>
      </div>

      <HotelServicesSettings />
    </div>
  );
}

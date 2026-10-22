import { useEffect, useState } from 'react';
import { Shirt, Plus } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { apiError } from './api';
import { fcfa } from './labels';
import { createHotelService, fetchHotelServices, SERVICE_CATEGORIES, updateHotelService, type HotelService } from './servicesApi';

// Catalogue des prestations (pressing, room service…) : prix TTC, proposés à
// la réception pour les ajouter à la facture d'un séjour
export default function HotelServicesSettings() {
  const toast = useToast();
  const [services, setServices] = useState<HotelService[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Pressing');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => fetchHotelServices().then(setServices).catch(() => setServices([]));
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (name.trim().length < 2 || price === '') return toast.error('Indiquez le nom et le prix de la prestation');
    setSaving(true);
    try {
      await createHotelService({ name: name.trim(), category, price: Number(price) });
      toast.success(`Prestation « ${name.trim()} » ajoutée`);
      setName('');
      setPrice('');
      load();
    } catch (err) {
      toast.error(apiError(err, 'Impossible d’ajouter la prestation'));
    } finally {
      setSaving(false);
    }
  };

  const savePrice = async (s: HotelService, value: string) => {
    if (value === '' || Number(value) === Number(s.price)) return;
    try {
      await updateHotelService(s.id, { price: Number(value) });
      toast.success(`Prix de « ${s.name} » mis à jour`);
      load();
    } catch (err) {
      toast.error(apiError(err, 'Modification impossible'));
    }
  };

  const toggle = async (s: HotelService) => {
    await updateHotelService(s.id, { isActive: !s.isActive });
    load();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-surface p-5 lg:col-span-3">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
          <Shirt size={22} strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-heading">Prestations de l’hôtel</h2>
          <p className="text-xs text-slate-500">Pressing, blanchisserie, room service… ajoutés à la facture de la chambre (prix TTC).</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="service-name" className="mb-1 block text-xs font-medium text-slate-600">
            Prestation
          </label>
          <input id="service-name" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="Ex. Chemise — lavage et repassage" />
        </div>
        <div>
          <label htmlFor="service-category" className="mb-1 block text-xs font-medium text-slate-600">
            Catégorie
          </label>
          <select id="service-category" value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="service-price" className="mb-1 block text-xs font-medium text-slate-600">
            Prix (FCFA)
          </label>
          <input id="service-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="input w-32" />
        </div>
        <button onClick={add} disabled={saving} aria-busy={saving} className="btn btn-primary">
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {services.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="table-cards w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Prestation</th>
                <th className="px-3 py-2 font-medium">Catégorie</th>
                <th className="px-3 py-2 font-medium">Prix (FCFA)</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((s) => (
                <tr key={s.id} className={s.isActive ? '' : 'opacity-60'}>
                  <td data-label="Prestation" className="px-3 py-2 font-medium text-heading">{s.name}</td>
                  <td data-label="Catégorie" className="px-3 py-2 text-slate-600">{s.category}</td>
                  <td data-label="Prix (FCFA)" className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      defaultValue={Number(s.price)}
                      onBlur={(e) => savePrice(s, e.target.value)}
                      aria-label={`Prix de ${s.name}`}
                      title={fcfa(s.price)}
                      className="input input-sm w-28"
                    />
                  </td>
                  <td data-label="" className="px-3 py-2 text-right">
                    <button onClick={() => toggle(s)} className="text-xs font-medium text-primary-700 hover:underline">
                      {s.isActive ? 'Proposée — retirer' : 'Retirée — proposer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

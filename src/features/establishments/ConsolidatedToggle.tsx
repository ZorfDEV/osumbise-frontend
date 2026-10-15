import { Layers } from 'lucide-react';
import { useActiveEstablishment } from './ActiveEstablishmentContext';

// Case "Tous mes établissements" du tableau de bord et des rapports : visible
// uniquement pour un propriétaire qui en a plusieurs. Cochée, les chiffres
// portent sur toute l'organisation au lieu de l'établissement actif.
export default function ConsolidatedToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { canSwitch, establishments, current } = useActiveEstablishment();
  if (!canSwitch || establishments.length < 2) return null;

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      <Layers size={16} className="text-slate-500" />
      <span className="font-medium text-slate-700">Tous mes établissements</span>
      {!checked && current.name && <span className="hidden text-xs text-slate-500 sm:inline">(sinon : {current.name})</span>}
    </label>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronsUpDown, Settings2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useActiveEstablishment } from '@/features/establishments/ActiveEstablishmentContext';
import type { EstablishmentType } from '@/features/establishments/types';
import { resolveUploadUrl } from '@/lib/uploads';

const TYPE_LABELS: Record<EstablishmentType, string> = {
  BAR: 'Bar',
  RESTAURANT: 'Restaurant',
  HOTEL: 'Hôtel',
  GROSSISTE: 'Grossiste',
  EPICERIE: 'Épicerie',
};

function Avatar({ name, logo }: { name: string; logo: string | null }) {
  const src = resolveUploadUrl(logo);
  return src ? (
    <img src={src} alt="" className="h-8 w-8 shrink-0 rounded border border-slate-200 bg-white object-contain" />
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-500">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Marque à gauche de la Topbar. Pour un propriétaire : menu de choix de
// l'établissement actif. Pour les autres rôles : simple affichage.
export default function EstablishmentSwitcher() {
  const { user } = useAuth();
  const { establishments, canSwitch, current, setActive } = useActiveEstablishment();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Sans établissement en cours (propriétaire sans établissement créé) : nom de l'organisation
  const name = current.name ?? user?.organization.name ?? '';
  if (!name) return null;

  if (!canSwitch) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={name} logo={current.logo} />
        <span className="truncate text-sm font-medium text-slate-700">{name}</span>
      </div>
    );
  }

  const choose = (id: string) => {
    setOpen(false);
    if (id !== current.id) setActive(id);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Établissement actif : ${name}. Changer d’établissement`}
        className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-slate-100"
      >
        <Avatar name={name} logo={current.logo} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-heading">{name}</span>
          {current.type && (
            <span className="hidden text-xs leading-tight text-slate-500 sm:block">{TYPE_LABELS[current.type]}</span>
          )}
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-40 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-xl">
          <p className="px-4 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
            Vos établissements
          </p>
          <ul role="listbox" aria-label="Établissements" className="max-h-80 overflow-y-auto pb-2">
            {establishments.map((e) => {
              const selected = e.id === current.id;
              return (
                <li key={e.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => choose(e.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                      selected ? 'bg-primary-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Avatar name={e.name} logo={e.logo} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-heading">{e.name}</span>
                      <span className="block text-xs text-slate-500">{TYPE_LABELS[e.type]}</span>
                    </span>
                    {selected && <Check size={16} className="shrink-0 text-primary-700" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <Link
            to="/establishments"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 border-t border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Settings2 size={16} />
            Gérer les établissements
          </Link>
        </div>
      )}
    </div>
  );
}

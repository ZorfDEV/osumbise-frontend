import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_LABELS, useTheme, type ThemePreference } from '@/lib/theme';

const NEXT: Record<ThemePreference, ThemePreference> = { light: 'dark', dark: 'system', system: 'light' };
const ICONS = { light: Sun, dark: Moon, system: Monitor };

// Bouton de la Topbar : un clic passe Clair → Sombre → Automatique
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  const Icon = ICONS[preference];
  const next = NEXT[preference];
  const label = `Thème : ${THEME_LABELS[preference]}. Passer en ${THEME_LABELS[next].toLowerCase()}`;

  return (
    <button type="button" onClick={() => setPreference(next)} aria-label={label} title={label} className={className}>
      <Icon size={18} />
    </button>
  );
}

// Choix explicite des trois options, pour la page Paramètres
export function ThemePicker() {
  const { preference, setPreference } = useTheme();
  const options: { value: ThemePreference; hint: string }[] = [
    { value: 'light', hint: 'Idéal en journée et en salle lumineuse' },
    { value: 'dark', hint: 'Moins éblouissant pour le service du soir' },
    { value: 'system', hint: 'Suit le réglage de l’appareil' },
  ];

  return (
    <div role="radiogroup" aria-label="Thème de l’interface" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map(({ value, hint }) => {
        const Icon = ICONS[value];
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(value)}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              active ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${active ? 'text-primary-700' : 'text-slate-500'}`} />
            <span>
              <span className="block text-sm font-semibold text-heading">{THEME_LABELS[value]}</span>
              <span className="block text-xs text-slate-500">{hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

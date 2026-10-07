import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'osumbise:theme';
// Prévient les autres sélecteurs ouverts (Topbar, Paramètres) d'un changement
const CHANGE_EVENT = 'osumbise:theme-change';
// Thème par défaut tant que l'utilisateur n'a rien choisi. Mettre 'system'
// pour suivre automatiquement le réglage de l'appareil (et dans index.html).
const DEFAULT_THEME: ThemePreference = 'light';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

const readPreference = (): ThemePreference => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

const applyTheme = (pref: ThemePreference) => {
  const dark = pref === 'dark' || (pref === 'system' && media().matches);
  document.documentElement.classList.toggle('dark', dark);
  // Couleur de la barre du navigateur mobile / de l'app installée
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1A211E' : '#4A6B5D');
};

// Les tickets et factures s'impriment toujours en clair, quel que soit le
// thème affiché à l'écran.
let printListenersInstalled = false;
const installPrintListeners = () => {
  if (printListenersInstalled) return;
  printListenersInstalled = true;
  let wasDark = false;
  window.addEventListener('beforeprint', () => {
    wasDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.remove('dark');
  });
  window.addEventListener('afterprint', () => {
    if (wasDark) document.documentElement.classList.add('dark');
  });
};

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Clair',
  dark: 'Sombre',
  system: 'Automatique',
};

export const useTheme = () => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    installPrintListeners();
    applyTheme(preference);
    if (preference !== 'system') return;
    // En mode automatique, on suit les changements de réglage de l'appareil
    const mq = media();
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  // Synchronisation entre plusieurs sélecteurs affichés en même temps
  useEffect(() => {
    const onChange = () => setPreferenceState(readPreference());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // stockage indisponible : le choix vaut pour cette session uniquement
    }
    setPreferenceState(pref);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { preference, setPreference };
};

import { useEffect, useState } from 'react';

// Carillon « commande prête » : trois notes douces jouées avec la Web Audio
// API (aucun fichier son à charger). Réglage propre à chaque poste.

const STORAGE_KEY = 'osumbise:readySound';

export const readReadySoundEnabled = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
};

export const useReadySoundSetting = () => {
  const [enabled, setEnabled] = useState(readReadySoundEnabled);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Stockage indisponible : le réglage vaut pour la session seulement
    }
  }, [enabled]);
  return { enabled, setEnabled };
};

let context: AudioContext | null = null;

export const playReadySound = () => {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    context = context ?? new Ctx();
    // Le navigateur suspend le son tant que la page n'a pas été touchée :
    // il reprend dès la première interaction (clic au point de vente)
    if (context.state === 'suspended') void context.resume();
    const start = context.currentTime;
    [880, 1108.73, 1318.51].forEach((freq, i) => {
      const osc = context!.createOscillator();
      const gain = context!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = start + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(context!.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {
    // Son indisponible sur cet appareil : la notification à l'écran suffit
  }
};

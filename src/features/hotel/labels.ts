import type { RoomCategory, RoomStatus, StayPaymentMethod, StayStatus } from './types';

export const CATEGORY_LABELS: Record<RoomCategory, string> = {
  STANDARD: 'Standard',
  VIP: 'VIP',
  SUITE: 'Suite',
};

export const ROOM_STATUS: Record<RoomStatus, { label: string; card: string; dot: string; badge: string; icon: string }> = {
  AVAILABLE: {
    label: 'Libre',
    card: 'border-success/40 bg-success-soft/40',
    dot: 'bg-success-accent',
    badge: 'bg-success-soft text-success-dark',
    icon: 'text-success-dark',
  },
  OCCUPIED: {
    label: 'Occupée',
    card: 'border-danger/40 bg-danger-soft/30',
    dot: 'bg-danger',
    badge: 'bg-danger-soft text-danger-dark',
    icon: 'text-danger-dark',
  },
  CLEANING: {
    label: 'À nettoyer',
    card: 'border-warning/40 bg-warning-soft/40',
    dot: 'bg-warning-accent',
    badge: 'bg-warning-soft text-warning-dark',
    icon: 'text-warning-dark',
  },
  OUT_OF_SERVICE: {
    label: 'Hors service',
    card: 'border-slate-300 bg-slate-100',
    dot: 'bg-slate-500',
    badge: 'bg-slate-200 text-slate-700',
    icon: 'text-slate-500',
  },
};

export const STAY_STATUS: Record<StayStatus, { label: string; badge: string; bar: string }> = {
  RESERVED: { label: 'Réservé', badge: 'bg-info-soft text-info-dark', bar: 'bg-info-soft text-info-dark border-info/40' },
  CHECKED_IN: { label: 'En cours', badge: 'bg-success-soft text-success-dark', bar: 'bg-success-soft text-success-dark border-success/40' },
  CHECKED_OUT: { label: 'Terminé', badge: 'bg-slate-100 text-slate-600', bar: 'bg-slate-100 text-slate-600 border-slate-300' },
  CANCELLED: { label: 'Annulé', badge: 'bg-danger-soft text-danger-dark', bar: 'bg-danger-soft text-danger-dark border-danger/30' },
};

export const STAY_PAYMENT_LABELS: Record<StayPaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  TRANSFER: 'Virement',
  CREDIT: 'Compte client',
};

// « 101 · Bâtiment A » : le bâtiment n'est ajouté que s'il est renseigné
export const roomName = (r: { number: string; building?: string | null }) =>
  r.building ? `${r.number} · ${r.building}` : r.number;

export const fcfa = (n: number | string) => `${Math.round(Number(n)).toLocaleString('fr-FR')} FCFA`;

// Dates "jour" (AAAA-MM-JJ) — en heure locale, comme la réception les saisit
const pad = (x: number) => String(x).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => isoDay(new Date());
export const addDaysIso = (iso: string, n: number) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return isoDay(new Date(y, m - 1, d + n));
};
// L'API renvoie les colonnes @db.Date en "AAAA-MM-JJT00:00:00.000Z"
export const dayOf = (value: string) => value.slice(0, 10);
export const formatDay = (value: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) => {
  const [y, m, d] = dayOf(value).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', opts);
};
export const nightsBetween = (checkIn: string, checkOut: string) => {
  const [y1, m1, d1] = dayOf(checkIn).split('-').map(Number);
  const [y2, m2, d2] = dayOf(checkOut).split('-').map(Number);
  return Math.max(1, Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000));
};

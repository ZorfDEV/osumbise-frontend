import { EstablishmentType } from '@/features/establishments/types';

export type Role = 'OWNER' | 'ADMIN' | 'CASHIER' | 'SERVER' | 'STOCK_KEEPER' | 'COOK';

// Abonnement : à jour, expiré (délai de grâce) ou lecture seule
export interface SubscriptionAccess {
  state: 'OK' | 'GRACE' | 'READ_ONLY';
  // null : aucune formule choisie
  endedAt: string | null;
  readOnlyAt: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  establishmentId: string | null;
  // null pour un OWNER sans établissement fixe — voir la note dans TopBar.tsx
  establishment: { name: string; logo: string | null } | null;
  organization: { name: string };
  hasSubscription: boolean;
  subscriptionAccess?: SubscriptionAccess;
  isPlatformAdmin: boolean;
  // Administrateur ayant accès à tous les établissements du propriétaire
  multiEstablishment?: boolean;
  establishmentType: EstablishmentType | null;
}

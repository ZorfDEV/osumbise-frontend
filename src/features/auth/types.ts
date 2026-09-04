export type Role = 'OWNER' | 'ADMIN' | 'CASHIER' | 'SERVER' | 'STOCK_KEEPER' | 'COOK';

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
}

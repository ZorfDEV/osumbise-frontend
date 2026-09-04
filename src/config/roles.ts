import { Role } from '@/features/auth/types';

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  CASHIER: 'Caissier',
  SERVER: 'Serveur',
  STOCK_KEEPER: 'Magasinier',
  COOK: 'Cuisinier',
};

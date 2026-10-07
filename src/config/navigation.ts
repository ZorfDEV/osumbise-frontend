import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Package,
  Archive,
  Truck,
  ShoppingBag,
  Wallet,
  Receipt,
  BarChart3,
  Users,
  Users2,
  Building2,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { AuthUser, Role } from '@/features/auth/types';
import { EstablishmentType } from '@/features/establishments/types';

export const ALL_ROLES: Role[] = ['OWNER', 'ADMIN', 'CASHIER', 'SERVER', 'STOCK_KEEPER', 'COOK'];

// Sections du menu, dans l'ordre d'affichage. Une section sans aucune entrée
// visible pour le rôle courant n'est pas affichée.
export const NAV_SECTIONS = ['Pilotage', 'Vente', 'Catalogue', 'Achats', 'Gestion'] as const;
export type NavSection = (typeof NAV_SECTIONS)[number];

export interface NavItem {
  to: string;
  label: string;
  section: NavSection;
  roles: Role[];
  icon: LucideIcon;
  // Si omis : visible pour tous les types d'établissement. Sinon, visible
  // uniquement pour les types listés (ex. Tables/Cuisine n'ont pas de sens
  // pour un Grossiste, qui n'a ni service à table ni cuisine).
  visibleForTypes?: EstablishmentType[];
}

export const NAV_ITEMS: NavItem[] = [
  // Pilotage
  { to: '/dashboard', label: 'Tableau de bord', section: 'Pilotage', roles: ['OWNER', 'ADMIN'], icon: LayoutDashboard },
  { to: '/reports', label: 'Rapports', section: 'Pilotage', roles: ['OWNER', 'ADMIN'], icon: BarChart3 },

  // Vente
  {
    to: '/tables',
    label: 'Point de vente',
    section: 'Vente',
    roles: ['OWNER', 'ADMIN', 'SERVER', 'CASHIER'],
    icon: ShoppingCart,
    visibleForTypes: ['BAR', 'RESTAURANT', 'HOTEL', 'EPICERIE'],
  },
  {
    to: '/kitchen',
    label: 'Cuisine',
    section: 'Vente',
    roles: ['OWNER', 'ADMIN', 'COOK'],
    icon: ChefHat,
    visibleForTypes: ['BAR', 'RESTAURANT', 'HOTEL'],
  },
  {
    to: '/customers',
    label: 'Clients',
    section: 'Vente',
    roles: ['OWNER', 'ADMIN', 'CASHIER'],
    icon: Users2,
    visibleForTypes: ['GROSSISTE'],
  },
  {
    to: '/cash',
    label: 'Sessions de caisse',
    section: 'Vente',
    roles: ['OWNER', 'ADMIN', 'CASHIER'],
    icon: Wallet,
  },

  // Catalogue
  {
    to: '/products',
    label: 'Produits',
    section: 'Catalogue',
    roles: ['OWNER', 'ADMIN', 'STOCK_KEEPER'],
    icon: Package,
  },
  { to: '/stock', label: 'Stock', section: 'Catalogue', roles: ['OWNER', 'ADMIN', 'STOCK_KEEPER'], icon: Archive },

  // Achats
  {
    to: '/suppliers',
    label: 'Fournisseurs',
    section: 'Achats',
    roles: ['OWNER', 'ADMIN', 'STOCK_KEEPER'],
    icon: Truck,
  },
  {
    to: '/purchase-orders',
    label: 'Commandes d’achat',
    section: 'Achats',
    roles: ['OWNER', 'ADMIN', 'STOCK_KEEPER'],
    icon: ShoppingBag,
  },

  // Gestion
  { to: '/expenses', label: 'Dépenses', section: 'Gestion', roles: ['OWNER', 'ADMIN', 'CASHIER'], icon: Receipt },
  { to: '/users', label: 'Utilisateurs', section: 'Gestion', roles: ['OWNER', 'ADMIN'], icon: Users },
  { to: '/establishments', label: 'Établissements', section: 'Gestion', roles: ['OWNER'], icon: Building2 },
  { to: '/settings', label: 'Paramètres', section: 'Gestion', roles: ALL_ROLES, icon: Settings },
];

// Règle unique de visibilité d'une entrée (menu, page d'accueil, recherche)
export const isNavItemVisible = (item: NavItem, user: AuthUser | null | undefined) =>
  !!user &&
  item.roles.includes(user.role) &&
  (!item.visibleForTypes || !user.establishmentType || item.visibleForTypes.includes(user.establishmentType));

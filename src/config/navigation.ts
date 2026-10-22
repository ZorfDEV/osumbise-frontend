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
  ReceiptText,
  Users,
  Users2,
  HandCoins,
  Building2,
  Settings,
  BedDouble,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { AuthUser, Role } from '@/features/auth/types';
import { EstablishmentType } from '@/features/establishments/types';

export const ALL_ROLES: Role[] = ['OWNER', 'ADMIN', 'CASHIER', 'SERVER', 'STOCK_KEEPER', 'COOK'];

// Sections du menu, dans l'ordre d'affichage. Une section sans aucune entrée
// visible pour le rôle courant n'est pas affichée.
export const NAV_SECTIONS = ['Pilotage', 'Hébergement', 'Vente', 'Catalogue', 'Achats', 'Gestion'] as const;
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
  // Masqué pour ces rôles dans ces types d'établissement (ex. la caissière
  // d'un hôtel vend des chambres, pas au point de vente)
  hiddenFor?: { roles: Role[]; types: EstablishmentType[] };
}

export const NAV_ITEMS: NavItem[] = [
  // Pilotage
  { to: '/dashboard', label: 'Tableau de bord', section: 'Pilotage', roles: ['OWNER', 'ADMIN'], icon: LayoutDashboard },
  { to: '/reports', label: 'Rapports', section: 'Pilotage', roles: ['OWNER', 'ADMIN'], icon: BarChart3 },
  // Ventes encaissées : retrouver et annuler une vente (test, remboursement)
  { to: '/sales', label: 'Ventes', section: 'Pilotage', roles: ['OWNER', 'ADMIN'], icon: ReceiptText },

  // Vente
  {
    to: '/tables',
    label: 'Point de vente',
    section: 'Vente',
    roles: ['OWNER', 'ADMIN', 'SERVER', 'CASHIER'],
    icon: ShoppingCart,
    visibleForTypes: ['BAR', 'RESTAURANT', 'HOTEL', 'EPICERIE'],
    hiddenFor: { roles: ['CASHIER'], types: ['HOTEL'] },
  },

  // Hébergement (hôtels uniquement). Juste après le point de vente dans cette
  // liste : la page d'accueil (première entrée visible) d'un caissier d'hôtel
  // est Chambres, celle d'un caissier de bar/restaurant reste le point de
  // vente ; le menu affiche la section Hébergement en tête (NAV_SECTIONS).
  {
    to: '/hotel',
    label: 'Chambres',
    section: 'Hébergement',
    roles: ['OWNER', 'ADMIN', 'CASHIER'],
    icon: BedDouble,
    visibleForTypes: ['HOTEL'],
  },
  {
    to: '/hotel/stays',
    label: 'Séjours',
    section: 'Hébergement',
    roles: ['OWNER', 'ADMIN', 'CASHIER'],
    icon: CalendarDays,
    visibleForTypes: ['HOTEL'],
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
    // Factures en attente : commandes non payées et comptes clients à régler
    to: '/to-collect',
    label: 'À encaisser',
    section: 'Vente',
    roles: ['OWNER', 'ADMIN', 'CASHIER'],
    icon: HandCoins,
  },
  {
    to: '/customers',
    label: 'Clients',
    section: 'Vente',
    roles: ['OWNER', 'ADMIN', 'CASHIER'],
    icon: Users2,
    // Comptes clients (consommer maintenant, payer plus tard) : tous types
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
  { to: '/expenses', label: 'Dépenses', section: 'Gestion', roles: ['OWNER', 'ADMIN'], icon: Receipt },
  { to: '/users', label: 'Utilisateurs', section: 'Gestion', roles: ['OWNER', 'ADMIN'], icon: Users },
  { to: '/establishments', label: 'Établissements', section: 'Gestion', roles: ['OWNER'], icon: Building2 },
  { to: '/settings', label: 'Paramètres', section: 'Gestion', roles: ALL_ROLES, icon: Settings },
];

// Point de vente (nouvelles ventes) accessible ? Même règle que le lien
// « Point de vente » du menu : refusé à la caissière d'un hôtel, qui vend
// des chambres. Sert aussi à bloquer l'adresse /tables et les boutons « Vendre ».
export const canUsePos = (
  user: AuthUser | null | undefined,
  establishmentType: EstablishmentType | null = user?.establishmentType ?? null
) => {
  const pos = NAV_ITEMS.find((item) => item.to === '/tables');
  return !!pos && isNavItemVisible(pos, user, establishmentType);
};

// Règle unique de visibilité d'une entrée (menu, page d'accueil, recherche).
// `establishmentType` : type de l'établissement en cours — celui choisi par un
// propriétaire dans la Topbar, sinon celui du compte (useActiveEstablishment).
export const isNavItemVisible = (
  item: NavItem,
  user: AuthUser | null | undefined,
  establishmentType: EstablishmentType | null = user?.establishmentType ?? null
) =>
  !!user &&
  item.roles.includes(user.role) &&
  (!item.visibleForTypes || !establishmentType || item.visibleForTypes.includes(establishmentType)) &&
  !(item.hiddenFor && establishmentType && item.hiddenFor.roles.includes(user.role) && item.hiddenFor.types.includes(establishmentType));

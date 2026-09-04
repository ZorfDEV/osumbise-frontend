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
  Building2,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Role } from '@/features/auth/types';

export const ALL_ROLES: Role[] = ['OWNER', 'ADMIN', 'CASHIER', 'SERVER', 'STOCK_KEEPER', 'COOK'];

export interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Tableau de bord', roles: ['OWNER', 'ADMIN'], icon: LayoutDashboard },
  {
    to: '/tables',
    label: 'Point de vente',
    roles: ['OWNER', 'ADMIN', 'SERVER', 'CASHIER'],
    icon: ShoppingCart,
  },
  { to: '/kitchen', label: 'Cuisine', roles: ['OWNER', 'ADMIN', 'COOK'], icon: ChefHat },
  {
    to: '/products',
    label: 'Produits',
    roles: ['OWNER', 'ADMIN', 'STOCK_KEEPER'],
    icon: Package,
  },
  { to: '/stock', label: 'Stock', roles: ['OWNER', 'ADMIN', 'STOCK_KEEPER'], icon: Archive },
  {
    to: '/suppliers',
    label: 'Fournisseurs',
    roles: ['OWNER', 'ADMIN', 'STOCK_KEEPER'],
    icon: Truck,
  },
  {
    to: '/purchase-orders',
    label: 'Achats',
    roles: ['OWNER', 'ADMIN', 'STOCK_KEEPER'],
    icon: ShoppingBag,
  },
  {
    to: '/cash',
    label: 'Sessions de caisse',
    roles: ['OWNER', 'ADMIN', 'CASHIER'],
    icon: Wallet,
  },
  { to: '/expenses', label: 'Dépenses', roles: ['OWNER', 'ADMIN', 'CASHIER'], icon: Receipt },
  { to: '/reports', label: 'Rapports', roles: ['OWNER', 'ADMIN'], icon: BarChart3 },
  { to: '/users', label: 'Utilisateurs', roles: ['OWNER', 'ADMIN'], icon: Users },
  { to: '/establishments', label: 'Établissements', roles: ['OWNER'], icon: Building2 },
  { to: '/settings', label: 'Paramètres', roles: ALL_ROLES, icon: Settings },
];

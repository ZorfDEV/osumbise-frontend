import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import SubscribePage from '@/features/auth/SubscribePage';
import SettingsPage from '@/features/auth/SettingsPage';
import TablesPage from '@/features/pos/TablesPage';
import TablesManagePage from '@/features/pos/TablesManagePage';
import PosOrderPage from '@/features/pos/PosOrderPage';
import ReceiptPage from '@/features/pos/ReceiptPage';
import KitchenPage from '@/features/kitchen/KitchenPage';
import ProductsPage from '@/features/products/ProductsPage';
import ProductDetailPage from '@/features/products/ProductDetailPage';
import CategoriesPage from '@/features/products/CategoriesPage';
import UsersPage from '@/features/users/UsersPage';
import EstablishmentsPage from '@/features/establishments/EstablishmentsPage';
import StockPage from '@/features/stock/StockPage';
import SuppliersPage from '@/features/suppliers/SuppliersPage';
import PurchaseOrdersPage from '@/features/purchases/PurchaseOrdersPage';
import PurchaseOrderDetailPage from '@/features/purchases/PurchaseOrderDetailPage';
import CashPage from '@/features/cash/CashPage';
import CashSessionDetailPage from '@/features/cash/CashSessionDetailPage';
import ExpensesPage from '@/features/expenses/ExpensesPage';
import CustomersPage from '@/features/customers/CustomersPage';
import CustomerDetailPage from '@/features/customers/CustomerDetailPage';
import ReportsPage from '@/features/reports/ReportsPage';
import ProtectedRoute from './ProtectedRoute';
import PlatformAdminRoute from './PlatformAdminRoute';
import RootRoute from './RootRoute';
import HomeRoute from './HomeRoute';
import AppLayout from '@/components/layout/AppLayout';
import PlatformAdminLayout from '@/features/platformAdmin/PlatformAdminLayout';
import PlatformDashboardPage from '@/features/platformAdmin/PlatformDashboardPage';
import OrganizationsPage from '@/features/platformAdmin/OrganizationsPage';
import OrganizationDetailPage from '@/features/platformAdmin/OrganizationDetailPage';

const NotFoundPage = () => (
  <div className="text-slate-700">
    <h1 className="text-2xl font-semibold">Page introuvable</h1>
    <p className="mt-2 text-sm text-slate-500">
      Cette page n’existe pas ou tu n’y as pas accès.
    </p>
    <Link
      to="/dashboard"
      className="mt-4 inline-block text-sm font-medium text-slate-900 hover:underline"
    >
      ← Retour au tableau de bord
    </Link>
  </div>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Page marketing publique si non connecté, sinon redirige vers /dashboard */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Étape intermédiaire après inscription : choix de la formule,
              avant d'entrer dans l'app (pas de Sidebar/Topbar ici) */}
          <Route path="/subscribe" element={<SubscribePage />} />

          <Route element={<PlatformAdminRoute />}>
            <Route element={<PlatformAdminLayout />}>
              <Route path="/platform-admin" element={<PlatformDashboardPage />} />
              <Route path="/platform-admin/organizations" element={<OrganizationsPage />} />
              <Route
                path="/platform-admin/organizations/:id"
                element={<OrganizationDetailPage />}
              />
            </Route>
          </Route>

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<HomeRoute />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/tables/manage" element={<TablesManagePage />} />
            <Route path="/pos/:orderId" element={<PosOrderPage />} />
            <Route path="/pos/:orderId/receipt" element={<ReceiptPage />} />
            <Route path="/kitchen" element={<KitchenPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="/cash" element={<CashPage />} />
            <Route path="/cash/:sessionId" element={<CashSessionDetailPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/establishments" element={<EstablishmentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

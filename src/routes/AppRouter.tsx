import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '@/features/auth/LoginPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import TablesPage from '@/features/pos/TablesPage';
import TablesManagePage from '@/features/pos/TablesManagePage';
import PosOrderPage from '@/features/pos/PosOrderPage';
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
import ReportsPage from '@/features/reports/ReportsPage';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';

// Provisoire : chaque écran métier (dashboard, POS, stock...) remplacera ces
// pages au fur et à mesure des prochaines étapes
const Placeholder = ({ title }: { title: string }) => (
  <div className="text-slate-700">
    <h1 className="text-2xl font-semibold">{title}</h1>
    <p className="mt-2 text-sm text-slate-500">Écran à construire.</p>
  </div>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/tables/manage" element={<TablesManagePage />} />
            <Route path="/pos/:orderId" element={<PosOrderPage />} />
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
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/establishments" element={<EstablishmentsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

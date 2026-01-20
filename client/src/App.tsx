import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Kassa from './pages/admin/Kassa';
import Products from './pages/admin/Products';
import Warehouses from './pages/admin/Warehouses';
import Customers from './pages/admin/Customers';
import Debts from './pages/admin/Debts';
import Orders from './pages/admin/Orders';
import Helpers from './pages/admin/Helpers';
import StaffReceipts from './pages/admin/StaffReceipts';
import PrinterSettings from './pages/admin/PrinterSettings';
import CashierLayout from './layouts/CashierLayout';
import HelperLayout from './layouts/HelperLayout';
import HelperScanner from './pages/helper/Scanner';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-brand-100 flex items-center justify-center">
            <div className="spinner text-brand-600" />
          </div>
          <p className="text-surface-500 text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'cashier') return <Navigate to="/cashier" />;
  return <Navigate to="/helper" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRedirect />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="kassa" element={<Kassa />} />
            <Route path="products" element={<Products />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="customers" element={<Customers />} />
            <Route path="debts" element={<Debts />} />
            <Route path="orders" element={<Orders />} />
            <Route path="helpers" element={<Helpers />} />
            <Route path="staff-receipts" element={<StaffReceipts />} />
            <Route path="printer-settings" element={<PrinterSettings />} />
          </Route>

          {/* Cashier Routes */}
          <Route path="/cashier" element={<ProtectedRoute roles={['cashier']}><CashierLayout /></ProtectedRoute>}>
            <Route index element={<Kassa />} />
            <Route path="debts" element={<Debts />} />
            <Route path="staff-receipts" element={<StaffReceipts />} />
          </Route>

          {/* Helper Routes */}
          <Route path="/helper" element={<ProtectedRoute roles={['helper']}><HelperLayout /></ProtectedRoute>}>
            <Route index element={<HelperScanner />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

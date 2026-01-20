import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Warehouse, Users, 
  CreditCard, ShoppingBag, UserPlus, Receipt, Menu, X, LogOut, Sparkles, Edit, Phone, Lock, User, Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatPhone } from '../utils/format';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface SidebarProps {
  items: MenuItem[];
  basePath: string;
  collapsed?: boolean;
  setCollapsed?: (v: boolean) => void;
}

export default function Sidebar({ items, basePath, collapsed = false, setCollapsed }: SidebarProps) {
  const { user, logout, updateUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', password: '' });

  const openEditModal = () => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      password: ''
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = { name: formData.name, phone: formData.phone };
      if (formData.password) data.password = formData.password;
      
      const res = await api.put('/auth/profile', data);
      updateUser(res.data);
      setShowEditModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white border-r border-surface-200/60 transition-all duration-300 ease-smooth z-50 ${
      collapsed ? 'w-[72px]' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-surface-100">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-surface-900">Universal</span>
          </div>
        )}
        <button 
          onClick={() => setCollapsed?.(!collapsed)} 
          className="btn-icon-sm"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-180px)]">
        {items.map((item, i) => (
          <NavLink
            key={i}
            to={`${basePath}${item.path}`}
            end={item.path === ''}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200
              ${collapsed ? 'justify-center' : ''}
              ${isActive 
                ? 'bg-brand-50 text-brand-600' 
                : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              }
            `}
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-surface-100 bg-white">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-surface-200 to-surface-300 rounded-xl flex items-center justify-center">
              <span className="text-sm font-semibold text-surface-600">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">{user?.name}</p>
              <p className="text-xs text-surface-500 capitalize">{user?.role}</p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={openEditModal}
                className="btn-icon-sm hover:bg-brand-100 hover:text-brand-600"
                title="Tahrirlash"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-surface-500 hover:bg-danger-50 hover:text-danger-600 transition-all duration-200 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Chiqish' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Chiqish</span>}
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative z-10 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">Profilni tahrirlash</h3>
              <button onClick={() => setShowEditModal(false)} className="btn-icon-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Ism</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="text" className="input pl-12" placeholder="Ismingiz" value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="tel" className="input pl-12" placeholder="+998 (XX) XXX-XX-XX" value={formData.phone}
                    onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Yangi parol (ixtiyoriy)</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="password" className="input pl-12" placeholder="O'zgartirmaslik uchun bo'sh qoldiring" value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

export const adminMenuItems: MenuItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Statistika', path: '' },
  { icon: <Package className="w-5 h-5" />, label: 'Tovarlar', path: '/products' },
  { icon: <Warehouse className="w-5 h-5" />, label: 'Omborlar', path: '/warehouses' },
  { icon: <Users className="w-5 h-5" />, label: 'Mijozlar', path: '/customers' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Qarz daftarcha', path: '/debts' },
  { icon: <ShoppingBag className="w-5 h-5" />, label: 'Buyurtmalar', path: '/orders' },
  { icon: <UserPlus className="w-5 h-5" />, label: "Yordamchilar", path: '/helpers' },
  { icon: <Printer className="w-5 h-5" />, label: "Printer sozlamalari", path: '/printer-settings' },
];

export const cashierMenuItems: MenuItem[] = [
  { icon: <ShoppingCart className="w-5 h-5" />, label: 'Kassa (POS)', path: '' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Qarz daftarcha', path: '/debts' },
  { icon: <Receipt className="w-5 h-5" />, label: "Xodimlar cheklari", path: '/staff-receipts' },
];

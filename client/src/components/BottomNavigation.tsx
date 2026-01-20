import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Receipt, 
  FileText
} from 'lucide-react';

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Bosh sahifa', exact: true },
    { path: '/admin/kassa', icon: ShoppingCart, label: 'Kassa' },
    { path: '/admin/products', icon: Package, label: 'Tovarlar' },
    { path: '/admin/debts', icon: Receipt, label: 'Qarzlar' },
    { path: '/admin/staff-receipts', icon: FileText, label: 'Cheklar' }
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-surface-200/60 z-50 safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                active 
                  ? 'text-brand-600' 
                  : 'text-surface-400 active:text-surface-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                active ? 'bg-brand-50' : ''
              }`}>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`} />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-brand-600' : 'text-surface-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

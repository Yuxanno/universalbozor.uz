import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar, { cashierMenuItems } from '../components/Sidebar';

export default function CashierLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="hidden lg:block">
        <Sidebar items={cashierMenuItems} basePath="/cashier" collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <main className={`transition-all duration-300 ease-smooth ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        <Outlet />
      </main>
    </div>
  );
}

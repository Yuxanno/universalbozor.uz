import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { ShoppingBag, Package, Clock, Truck, CheckCircle2, XCircle, User } from 'lucide-react';
import { Order } from '../../types';
import api from '../../utils/api';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) { console.error('Error fetching orders:', err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      fetchOrders();
    } catch (err) { console.error('Error updating order:', err); }
  };

  const statusConfig = {
    new: { color: 'brand', label: 'Yangi', icon: Clock },
    processing: { color: 'warning', label: 'Jarayonda', icon: Package },
    shipped: { color: 'accent', label: "Yo'lda", icon: Truck },
    delivered: { color: 'success', label: 'Yetkazildi', icon: CheckCircle2 },
    cancelled: { color: 'danger', label: 'Bekor qilindi', icon: XCircle },
  };

  const filterOptions = [
    { value: 'all', label: 'Barchasi' },
    ...Object.entries(statusConfig).map(([key, val]) => ({ value: key, label: val.label }))
  ];

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      <Header 
        title="Buyurtmalar"
        filterOptions={filterOptions}
        filterValue={filter}
        onFilterChange={setFilter}
      />

      <div className="p-4 lg:p-6">
        {/* Orders List */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner text-brand-600 w-8 h-8" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Buyurtmalar topilmadi</h3>
              <p className="text-surface-500">Hozircha buyurtmalar yo'q</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {filteredOrders.map(order => {
                const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.new;
                return (
                  <div key={order._id} className="p-4 lg:p-6 hover:bg-surface-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-surface-900">Buyurtma #{order._id.slice(-6)}</h4>
                            <div className="flex items-center gap-2 text-sm text-surface-500 mt-1">
                              <User className="w-4 h-4" />
                              <span>{order.customer?.name || 'Noma\'lum mijoz'}</span>
                            </div>
                          </div>
                          <select
                            value={order.status}
                            onChange={e => updateStatus(order._id, e.target.value)}
                            className={`select text-sm py-2 px-3 bg-${config.color}-50 text-${config.color}-700 border-${config.color}-200`}
                          >
                            {Object.entries(statusConfig).map(([value, cfg]) => (
                              <option key={value} value={value}>{cfg.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-surface-500">
                            <span>{order.items.length} ta mahsulot</span>
                            <span>{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</span>
                          </div>
                          <p className="font-bold text-surface-900">{(order.total || 0).toLocaleString()} so'm</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

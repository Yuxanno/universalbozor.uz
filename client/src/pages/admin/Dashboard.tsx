import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { 
  DollarSign, TrendingUp, ShoppingCart, Receipt, Package, 
  Clock, RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';

export default function Dashboard() {
  const [period, setPeriod] = useState<'today' | 'week'>('today');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    totalReceipts: 0,
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    peakHour: ''
  });
  const [chartData, setChartData] = useState<{name: string; sales: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const res = await api.get(`/stats/chart?period=${period}`);
      setChartData(res.data);
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };

  const mainStats = [
    { 
      icon: DollarSign, 
      label: 'Umumiy tushum', 
      value: formatNumber(stats.totalRevenue), 
      suffix: "so'm", 
      color: 'bg-success-500',
      bgColor: 'bg-success-50',
      textColor: 'text-success-600',
      trend: '+12%',
      trendUp: true
    },
    { 
      icon: TrendingUp, 
      label: period === 'today' ? 'Bugungi sotuv' : 'Haftalik sotuv', 
      value: formatNumber(period === 'today' ? stats.todaySales : stats.weekSales), 
      suffix: "so'm", 
      color: 'bg-brand-500',
      bgColor: 'bg-brand-50',
      textColor: 'text-brand-600',
      trend: '+8%',
      trendUp: true
    },
    { 
      icon: ShoppingCart, 
      label: 'Jami cheklar', 
      value: stats.totalReceipts.toString(), 
      color: 'bg-accent-500',
      bgColor: 'bg-accent-50',
      textColor: 'text-accent-600',
      trend: '+5%',
      trendUp: true
    },
    { 
      icon: Receipt, 
      label: "Eng faol vaqt", 
      value: stats.peakHour || '-', 
      color: 'bg-warning-500',
      bgColor: 'bg-warning-50',
      textColor: 'text-warning-600',
      trend: '',
      trendUp: true
    },
  ];

  const inventory = [
    { label: 'Jami mahsulotlar', value: stats.totalProducts, color: 'bg-surface-500', dotColor: 'bg-surface-400' },
    { label: 'Kam qolgan', value: stats.lowStock, color: 'bg-warning-500', dotColor: 'bg-warning-500' },
    { label: 'Tugagan', value: stats.outOfStock, color: 'bg-danger-500', dotColor: 'bg-danger-500' },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      <Header title="Statistika" />
      
      <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
        {/* Period Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-surface-900">Umumiy ko'rinish</h2>
            <p className="text-sm text-surface-500 mt-0.5">Biznesingiz holati</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-surface-100 rounded-xl">
              <button 
                onClick={() => setPeriod('today')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  period === 'today' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                Bugun
              </button>
              <button 
                onClick={() => setPeriod('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  period === 'week' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                Hafta
              </button>
            </div>
            <button 
              onClick={fetchStats} 
              className="btn-icon"
              title="Yangilash"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="card p-5">
                <div className="skeleton w-10 h-10 rounded-xl mb-4" />
                <div className="skeleton-title mb-2" />
                <div className="skeleton-text w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {mainStats.map((stat, i) => (
                <div key={i} className="stat-card group">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`stat-icon ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      stat.trendUp ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {stat.trend && (
                        <>
                          {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {stat.trend}
                        </>
                      )}
                    </div>
                  </div>
                  <p className="stat-value">{stat.value} <span className="text-sm font-normal text-surface-400">{stat.suffix}</span></p>
                  <p className="stat-label mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Inventory Stats */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="stat-icon bg-surface-100">
                    <Package className="w-5 h-5 text-surface-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900">Ombor holati</h3>
                    <p className="text-sm text-surface-500">Mahsulotlar statistikasi</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {inventory.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-surface-50 rounded-xl">
                    <div className={`w-3 h-3 ${item.dotColor} rounded-full`} />
                    <div>
                      <p className="text-2xl font-bold text-surface-900">{item.value}</p>
                      <p className="text-sm text-surface-500">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-brand-50">
                  <TrendingUp className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">
                    {period === 'today' ? 'Bugungi daromad' : 'Haftalik daromad'}
                  </h3>
                  <p className="text-sm text-surface-500">
                    {period === 'today' ? 'Soatlik dinamika' : 'Sotuv dinamikasi'}
                  </p>
                </div>
              </div>
            </div>
            <div className="h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e4e4e7', 
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.06)'
                      }}
                      labelStyle={{ color: '#18181b', fontWeight: 600 }}
                      formatter={(value: number) => [`${formatNumber(value)} so'm`, 'Sotuv']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#0ea5e9" 
                      strokeWidth={2} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-surface-400">
                  <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                    <TrendingUp className="w-8 h-8 text-surface-300" />
                  </div>
                  <p className="font-medium">Ma'lumot topilmadi</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-accent-50">
                  <Package className="w-5 h-5 text-accent-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">Top mahsulotlar</h3>
                  <p className="text-sm text-surface-500">Eng ko'p sotilgan</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center h-48 text-surface-400">
              <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-surface-300" />
              </div>
              <p className="font-medium">Ma'lumot topilmadi</p>
              <p className="text-sm text-surface-400 mt-1">Sotuvlar boshlanishi kerak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

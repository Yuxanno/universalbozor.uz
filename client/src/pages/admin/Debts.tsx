import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { 
  Plus, AlertTriangle, X, DollarSign, Calendar, User, 
  Clock, CheckCircle2, AlertCircle, Trash2, Wallet, ArrowDownLeft, ArrowUpRight, Phone, UserPlus, Edit
} from 'lucide-react';
import { Debt, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber, formatPhone } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { regions, regionNames } from '../../data/regions';
import { useAuth } from '../../context/AuthContext';

export default function Debts() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { showConfirm, AlertComponent } = useAlert();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({
    total: 0, pending: 0, today: 0, overdue: 0, paid: 0, blacklist: 0, totalAmount: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [debtType, setDebtType] = useState<'receivable' | 'payable'>('receivable');
  const [formData, setFormData] = useState({ 
    customer: '', creditorName: '', amount: '', dueDate: '', description: '', collateral: '' 
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', region: '', district: '' });
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  useEffect(() => {
    fetchDebts();
    fetchCustomers();
    fetchStats();
  }, [debtType]);

  const fetchDebts = async () => {
    try {
      const res = await api.get(`/debts?type=${debtType}`);
      setDebts(res.data);
    } catch (err) { console.error('Error fetching debts:', err); }
    finally { setLoading(false); }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) { console.error('Error fetching customers:', err); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get(`/debts/stats?type=${debtType}`);
      setStats(res.data);
    } catch (err) { console.error('Error fetching stats:', err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        type: debtType,
        customer: debtType === 'receivable' ? formData.customer : undefined,
        creditorName: debtType === 'payable' ? formData.creditorName : undefined,
        amount: Number(formData.amount),
        dueDate: formData.dueDate,
        description: formData.description,
        collateral: formData.collateral
      };
      
      if (editingDebt) {
        await api.put(`/debts/${editingDebt._id}`, data);
      } else {
        await api.post('/debts', data);
      }
      fetchDebts();
      fetchStats();
      closeModal();
    } catch (err) { console.error('Error saving debt:', err); }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    try {
      await api.post(`/debts/${selectedDebt._id}/payment`, {
        amount: Number(paymentAmount),
        method: 'cash'
      });
      fetchDebts();
      fetchStats();
      setShowPaymentModal(false);
      setSelectedDebt(null);
      setPaymentAmount('');
    } catch (err) { console.error('Error making payment:', err); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Qarzni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    try {
      await api.delete(`/debts/${id}`);
      fetchDebts();
      fetchStats();
    } catch (err) { console.error('Error deleting debt:', err); }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDebt(null);
    setFormData({ customer: '', creditorName: '', amount: '', dueDate: '', description: '', collateral: '' });
    setShowNewCustomerForm(false);
    setNewCustomer({ name: '', phone: '', region: '', district: '' });
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setDebtType(debt.type as 'receivable' | 'payable');
    setFormData({
      customer: debt.customer?._id || '',
      creditorName: (debt as any).creditorName || '',
      amount: String(debt.amount),
      dueDate: debt.dueDate.split('T')[0],
      description: debt.description || '',
      collateral: (debt as any).collateral || ''
    });
    setShowModal(true);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    try {
      const data = {
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.region && newCustomer.district ? `${newCustomer.region}, ${newCustomer.district}` : ''
      };
      const res = await api.post('/customers', data);
      await fetchCustomers();
      setFormData({ ...formData, customer: res.data._id });
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', phone: '', region: '', district: '' });
    } catch (err) { console.error('Error creating customer:', err); }
  };

  const filteredDebts = debts.filter(debt => {
    const name = debt.customer?.name || (debt as any).creditorName || '';
    const phone = debt.customer?.phone || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         phone.includes(searchQuery);
    
    let matchesStatus = true;
    if (statusFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 86400000);
      const dueDate = new Date(debt.dueDate);
      matchesStatus = dueDate >= today && dueDate < tomorrow && debt.status !== 'paid';
    } else if (statusFilter !== 'all') {
      matchesStatus = debt.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const statItems = [
    { label: 'Kutilmoqda', value: stats.pending, icon: Clock, color: 'warning', filter: 'pending' },
    { label: "Bugun to'lanadigan", value: stats.today, icon: Calendar, color: 'brand', filter: 'today' },
    { label: "To'langan", value: stats.paid, icon: CheckCircle2, color: 'success', filter: 'paid' },
    { label: "Muddati o'tgan", value: stats.overdue, icon: AlertCircle, color: 'danger', filter: 'overdue' },
    { label: 'Jami qarz', value: `${formatNumber(stats.totalAmount)} so'm`, icon: Wallet, color: 'accent', filter: null },
  ];

  const getDebtorName = (debt: Debt) => {
    if (debt.customer?.name) return debt.customer.name;
    return (debt as any).creditorName || 'Noma\'lum';
  };

  const getDebtorPhone = (debt: Debt) => {
    return debt.customer?.phone || '';
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Qarz daftarcha"
        showSearch
        onSearch={setSearchQuery}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi qarz</span>
          </button>
        }
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto">
        {/* Type Toggle - only for admin */}
        {isAdmin && (
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-surface-100 rounded-xl">
              <button
                onClick={() => { setDebtType('receivable'); setStatusFilter('all'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  debtType === 'receivable' 
                    ? 'bg-white text-success-600 shadow-sm' 
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                Menga qarzdor
              </button>
              <button
                onClick={() => { setDebtType('payable'); setStatusFilter('all'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  debtType === 'payable' 
                    ? 'bg-white text-danger-600 shadow-sm' 
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Men qarzdorman
            </button>
          </div>
        </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.filter && setStatusFilter(stat.filter)}
              className={`stat-card ${stat.filter ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${
                statusFilter === stat.filter ? 'ring-2 ring-brand-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`stat-icon bg-${stat.color}-50`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
              </div>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-label">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Debts List */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="spinner text-brand-600 w-8 h-8 mb-4" />
              <p className="text-surface-500">Yuklanmoqda...</p>
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Qarzlar topilmadi</h3>
              <p className="text-surface-500 text-center max-w-md">
                {searchQuery || statusFilter !== 'all' ? 'Filtr bo\'yicha qarzlar topilmadi' : 'Hozircha qarzlar yo\'q'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <div className="table-header">
                  <div className="grid grid-cols-12 gap-4 px-6 py-4">
                    <span className="table-header-cell col-span-2">
                      {debtType === 'receivable' ? 'Mijoz' : 'Kimga qarzdorman'}
                    </span>
                    <span className="table-header-cell col-span-2">Qarz</span>
                    <span className="table-header-cell col-span-2">Qoldiq</span>
                    <span className="table-header-cell col-span-2">Muddat</span>
                    {debtType === 'receivable' && <span className="table-header-cell col-span-2">Zalog</span>}
                    <span className={`table-header-cell ${debtType === 'receivable' ? 'col-span-1' : 'col-span-2'}`}>Holat</span>
                    <span className="table-header-cell col-span-1 text-center">Amallar</span>
                  </div>
                </div>
                <div className="divide-y divide-surface-100">
                  {filteredDebts.map(debt => (
                    <div key={debt._id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-surface-50 transition-colors">
                      <div className="col-span-2 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          debtType === 'receivable' ? 'bg-success-100' : 'bg-danger-100'
                        }`}>
                          <User className={`w-5 h-5 ${debtType === 'receivable' ? 'text-success-600' : 'text-danger-600'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-surface-900 truncate">{getDebtorName(debt)}</p>
                          {getDebtorPhone(debt) && <p className="text-sm text-surface-500 truncate">{getDebtorPhone(debt)}</p>}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="font-semibold text-surface-900">{formatNumber(debt.amount)}</p>
                        <p className="text-sm text-surface-500">so'm</p>
                      </div>
                      <div className="col-span-2">
                        <p className={`font-semibold ${debtType === 'receivable' ? 'text-success-600' : 'text-danger-600'}`}>
                          {formatNumber(debt.amount - debt.paidAmount)}
                        </p>
                        <p className="text-sm text-surface-500">so'm</p>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 text-surface-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(debt.dueDate).toLocaleDateString('uz-UZ')}
                      </div>
                      {debtType === 'receivable' && (
                        <div className="col-span-2">
                          {(debt as any).collateral ? (
                            <span className="text-sm text-amber-600 font-medium">{(debt as any).collateral}</span>
                          ) : (
                            <span className="text-sm text-surface-400">-</span>
                          )}
                        </div>
                      )}
                      <div className={debtType === 'receivable' ? 'col-span-1' : 'col-span-2'}>
                        <span className={`badge ${
                          debt.status === 'paid' ? 'badge-success' :
                          debt.status === 'overdue' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {debt.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> :
                           debt.status === 'overdue' ? <AlertCircle className="w-3 h-3" /> :
                           <Clock className="w-3 h-3" />}
                          {debt.status === 'paid' ? "To'langan" :
                           debt.status === 'overdue' ? "Muddati o'tgan" : 'Kutilmoqda'}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center gap-2">
                        {debt.status !== 'paid' && (
                          <button 
                            onClick={() => { setSelectedDebt(debt); setShowPaymentModal(true); }} 
                            className="btn-icon-sm hover:bg-success-100 hover:text-success-600"
                            title="To'lov"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(debt)} 
                          className="btn-icon-sm hover:bg-brand-100 hover:text-brand-600"
                          title="Tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(debt._id)} 
                          className="btn-icon-sm hover:bg-danger-100 hover:text-danger-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-surface-100">
                {filteredDebts.map(debt => (
                  <div key={debt._id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        debtType === 'receivable' ? 'bg-success-100' : 'bg-danger-100'
                      }`}>
                        <User className={`w-6 h-6 ${debtType === 'receivable' ? 'text-success-600' : 'text-danger-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-surface-900">{getDebtorName(debt)}</h4>
                            {getDebtorPhone(debt) && <p className="text-sm text-surface-500">{getDebtorPhone(debt)}</p>}
                          </div>
                          <span className={`badge ${
                            debt.status === 'paid' ? 'badge-success' :
                            debt.status === 'overdue' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {debt.status === 'paid' ? "To'langan" :
                             debt.status === 'overdue' ? "O'tgan" : 'Kutilmoqda'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-surface-50 rounded-xl p-3">
                            <p className="text-xs text-surface-500 mb-1">Qarz</p>
                            <p className="font-semibold text-surface-900">{formatNumber(debt.amount)}</p>
                          </div>
                          <div className={`rounded-xl p-3 ${debtType === 'receivable' ? 'bg-success-50' : 'bg-danger-50'}`}>
                            <p className="text-xs text-surface-500 mb-1">Qoldiq</p>
                            <p className={`font-semibold ${debtType === 'receivable' ? 'text-success-600' : 'text-danger-600'}`}>
                              {formatNumber(debt.amount - debt.paidAmount)}
                            </p>
                          </div>
                        </div>
                        {debtType === 'receivable' && (debt as any).collateral && (
                          <div className="bg-amber-50 rounded-xl p-2 mb-3">
                            <p className="text-xs text-amber-600">
                              <span className="font-medium">Zalog:</span> {(debt as any).collateral}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-surface-500">
                            <Calendar className="w-4 h-4" />
                            {new Date(debt.dueDate).toLocaleDateString('uz-UZ')}
                          </div>
                          <div className="flex gap-2">
                            {debt.status !== 'paid' && (
                              <button 
                                onClick={() => { setSelectedDebt(debt); setShowPaymentModal(true); }} 
                                className="btn-icon-sm bg-success-100 text-success-600"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => openEditModal(debt)} 
                              className="btn-icon-sm hover:bg-brand-100 hover:text-brand-600"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(debt._id)} className="btn-icon-sm text-danger-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Debt Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={closeModal} />
          <div className="modal w-full max-w-md p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">{editingDebt ? 'Qarzni tahrirlash' : 'Yangi qarz'}</h3>
              <button onClick={closeModal} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            {/* Debt Type Toggle in Modal - only for admin */}
            {isAdmin && (
              <div className="flex p-1 bg-surface-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setDebtType('receivable')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    debtType === 'receivable' ? 'bg-white text-success-600 shadow-sm' : 'text-surface-500'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Menga qarzdor
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType('payable')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    debtType === 'payable' ? 'bg-white text-danger-600 shadow-sm' : 'text-surface-500'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Men qarzdorman
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {debtType === 'receivable' ? (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Mijoz</label>
                  {showNewCustomerForm ? (
                    <div className="space-y-3 p-3 bg-surface-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-brand-600">Yangi mijoz</span>
                        <button type="button" onClick={() => setShowNewCustomerForm(false)} className="text-surface-400 hover:text-surface-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="Mijoz ismi" 
                        value={newCustomer.name}
                        onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} 
                      />
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                        <input 
                          type="text" 
                          className="input pl-12" 
                          placeholder="+998 (XX) XXX-XX-XX" 
                          value={newCustomer.phone}
                          onChange={e => setNewCustomer({ ...newCustomer, phone: formatPhone(e.target.value) })} 
                        />
                      </div>
                      <select 
                        className="select text-sm" 
                        value={newCustomer.region}
                        onChange={e => setNewCustomer({ ...newCustomer, region: e.target.value, district: '' })}
                      >
                        <option value="">Viloyatni tanlang</option>
                        {regionNames.map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                      {newCustomer.region && (
                        <select 
                          className="select text-sm" 
                          value={newCustomer.district}
                          onChange={e => setNewCustomer({ ...newCustomer, district: e.target.value })}
                        >
                          <option value="">Tumanni tanlang</option>
                          {regions[newCustomer.region]?.map(district => (
                            <option key={district} value={district}>{district}</option>
                          ))}
                        </select>
                      )}
                      <button 
                        type="button" 
                        onClick={handleCreateCustomer}
                        disabled={!newCustomer.name || !newCustomer.phone}
                        className="btn-primary w-full"
                      >
                        <UserPlus className="w-4 h-4" />
                        Mijozni yaratish
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select className="select flex-1" value={formData.customer}
                        onChange={e => setFormData({...formData, customer: e.target.value})} required>
                        <option value="">Tanlang</option>
                        {customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => setShowNewCustomerForm(true)}
                        className="btn-icon bg-brand-100 text-brand-600 hover:bg-brand-200"
                        title="Yangi mijoz qo'shish"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Kimga qarzdorman</label>
                  <input type="text" className="input" placeholder="Ism yoki kompaniya nomi" 
                    value={formData.creditorName}
                    onChange={e => setFormData({...formData, creditorName: e.target.value})} required />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Summa (so'm)</label>
                <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.amount)}
                  onChange={e => setFormData({...formData, amount: parseNumber(e.target.value)})} required />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Muddat</label>
                <input type="date" className="input" value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Izoh (ixtiyoriy)</label>
                <input type="text" className="input" placeholder="Qarz haqida izoh" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              {debtType === 'receivable' && (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Zalog (ixtiyoriy)</label>
                  <input type="text" className="input" placeholder="Zalogga nima qoldirdi" 
                    value={formData.collateral}
                    onChange={e => setFormData({...formData, collateral: e.target.value})} />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowPaymentModal(false)} />
          <div className="modal w-full max-w-md p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">To'lov qilish</h3>
              <button onClick={() => setShowPaymentModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className={`rounded-xl p-4 mb-6 ${debtType === 'receivable' ? 'bg-success-50' : 'bg-danger-50'}`}>
              <p className="text-sm text-surface-600 mb-1">Qoldiq summa</p>
              <p className={`text-2xl font-bold ${debtType === 'receivable' ? 'text-success-600' : 'text-danger-600'}`}>
                {formatNumber(selectedDebt.amount - selectedDebt.paidAmount)} so'm
              </p>
            </div>
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">To'lov summasi</label>
                <input type="text" className="input" placeholder="0" value={formatInputNumber(paymentAmount)}
                  onChange={e => setPaymentAmount(parseNumber(e.target.value))} required />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary flex-1">
                  Bekor qilish
                </button>
                <button type="submit" className="btn-success flex-1">To'lash</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

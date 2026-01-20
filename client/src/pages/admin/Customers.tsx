import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { Plus, Users, X, Phone, Edit, Trash2, MapPin, ChevronDown } from 'lucide-react';
import { Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatPhone, displayPhone } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { regions, regionNames } from '../../data/regions';

export default function Customers() {
  const { showConfirm, AlertComponent } = useAlert();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '', region: '', district: '' });
  const [filterRegion, setFilterRegion] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [showRegionFilter, setShowRegionFilter] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        phone: formData.phone,
        address: formData.region && formData.district ? `${formData.region}, ${formData.district}` : ''
      };
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, data);
      } else {
        await api.post('/customers', data);
      }
      fetchCustomers();
      closeModal();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Mijozni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err) { console.error(err); }
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    // Parse address back to region and district
    const addressParts = (customer.address || '').split(', ');
    setFormData({
      name: customer.name,
      phone: customer.phone,
      region: addressParts[0] || '',
      district: addressParts[1] || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', region: '', district: '' });
  };

  const filteredCustomers = customers.filter(c => {
    // Text search filter
    const matchesSearch = searchQuery.trim() === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    
    // Region filter - exact match
    let matchesRegion = true;
    if (filterRegion) {
      const addressParts = (c.address || '').split(', ');
      const customerRegion = addressParts[0] || '';
      const customerDistrict = addressParts[1] || '';
      
      matchesRegion = customerRegion === filterRegion;
      if (matchesRegion && filterDistrict) {
        matchesRegion = customerDistrict === filterDistrict;
      }
    }
    
    return matchesSearch && matchesRegion;
  });

  const getFilterLabel = () => {
    if (!filterRegion) return 'Barcha hududlar';
    if (!filterDistrict) return filterRegion;
    return `${filterRegion}, ${filterDistrict}`;
  };

  const clearFilter = () => {
    setFilterRegion('');
    setFilterDistrict('');
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header
        title="Mijozlar"
        showSearch
        onSearch={setSearchQuery}
        actions={
          <div className="flex items-center gap-2">
            {/* Region Filter Button */}
            <div className="relative">
              <button 
                onClick={() => setShowRegionFilter(!showRegionFilter)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filterRegion ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline max-w-32 truncate">{getFilterLabel()}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showRegionFilter && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRegionFilter(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-surface-200 z-50 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-surface-700">Hudud bo'yicha filter</span>
                      {filterRegion && (
                        <button onClick={clearFilter} className="text-xs text-brand-600 hover:text-brand-700">
                          Tozalash
                        </button>
                      )}
                    </div>
                    <select 
                      className="select text-sm mb-2" 
                      value={filterRegion}
                      onChange={e => { setFilterRegion(e.target.value); setFilterDistrict(''); }}
                    >
                      <option value="">Barcha viloyatlar</option>
                      {regionNames.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                    {filterRegion && (
                      <select 
                        className="select text-sm" 
                        value={filterDistrict}
                        onChange={e => setFilterDistrict(e.target.value)}
                      >
                        <option value="">Barcha tumanlar</option>
                        {regions[filterRegion]?.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yangi mijoz</span>
            </button>
          </div>
        }
      />

      <div className="p-4 lg:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner text-brand-600 w-8 h-8" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="card flex flex-col items-center py-16">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-surface-400" />
            </div>
            {filterRegion ? (
              <>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">
                  Bu hududda mijozlar yo'q
                </h3>
                <p className="text-surface-500 mb-2 text-center">
                  <span className="font-medium text-brand-600">{filterDistrict ? `${filterRegion}, ${filterDistrict}` : filterRegion}</span> da hech qanday mijoz topilmadi
                </p>
                <button 
                  onClick={clearFilter} 
                  className="btn-primary mt-4"
                >
                  <X className="w-4 h-4" />
                  Filterni tozalash
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-surface-900 mb-2">Mijozlar yo'q</h3>
                <p className="text-surface-500 mb-6">Birinchi mijozni qo'shing</p>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                  Mijoz qo'shish
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <div className="table-header">
                <div className="grid grid-cols-12 gap-4 px-6 py-4">
                  <span className="table-header-cell col-span-2">Ism</span>
                  <span className="table-header-cell col-span-2">Telefon</span>
                  <span className="table-header-cell col-span-3">Manzil</span>
                  <span className="table-header-cell col-span-2">Xaridlar</span>
                  <span className="table-header-cell col-span-2">Qarz</span>
                  <span className="table-header-cell col-span-1 text-center">Amallar</span>
                </div>
              </div>
              <div className="divide-y divide-surface-100">
                {filteredCustomers.map(customer => (
                  <div key={customer._id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-surface-50 transition-colors">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                        <span className="font-semibold text-brand-600">{customer.name.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-surface-900 truncate">{customer.name}</span>
                    </div>
                    <div className="col-span-2 text-surface-600 text-sm">{displayPhone(customer.phone)}</div>
                    <div className="col-span-3 text-surface-500 text-sm truncate">
                      {customer.address || '-'}
                    </div>
                    <div className="col-span-2">
                      <span className="text-brand-600 font-medium">
                        {formatNumber((customer as any).totalPurchases || 0)} so'm
                      </span>
                      <p className="text-xs text-surface-400">{(customer as any).purchaseCount || 0} ta xarid</p>
                    </div>
                    <div className="col-span-2">
                      <span className={customer.debt > 0 ? 'text-danger-600 font-medium' : 'text-success-600'}>
                        {formatNumber(customer.debt)} so'm
                      </span>
                    </div>
                    <div className="col-span-1 flex items-center justify-center gap-2">
                      <button onClick={() => openEditModal(customer)} className="btn-icon-sm hover:bg-brand-100 hover:text-brand-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(customer._id)} className="btn-icon-sm hover:bg-danger-100 hover:text-danger-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-surface-100">
              {filteredCustomers.map(customer => (
                <div key={customer._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="font-semibold text-brand-600 text-lg">{customer.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-surface-900">{customer.name}</h4>
                          <p className="text-sm text-surface-500">{displayPhone(customer.phone)}</p>
                          {customer.address && (
                            <p className="text-xs text-surface-400 mt-1">{customer.address}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditModal(customer)} className="btn-icon-sm">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(customer._id)} className="btn-icon-sm text-danger-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(customer as any).totalPurchases > 0 && (
                          <div className="bg-brand-50 rounded-xl p-2 inline-block">
                            <span className="text-sm font-semibold text-brand-600">
                              Xarid: {formatNumber((customer as any).totalPurchases)} so'm
                            </span>
                          </div>
                        )}
                        {customer.debt > 0 && (
                          <div className="bg-danger-50 rounded-xl p-2 inline-block">
                            <span className="text-sm font-semibold text-danger-600">
                              Qarz: {formatNumber(customer.debt)} so'm
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={closeModal} />
          <div className="modal w-full max-w-md p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">
                {editingCustomer ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
              </h3>
              <button onClick={closeModal} className="btn-icon-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Ism</label>
                <input className="input" placeholder="Mijoz ismi" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input className="input pl-12" placeholder="+998 (XX) XXX-XX-XX" value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Viloyat</label>
                <select 
                  className="select" 
                  value={formData.region}
                  onChange={e => setFormData({ ...formData, region: e.target.value, district: '' })}
                >
                  <option value="">Viloyatni tanlang</option>
                  {regionNames.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              {formData.region && (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Tuman</label>
                  <select 
                    className="select" 
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                  >
                    <option value="">Tumanni tanlang</option>
                    {regions[formData.region]?.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
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
    </div>
  );
}

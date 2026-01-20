import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { Plus, UserPlus, X, Shield, ShoppingCart, Trash2, Phone, Lock, User, Edit } from 'lucide-react';
import { User as UserType } from '../../types';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';
import { formatPhone, getRawPhone, displayPhone } from '../../utils/format';

export default function Helpers() {
  const { showConfirm, AlertComponent } = useAlert();
  const [helpers, setHelpers] = useState<UserType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', role: 'helper' as 'cashier' | 'helper'
  });

  useEffect(() => { fetchHelpers(); }, []);

  const fetchHelpers = async () => {
    try {
      const res = await api.get('/users/helpers');
      setHelpers(res.data);
    } catch (err) { console.error('Error fetching helpers:', err); }
    finally { setLoading(false); }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({...formData, phone: formatted});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        phone: getRawPhone(formData.phone),
        role: formData.role,
        ...(formData.password && { password: formData.password })
      };
      
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, data);
      } else {
        await api.post('/users', { ...data, password: formData.password });
      }
      fetchHelpers();
      closeModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Yordamchini o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    try {
      await api.delete(`/users/${id}`);
      fetchHelpers();
    } catch (err) { console.error('Error deleting helper:', err); }
  };

  const openEditModal = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      phone: displayPhone(user.phone),
      password: '',
      role: user.role as 'cashier' | 'helper'
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', phone: '', password: '', role: 'helper' });
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Yordamchilar"
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi yordamchi</span>
          </button>
        }
      />

      <div className="p-4 lg:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner text-brand-600 w-8 h-8" />
          </div>
        ) : helpers.length === 0 ? (
          <div className="card flex flex-col items-center py-16">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-surface-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Yordamchilar yo'q</h3>
            <p className="text-surface-500 mb-6">Birinchi yordamchini qo'shing</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Yordamchi qo'shish
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {helpers.map(helper => (
              <div key={helper._id} className="card-hover">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {helper.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-surface-900 truncate">{helper.name}</h3>
                    <p className="text-sm text-surface-500 truncate">{displayPhone(helper.phone)}</p>
                  </div>
                  <button onClick={() => openEditModal(helper)} className="btn-icon-sm hover:bg-brand-100 hover:text-brand-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(helper._id)} className="btn-icon-sm hover:bg-danger-100 hover:text-danger-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <span className={`badge ${helper.role === 'cashier' ? 'badge-success' : 'badge-primary'}`}>
                  {helper.role === 'cashier' ? (
                    <><ShoppingCart className="w-3 h-3" /> Kassir</>
                  ) : (
                    <><Shield className="w-3 h-3" /> Yordamchi</>
                  )}
                </span>
              </div>
            ))}
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
                {editingUser ? 'Tahrirlash' : 'Yangi yordamchi'}
              </h3>
              <button onClick={closeModal} className="btn-icon-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Ism</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="text" className="input pl-12" placeholder="Yordamchi ismi" value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Telefon raqam</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="tel" className="input pl-12" placeholder="+998 (XX) XXX-XX-XX" value={formData.phone}
                    onChange={handlePhoneChange} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">
                  {editingUser ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="password" className="input pl-12" placeholder={editingUser ? "O'zgartirmaslik uchun bo'sh qoldiring" : "Parol"} value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})} {...(!editingUser && { required: true, minLength: 6 })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-3 block">Rol</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: 'cashier'})}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.role === 'cashier' 
                        ? 'border-success-500 bg-success-50' 
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <ShoppingCart className={`w-6 h-6 mx-auto mb-2 ${formData.role === 'cashier' ? 'text-success-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Kassir</p>
                    <p className="text-xs text-surface-500">Kassa, qarzlar</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: 'helper'})}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.role === 'helper' 
                        ? 'border-brand-500 bg-brand-50' 
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <Shield className={`w-6 h-6 mx-auto mb-2 ${formData.role === 'helper' ? 'text-brand-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Yordamchi</p>
                    <p className="text-xs text-surface-500">QR skaner</p>
                  </button>
                </div>
              </div>
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

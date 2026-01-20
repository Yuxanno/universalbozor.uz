import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Download, User, Package, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

interface WorkerItem {
  product: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
}

interface WorkerReceipt {
  _id: string;
  items: WorkerItem[];
  total: number;
  status: 'draft' | 'pending' | 'approved' | 'completed';
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface Worker {
  _id: string;
  name: string;
  role: string;
}

export default function StaffReceipts() {
  const { showAlert, AlertComponent } = useAlert();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [receipts, setReceipts] = useState<WorkerReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [localItems, setLocalItems] = useState<{[key: string]: {price: string, quantity: string}}>({});
  const [prevValues, setPrevValues] = useState<{[key: string]: {price: string, quantity: string}}>({});
  const debounceTimers = useRef<{[key: string]: ReturnType<typeof setTimeout>}>({});

  const fetchData = useCallback(async () => {
    try {
      const [workersRes, receiptsRes] = await Promise.all([
        api.get('/users/helpers'),
        api.get('/receipts/staff')
      ]);
      // Фильтруем только helpers и убираем дубликаты
      const helpers = workersRes.data.filter((w: Worker) => w.role === 'helper');
      const uniqueHelpers = helpers.filter((w: Worker, index: number, self: Worker[]) => 
        index === self.findIndex((t) => t._id === w._id)
      );
      setWorkers(uniqueHelpers);
      setReceipts(receiptsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000); // Обновляем каждую секунду
    return () => clearInterval(interval);
  }, [fetchData]);

  const getWorkerReceipts = (workerId: string) => {
    return receipts.filter(r => r.createdBy?._id === workerId && (r.status === 'pending' || r.status === 'draft'));
  };

  const getReadyReceipts = (workerId: string) => {
    return receipts.filter(r => r.createdBy?._id === workerId && r.status === 'approved');
  };

  const handleDeleteItem = async (receiptId: string, itemIndex: number) => {
    try {
      await api.put(`/receipts/${receiptId}/remove-item/${itemIndex}`);
      fetchData();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleUpdateItem = async (receiptId: string, itemIndex: number, field: 'price' | 'quantity', value: number) => {
    const key = `${receiptId}-${itemIndex}-${field}`;
    
    // Clear previous timer
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    
    // Set new timer - send request after 3 seconds of no typing
    debounceTimers.current[key] = setTimeout(async () => {
      try {
        await api.put(`/receipts/${receiptId}/update-item/${itemIndex}`, { [field]: value });
        // После успешной синхронизации очищаем локальные изменения для этого item
        const itemKey = `${receiptId}-${itemIndex}`;
        setLocalItems(prev => {
          const newItems = { ...prev };
          delete newItems[itemKey];
          return newItems;
        });
        fetchData();
      } catch (err) {
        console.error('Error updating item:', err);
      }
    }, 3000);
  };

  const handleLocalChange = (receiptId: string, itemIndex: number, field: 'price' | 'quantity', value: string) => {
    const key = `${receiptId}-${itemIndex}`;
    setLocalItems(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
    
    const numValue = value === '' ? 0 : parseInt(value.replace(/\s/g, ''));
    if (!isNaN(numValue) && value !== '') {
      handleUpdateItem(receiptId, itemIndex, field, numValue);
    }
  };

  const handleFocus = (receiptId: string, itemIndex: number, field: 'price' | 'quantity', currentValue: string) => {
    const key = `${receiptId}-${itemIndex}`;
    setPrevValues(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: currentValue
      }
    }));
  };

  const handleBlur = (receiptId: string, itemIndex: number, field: 'price' | 'quantity', originalValue: number) => {
    const key = `${receiptId}-${itemIndex}`;
    const currentValue = localItems[key]?.[field];
    
    // Если пусто или 0 - восстанавливаем предыдущее значение
    if (currentValue === '' || currentValue === '0') {
      const prevValue = prevValues[key]?.[field] || String(originalValue);
      setLocalItems(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          [field]: prevValue
        }
      }));
    }
  };

  const getLocalValue = (receiptId: string, itemIndex: number, field: 'price' | 'quantity', originalValue: number) => {
    const key = `${receiptId}-${itemIndex}`;
    if (localItems[key] && localItems[key][field] !== undefined) {
      return localItems[key][field];
    }
    return field === 'price' ? formatNumber(originalValue) : String(originalValue);
  };

  const handleLoadToKassa = async (receipt: WorkerReceipt) => {
    try {
      // Save items to localStorage for Kassa to pick up
      const kassaItems = receipt.items.map(item => ({
        _id: item.product,
        name: item.name,
        code: item.code,
        price: item.price,
        cartQuantity: item.quantity,
        quantity: 0
      }));
      localStorage.setItem('kassaItems', JSON.stringify(kassaItems));
      localStorage.setItem('kassaReceiptId', receipt._id);
      
      // Navigate to Cashier page
      navigate('/cashier');
    } catch (err: any) {
      console.error('Error loading to kassa:', err);
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  // Показываем всех рабочих (helpers)
  const displayWorkers = workers;

  return (
    <div className="min-h-screen bg-surface-50">
      {AlertComponent}
      
      {/* Top Bar */}
      <div className="bg-white border-b border-surface-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-surface-900">Xodimlar POS</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-surface-500">
              {workers.length} ta xodim • {receipts.filter(r => r.status === 'pending').length} ta kutilmoqda
            </span>
          </div>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {displayWorkers.map((worker, index) => {
              const pendingReceipts = getWorkerReceipts(worker._id);
              const readyReceipts = getReadyReceipts(worker._id);
              const isReady = readyReceipts.length > 0;
              const hasDraft = pendingReceipts.some(r => r.status === 'draft');
              const hasPending = pendingReceipts.some(r => r.status === 'pending');
              const allItems = [...pendingReceipts, ...readyReceipts].flatMap(r => 
                r.items.map((item, idx) => ({ ...item, receiptId: r._id, status: r.status, itemIndex: idx }))
              );
              
              // Считаем total с учётом локальных изменений
              const total = allItems.reduce((sum, item, i) => {
                const key = `${item.receiptId}-${i}`;
                const localPrice = localItems[key]?.price;
                const localQty = localItems[key]?.quantity;
                const price = localPrice !== undefined ? parseInt(localPrice.replace(/\s/g, '')) || 0 : item.price;
                const qty = localQty !== undefined ? parseInt(localQty) || 0 : item.quantity;
                return sum + price * qty;
              }, 0);

              if (allItems.length === 0 && !isReady) {
                // Показываем пустую карточку
              }

              return (
                <div
                  key={worker._id}
                  className={`rounded-2xl border-2 overflow-hidden transition-all bg-white shadow-sm ${
                    isReady 
                      ? 'border-success-500 shadow-lg shadow-success-500/10' 
                      : hasPending
                        ? 'border-warning-500 shadow-lg shadow-warning-500/10'
                        : 'border-surface-200'
                  }`}
                >
                  {/* Header */}
                  <div className={`px-5 py-4 ${
                    isReady ? 'bg-success-500' : hasPending ? 'bg-warning-500' : 'bg-surface-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isReady ? 'bg-success-400' : hasPending ? 'bg-warning-400' : 'bg-white'
                        }`}>
                          <User className={`w-6 h-6 ${isReady || hasPending ? 'text-white' : 'text-surface-600'}`} />
                        </div>
                        <div>
                          <h3 className={`font-semibold text-lg ${isReady || hasPending ? 'text-white' : 'text-surface-900'}`}>
                            {worker.name || `Xodim ${index + 1}`}
                          </h3>
                          <p className={`text-sm ${isReady || hasPending ? 'text-white/80' : 'text-surface-500'}`}>
                            {isReady ? 'Tayyor' : hasPending ? 'Yuborilgan' : hasDraft ? 'Yig\'moqda...' : worker.role}
                          </p>
                        </div>
                      </div>
                      {isReady && <CheckCircle className="w-7 h-7 text-white" />}
                      {hasDraft && !hasPending && !isReady && (
                        <div className="w-3 h-3 bg-brand-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  </div>

                  {/* Notifications */}
                  {isReady && (
                    <div className="bg-success-50 border-b border-success-200 px-5 py-3">
                      <p className="text-success-700 text-sm font-medium text-center">
                        ✓ Xodim barcha tovarlarni yig'di
                      </p>
                    </div>
                  )}
                  {hasPending && !isReady && (
                    <div className="bg-warning-50 border-b border-warning-200 px-5 py-3">
                      <p className="text-warning-700 text-sm font-medium text-center">
                        ⏳ Tasdiqlash kutilmoqda
                      </p>
                    </div>
                  )}

                  {/* Items list */}
                  <div className="p-4 min-h-[350px] max-h-[400px] overflow-auto">
                    {allItems.length === 0 ? (
                      <div className="text-center py-12 text-surface-400">
                        <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Tovarlar yo'q</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allItems.map((item, i) => (
                          <div 
                            key={`${item.receiptId}-${i}`}
                            className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-surface-900 truncate">{item.name}</p>
                              <p className="text-xs text-surface-500">Kod: {item.code?.length > 10 ? item.code.slice(-6) : item.code}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={getLocalValue(item.receiptId, i, 'price', item.price)}
                                onFocus={() => handleFocus(item.receiptId, i, 'price', getLocalValue(item.receiptId, i, 'price', item.price))}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\s/g, '');
                                  if (val === '' || /^\d+$/.test(val)) {
                                    handleLocalChange(item.receiptId, i, 'price', val);
                                  }
                                }}
                                onBlur={() => handleBlur(item.receiptId, i, 'price', item.price)}
                                className="w-20 h-8 text-right text-sm font-medium border border-surface-200 rounded-lg px-2 focus:outline-none focus:border-brand-500"
                              />
                              <span className="text-surface-400">×</span>
                              <input
                                type="text"
                                value={getLocalValue(item.receiptId, i, 'quantity', item.quantity)}
                                onFocus={() => handleFocus(item.receiptId, i, 'quantity', getLocalValue(item.receiptId, i, 'quantity', item.quantity))}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d+$/.test(val)) {
                                    handleLocalChange(item.receiptId, i, 'quantity', val);
                                  }
                                }}
                                onBlur={() => handleBlur(item.receiptId, i, 'quantity', item.quantity)}
                                className="w-12 h-8 text-center text-sm font-semibold border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                              />
                              <span className="w-20 text-right font-semibold text-surface-900 text-sm">
                                {(() => {
                                  const key = `${item.receiptId}-${i}`;
                                  const localPrice = localItems[key]?.price;
                                  const localQty = localItems[key]?.quantity;
                                  const price = localPrice !== undefined ? parseInt(localPrice.replace(/\s/g, '')) || 0 : item.price;
                                  const qty = localQty !== undefined ? parseInt(localQty) || 0 : item.quantity;
                                  return formatNumber(price * qty);
                                })()}
                              </span>
                              <button
                                onClick={() => handleDeleteItem(item.receiptId, i)}
                                className="p-1.5 text-surface-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className={`px-5 py-4 border-t ${
                    isReady ? 'border-success-200 bg-success-50' : 
                    hasPending ? 'border-warning-200 bg-warning-50' : 
                    'border-surface-200 bg-surface-50'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-surface-500 font-medium">Jami:</span>
                      <span className="text-3xl font-bold text-surface-900">
                        {formatNumber(total)} <span className="text-base font-normal text-surface-500">so'm</span>
                      </span>
                    </div>
                    
                    {(isReady || hasPending) && (
                      <button
                        onClick={() => {
                          const receipt = readyReceipts[0] || pendingReceipts.find(r => r.status === 'pending');
                          if (receipt) handleLoadToKassa(receipt);
                        }}
                        className={`w-full flex items-center justify-center gap-2 py-4 text-white rounded-xl font-semibold text-lg transition-colors ${
                          isReady ? 'bg-success-500 hover:bg-success-600' : 'bg-warning-500 hover:bg-warning-600'
                        }`}
                      >
                        <Download className="w-5 h-5" />
                        Kassaga yuklash
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {workers.length === 0 && !loading && (
              <div className="col-span-full text-center py-20 text-surface-400">
                <User className="w-20 h-20 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2 text-surface-600">Xodimlar yo'q</h3>
                <p>Avval xodimlarni qo'shing</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

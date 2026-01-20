import { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Search, Send, Plus, Package, ShoppingCart, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product, CartItem } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

export default function HelperScanner() {
  const { showAlert, AlertComponent } = useAlert();
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [receiptStatus, setReceiptStatus] = useState<'draft' | 'pending'>('draft');
  const [lastSyncedCart, setLastSyncedCart] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLocalChanges = useRef(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetchProducts();
    loadDraft();
    
    // Периодически проверяем обновления с сервера (только если нет локальных изменений)
    const interval = setInterval(() => {
      if (!hasLocalChanges.current) {
        loadDraft();
      }
    }, 2000);
    
    return () => {
      clearInterval(interval);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Загрузка draft с сервера
  const loadDraft = async () => {
    try {
      const res = await api.get('/receipts/draft');
      if (res.data) {
        setReceiptStatus(res.data.status || 'draft');
        
        if (res.data.items) {
          const serverCartJson = JSON.stringify(res.data.items);
          
          // Обновляем только если данные изменились и нет локальных изменений
          if (serverCartJson !== lastSyncedCart && !hasLocalChanges.current) {
            const cartItems: CartItem[] = res.data.items.map((item: any) => ({
              _id: item.product,
              name: item.name,
              code: item.code,
              price: item.price,
              cartQuantity: item.quantity,
              quantity: 0
            }));
            setCart(cartItems);
            setLastSyncedCart(serverCartJson);
          }
        }
        isFirstLoad.current = false;
      }
    } catch (err) {
      console.error('Error loading draft:', err);
    }
  };

  // Синхронизация корзины на сервер
  const syncToServer = useCallback(async (items: CartItem[]) => {
    if (receiptStatus === 'pending') return;
    
    setSyncing(true);
    try {
      const serverItems = items.map(item => ({
        product: item._id,
        name: item.name,
        code: item.code,
        price: item.price,
        quantity: item.cartQuantity
      }));
      
      await api.put('/receipts/draft', { items: serverItems });
      
      // Сохраняем что синхронизировали
      setLastSyncedCart(JSON.stringify(serverItems));
      hasLocalChanges.current = false;
    } catch (err) {
      console.error('Error syncing draft:', err);
    } finally {
      setSyncing(false);
    }
  }, [receiptStatus]);

  // Отложенная синхронизация при изменении корзины
  useEffect(() => {
    // Пропускаем первую загрузку
    if (isFirstLoad.current) return;
    if (receiptStatus === 'pending') return;
    
    // Отмечаем что есть локальные изменения
    hasLocalChanges.current = true;
    
    // Отменяем предыдущий таймер
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // Синхронизируем через 3 секунды
    syncTimeoutRef.current = setTimeout(() => {
      syncToServer(cart);
    }, 3000);
    
  }, [cart, syncToServer, receiptStatus]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const startScanner = async () => {
    setScannedProduct(null);
    setSearchQuery('');
    setSearchResults([]);
    setScanning(true);

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          (decodedText) => {
            let product = null;

            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.code) {
                product = products.find(p => p.code === parsed.code);
              } else if (parsed._id || parsed.id) {
                product = products.find(p => p._id === (parsed._id || parsed.id));
              }
            } catch {
              product = products.find(p => p.code === decodedText);
            }

            if (product) {
              setScannedProduct(product);
            } else {
              showAlert('Tovar topilmadi: ' + decodedText, 'Xatolik', 'warning');
            }
            stopScanner();
          },
          () => {}
        );
      } catch (err) {
        console.error('Scanner error:', err);
        showAlert('Kamerani ishga tushirishda xatolik', 'Xatolik', 'danger');
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setScannedProduct(null);
    if (query.length > 0) {
      const results = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const addToCart = (product: Product) => {
    // Don't allow adding if receipt is pending
    if (receiptStatus === 'pending') {
      showAlert('Chek yuborilgan, o\'zgartirish mumkin emas', 'Ogohlantirish', 'warning');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p => p._id === product._id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
    setSearchQuery('');
    setSearchResults([]);
    setScannedProduct(null);
  };

  const removeFromCart = (id: string) => {
    // Don't allow removing if receipt is pending
    if (receiptStatus === 'pending') return;
    
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const sendToCashier = async () => {
    if (cart.length === 0) return;
    setSending(true);
    try {
      // Submit the draft (changes status from draft to pending)
      await api.put('/receipts/draft/submit');
      showAlert("Chek kassirga yuborildi!", 'Muvaffaqiyat', 'success');
      setReceiptStatus('pending');
      // Don't clear cart - let it show with pending status
    } catch (err: any) {
      console.error('Error sending receipt:', err);
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setSending(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  return (
    <div className="space-y-4">
      {AlertComponent}
      {/* Search Bar */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Tovar qidirish..."
              className="input pl-12"
            />
          </div>
          <button
            onClick={scanning ? stopScanner : startScanner}
            className={`btn-lg ${scanning ? 'btn-secondary' : 'btn-primary'}`}
          >
            <QrCode className="w-5 h-5" />
            {scanning ? 'Stop' : 'QR'}
          </button>
        </div>
      </div>

      {/* QR Scanner */}
      {scanning && (
        <div className="card">
          <div id="qr-reader" className="w-full rounded-xl overflow-hidden max-w-sm mx-auto" />
          <p className="text-center text-sm text-surface-500 mt-3">QR kodni kameraga ko'rsating</p>
        </div>
      )}

      {/* Scanned Product */}
      {scannedProduct && (
        <div className="card bg-success-50 border-success-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-success-700">Tovar topildi!</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-surface-900 text-lg">{scannedProduct.name}</p>
              <p className="text-sm text-surface-500">Kod: {scannedProduct.code}</p>
              <p className="text-sm text-surface-500">Tan narxi: {formatNumber((scannedProduct as any).costPrice || 0)} so'm</p>
              <p className="text-brand-600 font-bold mt-1">Optom: {formatNumber(scannedProduct.price)} so'm</p>
            </div>
            <button onClick={() => addToCart(scannedProduct)} className="btn-success">
              <Plus className="w-4 h-4" />
              Qo'shish
            </button>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-surface-100 max-h-64 overflow-auto">
            {searchResults.map(product => (
              <button
                key={product._id}
                onClick={() => addToCart(product)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-surface-900">{product.name}</p>
                    <p className="text-sm text-surface-500">Kod: {product.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-surface-400">Tan: {formatNumber((product as any).costPrice || 0)}</p>
                  <p className="font-bold text-brand-600">Optom: {formatNumber(product.price)}</p>
                  <p className="text-xs text-surface-400">{product.quantity} dona</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {searchQuery && searchResults.length === 0 && (
        <div className="card text-center py-8 text-surface-500">
          Tovar topilmadi
        </div>
      )}

      {/* Cart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand-600" />
            <span className="font-semibold text-surface-900">Savat</span>
            {syncing && <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />}
            {hasLocalChanges.current && !syncing && (
              <span className="w-2 h-2 bg-warning-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {receiptStatus === 'pending' && (
              <span className="badge bg-warning-100 text-warning-700 text-xs">Yuborilgan</span>
            )}
            <span className="badge-primary">{cart.length} ta</span>
          </div>
        </div>

        {receiptStatus === 'pending' && (
          <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 mb-4">
            <p className="text-warning-700 text-sm text-center">
              ⏳ Chek kassirga yuborilgan. Kassir narx va miqdorni o'zgartirishi mumkin.
            </p>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-8 h-8 text-surface-300" />
            </div>
            <p className="text-surface-500">Savat bo'sh</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item._id} className="p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors overflow-x-auto">
                <div className="flex items-center gap-3 min-w-max">
                  <div className="min-w-[100px] max-w-[120px]">
                    <p className="font-medium text-surface-900 truncate text-sm">{item.name}</p>
                    <p className="text-xs text-surface-500">Kod: {item.code?.length > 10 ? item.code.slice(-6) : item.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.price === 0 ? '' : formatNumber(item.price)}
                      onFocus={(e) => {
                        // Сохраняем текущее значение при входе
                        e.target.dataset.prevValue = String(item.price);
                      }}
                      onChange={(e) => {
                        if (receiptStatus === 'pending') return;
                        const val = e.target.value.replace(/\s/g, '');
                        if (val === '' || /^\d+$/.test(val)) {
                          const newPrice = val === '' ? 0 : parseInt(val);
                          setCart(prev => prev.map(p => 
                            p._id === item._id ? { ...p, price: newPrice } : p
                          ));
                        }
                      }}
                      onBlur={(e) => {
                        // Если пусто - восстанавливаем предыдущее значение
                        if (item.price === 0) {
                          const prevValue = parseInt(e.target.dataset.prevValue || '0') || 1;
                          setCart(prev => prev.map(p => 
                            p._id === item._id ? { ...p, price: prevValue } : p
                          ));
                        }
                      }}
                      disabled={receiptStatus === 'pending'}
                      className="w-20 h-8 text-right text-sm font-medium border border-surface-200 rounded-lg px-2 focus:outline-none focus:border-brand-500 disabled:opacity-50"
                    />
                    <span className="text-surface-400">×</span>
                    <input
                      type="text"
                      value={item.cartQuantity}
                      onFocus={(e) => {
                        e.target.dataset.prevValue = String(item.cartQuantity);
                      }}
                      onChange={(e) => {
                        if (receiptStatus === 'pending') return;
                        const val = e.target.value;
                        if (val === '' || /^\d+$/.test(val)) {
                          const newQty = val === '' ? 0 : parseInt(val);
                          setCart(prev => prev.map(p => 
                            p._id === item._id ? { ...p, cartQuantity: newQty } : p
                          ));
                        }
                      }}
                      onBlur={(e) => {
                        if (!item.cartQuantity || item.cartQuantity < 1) {
                          const prevValue = parseInt(e.target.dataset.prevValue || '1') || 1;
                          setCart(prev => prev.map(p => 
                            p._id === item._id ? { ...p, cartQuantity: prevValue } : p
                          ));
                        }
                      }}
                      disabled={receiptStatus === 'pending'}
                      className="w-12 h-8 text-center text-sm font-semibold border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 disabled:opacity-50"
                    />
                    <span className="w-20 text-right font-semibold text-surface-900 text-sm whitespace-nowrap">
                      {formatNumber(item.price * item.cartQuantity)}
                    </span>
                    <button 
                      onClick={() => removeFromCart(item._id)} 
                      disabled={receiptStatus === 'pending'}
                      className="p-1.5 text-surface-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-surface-500">Jami:</span>
              <span className="text-2xl font-bold text-surface-900">{formatNumber(total)} so'm</span>
            </div>
            {receiptStatus === 'draft' ? (
              <button onClick={sendToCashier} disabled={sending || syncing} className="btn-primary w-full py-4 text-lg">
                {sending ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Kassaga yuborish
                  </>
                )}
              </button>
            ) : (
              <div className="text-center text-surface-500 py-2">
                <CheckCircle className="w-6 h-6 text-warning-500 mx-auto mb-2" />
                <p>Kassir javobini kutmoqda...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

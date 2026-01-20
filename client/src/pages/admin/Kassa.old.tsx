import { useState, useEffect } from 'react';
import { 
  Search, RotateCcw, Save, CreditCard, Trash2, X, 
  Package, Banknote, Delete, AlertTriangle, User, ChevronDown, Wifi, WifiOff, RefreshCw, Printer
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { useOffline } from '../../hooks/useOffline';
import { cacheProducts, getCachedProducts } from '../../utils/indexedDbService';

interface SavedReceipt {
  id: string;
  items: CartItem[];
  total: number;
  savedAt: string;
}

interface PrintReceipt {
  items: { name: string; code: string; price: number; quantity: number }[];
  total: number;
  paymentMethod: 'cash' | 'card';
  date: string;
  receiptNumber: string;
}

export default function Kassa() {
  const { showAlert, AlertComponent } = useAlert();
  const { isOnline, pendingCount, isSyncing, manualSync } = useOffline();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [showReturnSearch, setShowReturnSearch] = useState(false);
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  const [showSavedReceipts, setShowSavedReceipts] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [workerReceiptId, setWorkerReceiptId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<PrintReceipt | null>(null);
  const [stockErrors, setStockErrors] = useState<{name: string, available: number, requested: number}[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    loadSavedReceipts();
    loadWorkerItems();
  }, []);

  // Load items from worker (StaffReceipts)
  const loadWorkerItems = () => {
    const kassaItems = localStorage.getItem('kassaItems');
    const receiptId = localStorage.getItem('kassaReceiptId');
    
    if (kassaItems) {
      try {
        const items = JSON.parse(kassaItems);
        setCart(items);
        if (receiptId) {
          setWorkerReceiptId(receiptId);
        }
        // Clear localStorage
        localStorage.removeItem('kassaItems');
        localStorage.removeItem('kassaReceiptId');
      } catch (err) {
        console.error('Error loading worker items:', err);
      }
    }
  };

  const fetchProducts = async () => {
    try {
      if (navigator.onLine) {
        // Online: fetch from server and cache
        const res = await api.get('/products?mainOnly=true');
        setProducts(res.data);
        // Cache for offline use
        await cacheProducts(res.data);
      } else {
        // Offline: use cached products
        const cached = await getCachedProducts();
        setProducts(cached as Product[]);
        if (cached.length === 0) {
          showAlert('Offline rejimda keshda tovarlar yo\'q', 'Ogohlantirish', 'warning');
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      // Try cache on error
      const cached = await getCachedProducts();
      if (cached.length > 0) {
        setProducts(cached as Product[]);
        showAlert('Serverga ulanib bo\'lmadi, keshdan yuklandi', 'Ogohlantirish', 'warning');
      }
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const loadSavedReceipts = () => {
    const saved = localStorage.getItem('savedReceipts');
    if (saved) setSavedReceipts(JSON.parse(saved));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  const handleNumpadClick = (value: string) => {
    if (value === 'C') setInputValue('');
    else if (value === '⌫') setInputValue(prev => prev.slice(0, -1));
    else if (value === '+') {
      addProductByCode(inputValue);
    }
    else setInputValue(prev => prev + value);
  };

  const handleCartItemClick = (item: CartItem) => {
    setSelectedCartItemId(item._id);
  };

  const addProductByCode = (code: string) => {
    const product = products.find(p => p.code === code);
    if (product) {
      addToCart(product);
      setInputValue('');
    } else if (code) {
      showAlert('Tovar topilmadi', 'Xatolik', 'warning');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p => p._id === product._id ? {...p, cartQuantity: p.cartQuantity + 1} : p);
      }
      return [...prev, {...product, cartQuantity: 1}];
    });
    setShowSearch(false);
    setSearchQuery('');
  };

  const toggleReturnMode = () => {
    if (!isReturnMode) {
      // Entering return mode - show search modal
      setCart([]);
      setIsReturnMode(true);
      setShowReturnSearch(true);
    } else {
      // Exiting return mode
      setIsReturnMode(false);
      setCart([]);
    }
  };

  const handleReturnSearch = (query: string) => {
    setReturnSearchQuery(query);
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

  const addToReturn = (product: Product) => {
    addToCart(product);
    setShowReturnSearch(false);
    setReturnSearchQuery('');
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      const results = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults(products);
    }
  };

  const handlePayment = async (method: 'cash' | 'card') => {
    if (cart.length === 0) return;
    
    // Сразу закрываем модальное окно чтобы избежать повторных нажатий
    setShowPayment(false);
    setStockErrors([]);
    
    const saleItems = cart.map(item => ({
      product: item._id,
      name: item.name,
      code: item.code,
      price: item.price,
      quantity: item.cartQuantity
    }));
    
    const saleData = {
      items: saleItems,
      total,
      paymentMethod: method,
      isReturn: isReturnMode,
      customer: selectedCustomer?._id
    };

    // Подготавливаем данные чека заранее
    const receiptData: PrintReceipt = {
      items: saleItems,
      total,
      paymentMethod: method,
      date: new Date().toLocaleString('uz-UZ'),
      receiptNumber: Date.now().toString().slice(-8)
    };

    try {
      // If online - send directly to server
      if (navigator.onLine) {
        try {
          await api.post('/receipts', saleData);
          
          // If this was from a worker receipt, mark it as completed
          if (workerReceiptId) {
            try {
              await api.put(`/receipts/${workerReceiptId}/load-to-kassa`);
            } catch (err) {
              console.error('Error completing worker receipt:', err);
            }
            setWorkerReceiptId(null);
          }
          
          // Show receipt modal (пользователь сам нажмёт печать)
          setPrintReceipt(receiptData);
          setShowReceipt(true);
          
        } catch (serverErr: any) {
          // Check if it's a network error or server error
          if (!serverErr.response) {
            // Network error - save offline
            const { saveOfflineSale } = await import('../../utils/indexedDbService');
            await saveOfflineSale(saleData);
            showAlert('Internet yo\'q, chek offline saqlandi', 'Ogohlantirish', 'warning');
            
            // Show receipt even offline
            setPrintReceipt(receiptData);
            setShowReceipt(true);
          } else {
            // Server returned an error (400, 500, etc.) - show the error
            const message = serverErr.response?.data?.message || 'Xatolik yuz berdi';
            showAlert(message, 'Xatolik', 'danger');
            return; // Don't clear cart on error
          }
        }
      } else {
        // Offline - save locally
        const { saveOfflineSale } = await import('../../utils/indexedDbService');
        await saveOfflineSale(saleData);
        
        // Show receipt even offline
        setPrintReceipt(receiptData);
        setShowReceipt(true);
      }

      // Clear cart and reset state
      setCart([]);
      setIsReturnMode(false);
      setSelectedCustomer(null);
      setWorkerReceiptId(null);
      fetchProducts();
      
    } catch (err) {
      console.error('Error creating receipt:', err);
      showAlert('Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const saveReceipt = () => {
    if (cart.length === 0) { showAlert("Chek bo'sh", 'Ogohlantirish', 'warning'); return; }
    const newSaved: SavedReceipt = {
      id: Date.now().toString(),
      items: [...cart],
      total,
      savedAt: new Date().toLocaleString()
    };
    const updated = [...savedReceipts, newSaved];
    setSavedReceipts(updated);
    localStorage.setItem('savedReceipts', JSON.stringify(updated));
    setCart([]);
    showAlert('Chek saqlandi!', 'Muvaffaqiyat', 'success');
  };

  const loadSavedReceipt = (receipt: SavedReceipt) => {
    setCart(receipt.items);
    const updated = savedReceipts.filter(r => r.id !== receipt.id);
    setSavedReceipts(updated);
    localStorage.setItem('savedReceipts', JSON.stringify(updated));
    setShowSavedReceipts(false);
  };

  const deleteSavedReceipt = (id: string) => {
    const updated = savedReceipts.filter(r => r.id !== id);
    setSavedReceipts(updated);
    localStorage.setItem('savedReceipts', JSON.stringify(updated));
  };

  // Печать чека через браузер window.print()
  const printReceiptBrowser = () => {
    if (!printReceipt) return;
    
    // Создаём новое окно для печати
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      showAlert('Popup bloklangan. Ruxsat bering.', 'Xatolik', 'danger');
      return;
    }
    
    // HTML для чека (58мм термопринтер)
    const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chek #${printReceipt.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { 
      size: 58mm auto; 
      margin: 0; 
    }
    @media print {
      body { width: 58mm; }
    }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      width: 58mm; 
      padding: 2mm;
      background: white;
    }
    .header { 
      text-align: center; 
      border-bottom: 1px dashed #000; 
      padding-bottom: 3mm; 
      margin-bottom: 3mm; 
    }
    .shop-name { 
      font-size: 18px; 
      font-weight: bold; 
      letter-spacing: 2px;
    }
    .shop-subtitle { 
      font-size: 10px; 
      margin-top: 1mm;
    }
    .meta { 
      font-size: 10px; 
      margin-bottom: 3mm; 
    }
    .meta div { margin-bottom: 1mm; }
    .line { 
      border-bottom: 1px dashed #000; 
      margin: 2mm 0; 
    }
    .items { margin-bottom: 3mm; }
    .item { margin-bottom: 2mm; }
    .item-name { font-weight: bold; }
    .item-details { 
      display: flex; 
      justify-content: space-between; 
      font-size: 10px;
    }
    .total-section { 
      border-top: 2px solid #000; 
      border-bottom: 2px solid #000; 
      padding: 3mm 0; 
      margin: 3mm 0;
    }
    .total { 
      display: flex; 
      justify-content: space-between; 
      font-size: 16px; 
      font-weight: bold; 
    }
    .payment { 
      text-align: center; 
      font-size: 11px; 
      margin: 3mm 0;
      padding: 2mm;
      background: #f0f0f0;
    }
    .footer { 
      text-align: center; 
      border-top: 1px dashed #000; 
      padding-top: 3mm; 
      margin-top: 3mm;
    }
    .footer-text { font-weight: bold; font-size: 12px; }
    .footer-sub { font-size: 10px; margin-top: 1mm; }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">UNIVERSAL</div>
    <div class="shop-subtitle">Savdo markazi</div>
  </div>
  
  <div class="meta">
    <div>Sana: ${printReceipt.date.split(',')[0]}</div>
    <div>Vaqt: ${printReceipt.date.split(',')[1]?.trim() || ''}</div>
    <div>Chek: #${printReceipt.receiptNumber}</div>
  </div>
  
  <div class="line"></div>
  
  <div class="items">
    ${printReceipt.items.map((item, i) => `
      <div class="item">
        <div class="item-name">${i + 1}. ${item.name}</div>
        <div class="item-details">
          <span>${item.quantity} x ${formatNumber(item.price)}</span>
          <span>${formatNumber(item.price * item.quantity)}</span>
        </div>
      </div>
    `).join('')}
  </div>
  
  <div class="total-section">
    <div class="total">
      <span>JAMI:</span>
      <span>${formatNumber(printReceipt.total)} so'm</span>
    </div>
  </div>
  
  <div class="payment">
    To'lov: ${printReceipt.paymentMethod === 'cash' ? 'Naqd pul' : 'Plastik karta'}
  </div>
  
  <div class="footer">
    <div class="footer-text">Xaridingiz uchun rahmat!</div>
    <div class="footer-sub">Yana kutamiz!</div>
  </div>
  
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() {
        window.close();
      };
    };
  </script>
</body>
</html>`;
    
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    
    // Закрываем модальное окно
    setShowReceipt(false);
    setPrintReceipt(null);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isReturnMode ? 'bg-warning-50' : 'bg-surface-50'}`}>
      {AlertComponent}
      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-4 lg:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-surface-900">Kassa (POS)</h1>
          {/* Offline Status Indicator */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
            isOnline ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          {/* Pending Sales Indicator */}
          {pendingCount > 0 && (
            <button
              onClick={async () => {
                if (isOnline && !isSyncing) {
                  const result = await manualSync();
                  if (result.success) {
                    showAlert(`${result.synced} ta chek sinxronlandi`, 'Muvaffaqiyat', 'success');
                  } else {
                    showAlert(result.error || 'Sinxronlash xatosi', 'Xatolik', 'danger');
                  }
                }
              }}
              disabled={!isOnline || isSyncing}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                isSyncing ? 'bg-brand-100 text-brand-700' : 'bg-warning-100 text-warning-700 hover:bg-warning-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sinxronlanmoqda...' : `${pendingCount} ta kutmoqda`}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSavedReceipts(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 rounded-lg text-sm hover:bg-surface-200 transition-colors"
          >
            <Save className="w-4 h-4 text-surface-500" />
            <span className="text-surface-700">Saqlangan</span>
            {savedReceipts.length > 0 && (
              <span className="px-1.5 py-0.5 bg-danger-500 text-white text-xs rounded-full font-medium">
                {savedReceipts.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left - Cart Table */}
        <div className="flex-1 flex flex-col p-4 lg:p-6">
          {/* Cart Info */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-surface-600">JAMI: {cart.length} ta mahsulot</span>
            
            {/* Customer Select */}
            <div className="relative">
              <button
                onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedCustomer 
                    ? 'bg-brand-100 text-brand-700' 
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="max-w-32 truncate">
                  {selectedCustomer ? selectedCustomer.name : 'Oddiy mijoz'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showCustomerSelect && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCustomerSelect(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-surface-200 z-50 overflow-hidden">
                    <div className="p-3 border-b border-surface-100">
                      <input
                        type="text"
                        placeholder="Mijoz qidirish..."
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <button
                        onClick={() => { setSelectedCustomer(null); setShowCustomerSelect(false); setCustomerSearchQuery(''); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 transition-colors ${
                          !selectedCustomer ? 'bg-brand-50' : ''
                        }`}
                      >
                        <div className="w-8 h-8 bg-surface-200 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-surface-500" />
                        </div>
                        <span className="text-sm font-medium text-surface-700">Oddiy mijoz</span>
                      </button>
                      {customers
                        .filter(c => 
                          customerSearchQuery === '' ||
                          c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          c.phone.includes(customerSearchQuery)
                        )
                        .map(customer => (
                          <button
                            key={customer._id}
                            onClick={() => { setSelectedCustomer(customer); setShowCustomerSelect(false); setCustomerSearchQuery(''); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 transition-colors ${
                              selectedCustomer?._id === customer._id ? 'bg-brand-50' : ''
                            }`}
                          >
                            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-semibold text-brand-600">{customer.name.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-surface-900 truncate">{customer.name}</p>
                              <p className="text-xs text-surface-500">{customer.phone}</p>
                            </div>
                            {customer.debt > 0 && (
                              <span className="text-xs text-danger-600 font-medium">
                                {formatNumber(customer.debt)}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 bg-white rounded-xl border border-surface-200 overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-surface-50 border-b border-surface-200 text-xs font-semibold text-surface-500 uppercase">
              <div className="col-span-1">Kod</div>
              <div className="col-span-3">Mahsulot</div>
              <div className="col-span-2">Ombor</div>
              <div className="col-span-2 text-center">Soni</div>
              <div className="col-span-2 text-right">Narx</div>
              <div className="col-span-1 text-right">Summa</div>
              <div className="col-span-1 text-center">Amallar</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-surface-400 py-20">
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Savat bo'sh</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {cart.map((item) => (
                    <div 
                      key={item._id} 
                      onClick={() => handleCartItemClick(item)}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-colors ${
                        selectedCartItemId === item._id 
                          ? 'bg-brand-50 border-l-4 border-brand-500' 
                          : 'hover:bg-surface-50'
                      }`}
                    >
                      <div className="col-span-1">
                        <span className="text-sm font-mono text-surface-600">{item.code}</span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-sm font-medium text-surface-900">{item.name}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-surface-500">-</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <input
                          type="text"
                          value={item.cartQuantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              setCart(prev => prev.map(p => 
                                p._id === item._id ? { ...p, cartQuantity: val === '' ? 0 : parseInt(val) } : p
                              ));
                            }
                          }}
                          onBlur={() => {
                            if (item.cartQuantity === 0 || !item.cartQuantity) {
                              removeFromCart(item._id);
                            }
                          }}
                          className="w-16 h-9 text-center font-medium border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <input
                          type="text"
                          value={formatNumber(item.price)}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\s/g, '');
                            if (val === '' || /^\d+$/.test(val)) {
                              setCart(prev => prev.map(p => 
                                p._id === item._id ? { ...p, price: val === '' ? 0 : parseInt(val) } : p
                              ));
                            }
                          }}
                          className="w-24 h-9 text-right font-medium border border-surface-200 rounded-xl px-2 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-sm font-semibold text-surface-900">
                          {formatNumber(item.price * item.cartQuantity)}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button 
                          onClick={() => removeFromCart(item._id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-danger-500 hover:bg-danger-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-3 mt-4">
            {!isReturnMode && (
              <button 
                onClick={() => { setShowSearch(true); setSearchResults(products); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 rounded-xl text-surface-700 hover:bg-surface-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                Qidirish
              </button>
            )}
            <button 
              onClick={toggleReturnMode}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors ${
                isReturnMode 
                  ? 'bg-warning-500 text-white' 
                  : 'bg-warning-100 text-warning-700 hover:bg-warning-200'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              {isReturnMode ? 'Qaytarishni bekor qilish' : 'Qaytarish'}
            </button>
            {isReturnMode && (
              <button 
                onClick={() => setShowReturnSearch(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-warning-100 text-warning-700 rounded-xl hover:bg-warning-200 transition-colors"
              >
                <Search className="w-4 h-4" />
                Tovar qo'shish
              </button>
            )}
            <button 
              onClick={saveReceipt}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 rounded-xl text-surface-700 hover:bg-surface-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              Saqlash
            </button>
            <button 
              onClick={async () => {
                // Проверяем наличие товара через API (кроме режима возврата)
                if (!isReturnMode) {
                  try {
                    const res = await api.post('/products/check-stock', {
                      items: cart.map(item => ({
                        productId: item._id,
                        name: item.name,
                        quantity: item.cartQuantity
                      }))
                    });
                    
                    if (res.data.errors && res.data.errors.length > 0) {
                      setStockErrors(res.data.errors);
                    } else {
                      setStockErrors([]);
                    }
                  } catch (err) {
                    console.error('Error checking stock:', err);
                    setStockErrors([]);
                  }
                } else {
                  setStockErrors([]);
                }
                setShowPayment(true);
              }}
              disabled={cart.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-success-500 text-white rounded-xl hover:bg-success-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" />
              To'lov
            </button>
          </div>
        </div>

        {/* Right - Numpad & Total */}
        <div className="w-72 lg:w-80 bg-white border-l border-surface-200 p-4 lg:p-6 flex flex-col">
          {/* Total */}
          <div className="text-right mb-6">
            <p className={`text-3xl lg:text-4xl font-bold ${isReturnMode ? 'text-warning-600' : 'text-surface-900'}`}>
              {formatNumber(total)} so'm
            </p>
          </div>

          {/* Input */}
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addProductByCode(inputValue)}
            placeholder="Kod kiriting..."
            className="w-full px-4 py-3 text-center text-lg font-mono bg-surface-50 border border-surface-200 rounded-xl mb-4 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />

          {/* Numpad */}
          <div className="grid grid-cols-4 gap-1.5">
            {['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '+', '0', '00', '.'].map((key) => (
              <button
                key={key}
                onClick={() => handleNumpadClick(key)}
                className={`
                  flex items-center justify-center rounded-xl text-xl font-semibold transition-all active:scale-95
                  ${key === 'C' ? 'bg-danger-500 text-white hover:bg-danger-600' : ''}
                  ${key === '⌫' ? 'bg-warning-500 text-white hover:bg-warning-600' : ''}
                  ${key === '+' ? 'bg-brand-500 text-white hover:bg-brand-600 row-span-2' : ''}
                  ${!['C', '⌫', '+'].includes(key) ? 'bg-surface-100 text-surface-700 hover:bg-surface-200' : ''}
                  ${key === '+' ? 'h-full' : 'h-16'}
                `}
              >
                {key === '⌫' ? <Delete className="w-6 h-6" /> : key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSearch(false)} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden">
            <div className="p-4 border-b border-surface-100">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Nom yoki kod bo'yicha qidiring..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-80 overflow-auto">
              {searchResults.map(product => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors text-left border-b border-surface-50 last:border-0"
                >
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-surface-900">{product.name}</p>
                    <p className="text-sm text-surface-500">Kod: {product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-400">Tan: {formatNumber((product as any).costPrice || 0)}</p>
                    <p className="font-semibold text-brand-600">Optom: {formatNumber(product.price)}</p>
                  </div>
                </button>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-center text-surface-500 py-8">Tovar topilmadi</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowPayment(false)} />
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative z-10">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-surface-900 mb-2">
                {isReturnMode ? 'Qaytarish tasdiqlash' : "To'lov usuli"}
              </h3>
              {selectedCustomer && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-brand-600">{selectedCustomer.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-surface-600">{selectedCustomer.name}</span>
                </div>
              )}
              <p className={`text-3xl font-bold ${isReturnMode ? 'text-warning-600' : 'text-surface-900'}`}>
                {isReturnMode && '- '}{formatNumber(total)} so'm
              </p>
              {isReturnMode && (
                <p className="text-sm text-warning-600 mt-2">Bu summa mijozga qaytariladi</p>
              )}
            </div>

            {/* Stock Error Warning */}
            {stockErrors.length > 0 && (
              <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-danger-500" />
                  <span className="font-semibold text-danger-700">Yetarli tovar yo'q!</span>
                </div>
                <div className="space-y-1 text-sm">
                  {stockErrors.map((err, i) => (
                    <p key={i} className="text-danger-600">
                      <span className="font-medium">{err.name}</span>: {err.available} ta bor, {err.requested} ta kerak
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={() => handlePayment('cash')} 
                disabled={stockErrors.length > 0}
                className={`w-full flex items-center justify-center gap-2 py-4 ${
                  stockErrors.length > 0 
                    ? 'bg-surface-300 text-surface-500 cursor-not-allowed' 
                    : isReturnMode 
                      ? 'bg-warning-500 hover:bg-warning-600' 
                      : 'bg-success-500 hover:bg-success-600'
                } text-white rounded-xl font-semibold transition-colors`}
              >
                <Banknote className="w-5 h-5" />
                Naqd pul
              </button>
              <button 
                onClick={() => handlePayment('card')} 
                disabled={stockErrors.length > 0}
                className={`w-full flex items-center justify-center gap-2 py-4 ${
                  stockErrors.length > 0 
                    ? 'bg-surface-300 text-surface-500 cursor-not-allowed' 
                    : 'bg-brand-500 hover:bg-brand-600'
                } text-white rounded-xl font-semibold transition-colors`}
              >
                <CreditCard className="w-5 h-5" />
                Plastik karta
              </button>
              <button onClick={() => { setShowPayment(false); setStockErrors([]); }} className="w-full py-3 text-surface-600 hover:text-surface-900 transition-colors">
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Search Modal */}
      {showReturnSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowReturnSearch(false); if (cart.length === 0) setIsReturnMode(false); }} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden">
            <div className="p-4 border-b border-surface-100 bg-warning-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">Qaytarish rejimi</h3>
                  <p className="text-sm text-surface-500">Qaytariladigan tovarni tanlang</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Tovar nomi yoki kodi..."
                  value={returnSearchQuery}
                  onChange={e => handleReturnSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-surface-200 rounded-xl focus:outline-none focus:border-warning-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-80 overflow-auto">
              {searchResults.map(product => (
                <button
                  key={product._id}
                  onClick={() => addToReturn(product)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-warning-50 transition-colors text-left border-b border-surface-50 last:border-0"
                >
                  <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-warning-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-surface-900">{product.name}</p>
                    <p className="text-sm text-surface-500">Kod: {product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-400">Tan: {formatNumber((product as any).costPrice || 0)}</p>
                    <p className="font-semibold text-warning-600">Optom: {formatNumber(product.price)}</p>
                  </div>
                </button>
              ))}
              {returnSearchQuery && searchResults.length === 0 && (
                <p className="text-center text-surface-500 py-8">Tovar topilmadi</p>
              )}
              {!returnSearchQuery && (
                <p className="text-center text-surface-400 py-8">Tovar nomini yoki kodini kiriting</p>
              )}
            </div>
            <div className="p-4 border-t border-surface-100 bg-surface-50">
              <button 
                onClick={() => { setShowReturnSearch(false); if (cart.length === 0) setIsReturnMode(false); }}
                className="w-full py-3 text-surface-600 hover:text-surface-900 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Receipts Modal */}
      {showSavedReceipts && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSavedReceipts(false)} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden">
            <div className="p-4 border-b border-surface-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-surface-900">Saqlangan cheklar</h3>
                <button 
                  onClick={() => setShowSavedReceipts(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-100 transition-colors"
                >
                  <X className="w-5 h-5 text-surface-500" />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-auto">
              {savedReceipts.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-surface-400">
                  <div className="text-center">
                    <Save className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Saqlangan cheklar yo'q</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {savedReceipts.map(receipt => (
                    <div key={receipt.id} className="p-4 hover:bg-surface-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-surface-500">{receipt.savedAt}</span>
                        <span className="font-semibold text-surface-900">{formatNumber(receipt.total)} so'm</span>
                      </div>
                      <p className="text-sm text-surface-600 mb-3">
                        {receipt.items.length} ta mahsulot
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadSavedReceipt(receipt)}
                          className="flex-1 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
                        >
                          Yuklash
                        </button>
                        <button
                          onClick={() => deleteSavedReceipt(receipt.id)}
                          className="px-3 py-2 bg-danger-100 text-danger-600 rounded-lg hover:bg-danger-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && printReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowReceipt(false)} />
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden">
            {/* Receipt Preview */}
            <div className="p-6 bg-white font-mono text-sm">
              {/* Header */}
              <div className="text-center border-b-2 border-surface-900 pb-3 mb-3">
                <h2 className="text-xl font-bold text-surface-900 tracking-widest">UNIVERSAL</h2>
                <p className="text-xs text-surface-500 mt-1">Savdo markazi</p>
              </div>

              {/* Meta */}
              <div className="text-xs text-surface-600 mb-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>Sana: {printReceipt.date.split(',')[0]}</span>
                  <span>Vaqt: {printReceipt.date.split(',')[1]?.trim()}</span>
                </div>
                <p>Chek №{printReceipt.receiptNumber}</p>
              </div>

              <div className="border-b border-dashed border-surface-400 mb-2"></div>

              {/* Items */}
              <div className="space-y-1.5 border-b border-dashed border-surface-400 pb-2 mb-2">
                {printReceipt.items.map((item, i) => (
                  <div key={i}>
                    <div className="font-medium text-surface-900">{i + 1}. {item.name}</div>
                    <div className="flex justify-between text-xs text-surface-500">
                      <span>{item.quantity} x {formatNumber(item.price)}</span>
                      <span className="font-semibold text-surface-700">{formatNumber(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-2 border-y-2 border-surface-900 mb-2">
                <span className="font-bold text-surface-900">JAMI:</span>
                <span className="text-lg font-bold text-surface-900">
                  {formatNumber(printReceipt.total)} so'm
                </span>
              </div>

              {/* Payment Method */}
              <div className="text-center text-xs bg-surface-100 rounded py-1.5 mb-2">
                To'lov: {printReceipt.paymentMethod === 'cash' ? 'Naqd pul' : 'Plastik karta'}
              </div>

              {/* Footer */}
              <div className="text-center border-t border-dashed border-surface-400 pt-2">
                <p className="font-bold text-surface-900 text-xs">Xaridingiz uchun rahmat!</p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-surface-50 border-t border-surface-200 flex gap-3">
              <button
                onClick={printReceiptBrowser}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
              >
                <Printer className="w-5 h-5" />
                Chop etish
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 py-3 bg-surface-200 text-surface-700 rounded-xl font-semibold hover:bg-surface-300 transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

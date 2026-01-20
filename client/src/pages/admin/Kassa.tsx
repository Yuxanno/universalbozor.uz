import { useState, useEffect } from 'react';
import { 
  Search, RotateCcw, Save, CreditCard, Trash2, X, 
  Package, Banknote, Delete, AlertTriangle, Printer
} from 'lucide-react';
import { CartItem, Product } from '../../types';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inputMode, _setInputMode] = useState<'quantity' | 'code'>('code');
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
  const [showReceipt, setShowReceipt] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<PrintReceipt | null>(null);

  useEffect(() => {
    fetchProducts();
    loadSavedReceipts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?warehouse=Asosiy ombor');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
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
      if (inputMode === 'quantity' && selectedCartItemId) {
        const qty = parseInt(inputValue);
        if (qty > 0) {
          setCart(prev => prev.map(p =>
            p._id === selectedCartItemId ? { ...p, cartQuantity: qty } : p
          ));
        }
        setInputValue('');
      } else {
        addProductByCode(inputValue);
      }
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
      setCart([]);
      setIsReturnMode(true);
      openReturnSearch();
    } else {
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
      setSearchResults(products);
    }
  };

  const openReturnSearch = () => {
    setSearchResults(products);
    setShowReturnSearch(true);
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

  const openSearch = () => {
    setSearchResults(products);
    setShowSearch(true);
  };

  const handlePayment = async (method: 'cash' | 'card') => {
    if (cart.length === 0) return;
    
    const saleItems = cart.map(item => ({
      product: item._id,
      name: item.name,
      code: item.code,
      price: item.price,
      quantity: item.cartQuantity
    }));

    const receiptData: PrintReceipt = {
      items: saleItems,
      total,
      paymentMethod: method,
      date: new Date().toLocaleString('uz-UZ'),
      receiptNumber: Date.now().toString().slice(-8)
    };

    try {
      await api.post('/receipts', {
        items: saleItems,
        total,
        paymentMethod: method,
        isReturn: isReturnMode
      });
      
      setCart([]);
      setShowPayment(false);
      setIsReturnMode(false);
      setPrintReceipt(receiptData);
      setShowReceipt(true);
      fetchProducts();
    } catch (err: any) {
      console.error('Error creating receipt:', err);
      const message = err.response?.data?.message || 'Xatolik yuz berdi';
      showAlert(message, 'Xatolik', 'danger');
    }
  };

  const handlePrint = () => {
    if (!printReceipt) return;
    
    const w = window.open('', '_blank');
    if (!w) {
      showAlert('Popup bloklangan', 'Xatolik', 'danger');
      return;
    }
    
    const formatNum = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    // Build items HTML
    let itemsHtml = '';
    printReceipt.items.forEach((item, i) => {
      itemsHtml += `
        <div class="item">
          <div class="item-name">${i + 1}. ${item.name}</div>
          <div class="item-calc">${item.quantity} x ${formatNum(item.price)}<span class="price">${formatNum(item.price * item.quantity)}</span></div>
        </div>
      `;
    });
    
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { 
  size: 2in 4in; 
  margin: 0; 
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: 'Courier New', monospace;
  font-size: 11px;
  width: 2in;
  padding: 3mm;
  text-align: center;
}
.title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
.subtitle { font-size: 9px; margin-bottom: 3mm; }
.line { border-top: 1px dashed #000; margin: 2mm 0; }
.meta { font-size: 10px; text-align: left; margin-bottom: 1mm; }
.items { text-align: left; }
.item { margin-bottom: 2mm; }
.item-name { font-weight: bold; }
.item-calc { display: flex; justify-content: space-between; font-size: 10px; }
.price { font-weight: bold; }
.total-box { border: 1px solid #000; padding: 2mm; margin: 2mm 0; }
.total-label { font-size: 12px; font-weight: bold; }
.total-sum { font-size: 14px; font-weight: bold; }
.payment { font-size: 10px; margin: 2mm 0; }
.footer { font-size: 11px; font-weight: bold; }
.footer-sub { font-size: 9px; }
</style>
</head>
<body>

<div class="title">UNIVERSAL</div>
<div class="subtitle">Savdo markazi</div>

<div class="line"></div>

<div class="meta">Sana: ${printReceipt.date}</div>
<div class="meta">Vaqt: ${new Date().toLocaleTimeString('uz-UZ')}</div>
<div class="meta">Chek: #${printReceipt.receiptNumber}</div>

<div class="line"></div>

<div class="items">
${itemsHtml}
</div>

<div class="line"></div>

<div class="total-box">
  <div class="total-label">JAMI:</div>
  <div class="total-sum">${formatNum(printReceipt.total)} so'm</div>
</div>

<div class="payment">To'lov: ${printReceipt.paymentMethod === 'cash' ? 'Naqd pul' : 'Plastik karta'}</div>

<div class="line"></div>

<div class="footer">Xaridingiz uchun rahmat!</div>
<div class="footer-sub">Yana kutamiz!</div>

<script>window.onload=function(){window.print();}</script>
</body>
</html>`;
    
    w.document.write(html);
    w.document.close();
    setShowReceipt(false);
    setPrintReceipt(null);
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

  return (
    <div className={`min-h-screen flex flex-col ${isReturnMode ? 'bg-warning-50' : 'bg-surface-50'}`}>
      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-4 lg:px-6 h-14 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-surface-900">Kassa (POS)</h1>
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
          <div className="mb-4 text-sm text-surface-600">
            JAMI: {cart.length} ta mahsulot
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
                      <div className="col-span-2 text-right">
                        <span className="text-sm text-surface-900">{item.price.toLocaleString()}</span>
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-sm font-semibold text-surface-900">
                          {(item.price * item.cartQuantity).toLocaleString()}
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
                onClick={openSearch}
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
                onClick={openReturnSearch}
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
              onClick={() => setShowPayment(true)}
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
              {total.toLocaleString()} so'm
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
            {['7', '8', '9', 'C', '4', '5', '6','⌫', '1', '2', '3', '+', '0', '00', '.'].map((key) => (
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
                    <p className="text-xs text-surface-400">Tan: {((product as any).costPrice || 0).toLocaleString()}</p>
                    <p className="font-semibold text-brand-600">Optom: {product.price.toLocaleString()}</p>
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
              <p className={`text-3xl font-bold ${isReturnMode ? 'text-warning-600' : 'text-surface-900'}`}>
                {isReturnMode && '- '}{total.toLocaleString()} so'm
              </p>
              {isReturnMode && (
                <p className="text-sm text-warning-600 mt-2">Bu summa mijozga qaytariladi</p>
              )}
            </div>
            <div className="space-y-3">
              <button onClick={() => handlePayment('cash')} className={`w-full flex items-center justify-center gap-2 py-4 ${isReturnMode ? 'bg-warning-500 hover:bg-warning-600' : 'bg-success-500 hover:bg-success-600'} text-white rounded-xl font-semibold transition-colors`}>
                <Banknote className="w-5 h-5" />
                Naqd pul
              </button>
              <button onClick={() => handlePayment('card')} className="w-full flex items-center justify-center gap-2 py-4 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors">
                <CreditCard className="w-5 h-5" />
                Plastik karta
              </button>
              <button onClick={() => setShowPayment(false)} className="w-full py-3 text-surface-600 hover:text-surface-900 transition-colors">
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
                    <p className="text-xs text-surface-400">Tan: {((product as any).costPrice || 0).toLocaleString()}</p>
                    <p className="font-semibold text-warning-600">Optom: {product.price.toLocaleString()}</p>
                  </div>
                </button>
              ))}
              {returnSearchQuery && searchResults.length === 0 && (
                <p className="text-center text-surface-500 py-8">Tovar topilmadi</p>
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
                        <span className="font-semibold text-surface-900">{receipt.total.toLocaleString()} so'm</span>
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

      {/* Receipt Print Modal */}
      {showReceipt && printReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowReceipt(false)} />
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden">
            <div className="p-6 font-mono text-sm">
              <div className="text-center border-b-2 border-surface-900 pb-3 mb-3">
                <h2 className="text-xl font-bold tracking-widest">UNIVERSAL</h2>
              </div>
              <div className="text-xs text-surface-600 mb-2">
                <p>Sana: {printReceipt.date}</p>
                <p>Chek №{printReceipt.receiptNumber}</p>
              </div>
              <div className="border-b border-dashed border-surface-400 mb-2" />
              <div className="space-y-1.5 mb-2">
                {printReceipt.items.map((item, i) => (
                  <div key={i}>
                    <div className="font-medium">{i + 1}. {item.name}</div>
                    <div className="flex justify-between text-xs text-surface-500">
                      <span>{item.quantity} x {item.price.toLocaleString()}</span>
                      <span className="font-semibold text-surface-700">{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center py-2 border-y-2 border-surface-900 mb-2">
                <span className="font-bold">JAMI:</span>
                <span className="text-lg font-bold">{printReceipt.total.toLocaleString()} so'm</span>
              </div>
              <div className="text-center text-xs bg-surface-100 rounded py-1.5">
                To'lov: {printReceipt.paymentMethod === 'cash' ? 'Naqd pul' : 'Plastik karta'}
              </div>
            </div>
            <div className="p-4 bg-surface-50 border-t border-surface-200 flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600"
              >
                <Printer className="w-5 h-5" />
                Chop etish
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 py-3 bg-surface-200 text-surface-700 rounded-xl font-semibold hover:bg-surface-300"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {AlertComponent}
    </div>
  );
}

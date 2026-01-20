import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { Plus, Warehouse as WarehouseIcon, X, Package, Edit, Trash2, MapPin, Search, QrCode, Download, Printer } from 'lucide-react';
import { Warehouse, Product } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { QRCodeSVG } from 'qrcode.react';

export default function Warehouses() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [warehouseProducts, setWarehouseProducts] = useState<Product[]>([]);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);
  const [printQuantity, setPrintQuantity] = useState('1');
  const [printers, setPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [printing, setPrinting] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [productFormData, setProductFormData] = useState({
    code: '', name: '', costPrice: '', wholesalePrice: '', quantity: ''
  });
  const [packageData, setPackageData] = useState({
    packageCount: '', unitsPerPackage: '', totalCost: ''
  });
  const [codeError, setCodeError] = useState('');

  useEffect(() => { fetchWarehouses(); }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      // Filter out "Asosiy ombor"
      const filtered = res.data.filter((w: Warehouse) => w.name !== 'Asosiy ombor');
      setWarehouses(filtered);
    } catch (err) { console.error('Error fetching warehouses:', err); }
    finally { setLoading(false); }
  };

  const fetchWarehouseProducts = async (warehouseId: string) => {
    setProductsLoading(true);
    try {
      const res = await api.get(`/products?warehouse=${warehouseId}`);
      setWarehouseProducts(res.data);
    } catch (err) { console.error('Error fetching products:', err); }
    finally { setProductsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await api.put(`/warehouses/${editingWarehouse._id}`, formData);
      } else {
        await api.post('/warehouses', formData);
      }
      fetchWarehouses();
      closeModal();
    } catch (err) { console.error('Error saving warehouse:', err); }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return;
    if (codeError) {
      showAlert(codeError, 'Xatolik', 'danger');
      return;
    }
    
    let finalQuantity = 0;
    let finalCostPrice = Number(productFormData.costPrice) || 0;
    
    // Calculate from package data
    if (packageData.packageCount && packageData.unitsPerPackage) {
      const totalUnits = Number(packageData.packageCount) * Number(packageData.unitsPerPackage);
      finalQuantity = editingProduct ? editingProduct.quantity + totalUnits : totalUnits;
    } else if (editingProduct) {
      finalQuantity = editingProduct.quantity;
    }
    
    try {
      const data = {
        code: productFormData.code,
        name: productFormData.name,
        costPrice: finalCostPrice,
        price: Number(productFormData.wholesalePrice),
        quantity: finalQuantity,
        warehouse: selectedWarehouse._id
      };
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, data);
      } else {
        await api.post('/products', data);
      }
      fetchWarehouseProducts(selectedWarehouse._id);
      closeAddProductModal();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const confirmed = await showConfirm("Tovarni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    if (!selectedWarehouse) return;
    try {
      await api.delete(`/products/${id}`);
      fetchWarehouseProducts(selectedWarehouse._id);
    } catch (err) { console.error('Error deleting product:', err); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Omborni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    try {
      await api.delete(`/warehouses/${id}`);
      fetchWarehouses();
    } catch (err) { console.error('Error deleting warehouse:', err); }
  };

  const openWarehouseProducts = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    fetchWarehouseProducts(warehouse._id);
    setShowProductsModal(true);
  };

  const openEditModal = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({ name: warehouse.name, address: warehouse.address || '' });
    setShowModal(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProductFormData({
      code: product.code,
      name: product.name,
      costPrice: String((product as any).costPrice || 0),
      wholesalePrice: String(product.price),
      quantity: String(product.quantity)
    });
    setCodeError('');
    setShowAddProductModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingWarehouse(null);
    setFormData({ name: '', address: '' });
  };

  const closeProductsModal = () => {
    setShowProductsModal(false);
    setSelectedWarehouse(null);
    setWarehouseProducts([]);
    setWarehouseSearchQuery('');
  };

  const closeAddProductModal = () => {
    setShowAddProductModal(false);
    setEditingProduct(null);
    setProductFormData({ code: '', name: '', costPrice: '', wholesalePrice: '', quantity: '' });
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setCodeError('');
  };

  const openAddProductModal = async () => {
    try {
      const res = await api.get('/products/next-code');
      setProductFormData({ ...productFormData, code: res.data.code, name: '', costPrice: '', wholesalePrice: '', quantity: '' });
    } catch (err) {
      console.error('Error getting next code:', err);
    }
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setCodeError('');
    setShowAddProductModal(true);
  };

  const checkCodeExists = async (code: string) => {
    if (!code) return;
    try {
      const excludeId = editingProduct?._id || '';
      const res = await api.get(`/products/check-code/${code}${excludeId ? `?excludeId=${excludeId}` : ''}`);
      if (res.data.exists) {
        setCodeError(`Kod "${code}" allaqachon mavjud`);
      } else {
        setCodeError('');
      }
    } catch (err) {
      console.error('Error checking code:', err);
    }
  };

  const openQRModal = (product: Product) => {
    setQrProduct(product);
    setShowQRModal(true);
  };

  const openPrintModal = async (product: Product) => {
    setPrintProduct(product);
    setPrintQuantity('1');
    setSelectedPrinter('');
    setPrinting(false);
    setShowPrintModal(true);
    
    // Загружаем список принтеров
    try {
      const res = await api.get('/printers');
      setPrinters(res.data || []);
      // Выбираем принтер по умолчанию
      const defaultPrinter = res.data.find((p: any) => p.isDefault);
      if (defaultPrinter) {
        setSelectedPrinter(defaultPrinter.name);
      } else if (res.data.length > 0) {
        setSelectedPrinter(res.data[0].name);
      }
    } catch (err) {
      console.error('Error fetching printers:', err);
      setPrinters([]);
    }
  };

  // Печать ценника через браузер
  const handlePrint = () => {
    if (!printProduct) return;
    
    const qty = Number(printQuantity) || 1;
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      showAlert('Popup bloklangan. Ruxsat bering.', 'Xatolik', 'danger');
      return;
    }
    
    const qrData = JSON.stringify({ id: printProduct._id, code: printProduct.code, name: printProduct.name });
    
    const labelsHtml = Array(qty).fill(`
      <div class="label">
        <div class="info">
          <div class="name">${printProduct.name}</div>
          <div class="code">Kod: ${printProduct.code}</div>
        </div>
        <div class="qr-container">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}" alt="QR" />
        </div>
      </div>
    `).join('');
    
    const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ценник - ${printProduct.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 58mm 40mm; margin: 0; }
    @media print {
      body { width: 58mm; }
      .label { page-break-after: always; }
      .label:last-child { page-break-after: auto; }
    }
    body { font-family: Arial, sans-serif; background: white; }
    .label { 
      width: 58mm; height: 40mm; padding: 2mm;
      display: flex; align-items: center; justify-content: space-between;
    }
    .info { flex: 1; }
    .name { font-size: 14pt; font-weight: bold; margin-bottom: 2mm; line-height: 1.1; }
    .code { font-size: 12pt; color: #333; }
    .qr-container { width: 22mm; height: 22mm; flex-shrink: 0; }
    .qr-container img { width: 100%; height: 100%; }
  </style>
</head>
<body>
  ${labelsHtml}
  <script>
    window.onload = function() {
      var imgs = document.querySelectorAll('img');
      var loaded = 0;
      imgs.forEach(function(img) {
        if (img.complete) {
          loaded++;
          if (loaded === imgs.length) setTimeout(function() { window.print(); }, 100);
        } else {
          img.onload = function() {
            loaded++;
            if (loaded === imgs.length) setTimeout(function() { window.print(); }, 100);
          };
          img.onerror = function() {
            loaded++;
            if (loaded === imgs.length) setTimeout(function() { window.print(); }, 100);
          };
        }
      });
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;
    
    printWindow.document.write(printHtml);
    printWindow.document.close();
    setShowPrintModal(false);
  };

  const downloadQR = () => {
    if (!qrProduct) return;
    const svg = document.getElementById('qr-code-svg-warehouse');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${qrProduct.code}-${qrProduct.name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Omborlar"
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi ombor</span>
          </button>
        }
      />

      <div className="p-4 lg:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner text-brand-600 w-8 h-8" />
          </div>
        ) : warehouses.length === 0 ? (
          <div className="card flex flex-col items-center py-16">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
              <WarehouseIcon className="w-8 h-8 text-surface-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Omborlar yo'q</h3>
            <p className="text-surface-500 mb-6">Birinchi omborni qo'shing</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">Ombor qo'shish</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map(warehouse => (
              <div 
                key={warehouse._id} 
                className="card-hover cursor-pointer"
                onClick={() => openWarehouseProducts(warehouse)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                      <WarehouseIcon className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900">{warehouse.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-surface-500">
                        <MapPin className="w-3 h-3" />
                        <span>{warehouse.address || 'Manzil ko\'rsatilmagan'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditModal(warehouse)} className="btn-icon-sm hover:bg-brand-100 hover:text-brand-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(warehouse._id)} className="btn-icon-sm hover:bg-danger-100 hover:text-danger-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-surface-500 pt-3 border-t border-surface-100">
                  <Package className="w-4 h-4" />
                  <span>{(warehouse as any).productCount || 0} ta tovar</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Warehouse Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={closeModal} />
          <div className="modal w-full max-w-md p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">
                {editingWarehouse ? 'Omborni tahrirlash' : 'Yangi ombor'}
              </h3>
              <button onClick={closeModal} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Ombor nomi</label>
                <input type="text" className="input" placeholder="Ombor nomi" value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Manzil</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="text" className="input pl-12" placeholder="Manzilni kiriting" value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})} />
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

      {/* Warehouse Products Modal */}
      {showProductsModal && selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 lg:p-4">
          <div className="overlay" onClick={closeProductsModal} />
          <div className="modal w-full h-full max-w-[98vw] max-h-[96vh] lg:max-w-[95vw] lg:max-h-[94vh] p-4 lg:p-6 relative z-10 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-surface-900">{selectedWarehouse.name}</h3>
                <p className="text-sm text-surface-500">Ombordagi tovarlar</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Qidirish..."
                    value={warehouseSearchQuery}
                    onChange={(e) => setWarehouseSearchQuery(e.target.value)}
                    className="w-48 lg:w-64 pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <button onClick={openAddProductModal} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Tovar qo'shish
                </button>
                <button onClick={closeProductsModal} className="btn-icon-sm"><X className="w-5 h-5" /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              {productsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="spinner text-brand-600 w-8 h-8" />
                </div>
              ) : warehouseProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-surface-300 mb-4" />
                  <p className="text-surface-500">Bu omborga tovarlar yo'q</p>
                  <button onClick={openAddProductModal} className="btn-primary mt-4">
                    Tovar qo'shish
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {warehouseProducts
                    .filter(p => 
                      warehouseSearchQuery === '' ||
                      p.name.toLowerCase().includes(warehouseSearchQuery.toLowerCase()) ||
                      p.code.toLowerCase().includes(warehouseSearchQuery.toLowerCase())
                    )
                    .map(product => (
                    <div key={product._id} className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                          <Package className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                          <p className="font-medium text-surface-900">{product.name}</p>
                          <p className="text-sm text-surface-500">Kod: {product.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-surface-500">Tan narxi: {formatNumber((product as any).costPrice || 0)} so'm</p>
                          <p className="font-semibold text-surface-900">Optom: {formatNumber(product.price)} so'm</p>
                          <p className={`text-sm ${product.quantity === 0 ? 'text-danger-600' : 'text-surface-500'}`}>
                            {product.quantity} dona
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openQRModal(product)} className="btn-icon-sm hover:bg-surface-200" title="QR kod">
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button onClick={() => openPrintModal(product)} className="btn-icon-sm hover:bg-surface-200" title="Ценник чоп этиш">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditProductModal(product)} className="btn-icon-sm hover:bg-brand-100 hover:text-brand-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteProduct(product._id)} className="btn-icon-sm hover:bg-danger-100 hover:text-danger-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showAddProductModal && selectedWarehouse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="overlay" onClick={closeAddProductModal} />
          <div className="modal w-full max-w-lg p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-surface-900">
                  {editingProduct ? 'Tovarni tahrirlash' : 'Yangi tovar'}
                </h3>
                <p className="text-sm text-surface-500">{selectedWarehouse.name} uchun</p>
              </div>
              <button onClick={closeAddProductModal} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Kod</label>
                <input 
                  type="text" 
                  className={`input ${codeError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}`}
                  placeholder="000001" 
                  value={productFormData.code}
                  onChange={e => setProductFormData({...productFormData, code: e.target.value})}
                  onBlur={e => checkCodeExists(e.target.value)}
                  required 
                />
                {codeError && <p className="text-sm text-danger-600 mt-1">{codeError}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Nomi</label>
                <input type="text" className="input" placeholder="Tovar nomi" value={productFormData.name}
                  onChange={e => setProductFormData({...productFormData, name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Tan narxi (so'm)</label>
                  <input type="text" className="input" placeholder="0" value={formatInputNumber(productFormData.costPrice)}
                    onChange={e => setProductFormData({...productFormData, costPrice: parseNumber(e.target.value)})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Optom narxi (so'm)</label>
                  <input type="text" className="input" placeholder="0" value={formatInputNumber(productFormData.wholesalePrice)}
                    onChange={e => setProductFormData({...productFormData, wholesalePrice: parseNumber(e.target.value)})} required />
                </div>
              </div>
              
              {/* Package Information Section - Always visible */}
              <div className="border-t border-surface-200 pt-4">
                <label className="text-sm font-medium text-surface-700 mb-3 block">Qop ma'lumotlari</label>
                <div className="space-y-3 bg-surface-50 p-4 rounded-xl">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-surface-600 mb-1 block">Qoplar soni</label>
                      <input
                        type="number"
                        className="input text-sm"
                        placeholder="5"
                        value={packageData.packageCount}
                        onChange={e => setPackageData({...packageData, packageCount: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-surface-600 mb-1 block">Har qopda</label>
                      <input
                        type="number"
                        className="input text-sm"
                        placeholder="20"
                        value={packageData.unitsPerPackage}
                        onChange={e => setPackageData({...packageData, unitsPerPackage: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-surface-600 mb-1 block">Jami mahsulot</label>
                      <input
                        type="text"
                        className="input text-sm bg-surface-100"
                        placeholder="0"
                        value={packageData.packageCount && packageData.unitsPerPackage ? formatNumber(Number(packageData.packageCount) * Number(packageData.unitsPerPackage)) : ''}
                        readOnly
                      />
                    </div>
                  </div>
                  

                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeAddProductModal} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1" disabled={!!codeError}>Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQRModal && qrProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowQRModal(false)} />
          <div className="modal w-full max-w-sm p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">QR Kod</h3>
              <button onClick={() => setShowQRModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl border border-surface-200 mb-4">
                <QRCodeSVG
                  id="qr-code-svg-warehouse"
                  value={JSON.stringify({
                    id: qrProduct._id,
                    code: qrProduct.code,
                    name: qrProduct.name,
                    price: qrProduct.price
                  })}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="text-center mb-4">
                <p className="font-semibold text-surface-900">{qrProduct.name}</p>
                <p className="text-sm text-surface-500">Kod: {qrProduct.code}</p>
                <p className="text-sm text-surface-500">Tan narxi: {formatNumber((qrProduct as any).costPrice || 0)} so'm</p>
                <p className="text-sm text-surface-500">Optom: {formatNumber(qrProduct.price)} so'm</p>
              </div>
              <button onClick={downloadQR} className="btn-primary w-full">
                <Download className="w-4 h-4" />
                Yuklab olish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && printProduct && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="overlay" onClick={() => !printing && setShowPrintModal(false)} />
          <div className="modal w-full max-w-md p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">Ценник чоп этиш</h3>
              <button onClick={() => !printing && setShowPrintModal(false)} className="btn-icon-sm" disabled={printing}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Product info with QR code */}
              <div className="bg-surface-50 rounded-xl p-3 flex items-center justify-center gap-6">
                <div>
                  <p className="font-semibold text-surface-900">{printProduct.name}</p>
                  <p className="text-sm text-surface-500">Код: {printProduct.code}</p>
                </div>
                <div className="bg-white p-1 rounded-lg border border-surface-200">
                  <QRCodeSVG
                    value={JSON.stringify({
                      id: printProduct._id,
                      code: printProduct.code,
                      name: printProduct.name,
                      price: printProduct.price
                    })}
                    size={80}
                    level="H"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Сони</label>
                <input 
                  type="number" 
                  className="input text-center" 
                  min="1"
                  max="50"
                  value={printQuantity}
                  onChange={e => setPrintQuantity(e.target.value)}
                  disabled={printing}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Принтер</label>
                <select 
                  className="input"
                  value={selectedPrinter}
                  onChange={e => setSelectedPrinter(e.target.value)}
                  disabled={printing}
                >
                  {printers.length === 0 ? (
                    <option value="">Принтерлар юкланмоқда...</option>
                  ) : (
                    printers.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} {p.isDefault ? '(асосий)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowPrintModal(false)} 
                  className="btn-secondary flex-1"
                  disabled={printing}
                >
                  Бекор қилиш
                </button>
                <button 
                  type="button" 
                  onClick={handlePrint} 
                  className="btn-primary flex-1"
                  disabled={printing || !selectedPrinter}
                >
                  {printing ? (
                    <>
                      <div className="spinner w-4 h-4" />
                      Юборилмоқда...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      Чоп этиш
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

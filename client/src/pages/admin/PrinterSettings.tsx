import { useState, useEffect } from 'react';
import { Save, TestTube, RefreshCw, Settings, FileText, Tag } from 'lucide-react';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';

interface PrinterInfo {
  name: string;
  isDefault: boolean;
  status?: 'ready' | 'offline';
}

interface LabelSettings {
  width: number;
  height: number;
  fontSize: number;
  showPrice: boolean;
  showCode: boolean;
  showQR: boolean;
  qrSize: number;
  padding: number;
}

interface ReceiptSettings {
  width: number;
  charsPerLine: number;
  shopName: string;
  shopSubtitle: string;
  footerText: string;
  showLogo: boolean;
  printMethod: 'text' | 'pdf';
  autoCut: boolean;
  feedLines: number;
}

interface Settings {
  labelPrinter: string;
  receiptPrinter: string;
  label: LabelSettings;
  receipt: ReceiptSettings;
  autoPrint: boolean;
  copies: number;
}

export default function PrinterSettings() {
  const { showAlert, AlertComponent } = useAlert();
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [settings, setSettings] = useState<Settings>({
    labelPrinter: '',
    receiptPrinter: '',
    label: {
      width: 58,
      height: 40,
      fontSize: 11,
      showPrice: true,
      showCode: true,
      showQR: true,
      qrSize: 20,
      padding: 2,
    },
    receipt: {
      width: 58,
      charsPerLine: 32,
      shopName: 'UNIVERSAL',
      shopSubtitle: 'Savdo markazi',
      footerText: 'Rahmat!',
      showLogo: true,
      printMethod: 'text',
      autoCut: true,
      feedLines: 5,
    },
    autoPrint: true,
    copies: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [printersRes, settingsRes, logsRes] = await Promise.all([
        api.get('/printers'),
        api.get('/printers/settings'),
        api.get('/printers/logs'),
      ]);
      setPrinters(printersRes.data);
      if (settingsRes.data) {
        setSettings(prev => ({ ...prev, ...settingsRes.data }));
      }
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/printers/settings', settings);
      showAlert('Sozlamalar saqlandi', 'Muvaffaqiyat', 'success');
    } catch (err) {
      showAlert('Xatolik yuz berdi', 'Xatolik', 'danger');
    }
    setSaving(false);
  };

  const handleTest = async (type: 'label' | 'receipt') => {
    setTesting(type);
    try {
      const printer = type === 'label' ? settings.labelPrinter : settings.receiptPrinter;
      const res = await api.post('/printers/test', { printer, type });
      showAlert(res.data.message, 'Test', 'success');
      // Refresh logs
      const logsRes = await api.get('/printers/logs');
      setLogs(logsRes.data || []);
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Test xatosi', 'Xatolik', 'danger');
    }
    setTesting(null);
  };

  const updateLabel = (key: keyof LabelSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      label: { ...prev.label, [key]: value }
    }));
  };

  const updateReceipt = (key: keyof ReceiptSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      receipt: { ...prev.receipt, [key]: value }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {AlertComponent}
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-surface-900">Printer sozlamalari</h1>
            <p className="text-sm text-surface-500">Ценник ва чек принтерларини созlash</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ценник настройки */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
              <Tag className="w-4 h-4 text-warning-600" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900">Ценник sozlamalari</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Printer</label>
              <select
                value={settings.labelPrinter}
                onChange={e => setSettings(prev => ({ ...prev, labelPrinter: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
              >
                <option value="">Standart printer</option>
                {printers.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} {p.isDefault ? '(default)' : ''} {p.status === 'offline' ? '⚠️ offline' : '✓'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Kenglik (mm)</label>
                <input
                  type="number"
                  value={settings.label.width}
                  onChange={e => updateLabel('width', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Balandlik (mm)</label>
                <input
                  type="number"
                  value={settings.label.height}
                  onChange={e => updateLabel('height', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Shrift o'lchami (pt)</label>
                <input
                  type="number"
                  value={settings.label.fontSize}
                  onChange={e => updateLabel('fontSize', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">QR o'lchami (mm)</label>
                <input
                  type="number"
                  value={settings.label.qrSize}
                  onChange={e => updateLabel('qrSize', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Chetdan (mm)</label>
              <input
                type="number"
                value={settings.label.padding}
                onChange={e => updateLabel('padding', Number(e.target.value))}
                className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.label.showPrice}
                  onChange={e => updateLabel('showPrice', e.target.checked)}
                  className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-surface-700">Narxni ko'rsatish</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.label.showCode}
                  onChange={e => updateLabel('showCode', e.target.checked)}
                  className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-surface-700">Kodni ko'rsatish</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.label.showQR}
                  onChange={e => updateLabel('showQR', e.target.checked)}
                  className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-surface-700">QR kodni ko'rsatish</span>
              </label>
            </div>

            <button
              onClick={() => handleTest('label')}
              disabled={testing === 'label'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-warning-100 text-warning-700 rounded-xl hover:bg-warning-200 disabled:opacity-50"
            >
              <TestTube className="w-4 h-4" />
              {testing === 'label' ? 'Test...' : 'Test ценник'}
            </button>
          </div>
        </div>

        {/* Чек настройки */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-success-600" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900">Chek sozlamalari</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Printer</label>
              <select
                value={settings.receiptPrinter}
                onChange={e => setSettings(prev => ({ ...prev, receiptPrinter: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
              >
                <option value="">Standart printer</option>
                {printers.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name} {p.isDefault ? '(default)' : ''} {p.status === 'offline' ? '⚠️ offline' : '✓'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Kenglik (mm)</label>
                <select
                  value={settings.receipt.width}
                  onChange={e => updateReceipt('width', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
                >
                  <option value={58}>58mm</option>
                  <option value={80}>80mm</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Belgilar soni</label>
                <input
                  type="number"
                  value={settings.receipt.charsPerLine}
                  onChange={e => updateReceipt('charsPerLine', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Do'kon nomi</label>
              <input
                type="text"
                value={settings.receipt.shopName}
                onChange={e => updateReceipt('shopName', e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Qo'shimcha matn</label>
              <input
                type="text"
                value={settings.receipt.shopSubtitle}
                onChange={e => updateReceipt('shopSubtitle', e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Pastki matn</label>
              <input
                type="text"
                value={settings.receipt.footerText}
                onChange={e => updateReceipt('footerText', e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Chop usuli</label>
              <select
                value={settings.receipt.printMethod}
                onChange={e => updateReceipt('printMethod', e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
              >
                <option value="text">Matn (tezroq)</option>
                <option value="pdf">PDF (chiroyliroq)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Qog'oz uzatish (qatorlar)</label>
              <input
                type="number"
                value={settings.receipt.feedLines}
                onChange={e => updateReceipt('feedLines', Number(e.target.value))}
                min={1}
                max={10}
                className="w-full px-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.receipt.autoCut}
                onChange={e => updateReceipt('autoCut', e.target.checked)}
                className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-700">Avtomatik kesish (auto-cut)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoPrint}
                onChange={e => setSettings(prev => ({ ...prev, autoPrint: e.target.checked }))}
                className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-700">Sotuvdan keyin avtomatik chop etish</span>
            </label>

            <button
              onClick={() => handleTest('receipt')}
              disabled={testing === 'receipt'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-success-100 text-success-700 rounded-xl hover:bg-success-200 disabled:opacity-50"
            >
              <TestTube className="w-4 h-4" />
              {testing === 'receipt' ? 'Test...' : 'Test chek'}
            </button>
          </div>
        </div>
      </div>

      {/* Логи печати */}
      <div className="mt-6 bg-white rounded-2xl border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">Chop tarixi</h2>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Yangilash
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-2 px-3 font-medium text-surface-600">Vaqt</th>
                <th className="text-left py-2 px-3 font-medium text-surface-600">Turi</th>
                <th className="text-left py-2 px-3 font-medium text-surface-600">Printer</th>
                <th className="text-left py-2 px-3 font-medium text-surface-600">Status</th>
                <th className="text-left py-2 px-3 font-medium text-surface-600">Vaqt (ms)</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 20).map((log, i) => (
                <tr key={i} className="border-b border-surface-100">
                  <td className="py-2 px-3 text-surface-600">
                    {new Date(log.timestamp).toLocaleTimeString('uz-UZ')}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      log.type === 'label' ? 'bg-warning-100 text-warning-700' : 'bg-success-100 text-success-700'
                    }`}>
                      {log.type === 'label' ? 'Ценник' : 'Чек'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-surface-700">{log.printer || 'default'}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      log.status === 'success' ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                    }`}>
                      {log.status === 'success' ? '✓' : '✗'} {log.error || ''}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-surface-600">{log.duration}ms</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-surface-400">
                    Hali chop tarixi yo'q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

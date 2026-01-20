import { useState, useMemo } from 'react';
import { Search, X, Package } from 'lucide-react';
import { Product } from '../../types';
import { formatNumber } from '../../utils/format';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  products: Product[];
  title?: string;
  isReturnMode?: boolean;
}

export default function ProductSearchModal({
  isOpen,
  onClose,
  onSelect,
  products,
  title = "Tovar qidirish",
  isReturnMode
}: ProductSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 50);
    
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.code.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [products, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 px-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden animate-scale-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-surface-100 flex items-center justify-between flex-shrink-0">
          <h3 className={`font-semibold ${isReturnMode ? 'text-warning-600' : 'text-surface-900'}`}>
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-surface-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom yoki kod bo'yicha qidirish..."
              className="w-full h-12 pl-10 pr-4 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
              autoFocus
            />
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-auto">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-surface-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tovar topilmadi</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {filteredProducts.map(product => (
                <button
                  key={product._id}
                  onClick={() => {
                    onSelect(product);
                    setSearchQuery('');
                  }}
                  className="w-full p-4 text-left hover:bg-surface-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 truncate">{product.name}</p>
                      <p className="text-sm text-surface-500">{product.code}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-brand-600">{formatNumber(product.price)} so'm</p>
                      <p className={`text-xs ${product.quantity > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {product.quantity > 0 ? `${product.quantity} ta` : 'Tugagan'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

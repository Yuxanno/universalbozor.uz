import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '../../types';
import { formatNumber } from '../../utils/format';

interface CartItemCardProps {
  item: CartItemType;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  isReturnMode?: boolean;
}

export default function CartItemCard({ item, onQuantityChange, onRemove, isReturnMode }: CartItemCardProps) {
  return (
    <div className={`p-4 bg-white ${isReturnMode ? 'border-l-4 border-warning-500' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-surface-900 truncate">{item.name}</p>
          <p className="text-sm text-surface-500">{item.code}</p>
          <p className="text-sm font-semibold text-brand-600 mt-1">
            {formatNumber(item.price)} so'm
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-100 rounded-xl">
            <button
              onClick={() => onQuantityChange(item._id, item.cartQuantity - 1)}
              className="w-9 h-9 flex items-center justify-center text-surface-600 hover:bg-surface-200 rounded-l-xl transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center font-semibold text-surface-900">
              {item.cartQuantity}
            </span>
            <button
              onClick={() => onQuantityChange(item._id, item.cartQuantity + 1)}
              className="w-9 h-9 flex items-center justify-center text-surface-600 hover:bg-surface-200 rounded-r-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => onRemove(item._id)}
            className="w-9 h-9 flex items-center justify-center text-danger-500 hover:bg-danger-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-surface-100">
        <span className="text-sm text-surface-500">Jami:</span>
        <span className={`font-semibold ${isReturnMode ? 'text-warning-600' : 'text-surface-900'}`}>
          {isReturnMode && '- '}{formatNumber(item.price * item.cartQuantity)} so'm
        </span>
      </div>
    </div>
  );
}

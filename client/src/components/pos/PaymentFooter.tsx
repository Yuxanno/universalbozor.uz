import { Banknote, CreditCard, Loader2 } from 'lucide-react';
import { formatNumber } from '../../utils/format';

interface PaymentFooterProps {
  total: number;
  itemCount: number;
  onPayCash: () => void;
  onPayCard: () => void;
  disabled?: boolean;
  loading?: boolean;
  isReturnMode?: boolean;
}

export default function PaymentFooter({
  total,
  itemCount,
  onPayCash,
  onPayCard,
  disabled,
  loading,
  isReturnMode
}: PaymentFooterProps) {
  const isDisabled = disabled || loading || itemCount === 0;

  return (
    <div className="bg-white border-t border-surface-200 p-4 safe-area-bottom">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-surface-500">{itemCount} ta mahsulot</p>
          <p className={`text-2xl font-bold ${isReturnMode ? 'text-warning-600' : 'text-surface-900'}`}>
            {isReturnMode && '- '}{formatNumber(total)} so'm
          </p>
        </div>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onPayCash}
          disabled={isDisabled}
          className={`flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all disabled:opacity-50 ${
            isReturnMode
              ? 'bg-warning-500 hover:bg-warning-600 text-white'
              : 'bg-success-500 hover:bg-success-600 text-white'
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Banknote className="w-5 h-5" />
              Naqd
            </>
          )}
        </button>
        
        <button
          onClick={onPayCard}
          disabled={isDisabled}
          className="flex-1 h-14 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-semibold transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Karta
            </>
          )}
        </button>
      </div>
    </div>
  );
}

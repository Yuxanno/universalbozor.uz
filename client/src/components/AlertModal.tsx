import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export default function AlertModal({
  isOpen, onClose, onConfirm, title, message,
  type = 'info', confirmText = 'OK', cancelText = 'Bekor qilish', showCancel = false
}: AlertModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); onConfirm ? onConfirm() : onClose(); }
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onConfirm, onClose]);

  if (!isOpen) return null;

  const icons = {
    info: <Info className="w-6 h-6 text-brand-600" />,
    success: <CheckCircle className="w-6 h-6 text-success-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-warning-600" />,
    danger: <AlertTriangle className="w-6 h-6 text-danger-600" />
  };

  const colors = {
    info: 'bg-brand-50', success: 'bg-success-50',
    warning: 'bg-warning-50', danger: 'bg-danger-50'
  };

  const btnColors = {
    info: 'btn-primary', success: 'btn-success',
    warning: 'btn-warning', danger: 'btn-danger'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative z-10">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 ${colors[type]} rounded-xl flex items-center justify-center flex-shrink-0`}>
            {icons[type]}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-surface-900 mb-1">{title}</h3>
            <p className="text-surface-600">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {showCancel && (
            <button onClick={onClose} className="btn-secondary flex-1">{cancelText}</button>
          )}
          <button ref={confirmRef} onClick={onConfirm || onClose} className={`${btnColors[type]} flex-1`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

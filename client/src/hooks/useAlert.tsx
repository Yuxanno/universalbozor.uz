import { useState, useCallback } from 'react';
import AlertModal from '../components/AlertModal';

type AlertType = 'info' | 'success' | 'warning' | 'danger';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  showCancel: boolean;
  confirmText: string;
  onConfirm?: () => void;
}

export function useAlert() {
  const [state, setState] = useState<AlertState>({
    isOpen: false, title: '', message: '', type: 'info',
    showCancel: false, confirmText: 'OK'
  });

  const showAlert = useCallback((
    message: string,
    title = 'Xabar',
    type: AlertType = 'info'
  ) => {
    return new Promise<void>((resolve) => {
      setState({
        isOpen: true, title, message, type,
        showCancel: false, confirmText: 'OK',
        onConfirm: () => { setState(s => ({ ...s, isOpen: false })); resolve(); }
      });
    });
  }, []);

  const showConfirm = useCallback((
    message: string,
    title = 'Tasdiqlash',
    type: AlertType = 'warning'
  ) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true, title, message, type,
        showCancel: true, confirmText: 'Ha',
        onConfirm: () => { setState(s => ({ ...s, isOpen: false })); resolve(true); }
      });
      const originalOnClose = () => { setState(s => ({ ...s, isOpen: false })); resolve(false); };
      setState(s => ({ ...s, onClose: originalOnClose }));
    });
  }, []);

  const closeAlert = useCallback(() => {
    setState(s => ({ ...s, isOpen: false }));
  }, []);

  const AlertComponent = (
    <AlertModal
      isOpen={state.isOpen}
      onClose={closeAlert}
      onConfirm={state.onConfirm}
      title={state.title}
      message={state.message}
      type={state.type}
      showCancel={state.showCancel}
      confirmText={state.confirmText}
    />
  );

  return { showAlert, showConfirm, AlertComponent };
}

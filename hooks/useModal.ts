import { useState, useCallback } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  type?: 'warning' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export interface AlertOptions {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export const useModal = () => {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    options: AlertOptions | null;
  }>({
    isOpen: false,
    options: null
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        options: {
          title: options.title || 'تأكيد',
          message: options.message,
          type: options.type || 'warning',
          confirmText: options.confirmText || 'تأكيد',
          cancelText: options.cancelText || 'إلغاء'
        },
        resolve
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    setAlertModal({
      isOpen: true,
      options: {
        message: options.message,
        type: options.type || 'info',
        duration: options.duration || 3000
      }
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmModal.resolve) {
      confirmModal.resolve(true);
    }
    setConfirmModal({ isOpen: false, options: null, resolve: null });
  }, [confirmModal.resolve]);

  const handleCancel = useCallback(() => {
    if (confirmModal.resolve) {
      confirmModal.resolve(false);
    }
    setConfirmModal({ isOpen: false, options: null, resolve: null });
  }, [confirmModal.resolve]);

  const closeAlert = useCallback(() => {
    setAlertModal({ isOpen: false, options: null });
  }, []);

  return {
    confirm,
    alert,
    confirmModal: {
      ...confirmModal,
      onConfirm: handleConfirm,
      onCancel: handleCancel
    },
    alertModal: {
      ...alertModal,
      onClose: closeAlert
    }
  };
};


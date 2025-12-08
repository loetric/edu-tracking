import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  message,
  type = 'info',
  onClose,
  duration = 3000
}) => {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const typeStyles = {
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      border: 'border-green-200'
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      border: 'border-red-200'
    },
    warning: {
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-50',
      border: 'border-yellow-200'
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      border: 'border-blue-200'
    }
  };

  const styles = typeStyles[type];
  const Icon = styles.icon;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-center" dir="rtl">
      <div className={`bg-white rounded-lg shadow-2xl border-2 ${styles.border} max-w-md w-full transform transition-all animate-in slide-in-from-top-5`}>
        <div className="p-4 flex items-start gap-3">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <Icon size={20} className={styles.iconColor} />
          </div>
          <div className="flex-1">
            <div className="text-gray-800 whitespace-pre-line text-sm leading-relaxed">
              {message}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};


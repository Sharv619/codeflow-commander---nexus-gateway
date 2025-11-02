import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast = ({ message, type, onClose, duration = 5000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-green-600';
      case 'error':
        return 'bg-red-500 border-red-600';
      case 'info':
      default:
        return 'bg-blue-500 border-blue-600';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${getToastStyles()} border-l-4 p-4 rounded shadow-lg`}>
      <div className="flex items-center">
        <span className="text-xl mr-3">{getIcon()}</span>
        <p className="text-white flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 ml-4 text-xl font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;

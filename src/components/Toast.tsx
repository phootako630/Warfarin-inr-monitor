import { useEffect } from 'react';
import type { ToastMessage } from '../types';

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(message.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [message.id, onClose]);

  const bgColor = {
    success: 'bg-success-500',
    error: 'bg-danger-500',
    info: 'bg-primary-500',
  }[message.type];

  return (
    <div
      className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg mb-2 animate-slide-up`}
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-base font-medium">{message.message}</p>
        <button
          onClick={() => onClose(message.id)}
          className="ml-4 text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ messages, onClose }: ToastContainerProps) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      {messages.map((message) => (
        <Toast key={message.id} message={message} onClose={onClose} />
      ))}
    </div>
  );
}

import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeStyles = {
    success: 'bg-navy text-white border-l-4 border-success shadow-xl',
    info: 'bg-navy text-white border-l-4 border-rzp-blue shadow-xl',
    warning: 'bg-navy text-white border-l-4 border-warning shadow-xl',
  };

  const icons = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${typeStyles[type] || typeStyles.success} shadow-2xl`}>
        <span className="text-base">{icons[type] || '✅'}</span>
        <span className="flex-1 text-xs md:text-sm">{message}</span>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

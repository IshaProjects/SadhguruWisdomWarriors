import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Fullscreen overlay that renders children at full viewport size.
 * Close with the × button or pressing Escape.
 */
export default function ChartModal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-dark-900/95 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 shrink-0">
        <h2 className="text-base font-semibold text-dark-100">{title}</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-100 transition-colors"
          aria-label="Close expanded view"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* content – fills remaining height */}
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
    </div>
  );
}

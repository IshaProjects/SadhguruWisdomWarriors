import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import clsx from 'clsx';

/**
 * A small ⓘ icon that shows a styled tooltip on hover.
 * Props:
 *   text  – tooltip content (string or JSX)
 *   side  – 'top' | 'bottom' | 'left' | 'right'  (default 'top')
 *   size  – icon size class (default 'w-3.5 h-3.5')
 */
export default function InfoTooltip({ text, side = 'top', size = 'w-3.5 h-3.5' }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Hide if user clicks elsewhere
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setVisible(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible]);

  const positionCls = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full  left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2  mr-2',
    right:  'left-full  top-1/2 -translate-y-1/2  ml-2',
  }[side] ?? 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  const arrowCls = {
    top:    'top-full  left-1/2 -translate-x-1/2 border-t-dark-600 border-x-transparent border-b-transparent border-4',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-dark-600 border-x-transparent border-t-transparent border-4',
    left:   'left-full  top-1/2 -translate-y-1/2  border-l-dark-600 border-y-transparent border-r-transparent border-4',
    right:  'right-full top-1/2 -translate-y-1/2  border-r-dark-600 border-y-transparent border-l-transparent border-4',
  }[side] ?? 'top-full left-1/2 -translate-x-1/2 border-t-dark-600 border-x-transparent border-b-transparent border-4';

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible((v) => !v)}
    >
      <Info className={clsx(size, 'text-dark-500 hover:text-dark-300 cursor-help transition-colors shrink-0')} />

      {visible && (
        <span
          className={clsx(
            'absolute z-50 w-56 text-xs text-dark-200 bg-dark-800 border border-dark-600',
            'rounded-lg px-3 py-2 shadow-xl pointer-events-none leading-relaxed',
            positionCls
          )}
        >
          {text}
          <span className={clsx('absolute w-0 h-0', arrowCls)} />
        </span>
      )}
    </span>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import clsx from 'clsx';

/**
 * A small ⓘ icon that shows a styled tooltip on hover / click.
 * The tooltip is rendered via a React portal so it always sits above
 * every ancestor element regardless of overflow, z-index, or stacking context.
 *
 * Props:
 *   text  – tooltip content (string or JSX)
 *   side  – preferred side: 'top' | 'bottom' | 'left' | 'right'  (default 'top')
 *   size  – Tailwind icon size class (default 'w-3.5 h-3.5')
 */
export default function InfoTooltip({ text, side = 'top', size = 'w-3.5 h-3.5' }) {
  const [visible, setVisible]   = useState(false);
  const [coords, setCoords]     = useState({ top: 0, left: 0 });
  const [resolvedSide, setResolvedSide] = useState(side);
  const iconRef = useRef(null);

  const TOOLTIP_W  = 224; // w-56 = 14rem = 224px
  const TOOLTIP_H  = 120; // rough estimate; enough for viewport-edge detection
  const GAP        = 8;   // gap between icon and tooltip box

  /** Compute fixed pixel position based on the icon's bounding rect */
  const recompute = useCallback(() => {
    if (!iconRef.current) return;
    const r   = iconRef.current.getBoundingClientRect();
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;

    // Determine best side (auto-flip if not enough space)
    let s = side;
    if (s === 'top'    && r.top    < TOOLTIP_H + GAP) s = 'bottom';
    if (s === 'bottom' && r.bottom > vh - TOOLTIP_H - GAP) s = 'top';
    if (s === 'left'   && r.left   < TOOLTIP_W + GAP) s = 'right';
    if (s === 'right'  && r.right  > vw - TOOLTIP_W - GAP) s = 'left';
    setResolvedSide(s);

    // Centre of the icon
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;

    let top, left;
    switch (s) {
      case 'bottom':
        top  = r.bottom + GAP;
        left = cx - TOOLTIP_W / 2;
        break;
      case 'left':
        top  = cy - 40;           // rough vertical centre of tooltip
        left = r.left - TOOLTIP_W - GAP;
        break;
      case 'right':
        top  = cy - 40;
        left = r.right + GAP;
        break;
      default: // 'top'
        top  = r.top - GAP;       // we'll translate up with CSS
        left = cx - TOOLTIP_W / 2;
    }

    // Clamp horizontally so it never goes off-screen
    left = Math.max(8, Math.min(left, vw - TOOLTIP_W - 8));

    setCoords({ top, left });
  }, [side]);

  const show = useCallback(() => {
    recompute();
    setVisible(true);
  }, [recompute]);

  const hide = useCallback(() => setVisible(false), []);

  // Hide on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (iconRef.current && !iconRef.current.contains(e.target)) setVisible(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible]);

  // Recompute on scroll / resize so it tracks correctly when shown
  useEffect(() => {
    if (!visible) return;
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [visible, recompute]);

  /* ── arrow pointing back toward the icon ── */
  const arrowStyle = {
    top:    { top: '100%', left: '50%', transform: 'translateX(-50%)',  borderTop: '5px solid #475569',    borderLeft: '5px solid transparent', borderRight: '5px solid transparent' },
    bottom: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderBottom: '5px solid #475569', borderLeft: '5px solid transparent', borderRight: '5px solid transparent' },
    left:   { top: '1rem', left: '100%', borderLeft: '5px solid #475569',   borderTop: '5px solid transparent', borderBottom: '5px solid transparent' },
    right:  { top: '1rem', right: '100%', borderRight: '5px solid #475569', borderTop: '5px solid transparent', borderBottom: '5px solid transparent' },
  }[resolvedSide];

  /* vertical translation for 'top' so box sits above, not below, the coord */
  const translateY = resolvedSide === 'top' ? '-100%' : '0';

  return (
    <>
      <span
        ref={iconRef}
        className="relative inline-flex items-center"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={() => (visible ? hide() : show())}
      >
        <Info className={clsx(size, 'text-dark-500 hover:text-dark-300 cursor-help transition-colors shrink-0')} />
      </span>

      {visible && createPortal(
        <div
          className="pointer-events-none"
          style={{
            position:  'fixed',
            top:       coords.top,
            left:      coords.left,
            width:     TOOLTIP_W,
            zIndex:    99999,
            transform: `translateY(${translateY})`,
          }}
        >
          <div className="relative text-xs text-dark-200 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2.5 shadow-2xl leading-relaxed">
            {text}
            {/* Arrow */}
            <span className="absolute w-0 h-0" style={arrowStyle} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

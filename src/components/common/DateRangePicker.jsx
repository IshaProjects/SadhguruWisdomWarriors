import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Calendar, X } from 'lucide-react';
import { subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getUtcCurrentMonthRange, formatDateUtc } from '../../utils/dateUtc.js';

// react-day-picker emits local-midnight Date objects for selected days, and
// presets below use date-fns helpers which also work in local time. We must
// serialize using LOCAL Y/M/D so the calendar date the user clicked is what
// the server receives — converting via toISOString() would roll back the date
// for any user in a positive UTC offset (e.g. IST).
const toYmd = (d) => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Parse "YYYY-MM-DD" into a local-midnight Date, matching what DayPicker uses.
const fromYmd = (str) => {
  if (!str) return undefined;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const presets = [
  { label: 'Today',        range: () => { const t = new Date(); return { from: t, to: t }; } },
  { label: 'Yesterday',    range: () => { const y = subDays(new Date(), 1); return { from: y, to: y }; } },
  { label: 'Last 7 days',  range: () => ({ from: subDays(new Date(), 6),  to: new Date() }) },
  { label: 'Last 30 days', range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: 'This month',   range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Last month',   range: () => { const lm = subMonths(new Date(), 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; } },
  { label: 'Last 90 days', range: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
];

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  align = 'left',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: fromYmd(startDate), to: fromYmd(endDate) });
  const [pos, setPos] = useState(null);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraft({ from: fromYmd(startDate), to: fromYmd(endDate) });
    const updatePos = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 8, left: r.left, right: window.innerWidth - r.right });
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open, startDate, endDate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const apply = (range) => {
    if (!range?.from || !range?.to) return;
    onChange({
      startDate: toYmd(range.from),
      endDate:   toYmd(range.to),
    });
    setOpen(false);
  };

  const reset = () => {
    const m = getUtcCurrentMonthRange();
    onChange({ startDate: m.startDate, endDate: m.endDate });
    setOpen(false);
  };

  const buttonLabel = startDate && endDate
    ? `${formatDateUtc(startDate)} → ${formatDateUtc(endDate)}`
    : 'Pick a date range';

  const popoverStyle = pos
    ? align === 'right'
      ? { position: 'fixed', top: pos.top, right: pos.right, zIndex: 1000 }
      : { position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }
    : { display: 'none' };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-field text-sm flex items-center gap-2 min-w-[18rem] py-1.5"
      >
        <Calendar className="w-4 h-4 text-dark-400 shrink-0" />
        <span className="flex-1 text-left">{buttonLabel}</span>
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          className="drp-popover bg-dark-800 border border-dark-700 rounded-lg shadow-xl p-3 flex gap-3"
        >
          <div className="flex flex-col gap-0.5 w-32 border-r border-dark-700 pr-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => apply(p.range())}
                className="text-left text-xs px-2 py-1.5 rounded hover:bg-dark-700 text-dark-200"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            <DayPicker
              mode="range"
              numberOfMonths={2}
              defaultMonth={draft?.from || new Date()}
              selected={draft}
              onSelect={setDraft}
              showOutsideDays
              weekStartsOn={1}
            />
            <div className="flex justify-between items-center mt-1 pt-2 border-t border-dark-700">
              <button
                type="button"
                onClick={reset}
                className="text-xs text-dark-400 hover:text-dark-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-dark-700"
                title="Reset to current month"
              >
                <X className="w-3 h-3" /> Reset to current month
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs text-dark-300 hover:text-dark-100 px-3 py-1.5 rounded hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => apply(draft)}
                  disabled={!draft?.from || !draft?.to}
                  className="text-xs bg-accent-500 hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

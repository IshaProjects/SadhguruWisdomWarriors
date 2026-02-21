import { useState, useEffect } from 'react';
import { Maximize2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import ChartModal from './ChartModal.jsx';
import { useEditMode } from './DashboardGrid.jsx';
import clsx from 'clsx';

const STORAGE_KEY = 'dashboard_widget_collapsed';

function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveCollapsed(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); }
  catch {}
}

export default function DashboardWidget({ id, title, children, className }) {
  const editMode = useEditMode();
  const [expanded,  setExpanded]  = useState(false);
  const [collapsed, setCollapsed] = useState(() => loadCollapsed()[id] ?? false);

  useEffect(() => {
    const map = loadCollapsed();
    map[id] = collapsed;
    saveCollapsed(map);
  }, [id, collapsed]);

  const toggleCollapse = () => setCollapsed((v) => !v);

  return (
    <>
      <div className={clsx('relative h-full flex flex-col', className)}>

        {/* ── EDIT MODE: full header bar with drag handle + title ──────── */}
        {editMode && (
          <div className="drag-handle flex items-center justify-between gap-2 px-3 py-1.5 shrink-0
                          bg-dark-800/80 border-b border-dark-700/60 rounded-t-xl select-none
                          cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5 text-dark-500 opacity-70" />
              <span className="text-xs font-medium text-dark-400 truncate">{title}</span>
            </div>
            <button
              onClick={toggleCollapse}
              className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-300 transition-colors"
              title={collapsed ? 'Expand widget' : 'Collapse widget'}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* ── COLLAPSED (non-edit): slim title bar to expand back ──────── */}
        {!editMode && collapsed && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 shrink-0
                          bg-dark-800/60 border border-dark-700/50 rounded-xl select-none">
            <span className="text-xs font-medium text-dark-400 truncate">{title}</span>
            <button
              onClick={toggleCollapse}
              className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-300 transition-colors"
              title="Expand widget"
              aria-label="Expand"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── NORMAL MODE: floating action buttons, hover-only ─────────── */}
        {!editMode && !collapsed && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1
                          opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={() => setExpanded(true)}
              className="p-1.5 rounded-lg bg-dark-800/90 border border-dark-600/60
                         text-dark-500 hover:text-dark-200 hover:bg-dark-700 transition-colors"
              title="Expand to fullscreen"
              aria-label="Expand"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg bg-dark-800/90 border border-dark-600/60
                         text-dark-500 hover:text-dark-200 hover:bg-dark-700 transition-colors"
              title="Collapse widget"
              aria-label="Collapse"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────── */}
        {!collapsed && (
          <div className="flex-1 min-h-0">
            {children}
          </div>
        )}
      </div>

      {/* ── Fullscreen modal ─────────────────────────────────────────────── */}
      {expanded && (
        <ChartModal title={title} onClose={() => setExpanded(false)}>
          {children}
        </ChartModal>
      )}
    </>
  );
}

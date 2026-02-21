import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import { LayoutDashboard, Save, X, RotateCcw, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { DEFAULT_LAYOUTS, COLS, BREAKPOINTS } from './dashboardLayouts.js';

export const EditModeContext = createContext(false);
export const useEditMode = () => useContext(EditModeContext);

/**
 * LayoutContext — lets child widgets programmatically resize a grid tile.
 * setTileHeight(id, h) updates the `h` value for the named tile across all
 * breakpoints, pushing everything below it down automatically.
 */
export const LayoutContext = createContext(null);
export const useLayoutContext = () => useContext(LayoutContext);

// Inner grid component that has access to measured container width
function GridInner({ children, editMode, layouts, onLayoutChange }) {
  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 });

  const dragConfig = editMode
    ? { enabled: true,  handle: '.drag-handle' }
    : { enabled: false, handle: '.drag-handle' };

  const resizeConfig = editMode
    ? { enabled: true,  handles: ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'] }
    : { enabled: false, handles: [] };

  return (
    <div ref={containerRef} className="w-full">
      <ResponsiveGridLayout
        className={clsx('layout px-6', editMode && 'rgl-edit-mode')}
        width={width}
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={80}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        dragConfig={dragConfig}
        resizeConfig={resizeConfig}
        onLayoutChange={onLayoutChange}
      >
        {children}
      </ResponsiveGridLayout>
    </div>
  );
}

export default function DashboardGrid({ children }) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [editMode,     setEditMode]     = useState(false);
  const [layouts,      setLayouts]      = useState(DEFAULT_LAYOUTS);
  const [saved,        setSaved]        = useState(DEFAULT_LAYOUTS);
  const [saving,       setSaving]       = useState(false);
  const [resetting,    setResetting]    = useState(false);
  const [loaded,       setLoaded]       = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Fetch persisted layout on mount.
  // If the saved layout is missing any widget from DEFAULT_LAYOUTS, fall back
  // to defaults so nothing is invisible after a code update.
  useEffect(() => {
    const expectedIds = new Set(DEFAULT_LAYOUTS.lg.map((item) => item.i));

    api.get('/dashboard/layout')
      .then((res) => {
        const remote = res.data?.layouts;
        if (remote && Object.keys(remote).length > 0) {
          const savedIds = new Set((remote.lg ?? []).map((item) => item.i));
          const allPresent = [...expectedIds].every((id) => savedIds.has(id));
          if (allPresent) {
            setLayouts(remote);
            setSaved(remote);
            return;
          }
        }
        setLayouts(DEFAULT_LAYOUTS);
        setSaved(DEFAULT_LAYOUTS);
      })
      .catch(() => {
        setLayouts(DEFAULT_LAYOUTS);
        setSaved(DEFAULT_LAYOUTS);
      })
      .finally(() => setLoaded(true));
  }, []);

  const onLayoutChange = useCallback((_layout, allLayouts) => {
    if (editMode && allLayouts) setLayouts(allLayouts);
  }, [editMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/dashboard/layout', { layouts });
      setSaved(layouts);
      setEditMode(false);
      toast.success('Layout saved — all users will see this arrangement');
    } catch {
      toast.error('Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLayouts(saved);
    setEditMode(false);
  };

  /**
   * Programmatically resize a tile to `h` grid rows across all breakpoints.
   * Used by content-driven widgets (e.g. ChannelMetricsTable) to push siblings
   * below them when their content grows.
   */
  const setTileHeight = useCallback((id, h) => {
    setLayouts((prev) => {
      const next = {};
      for (const bp of Object.keys(prev)) {
        next[bp] = prev[bp].map((item) =>
          item.i === id ? { ...item, h: Math.max(h, item.minH ?? 2) } : item
        );
      }
      return next;
    });
  }, []);

  const handleResetPreview = () => {
    setLayouts(DEFAULT_LAYOUTS);
  };

  const handleResetAndSave = async () => {
    setResetting(true);
    setConfirmReset(false);
    try {
      await api.put('/dashboard/layout', { layouts: DEFAULT_LAYOUTS });
      setLayouts(DEFAULT_LAYOUTS);
      setSaved(DEFAULT_LAYOUTS);
      setEditMode(false);
      toast.success('Dashboard reset to default layout for everyone');
    } catch {
      toast.error('Failed to reset layout');
    } finally {
      setResetting(false);
    }
  };

  if (!loaded) return null;

  return (
    <LayoutContext.Provider value={{ setTileHeight }}>
    <EditModeContext.Provider value={editMode}>
      <div className="relative">

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        {canEdit && (
          <div className="flex items-center justify-end gap-2 mb-3 px-6">
            {!editMode ? (
              <>
                <button
                  onClick={() => setConfirmReset(true)}
                  disabled={resetting}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                             bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-dark-200
                             border border-dark-600 transition-colors disabled:opacity-50"
                  title="Reset dashboard to the built-in default layout"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {resetting ? 'Resetting…' : 'Reset to Default'}
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                             bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-dark-100
                             border border-dark-600 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Customize Layout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleResetPreview}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                             bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-dark-200
                             border border-dark-600 transition-colors"
                  title="Preview default layout (not saved yet)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Preview Default
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                             bg-dark-700 hover:bg-dark-600 text-dark-400 hover:text-dark-200
                             border border-dark-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                             bg-accent-600 hover:bg-accent-500 text-white
                             disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving…' : 'Save for Everyone'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Edit-mode banner ──────────────────────────────────────────── */}
        {editMode && (
          <div className="mx-6 mb-3 px-4 py-2.5 rounded-lg bg-accent-500/10 border border-accent-500/30 text-xs text-accent-300 flex items-center gap-2">
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            Drag the grip to rearrange · Drag any edge or corner to resize · Hit{' '}
            <strong className="font-semibold">"Save for Everyone"</strong> to apply for all users
          </div>
        )}

        {/* ── Reset confirmation dialog ──────────────────────────────────── */}
        {confirmReset && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-warning/10 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-dark-100">Reset to Default Layout?</h3>
                  <p className="text-xs text-dark-400 mt-1 leading-relaxed">
                    This will restore the built-in default arrangement for{' '}
                    <strong className="text-dark-300">all users</strong>. Any custom layout currently
                    saved will be permanently overwritten.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-dark-700 hover:bg-dark-600
                             text-dark-300 hover:text-dark-100 border border-dark-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAndSave}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-warning/20 hover:bg-warning/30
                             text-warning border border-warning/30 transition-colors"
                >
                  Yes, Reset for Everyone
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Grid ──────────────────────────────────────────────────────── */}
        <GridInner
          editMode={editMode}
          layouts={layouts}
          onLayoutChange={onLayoutChange}
        >
          {children}
        </GridInner>
      </div>
    </EditModeContext.Provider>
    </LayoutContext.Provider>
  );
}

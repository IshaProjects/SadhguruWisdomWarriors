import { useState, useEffect, useMemo } from 'react';
import { X, ExternalLink, CheckSquare, RefreshCw, AlertTriangle, CheckCircle2, PlusCircle, Filter } from 'lucide-react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export function formatExternalLink(rawLink, youtubeChannelId) {
  let link = (rawLink || '').trim();
  if (link) {
    if (link.startsWith('@')) {
      return `https://www.youtube.com/${link}`;
    }
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      return `https://${link.replace(/^\/+/, '')}`;
    }
    return link;
  }
  if (youtubeChannelId && youtubeChannelId !== 'UNRESOLVED') {
    return `https://www.youtube.com/channel/${youtubeChannelId}`;
  }
  return '#';
}

export function getNormalizedStatus(item) {
  const s = String(item.statusState || item.appStatus || item.status || '').toUpperCase().trim();
  if (s === 'NEW_CHANNEL' || s === 'NEW') return 'NEW_CHANNEL';
  if (s === 'HANDLE_CHANGED' || s === 'HANDLE_UPDATED' || s === 'UPDATED') return 'HANDLE_CHANGED';
  if (s === 'ALREADY_ADDED' || s === 'ACTIVE' || s === 'ALREADY_ACTIVE') return 'ALREADY_ADDED';
  if (s === 'CHANNEL_TERMINATED' || s === 'TERMINATED' || s === 'PREVIOUSLY_DELETED' || s === 'DELETED') return 'CHANNEL_TERMINATED';
  if (s === 'CHANNEL_NOT_FOUND' || s === 'NOT_FOUND' || s === 'UNRESOLVED') return 'CHANNEL_NOT_FOUND';
  if (s === 'ERROR') return 'ERROR';

  if (item.dbId || (item.youtubeChannelId && item.youtubeChannelId !== 'UNRESOLVED')) {
    return 'ALREADY_ADDED';
  }
  return 'CHANNEL_NOT_FOUND';
}

export default function GoogleSheetSyncModal({ isOpen, onClose, onSuccess }) {
  const [sheetType, setSheetType] = useState('dedicated');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeTabFilter, setActiveTabFilter] = useState('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPreview = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/channels/preview-google-sheet-sync?sheetType=${sheetType}`);
        const candidateItems = res.data.items || [];
        setItems(candidateItems);
        setSummary(res.data.summary);

        // Start with NO channels selected by default so only explicitly checked channels are added
        setSelectedIds(new Set());
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to scan Google Sheet');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, sheetType]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const normStatus = getNormalizedStatus(item);
      if (activeTabFilter !== 'ALL' && item.tabName !== activeTabFilter) return false;
      if (activeStatusFilter !== 'ALL' && normStatus !== activeStatusFilter) return false;
      return true;
    });
  }, [items, activeTabFilter, activeStatusFilter]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visibleSelectable = filteredItems.filter((i) => getNormalizedStatus(i) === 'NEW_CHANNEL');
    const allVisibleSelected = visibleSelectable.length > 0 && visibleSelectable.every((i) => selectedIds.has(i.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleSelectable.forEach((i) => {
        if (allVisibleSelected) {
          next.delete(i.id);
        } else {
          next.add(i.id);
        }
      });
      return next;
    });
  };

  const handleApproveImport = async () => {
    const newChannels = items.filter((i) => i.statusState === 'NEW_CHANNEL' && selectedIds.has(i.id));
    const updatedChannels = items.filter((i) => i.statusState === 'HANDLE_CHANGED');
    
    if (newChannels.length === 0 && updatedChannels.length === 0) {
      toast.error('No new channels selected and no handles to update.');
      return;
    }

    setImporting(true);
    try {
      const res = await api.post('/channels/import-approved-sheet-channels', {
        approvedItems: { newChannels, updatedChannels },
      });

      const { importedCount, updatedCount, errors } = res.data;
      let msg = `Successfully processed sync.`;
      if (importedCount > 0) msg += ` ${importedCount} added.`;
      if (updatedCount > 0) msg += ` ${updatedCount} handles updated.`;

      if (errors && errors.length > 0) {
        toast.error(`Completed with ${errors.length} errors. ${msg}`);
      } else {
        toast.success(msg);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to import selected channels');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-dark-700 bg-dark-850 gap-3">
          <div>
            <h2 className="text-xl font-semibold text-dark-100 flex items-center gap-2">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">📊</span>
              Google Sheet Sync — {sheetType === 'dedicated' ? 'Dedicated Database' : 'IHI Master Database'}
            </h2>
            <p className="text-xs text-dark-400 mt-1">
              {sheetType === 'dedicated'
                ? 'Review channels from Dedicated Google Sheet tabs before adding. All dedicated channels automatically receive green checkmark (✓).'
                : 'Review channels from IHI Master Database tabs before adding. IHI channels display with (—) until AI classification.'}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Sheet Switcher */}
            <div className="flex bg-dark-800 p-1 rounded-lg border border-dark-700 text-xs font-medium">
              <button
                type="button"
                onClick={() => setSheetType('dedicated')}
                className={clsx(
                  'px-3 py-1.5 rounded-md transition flex items-center gap-1.5',
                  sheetType === 'dedicated'
                    ? 'bg-emerald-500 text-dark-950 font-bold shadow-sm'
                    : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700/50'
                )}
              >
                Dedicated Sheet
              </button>
              <button
                type="button"
                onClick={() => setSheetType('ihi')}
                className={clsx(
                  'px-3 py-1.5 rounded-md transition flex items-center gap-1.5',
                  sheetType === 'ihi'
                    ? 'bg-emerald-500 text-dark-950 font-bold shadow-sm'
                    : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700/50'
                )}
              >
                IHI Master Database
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-dark-400 hover:text-dark-100 rounded-lg hover:bg-dark-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 text-center">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
            <div>
              <p className="text-dark-200 font-medium text-base">Scanning Google Sheet & Database History...</p>
              <p className="text-dark-400 text-xs mt-1">Reading 6 tabs (Grade A-E & Inactive) and matching YouTube Channel IDs</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">

            {/* Summary Stats Cards */}
            <div className="p-4 bg-dark-850/50 border-b border-dark-800 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-dark-800/80 p-3 rounded-lg border border-dark-700/60">
                <span className="text-xs text-dark-400 block font-medium">Total Sheet Channels</span>
                <span className="text-lg font-bold text-dark-100">{items.length}</span>
              </div>
              <div className="bg-emerald-950/30 p-3 rounded-lg border border-emerald-700/30">
                <span className="text-xs text-emerald-400 block font-medium">🆕 New Channels</span>
                <span className="text-lg font-bold text-emerald-300">{items.filter((i) => getNormalizedStatus(i) === 'NEW_CHANNEL').length}</span>
              </div>
              <div className="bg-amber-950/30 p-3 rounded-lg border border-amber-700/30">
                <span className="text-xs text-amber-400 block font-medium">⚠️ Channel handle updated</span>
                <span className="text-lg font-bold text-amber-300">{items.filter((i) => getNormalizedStatus(i) === 'HANDLE_CHANGED').length}</span>
              </div>
              <div className="bg-dark-800/50 p-3 rounded-lg border border-dark-700/40">
                <span className="text-xs text-dark-400 block font-medium">✅ Already Active</span>
                <span className="text-lg font-bold text-dark-300">{items.filter((i) => getNormalizedStatus(i) === 'ALREADY_ADDED').length}</span>
              </div>
              <div className="bg-red-950/30 p-3 rounded-lg border border-red-700/30">
                <span className="text-xs text-red-400 block font-medium">❌ Not Found / Terminated</span>
                <span className="text-lg font-bold text-red-300">{items.filter((i) => ['CHANNEL_NOT_FOUND', 'CHANNEL_TERMINATED', 'ERROR'].includes(getNormalizedStatus(i))).length}</span>
              </div>
            </div>

            {/* Filter Bar & Controls */}
            <div className="p-4 border-b border-dark-800 bg-dark-900/90 flex flex-wrap items-center justify-between gap-3">
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-dark-400 flex items-center gap-1 font-medium mr-1">
                  <Filter className="w-3.5 h-3.5" /> Filter Tab:
                </span>
                {['ALL', 'Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E', 'Inactive'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTabFilter(tab)}
                    className={clsx(
                      'px-2.5 py-1 rounded-md transition font-medium',
                      activeTabFilter === tab
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-dark-800 text-dark-400 hover:text-dark-200 border border-transparent'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={activeStatusFilter}
                  onChange={(e) => setActiveStatusFilter(e.target.value)}
                  className="bg-dark-800 border border-dark-700 text-dark-200 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NEW_CHANNEL">🆕 New Channels Only</option>
                  <option value="HANDLE_CHANGED">⚠️ Channel handle updated</option>
                  <option value="ALREADY_ADDED">✅ Already Active</option>
                  <option value="CHANNEL_TERMINATED">❌ Terminated / Deleted</option>
                  <option value="CHANNEL_NOT_FOUND">❓ Not Found</option>
                </select>

                <button
                  onClick={toggleSelectAllVisible}
                  className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1 border border-dark-700"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Select/Deselect Visible
                </button>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto p-4 min-h-[300px]">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-dark-400 text-sm">
                  No channels match the selected filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto border border-dark-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-dark-850 text-dark-300 uppercase tracking-wider border-b border-dark-800 font-semibold">
                      <tr>
                        <th className="p-3 w-10 text-center">Select</th>
                        <th className="p-3">Tab / Category</th>
                        <th className="p-3">Sheet Channel Name</th>
                        <th className="p-3">Clickable YouTube Link</th>
                        <th className="p-3">YouTube Channel ID</th>
                        <th className="p-3">App Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800 text-dark-200">
                      {filteredItems.map((item) => {
                        const normStatus = getNormalizedStatus(item);
                        const isSelected = selectedIds.has(item.id);
                        const isDisabled = normStatus !== 'NEW_CHANNEL';

                        return (
                          <tr
                            key={item.id}
                            className={clsx(
                              'hover:bg-dark-800/60 transition',
                              isSelected && 'bg-emerald-950/10',
                              isDisabled && 'opacity-60 bg-dark-900/50'
                            )}
                          >
                            {/* Checkbox */}
                            <td className="p-3 text-center">
                              {normStatus === 'NEW_CHANNEL' && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onChange={() => toggleSelect(item.id)}
                                  className="w-4 h-4 rounded border-dark-600 text-emerald-500 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              )}
                            </td>

                            {/* Tab / Category */}
                            <td className="p-3">
                              <span className="font-semibold text-dark-100 block">{item.tabName}</span>
                              <span className="text-[11px] text-emerald-400/90 font-medium block">{item.category}</span>
                            </td>

                            {/* Sheet Name / Channel Name */}
                            <td className="p-3 font-medium text-dark-100 max-w-[200px] truncate" title={item.name || item.nameInSheet}>
                              {item.name || item.nameInSheet}
                            </td>

                            {/* Clickable YouTube Link */}
                            <td className="p-3 max-w-[250px]">
                              {formatExternalLink(item.rawLink || item.cleanUrl, item.youtubeChannelId) !== '#' ? (
                                <a
                                  href={formatExternalLink(item.rawLink || item.cleanUrl, item.youtubeChannelId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-mono text-[11px] truncate"
                                  title="Click to test & open channel on YouTube"
                                >
                                  {item.rawLink || item.cleanUrl || 'YouTube Link'}
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : (
                                <span className="text-dark-400 font-mono text-[11px] truncate">
                                  {item.rawLink || item.cleanUrl || '-'}
                                </span>
                              )}
                            </td>

                            {/* YouTube Channel ID */}
                            <td className="p-3 font-mono text-[11px] text-dark-400">
                              {item.youtubeChannelId}
                            </td>

                            {/* Status Badge */}
                            <td className="p-3 whitespace-nowrap">
                              {normStatus === 'NEW_CHANNEL' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <PlusCircle className="w-3 h-3" /> New Channel
                                </span>
                              )}
                              {normStatus === 'HANDLE_CHANGED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <AlertTriangle className="w-3 h-3" /> Channel handle updated
                                </span>
                              )}
                              {normStatus === 'ALREADY_ADDED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-dark-800 text-dark-400 border border-dark-700">
                                  <CheckCircle2 className="w-3 h-3" /> Already Active
                                </span>
                              )}
                              {normStatus === 'CHANNEL_TERMINATED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                                  <AlertTriangle className="w-3 h-3" /> Terminated / Deleted
                                </span>
                              )}
                              {(normStatus === 'CHANNEL_NOT_FOUND' || normStatus === 'ERROR') && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                                  <AlertTriangle className="w-3 h-3" /> Not Found
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Action Bar */}
            <div className="p-4 border-t border-dark-800 bg-dark-850 flex items-center justify-between gap-4">
              <div className="text-xs text-dark-400 font-medium">
                Selected: <span className="text-emerald-400 font-bold">{selectedIds.size}</span> channel(s) approved for import.
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={importing}
                  className="btn-ghost text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApproveImport}
                  disabled={importing || (selectedIds.size === 0 && !items.some((i) => i.statusState === 'HANDLE_CHANGED'))}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing Sync...
                    </>
                  ) : selectedIds.size > 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Add Selected Channels ({selectedIds.size})
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Apply Handle Updates ({items.filter((i) => i.statusState === 'HANDLE_CHANGED').length})
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

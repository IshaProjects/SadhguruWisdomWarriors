import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Download, RefreshCw, LayoutGrid, List, Trash2, X, Sparkles, RotateCw } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import ChannelTable from '../components/channels/ChannelTable.jsx';
import ChannelCard from '../components/channels/ChannelCard.jsx';
import AddChannelModal from '../components/channels/AddChannelModal.jsx';
import EditChannelModal from '../components/channels/EditChannelModal.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import Pagination from '../components/common/Pagination.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { useRbac } from '../context/RbacContext.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function ChannelsPage() {
  const { canPerformAction } = useRbac();
  const [channels, setChannels]         = useState([]);
  const [pagination, setPagination]     = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading]           = useState(true);
  const [viewMode, setViewMode]         = useState('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChannel, setEditingChannel]   = useState(null);
  const [deletingChannel, setDeletingChannel] = useState(null);
  const [classifyingChannel, setClassifyingChannel] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [classificationSummary, setClassificationSummary] = useState(null);
  const [search, setSearch]     = useState('');
  const [filters, setFilters]   = useState({ period: '30d', category: '', tags: '', status: '', group: '' });
  const [sort, setSort]         = useState('-currentStats.subscribers');
  const [syncing, setSyncing]   = useState(false);
  const [pullingAll, setPullingAll] = useState(false);
  const [showPullAllModal, setShowPullAllModal] = useState(false);
  const [pullAllResult, setPullAllResult] = useState(null);
  const [classifyingAll, setClassifyingAll] = useState(false);
  const [showClassifyAllModal, setShowClassifyAllModal] = useState(false);
  const [classifyAllResult, setClassifyAllResult] = useState(null);
  const [reclassifyingChannel, setReclassifyingChannel] = useState(null);
  const [reclassifying, setReclassifying] = useState(false);

  // Bulk-select state
  const [selectedIds, setSelectedIds]         = useState(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting]       = useState(false);
  const [showBulkReclassifyConfirm, setShowBulkReclassifyConfirm] = useState(false);
  const [bulkReclassifying, setBulkReclassifying] = useState(false);
  const [bulkReclassifyResult, setBulkReclassifyResult] = useState(null);

  const fetchChannels = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: viewMode === 'grid' ? 24 : 25, sort };
      if (search) params.search = search;
      if (filters.category) params.category = filters.category;
      if (filters.group) params.group = filters.group;
      const tagsTrimmed = filters.tags?.trim?.();
      if (tagsTrimmed) params.tags = tagsTrimmed;
      if (filters.status) params.status = filters.status;

      const res = await api.get('/channels', { params });
      setChannels(res.data.channels);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [search, filters, sort, viewMode]);

  useEffect(() => {
    fetchChannels(1);
    setSelectedIds(new Set()); // clear selection on filter/page change
  }, [fetchChannels]);

  /* ── Single selection ── */
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Select / deselect all visible rows ── */
  const handleToggleAll = (visibleChannels) => {
    const allVisible = visibleChannels.map((ch) => ch._id);
    const allSelected = allVisible.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allVisible.forEach((id) => next.delete(id));
      } else {
        allVisible.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  /* ── Bulk delete (archive) ── */
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const ids = [...selectedIds];
      const res = await api.delete('/channels/bulk', { data: { ids } });
      toast.success(`${res.data.archived} channel${res.data.archived !== 1 ? 's' : ''} archived`);
      setShowBulkConfirm(false);
      clearSelection();
      fetchChannels(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  /* ── Bulk reclassify ── */
  const handleBulkReclassify = async () => {
    setBulkReclassifying(true);
    try {
      const ids = [...selectedIds];
      const res = await api.post('/channels/reclassify-bulk', { ids });
      setShowBulkReclassifyConfirm(false);
      clearSelection();
      setBulkReclassifyResult(res.data);
      fetchChannels(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk reclassification failed');
    } finally {
      setBulkReclassifying(false);
    }
  };

  /* ── Sync All ── */
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await api.post('/channels/sync-all');
      toast.success('Sync started');
      fetchChannels(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  /* ── Classify All (all channels) ── */
  const handleClassifyAll = async () => {
    setClassifyingAll(true);
    try {
      const res = await api.post('/channels/classify-all');
      setShowClassifyAllModal(false);
      setClassifyAllResult(res.data);
      fetchChannels(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Classify all failed');
    } finally {
      setClassifyingAll(false);
    }
  };

  /* ── Pull All Videos (all channels) ── */
  const handlePullAllVideos = async () => {
    setPullingAll(true);
    try {
      const res = await api.post('/channels/pull-all-videos');
      setShowPullAllModal(false);
      setPullAllResult(res.data);
      fetchChannels(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Pull all videos failed');
    } finally {
      setPullingAll(false);
    }
  };

  /* ── CSV Export ── */
  const handleExport = async () => {
    try {
      const res = await api.get('/export/channels', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `channels-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleChannelUpdated = () => {
    fetchChannels(pagination.page);
    setEditingChannel(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingChannel) return;
    try {
      await api.delete(`/channels/${deletingChannel._id}`);
      toast.success('Channel archived');
      setDeletingChannel(null);
      fetchChannels(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete channel');
    }
  };

  const handleClassify = async () => {
    if (!classifyingChannel) return;
    setClassifying(true);
    try {
      const res = await api.post(`/channels/${classifyingChannel._id}/classify-videos`);
      setClassifyingChannel(null);
      setClassificationSummary(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Classification failed');
    } finally {
      setClassifying(false);
    }
  };

  const handleReclassify = async () => {
    if (!reclassifyingChannel) return;
    setReclassifying(true);
    try {
      const res = await api.post(`/channels/${reclassifyingChannel._id}/reclassify-videos`);
      setReclassifyingChannel(null);
      setClassificationSummary(res.data);
      fetchChannels(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reclassification failed');
    } finally {
      setReclassifying(false);
    }
  };

  const canDelete = canPerformAction('channels.delete');
  const hasSelection = selectedIds.size > 0;

  return (
    <div>
      <TopBar title="Channels" onSearch={setSearch} />
      <div className="p-6 space-y-4">

        {/* ── Action Bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar filters={filters} onFilterChange={setFilters} showPeriod={false} showGroupFilter={true} />

          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-field text-sm py-1.5"
            >
              <option value="-currentStats.subscribers">Most Subscribers</option>
              <option value="-currentStats.views">Most Views</option>
              <option value="-currentStats.videoCount">Most Videos</option>
              <option value="-lastSyncedAt">Recently Synced</option>
              <option value="-createdAt">Recently Added</option>
              <option value="title">Name A-Z</option>
            </select>

            {/* View toggle */}
            <div className="flex bg-dark-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={clsx('p-1.5 rounded', viewMode === 'table' ? 'bg-dark-600 text-dark-100' : 'text-dark-400')}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx('p-1.5 rounded', viewMode === 'grid' ? 'bg-dark-600 text-dark-100' : 'text-dark-400')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {canPerformAction('channels.export') && (
              <button onClick={handleExport} className="btn-ghost text-sm flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Export
              </button>
            )}

            {canPerformAction('channels.sync') && (
              <>
                <button
                  onClick={() => setShowClassifyAllModal(true)}
                  disabled={classifyingAll}
                  className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
                  title="Classify all videos for all channels (Dedicated = sadhguru, IHI/other = AI)"
                >
                  <Sparkles className={clsx('w-4 h-4', classifyingAll && 'animate-pulse')} />
                  Classify All
                </button>
                <button
                  onClick={() => setShowPullAllModal(true)}
                  disabled={pullingAll}
                  className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
                  title="Pull all videos for all channels (one at a time, 100 per batch)"
                >
                  <Download className={clsx('w-4 h-4', pullingAll && 'animate-pulse')} />
                  Pull All Videos
                </button>
                <button
                  onClick={handleSyncAll}
                  disabled={syncing}
                  className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={clsx('w-4 h-4', syncing && 'animate-spin')} />
                  Sync All
                </button>
              </>
            )}

            {canPerformAction('channels.import') && (
              <Link to="/channels/import" className="btn-secondary text-sm flex items-center gap-1.5">
                <Upload className="w-4 h-4" /> Import
              </Link>
            )}

            {canPerformAction('channels.add') && (
              <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Channel
              </button>
            )}
          </div>
        </div>

        {/* ── Bulk-selection action bar (appears when ≥1 row is selected) ── */}
        {hasSelection && viewMode === 'table' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-500/10 border border-accent-500/30 animate-in fade-in duration-150">
            <span className="text-sm font-medium text-accent-300">
              {selectedIds.size} channel{selectedIds.size !== 1 ? 's' : ''} selected
            </span>

            <button
              onClick={clearSelection}
              className="btn-ghost text-xs text-dark-400 flex items-center gap-1 py-1 px-2"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>

            <div className="flex-1" />

            {canDelete && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkReclassifyConfirm(true)}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                  Reclassify {selectedIds.size}
                </button>
                <button
                  onClick={() => setShowBulkConfirm(true)}
                  className="btn-danger text-sm flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Archive {selectedIds.size} channel{selectedIds.size !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Channel List ── */}
        {loading ? (
          <LoadingSpinner />
        ) : viewMode === 'table' ? (
          <div className="glass-card overflow-hidden">
            <ChannelTable
              channels={channels}
              onEdit={canPerformAction('channels.edit') ? (ch) => setEditingChannel(ch) : null}
              onDelete={canPerformAction('channels.delete') ? (ch) => setDeletingChannel(ch) : null}
              onClassify={canPerformAction('channels.sync') ? (ch) => setClassifyingChannel(ch) : null}
              onReclassify={canPerformAction('channels.delete') ? (ch) => setReclassifyingChannel(ch) : null}
              selectedIds={selectedIds}
              onToggleSelect={canDelete ? handleToggleSelect : null}
              onToggleAll={canDelete ? handleToggleAll : null}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {channels.map((ch) => (
              <ChannelCard
                key={ch._id}
                channel={ch}
                onClassify={canPerformAction('channels.sync') ? (ch) => setClassifyingChannel(ch) : null}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onPageChange={(p) => fetchChannels(p)}
        />

        {/* ── Add Channel Modal ── */}
        <AddChannelModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdded={() => fetchChannels(1)}
        />

        {/* ── Edit Channel Modal ── */}
        {editingChannel && (
          <EditChannelModal
            channel={editingChannel}
            open={!!editingChannel}
            onClose={() => setEditingChannel(null)}
            onSaved={handleChannelUpdated}
          />
        )}

        {/* ── Classify All confirmation ── */}
        {showClassifyAllModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-2">Classify All Videos</h2>
              <p className="text-sm text-dark-300 mb-4">
                Classify all videos for all channels? Dedicated channels will be marked as Sadhguru automatically. IHI and other channels will use AI (Vertex AI / Gemini) to classify each video.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowClassifyAllModal(false)}
                  disabled={classifyingAll}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary flex items-center gap-1.5"
                  onClick={handleClassifyAll}
                  disabled={classifyingAll}
                >
                  {classifyingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Classifying…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Classify All
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Classify All result ── */}
        {classifyAllResult && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Classification Complete</h2>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-dark-400">Channels processed</span>
                  <span className="font-medium">{classifyAllResult.channelsProcessed}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Total videos</span>
                  <span className="font-medium">{classifyAllResult.totalVideos}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Newly classified</span>
                  <span className="font-medium text-green-400">{classifyAllResult.totalNewlyClassified}</span>
                </p>
                {classifyAllResult.totalNewlyClassified > 0 && (
                  <>
                    <p className="flex justify-between pt-2 border-t border-dark-700">
                      <span className="text-dark-400">→ Sadhguru</span>
                      <span className="font-medium text-green-400">{classifyAllResult.totalSadguru}</span>
                    </p>
                    <p className="flex justify-between">
                  <span className="text-dark-400">→ -</span>
                      <span className="font-medium">{classifyAllResult.totalNonSadguru}</span>
                    </p>
                  </>
                )}
                {classifyAllResult.totalFailed > 0 && (
                  <p className="flex justify-between">
                    <span className="text-dark-400">Could not process</span>
                    <span className="font-medium text-red-400">{classifyAllResult.totalFailed}</span>
                  </p>
                )}
                {classifyAllResult.errors?.length > 0 && (
                  <div className="pt-2 border-t border-dark-700">
                    <p className="text-dark-400 mb-2">Errors:</p>
                    <ul className="text-xs text-red-400 space-y-1 max-h-24 overflow-y-auto">
                      {classifyAllResult.errors.map((e, i) => (
                        <li key={i}>{e.title}: {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setClassifyAllResult(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Pull All Videos confirmation ── */}
        {showPullAllModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-2">Pull All Videos</h2>
              <p className="text-sm text-dark-300 mb-4">
                Pull video details for all channels that haven&apos;t been fully pulled yet? This will process one channel at a time, 100 videos per batch. It may take a while and will use YouTube API quota.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPullAllModal(false)}
                  disabled={pullingAll}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary flex items-center gap-1.5"
                  onClick={handlePullAllVideos}
                  disabled={pullingAll}
                >
                  {pullingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Pulling…
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Pull All Videos
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Pull All Videos result ── */}
        {pullAllResult && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Pull Complete</h2>
              {pullAllResult.message && (
                <p className="text-sm text-dark-300 mb-4">{pullAllResult.message}</p>
              )}
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-dark-400">Channels processed</span>
                  <span className="font-medium">{pullAllResult.channelsProcessed}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Total videos pulled</span>
                  <span className="font-medium text-green-400">{pullAllResult.totalVideosPulled}</span>
                </p>
                {pullAllResult.errors?.length > 0 && (
                  <div className="pt-2 border-t border-dark-700">
                    <p className="text-dark-400 mb-2">Errors:</p>
                    <ul className="text-xs text-red-400 space-y-1 max-h-24 overflow-y-auto">
                      {pullAllResult.errors.map((e, i) => (
                        <li key={i}>{e.title}: {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setPullAllResult(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Classify confirmation ── */}
        {classifyingChannel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-2">Classify Videos</h2>
              <p className="text-sm text-dark-300 mb-4">
                Classify all videos for <span className="font-semibold">{classifyingChannel.title}</span> as Sadhguru video or not? Each video title will be sent to Vertex AI to determine if it features Sadhguru content.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setClassifyingChannel(null)}
                  disabled={classifying}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary flex items-center gap-1.5"
                  onClick={handleClassify}
                  disabled={classifying}
                >
                  {classifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Classifying…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Classify
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Reclassify confirmation ── */}
        {reclassifyingChannel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-2 text-amber-400">Reclassify All Videos</h2>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
                <p className="text-sm text-amber-300 font-medium mb-1">Warning</p>
                <p className="text-sm text-dark-300">
                  This will clear all existing classifications for <span className="font-semibold">{reclassifyingChannel.title}</span> and re-classify every video from scratch. Already classified videos will be overwritten.
                </p>
              </div>
              <p className="text-sm text-dark-400 mb-4">
                This action cannot be undone. Are you sure you want to continue?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReclassifyingChannel(null)}
                  disabled={reclassifying}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                  onClick={handleReclassify}
                  disabled={reclassifying}
                >
                  {reclassifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Reclassifying…
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-4 h-4" />
                      Yes, Reclassify All
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Classification Summary ── */}
        {classificationSummary && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Classification Complete</h2>
              {classificationSummary.isSadhguruChannel && (
                <p className="text-sm text-accent-300 mb-4 p-3 rounded-lg bg-accent-500/10">
                  This is a Sadhguru (Dedicated) channel. All unclassified videos were marked as sadhguru by default — no AI call was needed.
                </p>
              )}
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-dark-400">Total videos</span>
                  <span className="font-medium">{classificationSummary.totalVideos}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Already classified</span>
                  <span className="font-medium">{classificationSummary.alreadyClassified}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Newly classified</span>
                  <span className="font-medium text-green-400">{classificationSummary.newlyClassified}</span>
                </p>
                {classificationSummary.failed > 0 && (
                  <p className="flex justify-between">
                    <span className="text-dark-400">Could not process</span>
                    <span className="font-medium text-red-400">{classificationSummary.failed}</span>
                  </p>
                )}
                {!classificationSummary.isSadhguruChannel && classificationSummary.newlyClassified > 0 && (
                  <>
                    <p className="flex justify-between pt-2 border-t border-dark-700">
                      <span className="text-dark-400">→ Sadhguru</span>
                      <span className="font-medium text-green-400">{classificationSummary.sadhguruCount}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-dark-400">→ Non sadhguru</span>
                      <span className="font-medium">{classificationSummary.nonSadhguruCount}</span>
                    </p>
                  </>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setClassificationSummary(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Single delete confirmation ── */}
        {deletingChannel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold mb-2">Archive channel</h2>
              <p className="text-sm text-dark-300 mb-4">
                Archive <span className="font-semibold">{deletingChannel.title}</span>? It will be
                hidden from the dashboard but can be restored by changing its status.
              </p>
              <div className="flex gap-3 justify-end">
                <button className="btn-secondary" onClick={() => setDeletingChannel(null)}>Cancel</button>
                <button className="btn-danger" onClick={handleConfirmDelete}>Archive</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Bulk delete confirmation ── */}
        {showBulkConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold mb-2">Archive {selectedIds.size} channels</h2>
              <p className="text-sm text-dark-300 mb-4">
                Are you sure you want to archive{' '}
                <span className="font-semibold">{selectedIds.size} selected channel{selectedIds.size !== 1 ? 's' : ''}</span>?
                They will be hidden from the dashboard but can be restored by changing their status.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  className="btn-secondary"
                  onClick={() => setShowBulkConfirm(false)}
                  disabled={bulkDeleting}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger flex items-center gap-2 disabled:opacity-50"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Archiving…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Archive {selectedIds.size} channel{selectedIds.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Bulk reclassify confirmation ── */}
        {showBulkReclassifyConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold mb-2 text-amber-400">Reclassify {selectedIds.size} channels</h2>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
                <p className="text-sm text-amber-300 font-medium mb-1">Warning</p>
                <p className="text-sm text-dark-300">
                  This will clear all existing classifications for the selected channels and re-classify every video from scratch.
                </p>
              </div>
              <p className="text-sm text-dark-400 mb-4">
                Dedicated channels will be set to sadhguru. IHI/other channels will be classified using Vertex AI.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  className="btn-secondary"
                  onClick={() => setShowBulkReclassifyConfirm(false)}
                  disabled={bulkReclassifying}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  onClick={handleBulkReclassify}
                  disabled={bulkReclassifying}
                >
                  {bulkReclassifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Reclassifying…
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-4 h-4" />
                      Yes, Reclassify
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Bulk reclassify result ── */}
        {bulkReclassifyResult && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Bulk Reclassification Complete</h2>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-dark-400">Channels requested</span>
                  <span className="font-medium">{bulkReclassifyResult.channelsRequested}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Channels processed</span>
                  <span className="font-medium">{bulkReclassifyResult.channelsProcessed}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Total videos</span>
                  <span className="font-medium">{bulkReclassifyResult.totalVideos}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">Newly classified</span>
                  <span className="font-medium text-green-400">{bulkReclassifyResult.totalNewlyClassified}</span>
                </p>
                <p className="flex justify-between pt-2 border-t border-dark-700">
                  <span className="text-dark-400">→ Sadhguru</span>
                  <span className="font-medium text-green-400">{bulkReclassifyResult.totalSadguru}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-dark-400">→ -</span>
                  <span className="font-medium">{bulkReclassifyResult.totalNonSadguru}</span>
                </p>
                {bulkReclassifyResult.totalFailed > 0 && (
                  <p className="flex justify-between">
                    <span className="text-dark-400">Could not process</span>
                    <span className="font-medium text-red-400">{bulkReclassifyResult.totalFailed}</span>
                  </p>
                )}
                {bulkReclassifyResult.errors?.length > 0 && (
                  <div className="pt-2 border-t border-dark-700">
                    <p className="text-dark-400 mb-2">Errors:</p>
                    <ul className="text-xs text-red-400 space-y-1 max-h-24 overflow-y-auto">
                      {bulkReclassifyResult.errors.map((e, i) => (
                        <li key={i}>{e.title}: {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setBulkReclassifyResult(null)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

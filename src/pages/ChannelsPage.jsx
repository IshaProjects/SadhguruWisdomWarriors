import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Download, RefreshCw, LayoutGrid, List } from 'lucide-react';
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
  const [channels, setChannels] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [deletingChannel, setDeletingChannel] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ period: '30d', category: '', tags: '', status: '' });
  const [sort, setSort] = useState('-currentStats.subscribers');
  const [syncing, setSyncing] = useState(false);

  const fetchChannels = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: viewMode === 'grid' ? 24 : 25,
        sort,
      };
      if (search) params.search = search;
      if (filters.category) params.category = filters.category;
      const tagsTrimmed = filters.tags?.trim?.();
      if (tagsTrimmed) params.tags = tagsTrimmed;
      if (filters.status) params.status = filters.status;

      const res = await api.get('/channels', { params });
      setChannels(res.data.channels);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [search, filters, sort, viewMode]);

  useEffect(() => {
    fetchChannels(1);
  }, [fetchChannels]);

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
      toast.success('Channel deleted');
      setDeletingChannel(null);
      fetchChannels(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete channel');
    }
  };

  return (
    <div>
      <TopBar title="Channels" onSearch={setSearch} />
      <div className="p-6 space-y-4">
        {/* Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            showPeriod={false}
          />

          <div className="flex items-center gap-2">
            {/* Sort */}
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
                className={clsx(
                  'p-1.5 rounded',
                  viewMode === 'table' ? 'bg-dark-600 text-dark-100' : 'text-dark-400'
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-1.5 rounded',
                  viewMode === 'grid' ? 'bg-dark-600 text-dark-100' : 'text-dark-400'
                )}
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
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={clsx('w-4 h-4', syncing && 'animate-spin')} />
                Sync All
              </button>
            )}

            {canPerformAction('channels.import') && (
              <Link to="/channels/import" className="btn-secondary text-sm flex items-center gap-1.5">
                <Upload className="w-4 h-4" /> Import
              </Link>
            )}

            {canPerformAction('channels.add') && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Channel
              </button>
            )}
          </div>
        </div>

        {/* Channel List */}
        {loading ? (
          <LoadingSpinner />
        ) : viewMode === 'table' ? (
          <div className="glass-card overflow-hidden">
            <ChannelTable
              channels={channels}
              onEdit={canPerformAction('channels.edit') ? (ch) => setEditingChannel(ch) : null}
              onDelete={canPerformAction('channels.delete') ? (ch) => setDeletingChannel(ch) : null}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {channels.map((ch) => (
              <ChannelCard key={ch._id} channel={ch} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onPageChange={(p) => fetchChannels(p)}
        />

        {/* Add Channel Modal */}
        <AddChannelModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdded={() => fetchChannels(1)}
        />

        {/* Edit Channel Modal (reuse add modal styling for consistency) */}
        {editingChannel && (
          <EditChannelModal
            channel={editingChannel}
            open={!!editingChannel}
            onClose={() => setEditingChannel(null)}
            onSaved={handleChannelUpdated}
          />
        )}

        {/* Delete confirmation */}
        {deletingChannel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold mb-2">Delete channel</h2>
              <p className="text-sm text-dark-300 mb-4">
                Are you sure you want to delete{' '}
                <span className="font-semibold">{deletingChannel.title}</span>? You can restore
                it later from archived channels.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDeletingChannel(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

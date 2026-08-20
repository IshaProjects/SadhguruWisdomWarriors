import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Layers, X, User, UserCheck, LayoutDashboard } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { formatNumber } from '../utils/formatters.js';
import clsx from 'clsx';

export default function MicroUnitsPage() {
  const { user } = useAuth();
  const [microUnits, setMicroUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [assigningPocUnit, setAssigningPocUnit] = useState(null);
  const [dashboardUnit, setDashboardUnit] = useState(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const fetchMicroUnits = async () => {
    try {
      const res = await api.get('/micro-units');
      setMicroUnits(res.data);
    } catch {
      toast.error('Failed to load micro units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMicroUnits();
  }, []);

  const handleDelete = async () => {
    if (!deletingUnit) return;
    try {
      await api.delete(`/micro-units/${deletingUnit._id}`);
      toast.success('Micro unit deleted');
      setDeletingUnit(null);
      fetchMicroUnits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <TopBar title="Micro Units" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-dark-400">
            Group channels into micro units for easier management, POC assignment, and reporting.
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Micro Unit
            </button>
          )}
        </div>

        {microUnits.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Layers className="w-12 h-12 text-dark-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-300 mb-2">No micro units yet</h3>
            <p className="text-sm text-dark-400 mb-4">
              Create a micro unit to group channels together and assign a POC.
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-sm flex items-center gap-1.5 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create Micro Unit
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {microUnits.map((unit) => {
              const totalSubs = (unit.channelIds || []).reduce(
                (s, c) => s + (c.currentStats?.subscribers || 0),
                0
              );
              return (
                <div
                  key={unit._id}
                  className="glass-card p-5 hover:border-dark-600 transition-colors flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-dark-100 truncate flex-1 text-base">
                        {unit.name}
                      </h3>
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingUnit(unit)}
                            className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-accent-400"
                            aria-label="Edit"
                            title="Edit Unit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingUnit(unit)}
                            className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-red-400"
                            aria-label="Delete"
                            title="Delete Unit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* POC Banner / Assignment */}
                    <div className="mb-3.5 p-2.5 rounded-lg bg-dark-800/80 border border-dark-700/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={clsx(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                          unit.poc ? "bg-accent-500/20 text-accent-400" : "bg-dark-700 text-dark-400"
                        )}>
                          {unit.poc ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div className="truncate text-xs">
                          <span className="text-dark-400 block font-normal">Point of Contact</span>
                          <span className="font-medium text-dark-200 truncate block">
                            {unit.poc ? unit.poc.name : "Unassigned"}
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setAssigningPocUnit(unit)}
                          className="text-xs px-2 py-1 rounded bg-dark-700 hover:bg-dark-600 text-accent-300 font-medium shrink-0 transition-colors"
                        >
                          {unit.poc ? "Reassign POC" : "+ Assign POC"}
                        </button>
                      )}
                    </div>

                    {/* Channel Counts & Stats */}
                    <div className="flex items-center gap-2 text-xs text-dark-400 mb-3">
                      <span className="font-medium text-dark-300">{unit.channelIds?.length || 0} channels</span>
                      {unit.channelIds?.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatNumber(totalSubs)} total subs</span>
                        </>
                      )}
                    </div>

                    {/* Channel Thumbnails List */}
                    {unit.channelIds?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {unit.channelIds.slice(0, 5).map((ch) => (
                          <div
                            key={ch._id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-dark-800 text-xs"
                            title={ch.title}
                          >
                            {ch.thumbnailUrl && (
                              <img
                                src={ch.thumbnailUrl}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover shrink-0"
                              />
                            )}
                            <span className="truncate max-w-[90px]">{ch.title}</span>
                          </div>
                        ))}
                        {unit.channelIds.length > 5 && (
                          <span className="px-2 py-1 rounded bg-dark-800 text-xs text-dark-400">
                            +{unit.channelIds.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dashboard Action Button */}
                  <div className="pt-2 border-t border-dark-700/50">
                    <button
                      type="button"
                      onClick={() => setDashboardUnit(unit)}
                      className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      View Unit Dashboard
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateMicroUnitModal
            onClose={() => setShowCreateModal(false)}
            onSaved={() => {
              setShowCreateModal(false);
              fetchMicroUnits();
            }}
          />
        )}

        {/* Edit Modal */}
        {editingUnit && (
          <CreateMicroUnitModal
            initial={editingUnit}
            onClose={() => setEditingUnit(null)}
            onSaved={() => {
              setEditingUnit(null);
              fetchMicroUnits();
            }}
          />
        )}

        {/* Assign/Reassign POC Modal */}
        {assigningPocUnit && (
          <AssignPocModal
            unit={assigningPocUnit}
            onClose={() => setAssigningPocUnit(null)}
            onSaved={() => {
              setAssigningPocUnit(null);
              fetchMicroUnits();
            }}
          />
        )}

        {/* Micro Unit Specific Dashboard Modal */}
        {dashboardUnit && (
          <MicroUnitDashboardModal
            unit={dashboardUnit}
            onClose={() => setDashboardUnit(null)}
          />
        )}

        {/* Delete confirmation */}
        {deletingUnit && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold mb-2">Delete micro unit</h2>
              <p className="text-sm text-dark-300 mb-4">
                Delete "{deletingUnit.name}"? This will not affect the channels themselves.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  className="btn-secondary"
                  onClick={() => setDeletingUnit(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={handleDelete}
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

function CreateMicroUnitModal({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || '');
  const [selectedChannels, setSelectedChannels] = useState(() => {
    const chs = initial?.channelIds || [];
    return chs.map((c) => (typeof c === 'object' ? c : { _id: c })).filter((c) => c._id);
  });
  const [channelSearch, setChannelSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!initial;
  const selectedIds = new Set(selectedChannels.map((c) => c._id));

  useEffect(() => {
    if (!channelSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/channels', {
          params: { search: channelSearch, limit: 20, page: 1 },
        });
        setSearchResults(res.data.channels || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [channelSearch]);

  const toggleChannel = (ch) => {
    const id = ch._id;
    if (selectedIds.has(id)) {
      setSelectedChannels((prev) => prev.filter((c) => c._id !== id));
    } else {
      setSelectedChannels((prev) => [...prev, ch]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const channelIds = selectedChannels.map((c) => c._id);
      if (isEdit) {
        await api.put(`/micro-units/${initial._id}`, {
          name: name.trim(),
          channelIds,
        });
        toast.success('Micro unit updated');
      } else {
        await api.post('/micro-units', {
          name: name.trim(),
          channelIds,
        });
        toast.success('Micro unit created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Micro Unit' : 'Create Micro Unit'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field w-full"
                placeholder="e.g. North Region"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Search & assign channels
              </label>
              <input
                type="text"
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="input-field w-full"
                placeholder="Search by channel name..."
              />
              {searching && (
                <p className="text-xs text-dark-400 mt-1">Searching...</p>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-dark-700 bg-dark-900/50">
                {searchResults.map((ch) => {
                  const isSelected = selectedIds.has(ch._id);
                  return (
                    <button
                      key={ch._id}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-dark-800 transition-colors',
                        isSelected && 'bg-accent-500/10'
                      )}
                    >
                      {ch.thumbnailUrl && (
                        <img
                          src={ch.thumbnailUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      )}
                      <span className="flex-1 truncate text-sm">{ch.title}</span>
                      {isSelected && (
                        <span className="text-xs text-accent-400">Added</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedChannels.length > 0 && (
              <div>
                <p className="text-xs text-dark-400 mb-2">
                  {selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedChannels.map((ch) => (
                    <span
                      key={ch._id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-dark-700 text-xs"
                    >
                      {ch.title || ch._id}
                      <button
                        type="button"
                        onClick={() => toggleChannel(ch)}
                        className="hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-dark-700 flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignPocModal({ unit, onClose, onSaved }) {
  const [pocs, setPocs] = useState([]);
  const [selectedPocId, setSelectedPocId] = useState(unit.poc?._id || unit.poc?.id || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/pocs')
      .then((res) => setPocs(res.data))
      .catch(() => toast.error('Failed to load POC users'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/micro-units/${unit._id}/poc`, { pocId: selectedPocId || null });
      toast.success(selectedPocId ? 'POC assigned successfully' : 'POC unassigned');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update POC');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-dark-700 pb-3">
          <div>
            <h2 className="text-lg font-semibold">{unit.poc ? 'Reassign POC' : 'Assign POC'}</h2>
            <p className="text-xs text-dark-400">Micro Unit: {unit.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Select Point of Contact (Approved POCs)
            </label>
            {loading ? (
              <p className="text-xs text-dark-400">Loading POC users...</p>
            ) : pocs.length === 0 ? (
              <div className="p-3 rounded bg-dark-800 text-xs text-amber-400">
                No approved POC users found. Approve a user with the <strong>POC</strong> role under <em>Settings → Team</em>.
              </div>
            ) : (
              <select
                value={selectedPocId}
                onChange={(e) => setSelectedPocId(e.target.value)}
                className="input-field w-full text-sm"
              >
                <option value="">-- No POC (Unassigned) --</option>
                {pocs.map((poc) => (
                  <option key={poc._id || poc.id} value={poc._id || poc.id}>
                    {poc.name} ({poc.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary text-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MicroUnitDashboardModal({ unit, onClose }) {
  const channels = unit.channelIds || [];
  const totalSubs = channels.reduce((s, c) => s + (c.currentStats?.subscribers || 0), 0);
  const totalViews = channels.reduce((s, c) => s + Number(c.currentStats?.views || 0), 0);
  const totalVideos = channels.reduce((s, c) => s + (c.currentStats?.videoCount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-accent-400" />
              {unit.name} — Dashboard
            </h2>
            <p className="text-xs text-dark-400 mt-0.5">
              Assigned POC: <strong className="text-dark-200">{unit.poc ? unit.poc.name : 'Unassigned'}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Overview Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-dark-800/80 border border-dark-700">
              <p className="text-xs text-dark-400 font-medium">Channels</p>
              <p className="text-xl font-bold text-dark-100 mt-1">{channels.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/80 border border-dark-700">
              <p className="text-xs text-dark-400 font-medium">Subscribers</p>
              <p className="text-xl font-bold text-accent-400 mt-1">{formatNumber(totalSubs)}</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/80 border border-dark-700">
              <p className="text-xs text-dark-400 font-medium">Total Views</p>
              <p className="text-xl font-bold text-dark-100 mt-1">{formatNumber(totalViews)}</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/80 border border-dark-700">
              <p className="text-xs text-dark-400 font-medium">Video Count</p>
              <p className="text-xl font-bold text-dark-100 mt-1">{formatNumber(totalVideos)}</p>
            </div>
          </div>

          {/* Unit Channels List */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-dark-200">
              Assigned Channels ({channels.length})
            </h3>
            {channels.length === 0 ? (
              <p className="text-sm text-dark-400 text-center py-6">No channels in this Micro Unit.</p>
            ) : (
              <div className="space-y-2">
                {channels.map((ch) => (
                  <div
                    key={ch._id}
                    className="flex items-center justify-between p-3.5 rounded-lg bg-dark-800/50 hover:bg-dark-800 transition-colors border border-dark-700/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ch.thumbnailUrl && (
                        <img
                          src={ch.thumbnailUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-dark-100 truncate">{ch.title}</p>
                        <p className="text-xs text-dark-400 truncate">{ch.category || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-accent-300">{formatNumber(ch.currentStats?.subscribers || 0)} subs</p>
                        <p className="text-dark-400">{formatNumber(ch.currentStats?.views || 0)} views</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-dark-700 flex justify-end">
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

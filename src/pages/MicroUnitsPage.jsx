import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Layers, X, User, UserCheck, LayoutDashboard } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { formatNumber } from '../utils/formatters.js';
import clsx from 'clsx';

export default function MicroUnitsPage() {
  const navigate = useNavigate();
  const [microUnits, setMicroUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(null);
  const [assigningPocUnit, setAssigningPocUnit] = useState(null);

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
            Group channels into micro units for easier management and reporting.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Micro Unit
          </button>
        </div>

        {microUnits.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Layers className="w-12 h-12 text-dark-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-300 mb-2">No micro units yet</h3>
            <p className="text-sm text-dark-400 mb-4">
              Create a micro unit to group channels together.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-sm flex items-center gap-1.5 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create Micro Unit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {microUnits.map((unit) => (
              <div
                key={unit._id}
                className="glass-card p-5 hover:border-dark-600 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-dark-100 truncate flex-1">
                      {unit.name}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingUnit(unit)}
                        className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-accent-400"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingUnit(unit)}
                        className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-red-400"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── Point of Contact Banner ── */}
                  <div className="bg-dark-800/80 rounded-lg p-2.5 flex items-center justify-between border border-dark-700/60 mb-3 gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <User className="w-4 h-4 text-accent-400 shrink-0" />
                      <div className="text-xs truncate">
                        <span className="text-dark-400">POC: </span>
                        <span className={clsx('font-medium', unit.poc ? 'text-accent-300' : 'text-dark-400 italic')}>
                          {unit.poc ? unit.poc.name : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setAssigningPocUnit(unit)}
                      className="text-xs px-2 py-1 rounded bg-dark-700 hover:bg-dark-600 text-accent-300 font-medium transition-colors shrink-0 flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      {unit.poc ? 'Reassign POC' : 'Assign POC'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-dark-400 mb-3">
                    <span>{unit.channelIds?.length || 0} channels</span>
                    {unit.channelIds?.length > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          {formatNumber(
                            unit.channelIds.reduce(
                              (s, c) => s + (c.currentStats?.subscribers || 0),
                              0
                            )
                          )}{' '}
                          subs
                        </span>
                      </>
                    )}
                  </div>
                  {unit.channelIds?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {unit.channelIds.slice(0, 4).map((ch) => (
                        <div
                          key={ch._id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-dark-800 text-xs"
                        >
                          {ch.thumbnailUrl && (
                            <img
                              src={ch.thumbnailUrl}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          )}
                          <span className="truncate max-w-[100px]">{ch.title}</span>
                        </div>
                      ))}
                      {unit.channelIds.length > 4 && (
                        <span className="px-2 py-1 rounded bg-dark-800 text-xs text-dark-400">
                          +{unit.channelIds.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* ── View Unit Dashboard Button ── */}
                <button
                  onClick={() => navigate(`/dashboard?microUnitId=${unit._id}`)}
                  className="w-full mt-4 btn-secondary text-xs font-medium flex items-center justify-center gap-1.5 py-2 hover:bg-accent-500/10 hover:border-accent-500/30 transition-all"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  View Unit Dashboard
                </button>
              </div>
            ))}
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

        {/* Assign POC Modal */}
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
      </div>
    </div>
  );
}

function AssignPocModal({ unit, onClose, onSaved }) {
  const [team, setTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [selectedPocId, setSelectedPocId] = useState(unit.pocId || unit.poc?._id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/team')
      .then((res) => setTeam(res.data))
      .catch(() => toast.error('Failed to load team members'))
      .finally(() => setLoadingTeam(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/micro-units/${unit._id}`, {
        pocId: selectedPocId || null,
      });
      toast.success('Point of Contact updated');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign POC');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Assign Point of Contact</h2>
            <p className="text-xs text-dark-400">{unit.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Select Point of Contact
            </label>
            {loadingTeam ? (
              <p className="text-xs text-dark-400 py-2">Loading team members...</p>
            ) : (() => {
              const pocMembers = team.filter(
                (m) => String(m.role).toLowerCase() === 'poc'
              );

              if (pocMembers.length === 0) {
                return (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                    No team members currently have the <strong>POC</strong> role. You can assign the POC role to team members in <strong>Settings ➔ Team</strong>.
                  </div>
                );
              }

              return (
                <select
                  value={selectedPocId}
                  onChange={(e) => setSelectedPocId(e.target.value)}
                  className="input-field w-full text-sm"
                >
                  <option value="">-- Unassigned --</option>
                  {pocMembers.map((member) => (
                    <option key={member._id || member.id} value={member._id || member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              );
            })()}
          </div>

          <div className="flex gap-3 pt-2 justify-end">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving || loadingTeam} className="btn-primary">
              {saving ? 'Saving…' : 'Save POC'}
            </button>
          </div>
        </form>
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

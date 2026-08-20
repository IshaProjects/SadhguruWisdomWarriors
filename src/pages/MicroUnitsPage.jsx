import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Layers, X, UserPlus, UserCheck, Tv } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { formatNumber } from '../utils/formatters.js';
import clsx from 'clsx';

export default function MicroUnitsPage() {
  const [microUnits, setMicroUnits] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateUnitModal, setShowCreateUnitModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [reassigningUnit, setReassigningUnit] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(null);

  const fetchMicroUnits = async () => {
    try {
      const res = await api.get('/micro-units');
      setMicroUnits(res.data);
    } catch {
      toast.error('Failed to load micro units');
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/auth/team');
      setTeamMembers(res.data || []);
    } catch {
      // Fallback silently if team endpoint is restricted
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchMicroUnits(), fetchTeamMembers()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
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
      <TopBar title="Micro Units Overview" />
      <div className="p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-dark-100">Micro Units Overview</h2>
            <p className="text-sm text-dark-400">
              Group up to 5 channels per micro unit and assign a Point of Contact (POC) manager.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-accent-400" />
              + Create User / POC
            </button>
            <button
              onClick={() => setShowCreateUnitModal(true)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              + Create Micro Unit
            </button>
          </div>
        </div>

        {/* Empty State */}
        {microUnits.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Layers className="w-12 h-12 text-dark-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-300 mb-2">No micro units created</h3>
            <p className="text-sm text-dark-400 mb-6 max-w-md mx-auto">
              Start grouping your channels into micro units (max 5 channels per unit) and assign POC coordinators.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4 text-accent-400" />
                Create User / POC
              </button>
              <button
                onClick={() => setShowCreateUnitModal(true)}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create Micro Unit
              </button>
            </div>
          </div>
        ) : (
          /* Micro Units Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {microUnits.map((unit, index) => {
              const channels = unit.channelIds || [];
              const pocName = unit.poc?.name || 'Unassigned';

              return (
                <div
                  key={unit._id}
                  className="glass-card p-5 hover:border-dark-600 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Name & ID Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-dark-100 truncate">
                          {unit.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm mt-0.5">
                          <span className="text-dark-400 font-medium">POC:</span>
                          <span className={clsx(
                            "font-semibold",
                            unit.poc ? "text-accent-400" : "text-amber-400 italic"
                          )}>
                            {pocName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-dark-800 text-dark-400 border border-dark-700">
                          ID: {index + 1}
                        </span>
                        <button
                          onClick={() => setDeletingUnit(unit)}
                          className="p-1 rounded hover:bg-dark-800 text-dark-400 hover:text-red-400 transition-colors"
                          title="Delete Micro Unit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Channels Section */}
                    <div className="mt-4 pt-3 border-t border-dark-800">
                      <div className="flex items-center justify-between text-xs text-dark-400 mb-2">
                        <span className="font-semibold uppercase tracking-wider">
                          CHANNELS ({channels.length} / 5)
                        </span>
                        <span>
                          {formatNumber(
                            channels.reduce(
                              (s, c) => s + (c.currentStats?.subscribers || 0),
                              0
                            )
                          )}{' '}
                          subs
                        </span>
                      </div>

                      {channels.length === 0 ? (
                        <p className="text-xs text-dark-500 italic py-2">No channels assigned yet</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {channels.map((ch) => (
                            <div
                              key={ch._id}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-dark-800/80 border border-dark-700/50 text-xs"
                            >
                              {ch.thumbnailUrl ? (
                                <img
                                  src={ch.thumbnailUrl}
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <Tv className="w-4 h-4 text-dark-400 shrink-0" />
                              )}
                              <span className="truncate flex-1 font-medium text-dark-200">{ch.title}</span>
                              <span className="text-dark-400 shrink-0">
                                {formatNumber(ch.currentStats?.subscribers || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-5 pt-3 border-t border-dark-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setEditingUnit(unit)}
                      className="btn-secondary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Channels
                    </button>
                    <button
                      onClick={() => setReassigningUnit(unit)}
                      className="btn-secondary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1 text-accent-400 hover:text-accent-300"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Re-assign POC
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create User / POC */}
        {showCreateUserModal && (
          <CreateUserModal
            onClose={() => setShowCreateUserModal(false)}
            onUserCreated={() => {
              setShowCreateUserModal(false);
              fetchTeamMembers();
            }}
          />
        )}

        {/* Modal: Create Micro Unit */}
        {showCreateUnitModal && (
          <CreateMicroUnitModal
            teamMembers={teamMembers}
            onClose={() => setShowCreateUnitModal(false)}
            onSaved={() => {
              setShowCreateUnitModal(false);
              fetchMicroUnits();
            }}
          />
        )}

        {/* Modal: Edit Channels */}
        {editingUnit && (
          <CreateMicroUnitModal
            initial={editingUnit}
            teamMembers={teamMembers}
            onClose={() => setEditingUnit(null)}
            onSaved={() => {
              setEditingUnit(null);
              fetchMicroUnits();
            }}
          />
        )}

        {/* Modal: Re-assign POC */}
        {reassigningUnit && (
          <ReassignPocModal
            unit={reassigningUnit}
            teamMembers={teamMembers}
            onClose={() => setReassigningUnit(null)}
            onSaved={() => {
              setReassigningUnit(null);
              fetchMicroUnits();
            }}
          />
        )}

        {/* Modal: Delete Confirmation */}
        {deletingUnit && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold mb-2">Delete micro unit</h2>
              <p className="text-sm text-dark-300 mb-5">
                Are you sure you want to delete "{deletingUnit.name}"? Channels will remain in your system.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setDeletingUnit(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary bg-red-600 hover:bg-red-700 text-sm"
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

/** Modal: Create User / POC */
function CreateUserModal({ onClose, onUserCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('manager');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    setSaving(true);
    try {
      await api.post('/auth/invite', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      toast.success(`POC User ${name} created successfully!`);
      onUserCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <div className="flex items-center justify-between pb-4 border-b border-dark-700 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent-400" />
            Create User / POC
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
              placeholder="e.g. Dhiren Patel"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full"
              placeholder="dhiren@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field w-full"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field w-full"
            >
              <option value="manager">Manager / POC</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div className="pt-4 border-t border-dark-700 flex gap-3 justify-end">
            <button type="button" className="btn-secondary text-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-sm" disabled={saving}>
              {saving ? 'Creating…' : 'Create POC User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Modal: Quick Re-assign POC */
function ReassignPocModal({ unit, teamMembers, onClose, onSaved }) {
  const [selectedPocId, setSelectedPocId] = useState(unit.poc?.id || unit.pocId || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/micro-units/${unit._id}`, {
        pocId: selectedPocId || null,
      });
      toast.success('POC re-assigned successfully');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to re-assign POC');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-sm p-6">
        <div className="flex items-center justify-between pb-3 border-b border-dark-700 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-accent-400" />
            Re-assign POC
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-dark-300">
            Select a new Point of Contact for <strong className="text-dark-100">{unit.name}</strong>:
          </p>

          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1">Point of Contact (POC)</label>
            <select
              value={selectedPocId}
              onChange={(e) => setSelectedPocId(e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="">-- No POC Assigned --</option>
              {teamMembers.map((member) => (
                <option key={member.id || member._id} value={member.id || member._id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-dark-700 flex gap-3 justify-end">
            <button type="button" className="btn-secondary text-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Modal: Create/Edit Micro Unit */
function CreateMicroUnitModal({ initial, teamMembers = [], onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || '');
  const [pocId, setPocId] = useState(initial?.poc?.id || initial?.pocId || '');
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
      if (selectedChannels.length >= 5) {
        toast.error('Maximum 5 channels allowed per micro unit');
        return;
      }
      setSelectedChannels((prev) => [...prev, ch]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (selectedChannels.length > 5) {
      toast.error('Maximum 5 channels allowed per micro unit');
      return;
    }
    setSaving(true);
    try {
      const channelIds = selectedChannels.map((c) => c._id);
      const payload = {
        name: name.trim(),
        channelIds,
        pocId: pocId || null,
      };

      if (isEdit) {
        await api.put(`/micro-units/${initial._id}`, payload);
        toast.success('Micro unit updated');
      } else {
        await api.post('/micro-units', payload);
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
          <div className="p-5 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Micro Unit Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field w-full"
                placeholder="e.g. North Region Unit"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Assign Point of Contact (POC)
              </label>
              <select
                value={pocId}
                onChange={(e) => setPocId(e.target.value)}
                className="input-field w-full"
              >
                <option value="">-- Select POC User --</option>
                {teamMembers.map((m) => (
                  <option key={m.id || m._id} value={m.id || m._id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-dark-300">
                  Search & assign channels
                </label>
                <span className="text-xs text-dark-400 font-mono">
                  {selectedChannels.length} / 5 channels
                </span>
              </div>
              <input
                type="text"
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="input-field w-full"
                placeholder="Search channel name..."
              />
              {searching && (
                <p className="text-xs text-dark-400 mt-1">Searching channels...</p>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-dark-700 bg-dark-900/80">
                {searchResults.map((ch) => {
                  const isSelected = selectedIds.has(ch._id);
                  return (
                    <button
                      key={ch._id}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-dark-800 transition-colors text-xs',
                        isSelected && 'bg-accent-500/15'
                      )}
                    >
                      {ch.thumbnailUrl && (
                        <img
                          src={ch.thumbnailUrl}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                      )}
                      <span className="flex-1 truncate font-medium text-dark-200">{ch.title}</span>
                      {isSelected && (
                        <span className="text-accent-400 font-semibold">Added</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedChannels.length > 0 && (
              <div>
                <p className="text-xs text-dark-400 mb-2">Selected Channels (Max 5):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedChannels.map((ch) => (
                    <span
                      key={ch._id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-dark-800 border border-dark-700 text-xs text-dark-200 font-medium"
                    >
                      {ch.title || ch._id}
                      <button
                        type="button"
                        onClick={() => toggleChannel(ch)}
                        className="hover:text-red-400 text-dark-400 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-dark-700 flex gap-3 justify-end bg-dark-900/50">
            <button type="button" className="btn-secondary text-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-sm"
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving…' : isEdit ? 'Update Unit' : 'Create Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

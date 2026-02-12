import { useState, useEffect } from 'react';
import { UserPlus, Shield, User, Pencil, Trash2, X } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRbac } from '../context/RbacContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { canPerformAction } = useRbac();
  const { isDark, toggleTheme } = useTheme();
  const [team, setTeam] = useState([]);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit state
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'viewer' });
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deletingMember, setDeletingMember] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      api.get('/auth/team').then((res) => setTeam(res.data)).catch(() => {});
    }
  }, [user]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/invite', inviteForm);
      setTeam([...team, res.data]);
      setInviteForm({ name: '', email: '', password: '', role: 'viewer' });
      setShowInvite(false);
      toast.success('Team member added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (member) => {
    setEditingMember(member);
    setEditForm({ name: member.name, email: member.email, role: member.role });
  };

  const getMemberId = (member) => member._id || member.id;

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const id = getMemberId(editingMember);
      const res = await api.put(`/auth/team/${id}`, editForm);
      setTeam(team.map((m) => (getMemberId(m) === id ? res.data : m)));
      setEditingMember(null);
      toast.success('Team member updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update member');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMember) return;
    try {
      const id = getMemberId(deletingMember);
      await api.delete(`/auth/team/${id}`);
      setTeam(team.filter((m) => getMemberId(m) !== id));
      setDeletingMember(null);
      toast.success('Team member deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete member');
    }
  };

  const roleIcon = {
    admin: <Shield className="w-4 h-4 text-accent-400" />,
    manager: <Shield className="w-4 h-4 text-warning" />,
    viewer: <User className="w-4 h-4 text-dark-400" />,
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <TopBar title="Settings" />
      <div className="p-6 space-y-6 max-w-3xl">
        {/* Profile */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Profile</h3>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 text-xl font-medium">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-lg">{user?.name}</p>
              <p className="text-dark-400 text-sm">{user?.email}</p>
              <span className="badge bg-accent-500/20 text-accent-300 mt-1 capitalize">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Appearance</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-dark-400">Toggle dark/light theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isDark ? 'bg-accent-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  isDark ? 'left-6' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Team Management */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Team Members</h3>
              {canPerformAction('team.invite') && (
                <button
                  onClick={() => setShowInvite(!showInvite)}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Add Member
                </button>
              )}
            </div>

            {showInvite && (
              <form onSubmit={handleInvite} className="mb-6 p-4 bg-dark-800 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="input-field text-sm"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="input-field text-sm"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                    className="input-field text-sm"
                    required
                  />
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="input-field text-sm"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="btn-secondary text-sm flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary text-sm flex-1 disabled:opacity-50">
                    {loading ? 'Adding...' : 'Add Team Member'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {team.map((member) => (
                <div
                  key={getMemberId(member)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-sm font-medium">
                      {member.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-dark-400">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {roleIcon[member.role]}
                    <span className="text-sm text-dark-300 capitalize">{member.role}</span>

                    {/* Edit & Delete — admin only, can't edit/delete yourself */}
                    {isAdmin && getMemberId(member) !== user?.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(member)}
                          className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 ml-2"
                          aria-label="Edit member"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingMember(member)}
                          className="p-1.5 rounded hover:bg-dark-800 text-red-400 hover:text-red-300"
                          aria-label="Delete member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {team.length === 0 && (
                <p className="text-sm text-dark-400 text-center py-4">No team members found.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold">Edit Team Member</h2>
                <p className="text-xs text-dark-400">{editingMember.email}</p>
              </div>
              <button onClick={() => setEditingMember(null)} className="p-1 hover:bg-dark-800 rounded">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input-field w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input-field w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="viewer">Viewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-2">Delete team member</h2>
            <p className="text-sm text-dark-300 mb-4">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{deletingMember.name}</span> (
              {deletingMember.email})? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletingMember(null)}
              >
                Cancel
              </button>
              <button
                type="button"
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
  );
}

import { useState, useEffect } from 'react';
import {
  UserPlus,
  Shield,
  User,
  Pencil,
  Trash2,
  X,
  Tag,
  Plus,
  Check,
  Users,
  SunMoon,
  Folder,
} from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRbac } from '../context/RbacContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────── Tabs */
const TABS = [
  { id: 'general',    label: 'General',    Icon: SunMoon  },
  { id: 'team',       label: 'Team',       Icon: Users    },
  { id: 'categories', label: 'Categories', Icon: Folder   },
];

/* ═══════════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const { user } = useAuth();
  const { canPerformAction } = useRbac();
  const { isDark, toggleTheme } = useTheme();

  const isAdmin   = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canManage = isAdmin || isManager;

  const defaultTab = canManage ? 'general' : 'general';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'team' || t.id === 'categories') return canManage;
    return true;
  });

  return (
    <div>
      <TopBar title="Settings" />
      <div className="p-6 max-w-4xl">
        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 border-b border-dark-700">
          {visibleTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? 'border-accent-500 text-accent-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'general'    && <GeneralTab user={user} isDark={isDark} toggleTheme={toggleTheme} />}
        {activeTab === 'team'       && canManage && <TeamTab user={user} canPerformAction={canPerformAction} isAdmin={isAdmin} />}
        {activeTab === 'categories' && canManage && <CategoriesTab canManage={canManage} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   General Tab
═══════════════════════════════════════════════════════════════════ */
function GeneralTab({ user, isDark, toggleTheme }) {
  return (
    <div className="space-y-6">
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
            className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-accent-500' : 'bg-dark-600'}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isDark ? 'left-6' : 'left-0.5'}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Team Tab
═══════════════════════════════════════════════════════════════════ */
function TeamTab({ user, canPerformAction, isAdmin }) {
  const [team, setTeam] = useState([]);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [showInvite, setShowInvite]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm]       = useState({ name: '', email: '', role: 'viewer' });
  const [editLoading, setEditLoading] = useState(false);
  const [deletingMember, setDeletingMember] = useState(null);

  useEffect(() => {
    api.get('/auth/team').then((res) => setTeam(res.data)).catch(() => {});
  }, []);

  const getMemberId = (m) => m._id || m.id;

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
    admin:   <Shield className="w-4 h-4 text-accent-400" />,
    manager: <Shield className="w-4 h-4 text-warning" />,
    viewer:  <User   className="w-4 h-4 text-dark-400" />,
  };

  return (
    <>
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Team Members</h3>
          {canPerformAction('team.invite') && (
            <button onClick={() => setShowInvite(!showInvite)} className="btn-primary text-sm flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" /> Add Member
            </button>
          )}
        </div>

        {showInvite && (
          <form onSubmit={handleInvite} className="mb-6 p-4 bg-dark-800 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text"     placeholder="Name"     value={inviteForm.name}     onChange={(e) => setInviteForm({ ...inviteForm, name:     e.target.value })} className="input-field text-sm" required />
              <input type="email"    placeholder="Email"    value={inviteForm.email}    onChange={(e) => setInviteForm({ ...inviteForm, email:    e.target.value })} className="input-field text-sm" required />
              <input type="password" placeholder="Password" value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} className="input-field text-sm" required />
              <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} className="input-field text-sm">
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary text-sm flex-1">Cancel</button>
              <button type="submit"  disabled={loading} className="btn-primary text-sm flex-1 disabled:opacity-50">{loading ? 'Adding...' : 'Add Team Member'}</button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {team.map((member) => (
            <div key={getMemberId(member)} className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-800 transition-colors">
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
                {isAdmin && getMemberId(member) !== user?.id && (
                  <>
                    <button type="button" onClick={() => openEdit(member)} className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200 ml-2" aria-label="Edit member">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setDeletingMember(member)} className="p-1.5 rounded hover:bg-dark-800 text-red-400 hover:text-red-300" aria-label="Delete member">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {team.length === 0 && <p className="text-sm text-dark-400 text-center py-4">No team members found.</p>}
        </div>
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
                <input type="text"  value={editForm.name}  onChange={(e) => setEditForm({ ...editForm, name:  e.target.value })} className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="input-field w-full">
                  <option value="viewer">Viewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingMember(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={editLoading} className="btn-primary flex-1 disabled:opacity-50">{editLoading ? 'Saving...' : 'Save Changes'}</button>
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
              Are you sure you want to delete <span className="font-semibold">{deletingMember.name}</span> ({deletingMember.email})? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setDeletingMember(null)}>Cancel</button>
              <button type="button" className="btn-danger"    onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Categories Tab
═══════════════════════════════════════════════════════════════════ */
function CategoriesTab({ canManage }) {
  const [categories, setCategories] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Create
  const [newName, setNewName]     = useState('');
  const [creating, setCreating]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Rename
  const [renamingCat, setRenamingCat] = useState(null); // { name, count }
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // Delete
  const [deletingCat, setDeletingCat] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  /* ── Create ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/categories', { name: newName.trim() });
      setCategories((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setShowCreate(false);
      toast.success(`Category "${res.data.name}" created`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  /* ── Rename ── */
  const openRename = (cat) => {
    setRenamingCat(cat);
    setRenameValue(cat.name);
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameValue.trim() || renameValue.trim() === renamingCat.name) {
      setRenamingCat(null);
      return;
    }
    setRenameLoading(true);
    try {
      const res = await api.put(`/categories/${encodeURIComponent(renamingCat.name)}`, { name: renameValue.trim() });
      setCategories((prev) =>
        prev
          .map((c) => c.name === res.data.oldName ? { name: res.data.newName, count: c.count } : c)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success(`Renamed to "${res.data.newName}" (${res.data.channelsUpdated} channel${res.data.channelsUpdated !== 1 ? 's' : ''} updated)`);
      setRenamingCat(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename category');
    } finally {
      setRenameLoading(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deletingCat) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/categories/${encodeURIComponent(deletingCat.name)}`);
      setCategories((prev) => {
        const updated = prev.filter((c) => c.name !== deletingCat.name);
        // bump Uncategorized count
        return updated.map((c) =>
          c.name === 'Uncategorized'
            ? { ...c, count: c.count + res.data.channelsReassigned }
            : c
        );
      });
      toast.success(
        `"${deletingCat.name}" deleted. ${res.data.channelsReassigned} channel${res.data.channelsReassigned !== 1 ? 's' : ''} moved to Uncategorized.`
      );
      setDeletingCat(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Channel Categories</h3>
            <p className="text-xs text-dark-400 mt-0.5">Organize channels by category. Renaming or deleting updates all assigned channels.</p>
          </div>
          {canManage && (
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> New Category
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="mb-5 flex gap-2 p-3 bg-dark-800 rounded-lg">
            <input
              type="text"
              placeholder="Category name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input-field text-sm flex-1"
              autoFocus
              required
            />
            <button type="button" onClick={() => { setShowCreate(false); setNewName(''); }} className="btn-secondary text-sm px-3">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary text-sm px-4 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
        )}

        {/* Category list */}
        {loadingList ? (
          <p className="text-sm text-dark-400 text-center py-8">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-dark-400 text-center py-8">No categories found.</p>
        ) : (
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-dark-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-accent-400 shrink-0" />
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-xs text-dark-400 bg-dark-700 px-2 py-0.5 rounded-full">
                    {cat.count} channel{cat.count !== 1 ? 's' : ''}
                  </span>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openRename(cat)}
                      className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200"
                      title="Rename category"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {cat.name !== 'Uncategorized' && (
                      <button
                        type="button"
                        onClick={() => setDeletingCat(cat)}
                        className="p-1.5 rounded hover:bg-dark-800 text-red-400 hover:text-red-300"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {renamingCat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Rename Category</h2>
              <button onClick={() => setRenamingCat(null)} className="p-1 hover:bg-dark-800 rounded">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <form onSubmit={handleRename} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Current name</label>
                <p className="text-sm text-dark-400 bg-dark-800 rounded px-3 py-2">{renamingCat.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">New name</label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="input-field w-full"
                  autoFocus
                  required
                />
              </div>
              <p className="text-xs text-dark-400">
                This will update all <strong>{renamingCat.count}</strong> channel{renamingCat.count !== 1 ? 's' : ''} assigned to this category.
              </p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setRenamingCat(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={renameLoading} className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2">
                  {renameLoading ? 'Saving…' : <><Check className="w-4 h-4" /> Rename</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-2">Delete Category</h2>
            <p className="text-sm text-dark-300 mb-1">
              Are you sure you want to delete <span className="font-semibold">"{deletingCat.name}"</span>?
            </p>
            {deletingCat.count > 0 && (
              <p className="text-sm text-yellow-400 mb-4">
                {deletingCat.count} channel{deletingCat.count !== 1 ? 's' : ''} will be moved to <strong>Uncategorized</strong>.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setDeletingCat(null)} disabled={deleteLoading}>Cancel</button>
              <button type="button" className="btn-danger"    onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

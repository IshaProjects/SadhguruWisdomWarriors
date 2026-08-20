import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Save, RotateCcw, ShieldCheck, Lock, MousePointerClick } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRbac } from '../context/RbacContext.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const ROLES = ['admin', 'manager', 'poc', 'viewer'];

function PermissionTable({ title, icon: Icon, description, entries, onChange, saving }) {
  const toggle = (idx, role) => {
    // Admin column is locked to true
    if (role === 'admin') return;
    const updated = entries.map((entry, i) => {
      if (i !== idx) return entry;
      return {
        ...entry,
        roles: { ...entry.roles, [role]: !entry.roles[role] },
      };
    });
    onChange(updated);
  };

  return (
    <section className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-700/50">
        <div className="flex items-center gap-2.5 mb-1">
          <Icon className="w-5 h-5 text-accent-400" />
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <p className="text-xs text-dark-400">{description}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left py-3 px-5 text-dark-400 font-medium w-1/2">Permission</th>
              {ROLES.map((role) => (
                <th key={role} className="text-center py-3 px-4 font-medium capitalize">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1.5',
                      role === 'admin'
                        ? 'text-accent-400'
                        : role === 'manager'
                        ? 'text-yellow-400'
                        : 'text-dark-400'
                    )}
                  >
                    {role}
                    {role === 'admin' && <Lock className="w-3 h-3" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr
                key={entry.key}
                className="border-b border-dark-800 hover:bg-dark-800/30 transition-colors"
              >
                <td className="py-3 px-5">
                  <p className="font-medium text-dark-100">{entry.label}</p>
                  <p className="text-xs text-dark-500 font-mono">{entry.key}</p>
                </td>
                {ROLES.map((role) => (
                  <td key={role} className="py-3 px-4 text-center">
                    <button
                      type="button"
                      disabled={role === 'admin' || saving}
                      onClick={() => toggle(idx, role)}
                      className={clsx(
                        'w-9 h-5 rounded-full relative transition-colors duration-200',
                        entry.roles[role]
                          ? role === 'admin'
                            ? 'bg-accent-500/50 cursor-not-allowed'
                            : 'bg-accent-500 cursor-pointer'
                          : role === 'admin'
                          ? 'bg-dark-600 cursor-not-allowed'
                          : 'bg-dark-600 cursor-pointer hover:bg-dark-500'
                      )}
                      aria-label={`${entry.label} – ${role}: ${entry.roles[role] ? 'on' : 'off'}`}
                    >
                      <span
                        className={clsx(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                          entry.roles[role] ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function RbacConfigPage() {
  const { user } = useAuth();
  const { refreshRbac } = useRbac();
  const [pages, setPages] = useState([]);
  const [actions, setActions] = useState([]);
  const [original, setOriginal] = useState({ pages: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Redirect non-admins
  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rbac');
      setPages(res.data.pages);
      setActions(res.data.actions);
      setOriginal({ pages: res.data.pages, actions: res.data.actions });
    } catch (err) {
      toast.error('Failed to load RBAC config');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    JSON.stringify(pages) !== JSON.stringify(original.pages) ||
    JSON.stringify(actions) !== JSON.stringify(original.actions);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/rbac', { pages, actions });
      setPages(res.data.pages);
      setActions(res.data.actions);
      setOriginal({ pages: res.data.pages, actions: res.data.actions });
      await refreshRbac();
      toast.success('RBAC configuration saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPages(original.pages);
    setActions(original.actions);
  };

  if (loading) {
    return (
      <div>
        <TopBar title="RBAC Configuration" />
        <div className="p-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="RBAC Configuration" />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-500/10">
              <ShieldCheck className="w-6 h-6 text-accent-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Role-Based Access Control</h1>
              <p className="text-sm text-dark-400">
                Configure which roles can access pages and perform actions.
                Admin access is locked and cannot be changed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-40"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Page-level permissions */}
        <PermissionTable
          title="Page Access"
          icon={Lock}
          description="Control which roles can access each page in the sidebar."
          entries={pages}
          onChange={setPages}
          saving={saving}
        />

        {/* Action-level permissions */}
        <PermissionTable
          title="Action / Button Access"
          icon={MousePointerClick}
          description="Control which roles can perform specific actions like editing, deleting, or syncing."
          entries={actions}
          onChange={setActions}
          saving={saving}
        />

        {/* Unsaved changes indicator */}
        {hasChanges && (
          <div className="fixed bottom-6 right-6 bg-dark-900 border border-accent-500/30 rounded-xl px-5 py-3 shadow-xl flex items-center gap-3 z-40">
            <div className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
            <span className="text-sm text-dark-200">You have unsaved changes</span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

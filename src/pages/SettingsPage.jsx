import { useState, useEffect } from 'react';
import { UserPlus, Shield, User } from 'lucide-react';
import TopBar from '../components/layout/TopBar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [team, setTeam] = useState([]);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(false);

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
      toast.success('Team member invited');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invite failed');
    } finally {
      setLoading(false);
    }
  };

  const roleIcon = {
    admin: <Shield className="w-4 h-4 text-accent-400" />,
    manager: <Shield className="w-4 h-4 text-warning" />,
    viewer: <User className="w-4 h-4 text-dark-400" />,
  };

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
              {user?.role === 'admin' && (
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
                <button type="submit" disabled={loading} className="btn-primary text-sm w-full disabled:opacity-50">
                  {loading ? 'Adding...' : 'Add Team Member'}
                </button>
              </form>
            )}

            <div className="space-y-2">
              {team.map((member) => (
                <div
                  key={member._id}
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

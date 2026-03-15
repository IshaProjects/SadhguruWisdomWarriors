import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Tv2,
  RefreshCw,
  Settings,
  LogOut,
  ChevronLeft,
  Youtube,
  ShieldCheck,
  BarChart2,
  Cpu,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRbac } from '../../context/RbacContext.jsx';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',  rbacKey: 'dashboard' },
  { to: '/channels',  icon: Tv2,             label: 'Channels',   rbacKey: 'channels'  },
  { to: '/micro-units', icon: Layers,        label: 'Micro Units', rbacKey: 'micro-units' },
  { to: '/reports',    icon: BarChart2,  label: 'Reports',    rbacKey: 'reports'    },
  { to: '/ai-studio', icon: Cpu,        label: 'AI Studio',  rbacKey: 'ai-studio'  },
  { to: '/sync',       icon: RefreshCw,  label: 'Sync Status',rbacKey: 'sync'       },
  { to: '/settings',  icon: Settings,         label: 'Settings',   rbacKey: 'settings'  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { canAccessPage } = useRbac();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-dark-900 border-r border-dark-700/50 flex flex-col transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-dark-700/50">
        <Youtube className="w-7 h-7 text-red-500 shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-lg tracking-tight">YT Manager</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx(
            'ml-auto p-1 rounded hover:bg-dark-800 text-dark-400 transition-transform duration-300',
            collapsed && 'rotate-180'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems
          .filter(({ rbacKey }) => canAccessPage(rbacKey))
          .map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 group',
                isActive
                  ? 'bg-accent-500/10 text-accent-400'
                  : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}

        {/* Admin-only RBAC link */}
        {user?.role === 'admin' && (
          <NavLink
            to="/settings/rbac"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 group',
                isActive
                  ? 'bg-accent-500/10 text-accent-400'
                  : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800'
              )
            }
          >
            <ShieldCheck className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">RBAC Config</span>}
          </NavLink>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-dark-700/50 p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-400 text-sm font-medium shrink-0">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-dark-400 truncate">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-dark-800 text-dark-400 hover:text-danger"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Trophy, 
  Shield, 
  Users, 
  Activity, 
  ChevronRight,
  Database,
  LogIn,
  LogOut,
  UserPlus,
  UserCheck
} from 'lucide-react';

export default function Sidebar({ healthState, isMobileOpen, onCloseMobile }) {
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/matches', label: 'Matches', icon: Trophy },
    { to: '/teams', label: 'Teams', icon: Shield },
    { to: '/players', label: 'Players', icon: Users }
  ];

  const getRoleBadgeClasses = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'TeamManager':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Referee':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Spectator':
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
          <NavLink to="/" onClick={onCloseMobile} className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/40 group-hover:scale-105 transition-transform">
              <span className="text-xl">⚽</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-2xl font-black tracking-tight text-white font-['Outfit']">
                  Tiki<span className="text-emerald-400">Taka</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Score Engine</p>
            </div>
          </NavLink>
        </div>

        {/* User Session Info Card */}
        <div className="p-4 border-b border-slate-800/80">
          {isAuthenticated && user ? (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${getRoleBadgeClasses(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                onClick={onCloseMobile}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                onClick={onCloseMobile}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom system status card */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                System Live State
              </span>
              <span className="flex h-2 w-2 relative">
                {healthState?.isReachable && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    healthState?.isReachable ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </span>
            </div>

            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Activity className="w-3 h-3 text-emerald-400" /> API:
                </span>
                <span className="font-mono text-emerald-400">
                  {healthState?.isReachable ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Database className="w-3 h-3 text-emerald-500" /> Database:
                </span>
                <span
                  className={`font-mono ${
                    healthState?.isDbConnected ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {healthState?.isDbConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}


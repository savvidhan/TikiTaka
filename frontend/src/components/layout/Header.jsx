import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, RefreshCw, LogIn, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ onOpenMobile, healthState, onRefreshHealth, isCheckingHealth }) {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & current brand indicator */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobile}
          className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 lg:hidden cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-white font-['Outfit'] hidden sm:inline-block">
            Tiki<span className="text-emerald-400">Taka</span> Football Management
          </span>
          <span className="text-xs text-slate-400 hidden md:inline-block">• Matchweek &amp; Roster Engine</span>
        </div>
      </div>

      {/* Right: User Chip & API Health badge & ping button */}
      <div className="flex items-center space-x-3">
        {isAuthenticated && user ? (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="text-slate-200 font-medium truncate max-w-[120px]">{user.name}</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-semibold border border-emerald-500/20">
              {user.role}
            </span>
          </div>
        ) : (
          <Link
            to="/login"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-300 hover:text-emerald-400 bg-slate-900/60 hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sign In</span>
          </Link>
        )}

        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
            healthState?.isReachable
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
          }`}
        >
          <span className="relative flex h-2 w-2">
            {healthState?.isReachable && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                healthState?.isReachable ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="hidden sm:inline">
            {healthState?.isReachable ? 'Server Online' : 'Server Offline'}
          </span>
        </div>

        <button
          onClick={onRefreshHealth}
          disabled={isCheckingHealth}
          title="Refresh server health"
          className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isCheckingHealth ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}

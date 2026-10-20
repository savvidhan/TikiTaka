import React from 'react';
import { Menu, Activity, RefreshCw } from 'lucide-react';

export default function Header({ onOpenMobile, healthState, onRefreshHealth, isCheckingHealth }) {
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

      {/* Right: API Health badge & ping button */}
      <div className="flex items-center space-x-3">
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

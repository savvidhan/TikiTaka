import React from 'react';
import { Shield, Activity, Radio, Trophy, Users, RefreshCw } from 'lucide-react';

export default function Navbar({ healthState, onRefreshHealth, isCheckingHealth }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/40">
              <span className="text-xl">⚽</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black tracking-tight text-white font-['Outfit']">
                  Tiki<span className="text-emerald-400">Taka</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                  MVP Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Grassroots Football Score Engine</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <a href="#overview" className="px-3 py-2 text-sm font-medium text-slate-200 hover:text-emerald-400 rounded-lg hover:bg-slate-900 transition-colors">
              Overview
            </a>
            <a href="#stack" className="px-3 py-2 text-sm font-medium text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Stack
            </a>
            <a href="#architecture" className="px-3 py-2 text-sm font-medium text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Architecture
            </a>
            <a href="#connectivity" className="px-3 py-2 text-sm font-medium text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> API Health
            </a>
          </nav>

          {/* Status Badge & Refresh */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              healthState?.isReachable
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
            }`}>
              <span className="relative flex h-2 w-2">
                {healthState?.isReachable && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  healthState?.isReachable ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></span>
              </span>
              <span>
                {healthState?.isReachable ? 'API Online' : 'API Offline'}
              </span>
            </div>

            <button
              onClick={onRefreshHealth}
              disabled={isCheckingHealth}
              title="Ping Backend API"
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingHealth ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { Database, Server, Globe, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/60 py-10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
          {/* Brand info */}
          <div>
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <span className="text-xl">⚽</span>
              <span className="text-lg font-bold text-white font-['Outfit']">
                Tiki<span className="text-emerald-400">Taka</span>
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400 max-w-sm">
              Full-stack football management system inspired by CricHeroes. Real-time scores, team management, and match scheduling.
            </p>
          </div>

          {/* Stack summary */}
          <div className="flex justify-center items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>React 19 + Vite</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>Express + Node.js</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>MongoDB + Mongoose</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-500 md:text-right">
            <p>© {new Date().getFullYear()} TikiTaka App. Development Environment Ready.</p>
            <p className="mt-1 text-[11px] text-slate-600">Built for grassroots football excellence.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

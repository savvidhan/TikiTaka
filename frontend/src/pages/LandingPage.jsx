import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Database, 
  Server, 
  Terminal, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Calendar, 
  Users, 
  Activity,
  Copy,
  Check
} from 'lucide-react';

export default function LandingPage({ healthState, onRefreshHealth, isCheckingHealth }) {
  const [copiedCmd, setCopiedCmd] = useState('');

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(''), 2000);
  };

  const getDbBadge = () => {
    if (!healthState?.isReachable) {
      return {
        text: 'Backend Offline',
        classes: 'bg-slate-800 text-slate-400 border-slate-700',
        icon: AlertCircle
      };
    }
    if (healthState?.isDbConnected) {
      return {
        text: 'MongoDB Connected',
        classes: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40',
        icon: CheckCircle2
      };
    }
    const dbMsg = healthState?.details?.database?.message || healthState?.dbStatus || 'Disconnected';
    return {
      text: `MongoDB: ${dbMsg}`,
      classes: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      icon: AlertCircle
    };
  };

  const dbBadge = getDbBadge();
  const DbIcon = dbBadge.icon;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pitch-grid overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-2/3 right-10 w-[400px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 relative z-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-slate-300 mb-6 shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Environment Initialized & Running</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-mono">v1.0.0-dev</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            The Operating System for <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Grassroots Football</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 font-normal leading-relaxed">
            Inspired by CricHeroes, <strong className="text-emerald-400 font-semibold">TikiTaka</strong> delivers professional-grade team rosters, match fixtures, ball-by-ball event timelines, and live score management.
          </p>
        </div>

        {/* System Diagnostics & Connectivity Card */}
        <div id="connectivity" className="mt-12 max-w-4xl mx-auto">
          <div className="card-glass rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Full-Stack Connectivity Monitor
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Verifies bidirectional communication between Vite client, Express API, and Mongoose ODM.
                </p>
              </div>

              <button
                onClick={onRefreshHealth}
                disabled={isCheckingHealth}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCheckingHealth ? 'Pinging API...' : 'Run Diagnostics'}
              </button>
            </div>

            {/* Diagnostic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Backend Express API Status */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-800 text-emerald-400">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Express Backend API</h3>
                      <p className="text-xs text-slate-400 font-mono">http://localhost:5000/api/health</p>
                    </div>
                  </div>

                  <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5 ${
                    healthState?.isReachable 
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' 
                      : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                  }`}>
                    {healthState?.isReachable ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reachable ({healthState.latency}ms)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Unreachable</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Server Uptime:</span>
                  <span className="font-mono text-slate-200">
                    {healthState?.details?.uptime !== undefined ? `${healthState.details.uptime}s` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* MongoDB + Mongoose Status */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-800 text-emerald-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">MongoDB & Mongoose</h3>
                      <p className="text-xs text-slate-400">ODM Connection Pool</p>
                    </div>
                  </div>

                  <div className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5 ${dbBadge.classes}`}>
                    <DbIcon className="w-3.5 h-3.5" />
                    <span>{dbBadge.text}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Config Source:</span>
                  <span className="font-mono text-slate-300">backend/.env (process.env.MONGODB_URI)</span>
                </div>
              </div>
            </div>

            {/* Notice banner if MongoDB URI is pending or connection failed */}
            {!healthState?.isDbConnected && healthState?.isReachable && (
              <div className="mt-5 p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-300">Backend API is alive, but MongoDB is not connected yet.</p>
                  <p className="mt-1 text-slate-300">
                    {healthState?.details?.database?.message ? (
                      <>
                        <span className="text-amber-200 font-semibold">Diagnostic: </span>
                        {healthState.details.database.message}. Please check your database user permissions or password in MongoDB Atlas.
                      </>
                    ) : (
                      <>
                        Please verify your MongoDB Atlas connection string in <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">backend/.env</code> under <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">MONGODB_URI</code>.
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stack Highlights Section */}
        <div id="stack" className="mt-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white tracking-tight">Verified Technology Architecture</h2>
            <p className="text-xs text-slate-400 mt-1">Configured strictly according to the project specifications</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1 */}
            <div className="card-glass p-5 rounded-xl border border-slate-800/80 hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">React 19 + Vite</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Ultra-fast HMR, JSX component architecture, Tailwind CSS v4 styling, and React Router navigation ready.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 text-[10px] bg-slate-900 text-slate-300 rounded border border-slate-800">Tailwind v4</span>
                <span className="px-2 py-0.5 text-[10px] bg-slate-900 text-slate-300 rounded border border-slate-800">Lucide Icons</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="card-glass p-5 rounded-xl border border-slate-800/80 hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Express.js API</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                ES module architecture, separation of <code className="text-emerald-400">app.js</code> and <code className="text-emerald-400">server.js</code>, and centralized error handling.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 text-[10px] bg-slate-900 text-slate-300 rounded border border-slate-800">ES Modules</span>
                <span className="px-2 py-0.5 text-[10px] bg-slate-900 text-slate-300 rounded border border-slate-800">Nodemon</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="card-glass p-5 rounded-xl border border-slate-800/80 hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">MongoDB + Mongoose</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Strictly MongoDB & Mongoose ODM. Zero Prisma, PostgreSQL, or SQLite dependencies in the tree.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 text-[10px] bg-slate-900 text-slate-300 rounded border border-slate-800">Mongoose 8</span>
                <span className="px-2 py-0.5 text-[10px] bg-slate-900 text-slate-300 rounded border border-slate-800">Atlas Ready</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="card-glass p-5 rounded-xl border border-slate-800/80 hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Security & Stability</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Helmet security headers, CORS origin verification, express-rate-limit protection, and Zod input validation.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 text-[10px] bg-slate-900 text-slate-300 rounded border border-slate-800">Helmet</span>
                <span className="px-2 py-0.5 text-[10px] bg-slate-900 text-slate-300 rounded border border-slate-800">Rate Limit</span>
                <span className="px-2 py-0.5 text-[10px] bg-slate-900 text-slate-300 rounded border border-slate-800">Zod</span>
              </div>
            </div>
          </div>
        </div>

        {/* Development CLI Quickstart */}
        <div id="architecture" className="mt-16 max-w-4xl mx-auto">
          <div className="card-glass rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Development Quickstart Commands
            </h2>
            <p className="text-xs text-slate-400 mt-1">Run frontend and backend in separate terminal windows</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              {/* Backend Command */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Backend Server</span>
                  <code className="text-xs font-mono text-emerald-300 mt-1 block">cd backend &amp;&amp; npm run dev</code>
                </div>
                <button
                  onClick={() => copyToClipboard('cd backend && npm run dev', 'backend')}
                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Copy command"
                >
                  {copiedCmd === 'backend' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Frontend Command */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Frontend Client</span>
                  <code className="text-xs font-mono text-emerald-300 mt-1 block">cd frontend &amp;&amp; npm run dev</code>
                </div>
                <button
                  onClick={() => copyToClipboard('cd frontend && npm run dev', 'frontend')}
                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Copy command"
                >
                  {copiedCmd === 'frontend' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

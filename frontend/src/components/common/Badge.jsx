import React from 'react';

export default function Badge({ variant = 'default', children, className = '' }) {
  const variantStyles = {
    // Match Statuses
    Scheduled: 'bg-sky-950/70 text-sky-400 border-sky-500/30',
    Live: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 animate-pulse',
    Completed: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30',
    Cancelled: 'bg-rose-950/50 text-rose-400 border-rose-500/30',

    // Player Positions
    Goalkeeper: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    Defender: 'bg-blue-950/60 text-blue-300 border-blue-500/30',
    Midfielder: 'bg-purple-950/60 text-purple-300 border-purple-500/30',
    Forward: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    Utility: 'bg-slate-800 text-slate-300 border-slate-700',

    // General
    active: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30',
    inactive: 'bg-slate-800 text-slate-400 border-slate-700',
    default: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style} ${className}`}
    >
      {variant === 'Live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
      )}
      {children}
    </span>
  );
}

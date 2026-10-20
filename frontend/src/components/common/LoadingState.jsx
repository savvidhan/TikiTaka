import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading TikiTaka data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 my-6">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-300">{message}</p>
      <p className="text-xs text-slate-500 mt-1">Connecting to TikiTaka API engine</p>
    </div>
  );
}

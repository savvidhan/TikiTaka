import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Failed to Load Data',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-rose-950/20 border border-rose-500/30 my-6 max-w-xl mx-auto">
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-rose-200">{title}</h3>
      <p className="text-xs text-rose-300/80 mt-1 max-w-md">{message}</p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}

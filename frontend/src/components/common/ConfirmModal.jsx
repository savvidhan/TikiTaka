import React from 'react';
import { AlertTriangle, AlertCircle, X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  actionNote = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger', // 'danger' | 'warning' | 'primary'
  loading = false
}) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
      iconBg: 'bg-red-500/10 border-red-500/20',
      btn: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'
    },
    warning: {
      icon: <AlertCircle className="w-6 h-6 text-amber-400" />,
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30'
    },
    primary: {
      icon: <AlertCircle className="w-6 h-6 text-emerald-400" />,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      btn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
    }
  };

  const currentStyle = variantStyles[confirmVariant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${currentStyle.iconBg}`}>
            {currentStyle.icon}
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-lg font-bold text-white font-['Outfit']">{title}</h3>
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        {actionNote && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{actionNote}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 disabled:opacity-50 ${currentStyle.btn}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

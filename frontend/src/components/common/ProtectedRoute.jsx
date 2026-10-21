import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse mb-4">
          <span className="text-2xl animate-spin">⚽</span>
        </div>
        <h3 className="text-base font-bold text-white font-['Outfit']">Verifying Authorization...</h3>
        <p className="text-xs text-slate-400 mt-1">Checking session credentials and role permissions</p>
      </div>
    );
  }

  // Not logged in: redirect to login and remember intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role validation check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl bg-slate-900/90 border border-rose-500/30 text-center shadow-2xl backdrop-blur-md">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white font-['Outfit'] tracking-tight">Access Restricted</h2>
        <p className="text-sm text-slate-300 mt-2">
          Your account role (<span className="font-semibold text-emerald-400">{user.role}</span>) does not have permission to access this administrative section.
        </p>
        <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
          Required Role: <span className="font-mono text-slate-200">{allowedRoles.join(' or ')}</span>
        </div>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Switch Account
          </button>
        </div>
      </div>
    );
  }

  return children;
}

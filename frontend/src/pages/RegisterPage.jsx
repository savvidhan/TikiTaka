import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Shield, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function RegisterPage() {
  const { register, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Spectator'); // Default role: Spectator
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // 1. Client-side field validations mirroring backend rules
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      setError('Name must be between 2 and 100 characters');
      return;
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please provide a valid email address');
      return;
    }

    // Role safety check: strictly allow only Spectator or TeamManager
    if (role !== 'Spectator' && role !== 'TeamManager') {
      setError('Invalid role selection. Only Spectator and TeamManager are permitted.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password.length > 128) {
      setError('Password cannot exceed 128 characters');
      return;
    }

    const complexityRegex = /^(?=.*[a-zA-Z])(?=.*[\d\W]).{8,128}$/;
    if (!complexityRegex.test(password)) {
      setError('Password must contain at least one letter and at least one number or special character');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      // 2. Register user on backend
      const res = await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role
      });

      setSuccessMessage('Account created successfully! Welcome to TikiTaka.');
      navigate('/', { replace: true });
    } catch (err) {
      if (err.status === 409) {
        setError('An account with this email address already exists. Please sign in or use a different email.');
      } else if (err.status === 400) {
        setError(err?.data?.message || err.message || 'Invalid registration details.');
      } else if (err.isNetworkError) {
        setError('Cannot reach server. Please ensure the backend is running.');
      } else {
        setError(err?.data?.message || err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/40 mx-auto mb-4">
            <span className="text-2xl">⚽</span>
          </div>
          <h1 className="text-3xl font-black text-white font-['Outfit'] tracking-tight">
            Create Your Account
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Join Tiki<span className="text-emerald-400">Taka</span> to follow matches or manage grassroots clubs
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Pep Guardiola"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pep@mancity.test"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {/* Account Role Selection (Strictly Spectator or TeamManager only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('Spectator')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === 'Spectator'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" /> Spectator
                    </span>
                    {role === 'Spectator' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">Follow fixtures, rosters &amp; live stats</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('TeamManager')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === 'TeamManager'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" /> Team Manager
                    </span>
                    {role === 'TeamManager' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">Create teams, roster players &amp; fixtures</p>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 italic">
                Note: Admin and Referee accounts are assigned privately by league organizers.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 chars (letters + numbers)"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register as {role === 'TeamManager' ? 'Team Manager' : 'Spectator'}</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Protected by RBAC
            </span>
            <Link
              to="/login"
              className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 group"
            >
              <span>Already registered? Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

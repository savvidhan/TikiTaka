import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Trophy, 
  Calendar, 
  ArrowRight, 
  Activity, 
  Database,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { getDashboardStats } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import Badge from '../components/common/Badge';

export default function DashboardPage({ healthState }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Football Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time grassroots team rosters, fixture scheduling, and live score management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/matches"
            className="px-3.5 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Match</span>
          </Link>
          <Link
            to="/teams"
            className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Create Team</span>
          </Link>
          <Link
            to="/players"
            className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Register Player</span>
          </Link>
        </div>
      </div>

      {loading && <LoadingState message="Fetching live football data..." />}

      {error && (
        <ErrorState
          title="Could Not Load Dashboard Statistics"
          message={error}
          onRetry={loadStats}
        />
      )}

      {!loading && !error && stats && (
        <>
          {/* 4 Primary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Teams */}
            <Link
              to="/teams"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-emerald-400 flex items-center gap-1 font-semibold">
                  View Teams <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-white font-['Outfit']">{stats.totalTeams}</span>
                <p className="text-xs text-slate-400 mt-1 font-medium">Registered Active Teams</p>
              </div>
            </Link>

            {/* 2. Players */}
            <Link
              to="/players"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-blue-400 flex items-center gap-1 font-semibold">
                  View Squads <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-white font-['Outfit']">{stats.totalPlayers}</span>
                <p className="text-xs text-slate-400 mt-1 font-medium">Active Squad Players</p>
              </div>
            </Link>

            {/* 3. Upcoming Matches */}
            <Link
              to="/matches"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/40 hover:bg-slate-900 transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-sky-400 flex items-center gap-1 font-semibold">
                  Fixtures <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-white font-['Outfit']">{stats.upcomingMatchesCount}</span>
                <p className="text-xs text-slate-400 mt-1 font-medium">Scheduled Fixtures</p>
              </div>
            </Link>

            {/* 4. Completed Matches */}
            <Link
              to="/matches"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-900 transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-purple-400 flex items-center gap-1 font-semibold">
                  Results <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-white font-['Outfit']">{stats.completedMatchesCount}</span>
                <p className="text-xs text-slate-400 mt-1 font-medium">Completed Match Results</p>
              </div>
            </Link>
          </div>

          {/* Recent & Upcoming Fixtures List */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  Recent &amp; Upcoming Matches
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Live scores, scheduled derbies, and tournament finals</p>
              </div>

              <Link
                to="/matches"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                View Full Match Schedule <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4 divide-y divide-slate-800/80">
              {stats.recentMatches.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No matches recorded yet.</p>
              ) : (
                stats.recentMatches.map((match) => (
                  <div
                    key={match._id}
                    className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-900/40 px-3 rounded-xl transition-colors"
                  >
                    {/* Fixture details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">{match.competitionName || 'Match'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-400">{match.matchType || 'Friendly'}</span>
                        <Badge variant={match.status}>{match.status}</Badge>
                      </div>

                      <h3 className="text-sm font-bold text-white">
                        {match.homeTeam?.name || 'Home Team'}{' '}
                        <span className="text-slate-400 font-normal">vs</span>{' '}
                        {match.awayTeam?.name || 'Away Team'}
                      </h3>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(match.scheduledAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>•</span>
                        <span>{match.venue || 'TBD Ground'}</span>
                      </div>
                    </div>

                    {/* Scoreline & Manage action */}
                    <div className="flex items-center gap-3 self-end md:self-center">
                      <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-center">
                        <span className="text-base font-black text-white">
                          {match.status === 'Completed' || match.status === 'Live'
                            ? `${match.homeScore} - ${match.awayScore}`
                            : 'VS'}
                        </span>
                      </div>
                      <Link
                        to={`/matches/${match._id}/manage`}
                        className="p-2 bg-slate-900 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 rounded-xl transition-colors text-xs font-semibold"
                        title="Open Live Match Center"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

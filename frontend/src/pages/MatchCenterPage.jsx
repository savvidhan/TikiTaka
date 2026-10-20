import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Trophy, 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Clock, 
  MapPin, 
  Calendar, 
  RotateCw, 
  Radio, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Zap, 
  Shield, 
  X,
  Loader2
} from 'lucide-react';
import { 
  getMatchById, 
  updateMatchStatus, 
  recordGoal 
} from '../services/api';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import Badge from '../components/common/Badge';
import ConfirmModal from '../components/common/ConfirmModal';

// Supported in-game goal types for Live Match Center
// Note: 'OwnGoal' is temporarily omitted in this milestone pending opposite-roster attribution handling
const GOAL_TYPES = ['OpenPlay', 'Penalty', 'FreeKick'];

export default function MatchCenterPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Status transition confirm modal
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionNote: '',
    confirmText: '',
    confirmVariant: 'primary',
    targetStatus: null
  });

  // Goal Recording Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalData, setGoalData] = useState({
    team: '',
    player: '',
    minute: '',
    type: 'OpenPlay'
  });
  const [goalError, setGoalError] = useState(null);
  const [recordingGoal, setRecordingGoal] = useState(false);

  // Success / Error Banner
  const [feedback, setFeedback] = useState(null);

  const fetchMatchDetails = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await getMatchById(id);
      setMatch(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load match details');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatchDetails();
  }, [fetchMatchDetails]);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Handle Transition Confirmation
  const handlePromptTransition = (targetStatus) => {
    if (targetStatus === 'Live') {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Start Live Match',
        message: `Are you ready to kick off "${match.homeTeam?.name} vs ${match.awayTeam?.name}"? The match will transition to "Live" status and enable real-time goal recording.`,
        actionNote: 'This will record the official start time of the fixture.',
        confirmText: 'Start Match Now',
        confirmVariant: 'primary',
        targetStatus: 'Live'
      });
    } else if (targetStatus === 'Completed') {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Complete Match & Finalize Score',
        message: `Are you sure you want to blow the final whistle? The current score of ${match.homeScore} - ${match.awayScore} will be officially sealed.`,
        actionNote: 'Terminal Status: Completed matches cannot be restarted or edited in order to preserve historical league results and player statistics.',
        confirmText: 'Complete Match',
        confirmVariant: 'warning',
        targetStatus: 'Completed'
      });
    } else if (targetStatus === 'Cancelled') {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Cancel Match Fixture',
        message: `Are you sure you want to cancel "${match.title}"?`,
        actionNote: 'Cancelled matches cannot be restarted.',
        confirmText: 'Cancel Match',
        confirmVariant: 'danger',
        targetStatus: 'Cancelled'
      });
    }
  };

  const handleConfirmTransition = async () => {
    if (!confirmModalConfig.targetStatus) return;
    setActionLoading(true);
    try {
      const res = await updateMatchStatus(id, confirmModalConfig.targetStatus);
      setFeedback({
        type: 'success',
        message: res.message || `Match status changed to ${confirmModalConfig.targetStatus}.`
      });
      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      await fetchMatchDetails(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Status transition failed.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Goal Recording Modal
  const handleOpenGoalModal = () => {
    if (!match || match.status !== 'Live') return;

    // Estimate elapsed minute from startedAt if available
    let estimatedMinute = 1;
    if (match.startedAt) {
      const diffMs = Date.now() - new Date(match.startedAt).getTime();
      estimatedMinute = Math.min(120, Math.max(1, Math.floor(diffMs / 60000)));
    }

    // Default scoring team to home team
    const defaultTeamId = match.homeTeam?._id || '';
    setGoalData({
      team: defaultTeamId,
      player: '',
      minute: estimatedMinute,
      type: 'OpenPlay'
    });
    setGoalError(null);
    setIsGoalModalOpen(true);
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    setGoalError(null);

    if (!goalData.team) {
      setGoalError('Please select which club scored');
      return;
    }
    if (!goalData.player) {
      setGoalError('Please select the scorer from the club roster');
      return;
    }

    const min = parseInt(goalData.minute, 10);
    if (isNaN(min) || min < 0 || min > 130) {
      setGoalError('Goal minute must be an integer between 0 and 130');
      return;
    }

    setRecordingGoal(true);
    try {
      const payload = {
        team: goalData.team,
        player: goalData.player,
        minute: min,
        type: goalData.type
      };

      const res = await recordGoal(id, payload);
      setFeedback({
        type: 'success',
        message: res.message || `Goal recorded at minute ${min}!`
      });
      setIsGoalModalOpen(false);
      await fetchMatchDetails(true);
    } catch (err) {
      setGoalError(err.message || 'Failed to record goal.');
    } finally {
      setRecordingGoal(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState 
          count={1} 
          type="cards" 
          message="Entering live match center..." 
        />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="space-y-4">
        <Link
          to="/matches"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Matches</span>
        </Link>
        <ErrorState
          title="Could Not Load Match Center"
          message={error || 'Match not found.'}
          onRetry={() => fetchMatchDetails()}
        />
      </div>
    );
  }

  const isScheduled = match.status === 'Scheduled';
  const isLive = match.status === 'Live';
  const isCompleted = match.status === 'Completed';
  const isCancelled = match.status === 'Cancelled';

  // Determine scoring team roster options for Goal Modal
  const isHomeScoring = goalData.team === match.homeTeam?._id;
  const currentScoringTeam = isHomeScoring ? match.homeTeam : match.awayTeam;
  const eligibleScorers = Array.isArray(currentScoringTeam?.roster)
    ? currentScoringTeam.roster
    : [];

  // Sort goals chronologically
  const sortedGoals = Array.isArray(match.goals)
    ? [...match.goals].sort((a, b) => (a.minute || 0) - (b.minute || 0))
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <Link
            to="/matches"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Fixtures &amp; Scores</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-['Outfit']">
              Live Match Center
            </h1>
            <Badge variant={match.status}>{match.status}</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {match.competitionName || 'Tournament Fixture'} • {match.venue || 'TBD Ground'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchMatchDetails(true)}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Refresh Match State"
            aria-label="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {isScheduled && (
            <button
              onClick={() => handlePromptTransition('Live')}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Kick Off Match</span>
            </button>
          )}

          {isLive && (
            <>
              <button
                onClick={handleOpenGoalModal}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Record Goal</span>
              </button>

              <button
                onClick={() => handlePromptTransition('Completed')}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Final Whistle</span>
              </button>
            </>
          )}

          {(isScheduled || isLive) && (
            <button
              onClick={() => handlePromptTransition('Cancelled')}
              disabled={actionLoading}
              className="px-3 py-2.5 bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel Match
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/70 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Stadium Scoreboard */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          {/* Home Team */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right flex-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-white text-xl sm:text-2xl font-['Outfit'] shadow-lg mb-3">
              {match.homeTeam?.shortName || match.homeTeam?.name?.slice(0, 3).toUpperCase() || 'HOM'}
            </div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-white font-['Outfit']">
              {match.homeTeam?.name || 'Home Team'}
            </h2>
            <span className="text-xs text-slate-400 font-mono mt-0.5">
              Home • {match.homeTeam?.homeGround || 'Main Ground'}
            </span>
          </div>

          {/* Center Score & Match State */}
          <div className="flex flex-col items-center justify-center px-6 py-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 min-w-[200px] sm:min-w-[240px]">
            {/* Status indicator */}
            <div className="flex items-center space-x-2 mb-2">
              {isLive ? (
                <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] font-bold">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>LIVE MATCH</span>
                </div>
              ) : isCompleted ? (
                <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                  FULL TIME
                </div>
              ) : isCancelled ? (
                <div className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-bold">
                  CANCELLED
                </div>
              ) : (
                <div className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[11px] font-bold">
                  SCHEDULED
                </div>
              )}
            </div>

            {/* Score numbers */}
            <div className="text-4xl sm:text-6xl font-black text-white font-mono tracking-widest flex items-center space-x-4">
              <span>{match.homeScore ?? 0}</span>
              <span className="text-slate-600 font-light text-3xl sm:text-5xl">-</span>
              <span>{match.awayScore ?? 0}</span>
            </div>

            {/* Match kickoff / duration */}
            <div className="mt-3 text-center text-xs text-slate-400 space-y-0.5">
              <div className="flex items-center justify-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {isLive && match.startedAt
                    ? `Elapsed: ~${Math.max(1, Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 60000))}'`
                    : `${match.durationMinutes || 90} Min Match`}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Kickoff: {new Date(match.scheduledAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-white text-xl sm:text-2xl font-['Outfit'] shadow-lg mb-3">
              {match.awayTeam?.shortName || match.awayTeam?.name?.slice(0, 3).toUpperCase() || 'AWY'}
            </div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-white font-['Outfit']">
              {match.awayTeam?.name || 'Away Team'}
            </h2>
            <span className="text-xs text-slate-400 font-mono mt-0.5">
              Away Club
            </span>
          </div>
        </div>

        {/* State Notice Banner */}
        {isCompleted && (
          <div className="mt-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 text-center font-semibold">
            Official Result Sealed — Match has concluded and score history is permanently preserved.
          </div>
        )}
        {isCancelled && (
          <div className="mt-6 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center font-semibold">
            This match was cancelled before completion.
          </div>
        )}
      </div>

      {/* Grid: Goal Timeline & Squad Lineups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Goal Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-['Outfit']">
                  Goal Timeline &amp; Scoring Events ({sortedGoals.length})
                </h3>
              </div>

              {isLive && (
                <button
                  onClick={handleOpenGoalModal}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Goal</span>
                </button>
              )}
            </div>

            {sortedGoals.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Trophy className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <span>No goals recorded yet for this fixture.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/60">
                {sortedGoals.map((goal, idx) => {
                  const isHomeGoal = goal.team?._id === match.homeTeam?._id || goal.team === match.homeTeam?._id;
                  const clubName = isHomeGoal ? match.homeTeam?.name : match.awayTeam?.name;
                  const clubCode = isHomeGoal ? match.homeTeam?.shortName : match.awayTeam?.shortName;

                  return (
                    <div
                      key={goal._id || idx}
                      className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-black text-sm">
                          {goal.minute}'
                        </div>
                        <div>
                          <span className="font-bold text-white text-sm block">
                            {goal.player?.displayName || `${goal.player?.firstName || ''} ${goal.player?.lastName || ''}`.trim() || 'Goal Scorer'}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-emerald-400">{clubName || 'Club'}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-500">[{clubCode || 'FC'}]</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-semibold">
                          {goal.type || 'OpenPlay'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Match Details & Rosters */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 text-[11px] pb-2 border-b border-slate-800">
              Fixture Specifications
            </h4>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Match Type:</span>
              <span className="font-semibold text-white">{match.matchType || 'Friendly'}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Competition:</span>
              <span className="font-semibold text-white">{match.competitionName || 'None'}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Venue:</span>
              <span className="font-semibold text-white">{match.venue || 'TBD'}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Scheduled:</span>
              <span className="font-semibold text-white">
                {new Date(match.scheduledAt).toLocaleDateString()}
              </span>
            </div>
            {match.notes && (
              <div className="pt-2 border-t border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-300 block mb-0.5">Notes:</span>
                {match.notes}
              </div>
            )}
          </div>

          {/* Quick Lineups Overview */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 text-[11px] pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>Squad Rosters</span>
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-white block mb-1">
                  {match.homeTeam?.name} ({match.homeTeam?.roster?.length || 0} registered)
                </span>
                <div className="text-[11px] text-slate-400 max-h-28 overflow-y-auto space-y-1 pr-1">
                  {match.homeTeam?.roster?.map((m, idx) => (
                    <div key={idx} className="flex justify-between py-0.5">
                      <span>#{m.jerseyNumber || '-'} {m.player?.displayName || 'Player'}</span>
                      <span className="text-slate-400">{m.role || 'Utility'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="font-bold text-white block mb-1">
                  {match.awayTeam?.name} ({match.awayTeam?.roster?.length || 0} registered)
                </span>
                <div className="text-[11px] text-slate-400 max-h-28 overflow-y-auto space-y-1 pr-1">
                  {match.awayTeam?.roster?.map((m, idx) => (
                    <div key={idx} className="flex justify-between py-0.5">
                      <span>#{m.jerseyNumber || '-'} {m.player?.displayName || 'Player'}</span>
                      <span className="text-slate-400">{m.role || 'Utility'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setIsGoalModalOpen(false)}
              disabled={recordingGoal}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit']">Record Goal Event</h3>
                <p className="text-xs text-slate-400 mt-0.5">Attributed to official match scoreline</p>
              </div>
            </div>

            {goalError && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-xs text-red-300 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{goalError}</span>
              </div>
            )}

            <form onSubmit={handleGoalSubmit} className="mt-4 space-y-4">
              {/* Scoring Team */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Scoring Club <span className="text-emerald-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setGoalData((prev) => ({
                        ...prev,
                        team: match.homeTeam?._id,
                        player: '' // Reset selected player when changing team
                      }))
                    }
                    className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      goalData.team === match.homeTeam?._id
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {match.homeTeam?.name} (Home)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setGoalData((prev) => ({
                        ...prev,
                        team: match.awayTeam?._id,
                        player: '' // Reset selected player when changing team
                      }))
                    }
                    className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      goalData.team === match.awayTeam?._id
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {match.awayTeam?.name} (Away)
                  </button>
                </div>
              </div>

              {/* Scorer from Roster */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Goal Scorer <span className="text-emerald-400">*</span>
                </label>
                {eligibleScorers.length === 0 ? (
                  <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-400">
                    No players registered in this club's roster. To attribute a goal, players must be registered to the team squad.
                  </p>
                ) : (
                  <select
                    name="player"
                    required
                    value={goalData.player}
                    onChange={(e) =>
                      setGoalData((prev) => ({ ...prev, player: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">-- Select Goal Scorer --</option>
                    {eligibleScorers.map((member) => (
                      <option key={member.player?._id || member.player} value={member.player?._id || member.player}>
                        #{member.jerseyNumber || '-'} {member.player?.displayName || member.displayName || 'Player'} ({member.role || 'Utility'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Minute & Goal Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Minute (0-130) <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={130}
                    required
                    value={goalData.minute}
                    onChange={(e) =>
                      setGoalData((prev) => ({ ...prev, minute: e.target.value }))
                    }
                    placeholder="e.g. 42"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Goal Type
                  </label>
                  <select
                    value={goalData.type}
                    onChange={(e) =>
                      setGoalData((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {GOAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  disabled={recordingGoal}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingGoal || eligibleScorers.length === 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center space-x-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
                >
                  {recordingGoal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Goal...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Confirm Goal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Transition Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        actionNote={confirmModalConfig.actionNote}
        confirmText={confirmModalConfig.confirmText}
        confirmVariant={confirmModalConfig.confirmVariant}
        loading={actionLoading}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmTransition}
      />
    </div>
  );
}

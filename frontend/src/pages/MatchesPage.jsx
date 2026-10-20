import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  X, 
  Zap, 
  CheckCircle2,
  AlertCircle,
  Radio,
  Plus,
  Edit2,
  Trash2,
  Play
} from 'lucide-react';
import { getMatches, getMatchById, deleteMatch } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import ConfirmModal from '../components/common/ConfirmModal';
import MatchFormModal from '../components/matches/MatchFormModal';

export default function MatchesPage() {
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Match detail modal
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [matchDetail, setMatchDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Form Modal (Schedule / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);

  // Delete Confirmation Modal
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState(null);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMatches({
        status: statusFilter,
        limit: 50
      });
      setMatches(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [statusFilter]);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleOpenMatchModal = async (id) => {
    setSelectedMatchId(id);
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await getMatchById(id);
      setMatchDetail(res.data);
    } catch (err) {
      setDetailError(err.message || 'Failed to load match scorecard');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedMatchId(null);
    setMatchDetail(null);
    setDetailError(null);
  };

  const handleOpenScheduleForm = () => {
    setEditingMatch(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (match, e) => {
    if (e) e.stopPropagation();
    setEditingMatch(match);
    setIsFormOpen(true);
  };

  const handlePromptDelete = (match, e) => {
    if (e) e.stopPropagation();
    setMatchToDelete(match);
  };

  const handleConfirmDelete = async () => {
    if (!matchToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteMatch(matchToDelete._id);
      setFeedback({
        type: 'success',
        message: res.message || `Match fixture "${matchToDelete.title}" deleted successfully.`
      });
      setMatchToDelete(null);
      if (selectedMatchId === matchToDelete._id) {
        handleCloseModal();
      }
      fetchMatches();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete fixture.'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = (savedMatch, mode) => {
    setFeedback({
      type: 'success',
      message: mode === 'created'
        ? `Match fixture "${savedMatch.title}" scheduled successfully!`
        : `Match fixture "${savedMatch.title}" updated successfully!`
    });
    fetchMatches();
    if (selectedMatchId && selectedMatchId === savedMatch._id) {
      handleOpenMatchModal(savedMatch._id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
              Match Fixtures &amp; Scores
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold font-mono">
              {matches.length} Listed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Grassroots tournament schedules, live scoring events, and official scorecards.
          </p>
        </div>

        <button
          onClick={handleOpenScheduleForm}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-sky-950/40 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Match</span>
        </button>
      </div>

      {/* Feedback banner */}
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

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto w-full sm:w-auto">
        {[
          { label: 'All Matches', value: '' },
          { label: 'Live Now', value: 'Live' },
          { label: 'Scheduled', value: 'Scheduled' },
          { label: 'Completed', value: 'Completed' },
          { label: 'Cancelled', value: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === tab.value
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.value === 'Live' && <Radio className="w-3 h-3 text-red-400 animate-pulse" />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Matches Feed */}
      {loading && <LoadingState message="Fetching official match fixtures..." />}

      {error && (
        <ErrorState
          title="Could Not Load Matches"
          message={error}
          onRetry={fetchMatches}
        />
      )}

      {!loading && !error && matches.length === 0 && (
        <EmptyState
          icon={Trophy}
          title="No Matches Found"
          message={
            statusFilter
              ? `There are currently no matches in "${statusFilter}" status.`
              : 'There are currently no fixtures scheduled in the platform. Use the button above to schedule your first fixture.'
          }
          actionLabel={statusFilter ? 'Show All Matches' : '+ Schedule Match'}
          onAction={statusFilter ? () => setStatusFilter('') : handleOpenScheduleForm}
        />
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {matches.map((match) => {
            const isLive = match.status === 'Live';
            const isScheduled = match.status === 'Scheduled';
            const isCompleted = match.status === 'Completed';

            return (
              <div
                key={match._id}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                        {match.competitionName || 'Tournament Fixture'}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {match.title}
                      </h3>
                    </div>

                    <Badge variant={match.status}>{match.status}</Badge>
                  </div>

                  {/* Team vs Team Scoreboard */}
                  <div className="py-4 my-2 flex items-center justify-between px-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs font-['Outfit'] shrink-0">
                        {match.homeTeam?.shortName || match.homeTeam?.name?.slice(0, 3).toUpperCase() || 'H'}
                      </div>
                      <span className="text-sm font-bold text-white truncate">
                        {match.homeTeam?.name || 'Home Club'}
                      </span>
                    </div>

                    <div className="px-4 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-3 shrink-0 mx-2">
                      <span className="text-base font-black text-white font-mono">
                        {match.status === 'Scheduled' ? '-' : (match.homeScore ?? 0)}
                      </span>
                      <span className="text-slate-600 font-light">:</span>
                      <span className="text-base font-black text-white font-mono">
                        {match.status === 'Scheduled' ? '-' : (match.awayScore ?? 0)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2.5 flex-1 min-w-0 justify-end">
                      <span className="text-sm font-bold text-white truncate text-right">
                        {match.awayTeam?.name || 'Away Club'}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs font-['Outfit'] shrink-0">
                        {match.awayTeam?.shortName || match.awayTeam?.name?.slice(0, 3).toUpperCase() || 'A'}
                      </div>
                    </div>
                  </div>

                  {/* Fixture Metadata */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                      <span>Kick-off:</span>
                      <span className="font-medium text-slate-300 ml-1.5">
                        {new Date(match.scheduledAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                      <span>Venue:</span>
                      <span className="font-medium text-slate-300 ml-1.5">{match.venue || 'TBD Ground'}</span>
                    </div>

                    <div className="flex items-center text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                      <span>Regulation:</span>
                      <span className="font-medium text-slate-300 ml-1.5">{match.durationMinutes} Minutes</span>
                    </div>
                  </div>

                  {/* Goal events preview */}
                  {match.goals && match.goals.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                        Goals Summary:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {match.goals.map((g, idx) => (
                          <span
                            key={g._id || idx}
                            className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/20 font-medium"
                          >
                            ⚽ {g.player?.displayName || 'Scorer'} ({g.minute}')
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center space-x-2">
                  <Link
                    to={`/matches/${match._id}/manage`}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                      isLive 
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40 animate-pulse' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                    }`}
                  >
                    {isLive ? <Radio className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isLive ? 'Live Console' : isScheduled ? 'Manage Fixture' : 'Match Center'}</span>
                  </Link>

                  <button
                    onClick={() => handleOpenMatchModal(match._id)}
                    className="py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title="View Scorecard Modal"
                  >
                    Scorecard
                  </button>

                  {isScheduled && (
                    <>
                      <button
                        onClick={(e) => handleOpenEditForm(match, e)}
                        className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="Edit Fixture"
                        aria-label="Edit Fixture"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handlePromptDelete(match, e)}
                        className="p-2 bg-slate-950 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 rounded-xl transition-colors cursor-pointer"
                        title="Delete Fixture"
                        aria-label="Delete Fixture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Match Scorecard Modal */}
      {selectedMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {matchDetail?.competitionName || 'Official Fixture'}
                </span>
                <h2 className="text-lg font-bold text-white font-['Outfit']">
                  {matchDetail?.title || 'Match Scorecard'}
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                {matchDetail && (
                  <Link
                    to={`/matches/${matchDetail._id}/manage`}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Open Live Center</span>
                  </Link>
                )}
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {loadingDetail && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Loading scorecard data...</p>
                </div>
              )}

              {detailError && (
                <ErrorState
                  title="Could Not Load Scorecard"
                  message={detailError}
                  onRetry={() => handleOpenMatchModal(selectedMatchId)}
                />
              )}

              {!loadingDetail && !detailError && matchDetail && (
                <>
                  {/* Scoreboard Block */}
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="text-center flex-1">
                      <span className="text-xs text-slate-400 block mb-1">Home</span>
                      <h3 className="font-extrabold text-white text-base font-['Outfit']">
                        {matchDetail.homeTeam?.name}
                      </h3>
                      <span className="text-[10px] font-mono text-emerald-400">
                        [{matchDetail.homeTeam?.shortName || 'H'}]
                      </span>
                    </div>

                    <div className="px-6 text-center">
                      <div className="text-3xl font-black text-white font-mono tracking-wider">
                        {matchDetail.status === 'Scheduled' ? '-' : (matchDetail.homeScore ?? 0)} - {matchDetail.status === 'Scheduled' ? '-' : (matchDetail.awayScore ?? 0)}
                      </div>
                      <Badge variant={matchDetail.status} className="mt-2">
                        {matchDetail.status}
                      </Badge>
                    </div>

                    <div className="text-center flex-1">
                      <span className="text-xs text-slate-400 block mb-1">Away</span>
                      <h3 className="font-extrabold text-white text-base font-['Outfit']">
                        {matchDetail.awayTeam?.name}
                      </h3>
                      <span className="text-[10px] font-mono text-emerald-400">
                        [{matchDetail.awayTeam?.shortName || 'A'}]
                      </span>
                    </div>
                  </div>

                  {/* Goal Events Timeline */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Official Match Goals ({matchDetail.goals?.length || 0})
                    </h3>

                    {(!matchDetail.goals || matchDetail.goals.length === 0) ? (
                      <p className="text-xs text-slate-500 py-6 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                        {matchDetail.status === 'Scheduled'
                          ? 'Goals will be recorded once the match kicks off in Live status.'
                          : 'No goals recorded in this match.'}
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                        {matchDetail.goals.map((goal, idx) => (
                          <div
                            key={goal._id || idx}
                            className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/40 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                                {goal.minute}'
                              </span>
                              <div>
                                <span className="font-bold text-white block">
                                  {goal.player?.displayName || 'Unknown Scorer'}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {goal.team?.name || 'Scoring Club'}
                                </span>
                              </div>
                            </div>

                            <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-[11px] font-semibold">
                              {goal.type || 'OpenPlay'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Additional Fixture Details */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs space-y-1.5 text-slate-400">
                    <div>
                      <span className="text-slate-400 font-semibold">Venue: </span>
                      <span className="text-slate-200">{matchDetail.venue || 'TBD'}</span>
                    </div>
                    {matchDetail.notes && (
                      <div>
                        <span className="text-slate-400 font-semibold">Notes: </span>
                        <span className="text-slate-200">{matchDetail.notes}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Match Form Modal */}
      <MatchFormModal
        isOpen={isFormOpen}
        match={editingMatch}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMatch(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(matchToDelete)}
        title="Delete Match Fixture"
        message={`Are you sure you want to remove the fixture "${matchToDelete?.title}"?`}
        actionNote="TikiTaka Fixture Rules: Completed matches cannot be deleted to preserve historic scores and records. Only Scheduled or Cancelled fixtures can be cleanly removed."
        confirmText="Confirm Delete"
        confirmVariant="danger"
        loading={deleting}
        onClose={() => setMatchToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

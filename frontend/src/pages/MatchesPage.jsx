import React, { useState, useEffect } from 'react';
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
  Radio
} from 'lucide-react';
import { getMatches, getMatchById } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Match detail modal
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [matchDetail, setMatchDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

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
      </div>

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
            {tab.value === 'Live' && <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />}
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
          description={
            statusFilter
              ? `There are currently no matches in "${statusFilter}" status.`
              : 'There are currently no fixtures scheduled in the platform.'
          }
          actionLabel={statusFilter ? 'Show All Matches' : undefined}
          onAction={statusFilter ? () => setStatusFilter('') : undefined}
        />
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {matches.map((match) => {
            const hasStartedOrFinished = match.status === 'Completed' || match.status === 'Live';
            return (
              <div
                key={match._id}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-300">
                        {match.competitionName || 'Tournament Fixture'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-slate-500">{match.matchType}</span>
                    </div>

                    <Badge variant={match.status}>{match.status}</Badge>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-white mt-3 group-hover:text-emerald-400 transition-colors">
                    {match.title}
                  </h3>

                  {/* Teams vs Scoreboard Display */}
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                    {/* Home Team */}
                    <div className="flex-1 text-left">
                      <span className="text-sm font-black text-white block">
                        {match.homeTeam?.name || 'Home Team'}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        {match.homeTeam?.shortName || 'HOME'}
                      </span>
                    </div>

                    {/* Score / VS Center */}
                    <div className="px-4 text-center">
                      {hasStartedOrFinished ? (
                        <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700/80 font-mono font-black text-lg text-emerald-400 tracking-wider">
                          {match.homeScore} - {match.awayScore}
                        </div>
                      ) : (
                        <span className="px-3 py-1 rounded-lg bg-slate-900 text-slate-400 text-xs font-black uppercase tracking-wider font-mono">
                          VS
                        </span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 text-right">
                      <span className="text-sm font-black text-white block">
                        {match.awayTeam?.name || 'Away Team'}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                        {match.awayTeam?.shortName || 'AWAY'}
                      </span>
                    </div>
                  </div>

                  {/* Fixture Metadata */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
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
                      <MapPin className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                      <span>Venue:</span>
                      <span className="font-medium text-slate-300 ml-1.5">{match.venue || 'TBD Ground'}</span>
                    </div>

                    <div className="flex items-center text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                      <span>Regulation:</span>
                      <span className="font-medium text-slate-300 ml-1.5">{match.durationMinutes} Minutes</span>
                    </div>
                  </div>

                  {/* Goal events preview */}
                  {match.goals && match.goals.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
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

                {/* Scorecard Action */}
                <div className="mt-5 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenMatchModal(match._id)}
                    className="w-full py-2 bg-slate-950 hover:bg-emerald-600/10 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>View Match Scorecard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Match Scorecard Modal */}
      {selectedMatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
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

              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {loadingDetail && <LoadingState message="Fetching official match details..." />}

              {detailError && (
                <ErrorState
                  title="Could Not Load Scorecard"
                  message={detailError}
                  onRetry={() => handleOpenMatchModal(selectedMatchId)}
                />
              )}

              {!loadingDetail && !detailError && matchDetail && (
                <>
                  {/* Prominent Scorecard Box */}
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                    {/* Home Club */}
                    <div className="flex-1">
                      <span className="text-base font-black text-white block">
                        {matchDetail.homeTeam?.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Ground: {matchDetail.homeTeam?.homeGround || 'Main Ground'}
                      </span>
                    </div>

                    {/* Score Center */}
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-emerald-400 font-mono tracking-widest">
                        {matchDetail.homeScore} - {matchDetail.awayScore}
                      </span>
                      <Badge variant={matchDetail.status} className="mt-1.5">
                        {matchDetail.status}
                      </Badge>
                    </div>

                    {/* Away Club */}
                    <div className="flex-1 sm:text-right">
                      <span className="text-base font-black text-white block">
                        {matchDetail.awayTeam?.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Ground: {matchDetail.awayTeam?.homeGround || 'Main Ground'}
                      </span>
                    </div>
                  </div>

                  {/* Goal Events Timeline */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Goal Timeline ({matchDetail.goals?.length || 0})
                    </h3>

                    {(!matchDetail.goals || matchDetail.goals.length === 0) ? (
                      <p className="text-xs text-slate-500 py-4 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                        No goals recorded for this match yet.
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
    </div>
  );
}

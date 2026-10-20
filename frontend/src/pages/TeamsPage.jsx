import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  MapPin, 
  Users, 
  Crown, 
  X, 
  ExternalLink,
  ChevronRight,
  Filter,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { getTeams, getTeamById, deleteTeam } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import ConfirmModal from '../components/common/ConfirmModal';
import TeamFormModal from '../components/teams/TeamFormModal';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Team squad detail modal
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamDetail, setTeamDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Form Modal (Create / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Delete Confirmation Modal
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState(null);

  const fetchTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTeams({
        search: searchTerm,
        isActive: activeFilter
      });
      setTeams(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeams();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeFilter]);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleOpenTeamModal = async (id) => {
    setSelectedTeamId(id);
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await getTeamById(id);
      setTeamDetail(res.data);
    } catch (err) {
      setDetailError(err.message || 'Failed to load squad details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedTeamId(null);
    setTeamDetail(null);
    setDetailError(null);
  };

  const handleOpenCreateForm = () => {
    setEditingTeam(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = async (team, e) => {
    if (e) e.stopPropagation();
    // Fetch full team with roster before opening edit form
    try {
      const full = await getTeamById(team._id);
      setEditingTeam(full.data);
    } catch {
      setEditingTeam(team);
    }
    setIsFormOpen(true);
  };

  const handlePromptDelete = (team, e) => {
    if (e) e.stopPropagation();
    setTeamToDelete(team);
  };

  const handleConfirmDelete = async () => {
    if (!teamToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteTeam(teamToDelete._id);
      setFeedback({
        type: 'success',
        message: res.message || `Club "${teamToDelete.name}" processed successfully.`
      });
      setTeamToDelete(null);
      if (selectedTeamId === teamToDelete._id) {
        handleCloseModal();
      }
      fetchTeams();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete club.'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = (savedTeam, mode) => {
    setFeedback({
      type: 'success',
      message: mode === 'created'
        ? `Club "${savedTeam.name}" created successfully!`
        : `Club "${savedTeam.name}" updated successfully!`
    });
    fetchTeams();
    if (selectedTeamId && selectedTeamId === savedTeam._id) {
      handleOpenTeamModal(savedTeam._id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
              Football Teams
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
              {teams.length} Registered
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Registered grassroots clubs, home grounds, captains, and squad rosters.
          </p>
        </div>

        <button
          onClick={handleOpenCreateForm}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Team</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search teams by name or short code..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl self-stretch sm:self-auto">
          <button
            onClick={() => setActiveFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFilter === '' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Clubs
          </button>
          <button
            onClick={() => setActiveFilter('true')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFilter === 'true' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveFilter('false')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFilter === 'false' ? 'bg-slate-800 text-slate-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading && (
        <LoadingState 
          count={6} 
          type="cards" 
          message="Loading football clubs from database..." 
        />
      )}

      {error && !loading && (
        <ErrorState
          title="Could Not Load Teams"
          message={error}
          onRetry={fetchTeams}
        />
      )}

      {!loading && !error && teams.length === 0 && (
        <EmptyState
          icon={Shield}
          title="No Teams Found"
          message={
            searchTerm
              ? `No football teams matched "${searchTerm}". Try a different search query.`
              : 'There are currently no football teams registered in the system. Create your first club using the button above.'
          }
          actionLabel={searchTerm ? 'Clear Search' : '+ Create Team'}
          onAction={searchTerm ? () => setSearchTerm('') : handleOpenCreateForm}
        />
      )}

      {!loading && !error && teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => (
            <div
              key={team._id}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div>
                {/* Header with Short code & Status */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-sm font-['Outfit']">
                      {team.shortName || team.name.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">Code: {team.shortName || 'N/A'}</p>
                    </div>
                  </div>

                  <Badge variant={team.isActive ? 'active' : 'inactive'}>
                    {team.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Team meta attributes */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <span className="text-slate-400 mr-1">Home Ground:</span>
                    <span className="font-medium text-slate-200">{team.homeGround || 'Not Specified'}</span>
                  </div>

                  <div className="flex items-center text-slate-300">
                    <Crown className="w-3.5 h-3.5 text-amber-400 mr-2 shrink-0" />
                    <span className="text-slate-400 mr-1">Captain:</span>
                    <span className="font-medium text-amber-200">
                      {team.captain?.displayName || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center text-slate-300">
                    <Users className="w-3.5 h-3.5 text-emerald-400 mr-2 shrink-0" />
                    <span className="text-slate-400 mr-1">Roster Size:</span>
                    <span className="font-bold text-emerald-300 font-mono">
                      {team.rosterCount || 0} Registered Players
                    </span>
                  </div>

                  {team.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 pt-2 border-t border-slate-800/60 leading-relaxed">
                      {team.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center space-x-2">
                <button
                  onClick={() => handleOpenTeamModal(team._id)}
                  className="flex-1 py-2 bg-slate-950 hover:bg-emerald-600/10 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Squad Roster</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleOpenEditForm(team, e)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Edit Club"
                  aria-label="Edit Club"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handlePromptDelete(team, e)}
                  className="p-2 bg-slate-950 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 rounded-xl transition-colors cursor-pointer"
                  title="Delete Club"
                  aria-label="Delete Club"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Squad Roster Modal / Drawer */}
      {selectedTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-['Outfit'] text-sm">
                  {teamDetail?.shortName || teamDetail?.name?.slice(0, 3)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-['Outfit']">
                    {teamDetail?.name || 'Club Roster'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Home Ground: {teamDetail?.homeGround || 'TBD'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {teamDetail && (
                  <>
                    <button
                      onClick={(e) => {
                        handleCloseModal();
                        handleOpenEditForm(teamDetail, e);
                      }}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Club"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        handlePromptDelete(teamDetail, e);
                      }}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Club"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {loadingDetail && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Retrieving official squad roster...</p>
                </div>
              )}

              {detailError && (
                <ErrorState
                  title="Could Not Load Squad Roster"
                  message={detailError}
                  onRetry={() => handleOpenTeamModal(selectedTeamId)}
                />
              )}

              {!loadingDetail && !detailError && teamDetail && (
                <>
                  {/* Captain Banner */}
                  {teamDetail.captain && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-amber-400/80 block">
                            Designated Club Captain
                          </span>
                          <span className="font-bold text-white text-sm">
                            {teamDetail.captain.displayName || `${teamDetail.captain.firstName} ${teamDetail.captain.lastName}`}
                          </span>
                        </div>
                      </div>

                      <Badge variant={teamDetail.captain.primaryPosition}>
                        {teamDetail.captain.primaryPosition}
                      </Badge>
                    </div>
                  )}

                  {/* Roster Table */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      Official Squad Members ({teamDetail.roster?.length || 0})
                    </h3>

                    {(!teamDetail.roster || teamDetail.roster.length === 0) ? (
                      <p className="text-xs text-slate-500 py-6 text-center">
                        No players currently assigned to this team's roster.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                        {teamDetail.roster.map((member, idx) => (
                          <div
                            key={member.player?._id || idx}
                            className="p-3 flex items-center justify-between text-xs hover:bg-slate-800/40 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center font-mono font-bold text-xs border border-slate-700">
                                {member.jerseyNumber !== undefined && member.jerseyNumber !== null
                                  ? member.jerseyNumber
                                  : '-'}
                              </span>
                              <div>
                                <span className="font-semibold text-white block">
                                  {member.player?.displayName || 'Unknown Player'}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {member.player?.preferredFoot ? `${member.player.preferredFoot} Foot` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Badge variant={member.role || member.player?.primaryPosition || 'Utility'}>
                                {member.role || member.player?.primaryPosition || 'Utility'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Form Modal */}
      <TeamFormModal
        isOpen={isFormOpen}
        team={editingTeam}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTeam(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(teamToDelete)}
        title="Delete Football Club"
        message={`Are you sure you want to remove club "${teamToDelete?.name}"?`}
        actionNote="TikiTaka Reference-Aware Protection: If this club is scheduled in matches or has completed fixtures, the backend will safely deactivate the team instead of deleting it, preserving tournament schedules and match results."
        confirmText="Confirm Delete"
        confirmVariant="danger"
        loading={deleting}
        onClose={() => setTeamToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

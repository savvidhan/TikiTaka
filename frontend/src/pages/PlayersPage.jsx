import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  X, 
  Shield, 
  Calendar, 
  Phone, 
  Globe, 
  Footprints,
  ChevronRight,
  Filter
} from 'lucide-react';
import { getPlayers, getPlayerById } from '../services/api';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [footFilter, setFootFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Player Profile Modal
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [playerDetail, setPlayerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlayers({
        search: searchTerm,
        position: positionFilter,
        foot: footFilter,
        isActive: activeFilter
      });
      setPlayers(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load player directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlayers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, positionFilter, footFilter, activeFilter]);

  const handleOpenPlayerModal = async (id) => {
    setSelectedPlayerId(id);
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await getPlayerById(id);
      setPlayerDetail(res.data);
    } catch (err) {
      setDetailError(err.message || 'Failed to load player profile');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedPlayerId(null);
    setPlayerDetail(null);
    setDetailError(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setPositionFilter('');
    setFootFilter('');
    setActiveFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
              Player Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold font-mono">
              {players.length} Registered
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Grassroots football talent, primary positions, preferred foot, and club affiliations.
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search players by name..."
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

        {/* Filters Grid */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Position Select */}
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
          >
            <option value="">All Positions</option>
            <option value="Goalkeeper">Goalkeeper</option>
            <option value="Defender">Defender</option>
            <option value="Midfielder">Midfielder</option>
            <option value="Forward">Forward</option>
            <option value="Utility">Utility</option>
          </select>

          {/* Foot Select */}
          <select
            value={footFilter}
            onChange={(e) => setFootFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
          >
            <option value="">All Feet</option>
            <option value="Right">Right Foot</option>
            <option value="Left">Left Foot</option>
            <option value="Both">Both Feet</option>
          </select>

          {/* Status Select */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Players</option>
            <option value="false">Inactive</option>
          </select>

          {(searchTerm || positionFilter || footFilter || activeFilter) && (
            <button
              onClick={resetFilters}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl border border-slate-800 transition-colors"
              title="Reset all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading && <LoadingState message="Fetching player rosters..." />}

      {error && (
        <ErrorState
          title="Could Not Load Player Directory"
          message={error}
          onRetry={fetchPlayers}
        />
      )}

      {!loading && !error && players.length === 0 && (
        <EmptyState
          icon={Users}
          title="No Players Found"
          description={
            searchTerm || positionFilter || footFilter || activeFilter
              ? 'No players matched your active filter selections. Try adjusting or clearing your filters.'
              : 'There are currently no squad players registered in the system.'
          }
          actionLabel={searchTerm || positionFilter || footFilter || activeFilter ? 'Reset Filters' : undefined}
          onAction={searchTerm || positionFilter || footFilter || activeFilter ? resetFilters : undefined}
        />
      )}

      {!loading && !error && players.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => {
            const initials = `${player.firstName?.[0] || ''}${player.lastName?.[0] || ''}`.toUpperCase();
            return (
              <div
                key={player._id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-slate-800/80">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-sm font-['Outfit'] group-hover:border-emerald-500/40 transition-colors">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {player.displayName || `${player.firstName} ${player.lastName}`}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {player.nationality || 'Grassroots Player'}
                        </p>
                      </div>
                    </div>

                    <Badge variant={player.primaryPosition}>{player.primaryPosition}</Badge>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Preferred Foot:</span>
                      <span className="font-medium text-slate-300">{player.preferredFoot || 'Right'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className={player.isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                        {player.isActive ? 'Active Squad' : 'Inactive'}
                      </span>
                    </div>

                    {player.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Contact:</span>
                        <span className="font-mono text-slate-400">{player.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenPlayerModal(player._id)}
                    className="w-full py-2 bg-slate-950 hover:bg-emerald-600/10 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Player Profile &amp; Clubs</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Player Profile Modal */}
      {selectedPlayerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold font-['Outfit'] text-sm">
                  {playerDetail ? `${playerDetail.firstName?.[0]}${playerDetail.lastName?.[0]}` : 'P'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-['Outfit']">
                    {playerDetail?.displayName || 'Player Profile'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {playerDetail?.primaryPosition} • {playerDetail?.nationality || 'Grassroots'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {loadingDetail && <LoadingState message="Fetching player details and club records..." />}

              {detailError && (
                <ErrorState
                  title="Could Not Load Player Profile"
                  message={detailError}
                  onRetry={() => handleOpenPlayerModal(selectedPlayerId)}
                />
              )}

              {!loadingDetail && !detailError && playerDetail && (
                <>
                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Position</span>
                      <span className="font-semibold text-white mt-0.5 block">{playerDetail.primaryPosition}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Preferred Foot</span>
                      <span className="font-semibold text-white mt-0.5 block">{playerDetail.preferredFoot} Foot</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Date of Birth</span>
                      <span className="font-semibold text-white mt-0.5 block">
                        {playerDetail.dateOfBirth
                          ? new Date(playerDetail.dateOfBirth).toLocaleDateString()
                          : 'Not Provided'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                      <span className={`font-semibold mt-0.5 block ${playerDetail.isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {playerDetail.isActive ? 'Active Registration' : 'Deactivated'}
                      </span>
                    </div>
                  </div>

                  {/* Club Affiliations */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      Affiliated Teams ({playerDetail.teams?.length || 0})
                    </h3>

                    {(!playerDetail.teams || playerDetail.teams.length === 0) ? (
                      <p className="text-xs text-slate-500 py-4 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                        Player is not currently registered on any club roster.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {playerDetail.teams.map((team) => (
                          <div
                            key={team._id}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-xs font-['Outfit']">
                                {team.shortName || team.name.slice(0, 3)}
                              </div>
                              <div>
                                <span className="font-bold text-white block">{team.name}</span>
                                <span className="text-[11px] text-slate-500">{team.homeGround || 'Home Ground'}</span>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-semibold">
                              Roster Member
                            </span>
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
    </div>
  );
}

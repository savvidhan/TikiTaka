import React, { useState, useEffect } from 'react';
import { 
  X, 
  Shield, 
  Users, 
  Crown, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { getPlayers, createTeam, updateTeam } from '../../services/api';

const ROLES = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Utility'];

export default function TeamFormModal({
  isOpen,
  onClose,
  onSuccess,
  team = null // If provided, edit mode
}) {
  const isEdit = Boolean(team && team._id);

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    homeGround: '',
    description: '',
    logoUrl: '',
    captain: '',
    isActive: true
  });

  // Roster entries: array of { player: id, displayName, jerseyNumber: number, role: string }
  const [roster, setRoster] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState('');

  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available players on mount or modal open
  useEffect(() => {
    if (isOpen) {
      const fetchAvailable = async () => {
        setLoadingPlayers(true);
        try {
          const res = await getPlayers({ limit: 100 });
          setAvailablePlayers(res.data || []);
        } catch (err) {
          console.error('Failed to load players list for roster selection:', err);
        } finally {
          setLoadingPlayers(false);
        }
      };
      fetchAvailable();
    }
  }, [isOpen]);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        shortName: team.shortName || '',
        homeGround: team.homeGround || '',
        description: team.description || '',
        logoUrl: team.logoUrl || '',
        captain: team.captain?._id || team.captain || '',
        isActive: team.isActive !== undefined ? team.isActive : true
      });

      // Populate existing roster
      if (Array.isArray(team.roster)) {
        setRoster(
          team.roster.map((r) => ({
            player: r.player?._id || r.player,
            displayName: r.player?.displayName || `${r.player?.firstName || ''} ${r.player?.lastName || ''}`.trim() || 'Player',
            jerseyNumber: r.jerseyNumber !== undefined && r.jerseyNumber !== null ? r.jerseyNumber : '',
            role: r.role || r.player?.primaryPosition || 'Utility'
          }))
        );
      } else {
        setRoster([]);
      }
    } else {
      setFormData({
        name: '',
        shortName: '',
        homeGround: '',
        description: '',
        logoUrl: '',
        captain: '',
        isActive: true
      });
      setRoster([]);
    }
    setError(null);
  }, [team, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddPlayerToRoster = () => {
    if (!selectedPlayerToAdd) return;

    // Prevent duplicate player in roster
    if (roster.some((r) => r.player === selectedPlayerToAdd)) {
      setError('This player is already in the team roster.');
      return;
    }

    const playerObj = availablePlayers.find((p) => p._id === selectedPlayerToAdd);
    if (!playerObj) return;

    // Pick an available default jersey number
    const usedJerseys = new Set(
      roster.map((r) => parseInt(r.jerseyNumber, 10)).filter((n) => !isNaN(n))
    );
    let nextJersey = 1;
    while (usedJerseys.has(nextJersey) && nextJersey <= 99) {
      nextJersey++;
    }

    const newMember = {
      player: playerObj._id,
      displayName: playerObj.displayName || `${playerObj.firstName} ${playerObj.lastName}`,
      jerseyNumber: nextJersey <= 99 ? nextJersey : '',
      role: playerObj.primaryPosition || 'Utility'
    };

    setRoster((prev) => [...prev, newMember]);
    setSelectedPlayerToAdd('');
    setError(null);
  };

  const handleRemoveRosterMember = (playerId) => {
    setRoster((prev) => prev.filter((r) => r.player !== playerId));
    // If removed player was captain, clear captain
    if (formData.captain === playerId) {
      setFormData((prev) => ({ ...prev, captain: '' }));
    }
  };

  const handleRosterMemberChange = (playerId, field, value) => {
    setRoster((prev) =>
      prev.map((r) => {
        if (r.player === playerId) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Validate team name
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Team name must be at least 2 characters');
      return;
    }

    // 2. Validate roster jersey numbers
    const jerseyNumbers = [];
    for (const member of roster) {
      if (member.jerseyNumber !== '' && member.jerseyNumber !== undefined && member.jerseyNumber !== null) {
        const jn = parseInt(member.jerseyNumber, 10);
        if (isNaN(jn) || jn < 1 || jn > 99) {
          setError(`Invalid jersey number for ${member.displayName}. Must be an integer between 1 and 99.`);
          return;
        }
        jerseyNumbers.push(jn);
      }
    }

    const uniqueJerseys = new Set(jerseyNumbers);
    if (jerseyNumbers.length !== uniqueJerseys.size) {
      setError('Duplicate jersey numbers detected in the roster. Each player must have a unique jersey number.');
      return;
    }

    // 3. Ensure captain is in the roster if assigned
    if (formData.captain) {
      const isCaptainInRoster = roster.some((r) => r.player === formData.captain);
      if (!isCaptainInRoster) {
        setError('The assigned team captain must be a registered member of the roster.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        isActive: formData.isActive,
        roster: roster.map((r) => ({
          player: r.player,
          jerseyNumber: r.jerseyNumber !== '' ? parseInt(r.jerseyNumber, 10) : undefined,
          role: r.role
        }))
      };

      if (formData.shortName.trim()) payload.shortName = formData.shortName.trim().toUpperCase();
      if (formData.homeGround.trim()) payload.homeGround = formData.homeGround.trim();
      if (formData.description.trim()) payload.description = formData.description.trim();
      if (formData.logoUrl.trim()) payload.logoUrl = formData.logoUrl.trim();
      if (formData.captain) payload.captain = formData.captain;

      let result;
      if (isEdit) {
        result = await updateTeam(team._id, payload);
      } else {
        result = await createTeam(payload);
      }

      onSuccess(result.data, isEdit ? 'updated' : 'created');
      onClose();
    } catch (err) {
      setError(err.message || (isEdit ? 'Failed to update team' : 'Failed to create team'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative overflow-y-auto max-h-[92vh]"
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

        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              {isEdit ? 'Edit Football Club' : 'Register New Club'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? 'Update club details, home ground, and squad roster' : 'Register a grassroots football team on TikiTaka'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-xs text-red-300 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* General Club Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Team Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Red Hawks FC"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Short Name <span className="text-slate-500 text-[10px]">(Max 10)</span>
              </label>
              <input
                type="text"
                name="shortName"
                maxLength={10}
                value={formData.shortName}
                onChange={handleChange}
                placeholder="e.g. RHK"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 uppercase focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Home Ground / Venue
              </label>
              <input
                type="text"
                name="homeGround"
                value={formData.homeGround}
                onChange={handleChange}
                placeholder="e.g. Anfield Arena"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Club Logo URL
              </label>
              <input
                type="text"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Club Description
            </label>
            <textarea
              name="description"
              rows={2}
              maxLength={500}
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief overview of the team history, academy, or motto..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Roster Assignment Section */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Squad Roster ({roster.length} Players Assigned)
                </h3>
              </div>

              {/* Add player dropdown */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedPlayerToAdd}
                  onChange={(e) => setSelectedPlayerToAdd(e.target.value)}
                  disabled={loadingPlayers}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors max-w-xs"
                >
                  <option value="">-- Select Registered Player --</option>
                  {availablePlayers
                    .filter((p) => !roster.some((r) => r.player === p._id))
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.displayName || `${p.firstName} ${p.lastName}`} ({p.primaryPosition})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddPlayerToRoster}
                  disabled={!selectedPlayerToAdd}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {roster.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No players added yet. Select a player above to add them to this team's roster.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {roster.map((member) => (
                  <div
                    key={member.player}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {member.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-white block">
                          {member.displayName}
                        </span>
                        <div className="flex items-center space-x-2 mt-0.5">
                          {formData.captain === member.player ? (
                            <span className="inline-flex items-center text-[10px] text-amber-400 font-bold gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              <Crown className="w-3 h-3" /> Team Captain
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, captain: member.player }))}
                              className="text-[10px] text-slate-400 hover:text-amber-400 underline decoration-slate-600"
                            >
                              Make Captain
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      {/* Jersey Number */}
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-400 text-[11px]">No.</span>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={member.jerseyNumber}
                          onChange={(e) =>
                            handleRosterMemberChange(member.player, 'jerseyNumber', e.target.value)
                          }
                          placeholder="#"
                          className="w-14 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Squad Role */}
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRosterMemberChange(member.player, 'role', e.target.value)
                        }
                        className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRosterMember(member.player)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Remove player from squad"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <input
              type="checkbox"
              id="teamIsActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="teamIsActive" className="text-xs font-medium text-slate-300 cursor-pointer">
              Active club eligible for match fixture scheduling
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center space-x-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Club...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? 'Update Team' : 'Create Team'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

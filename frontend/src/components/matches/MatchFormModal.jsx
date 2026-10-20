import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Trophy, 
  Save, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { getTeams, createMatch, updateMatch } from '../../services/api';

const MATCH_TYPES = ['Friendly', 'League', 'Tournament', 'Practice'];

export default function MatchFormModal({
  isOpen,
  onClose,
  onSuccess,
  match = null // If provided, edit mode
}) {
  const isEdit = Boolean(match && match._id);

  const [formData, setFormData] = useState({
    title: '',
    homeTeam: '',
    awayTeam: '',
    scheduledAt: '',
    venue: '',
    competitionName: '',
    matchType: 'Friendly',
    durationMinutes: 90,
    notes: ''
  });

  const [availableTeams, setAvailableTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available teams for home/away selection
  useEffect(() => {
    if (isOpen) {
      const fetchActiveTeams = async () => {
        setLoadingTeams(true);
        try {
          const res = await getTeams({ isActive: 'true' });
          setAvailableTeams(res.data || []);
        } catch (err) {
          console.error('Failed to load active clubs for match scheduling:', err);
        } finally {
          setLoadingTeams(false);
        }
      };
      fetchActiveTeams();
    }
  }, [isOpen]);

  useEffect(() => {
    if (match) {
      // Format scheduledAt to datetime-local string (YYYY-MM-DDTHH:mm)
      let formattedDate = '';
      if (match.scheduledAt) {
        const d = new Date(match.scheduledAt);
        const pad = (n) => String(n).padStart(2, '0');
        formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }

      setFormData({
        title: match.title || '',
        homeTeam: match.homeTeam?._id || match.homeTeam || '',
        awayTeam: match.awayTeam?._id || match.awayTeam || '',
        scheduledAt: formattedDate,
        venue: match.venue || '',
        competitionName: match.competitionName || '',
        matchType: match.matchType || 'Friendly',
        durationMinutes: match.durationMinutes || 90,
        notes: match.notes || ''
      });
    } else {
      // Default scheduled date: tomorrow at 18:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      const pad = (n) => String(n).padStart(2, '0');
      const defaultDateStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;

      setFormData({
        title: '',
        homeTeam: '',
        awayTeam: '',
        scheduledAt: defaultDateStr,
        venue: '',
        competitionName: 'Grassroots Premier League',
        matchType: 'Friendly',
        durationMinutes: 90,
        notes: ''
      });
    }
    setError(null);
  }, [match, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-suggest venue when home team is selected and venue is empty
      if (name === 'homeTeam' && value && !prev.venue) {
        const selectedClub = availableTeams.find((t) => t._id === value);
        if (selectedClub?.homeGround) {
          updated.venue = selectedClub.homeGround;
        }
      }

      // Auto-suggest title if not manually filled
      if ((name === 'homeTeam' || name === 'awayTeam') && (!prev.title || prev.title.includes('vs'))) {
        const hId = name === 'homeTeam' ? value : prev.homeTeam;
        const aId = name === 'awayTeam' ? value : prev.awayTeam;
        const hTeam = availableTeams.find((t) => t._id === hId);
        const aTeam = availableTeams.find((t) => t._id === aId);
        if (hTeam && aTeam) {
          updated.title = `${hTeam.name} vs ${aTeam.name}`;
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client validations
    if (!formData.title.trim()) {
      setError('Match title is required');
      return;
    }

    if (!isEdit) {
      if (!formData.homeTeam) {
        setError('Please select the designated home team');
        return;
      }
      if (!formData.awayTeam) {
        setError('Please select the designated away team');
        return;
      }
      if (formData.homeTeam === formData.awayTeam) {
        setError('Home team and away team must be different clubs');
        return;
      }
    }

    if (!formData.scheduledAt) {
      setError('Scheduled match kickoff date and time is required');
      return;
    }

    const duration = parseInt(formData.durationMinutes, 10);
    if (isNaN(duration) || duration < 10 || duration > 180) {
      setError('Match duration must be between 10 and 180 minutes');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: formData.title.trim(),
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        venue: formData.venue.trim() || undefined,
        competitionName: formData.competitionName.trim() || undefined,
        matchType: formData.matchType,
        durationMinutes: duration,
        notes: formData.notes.trim() || undefined
      };

      if (!isEdit) {
        payload.homeTeam = formData.homeTeam;
        payload.awayTeam = formData.awayTeam;
      }

      let result;
      if (isEdit) {
        result = await updateMatch(match._id, payload);
      } else {
        result = await createMatch(payload);
      }

      onSuccess(result.data, isEdit ? 'updated' : 'created');
      onClose();
    } catch (err) {
      setError(err.message || (isEdit ? 'Failed to update fixture' : 'Failed to schedule match'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]"
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
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              {isEdit ? 'Edit Match Fixture' : 'Schedule New Match'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? 'Update scheduled kickoff, venue, and metadata' : 'Set up a new football match between two registered clubs'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-xs text-red-300 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Match Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Match Title <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Red Hawks FC vs Blue Titans FC"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Participating Clubs (Only editable on create) */}
          {!isEdit ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Home Team <span className="text-emerald-400">*</span>
                </label>
                <select
                  name="homeTeam"
                  required
                  value={formData.homeTeam}
                  onChange={handleChange}
                  disabled={loadingTeams}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">-- Select Home Team --</option>
                  {availableTeams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name} ({team.shortName || 'FC'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Away Team <span className="text-emerald-400">*</span>
                </label>
                <select
                  name="awayTeam"
                  required
                  value={formData.awayTeam}
                  onChange={handleChange}
                  disabled={loadingTeams}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="">-- Select Away Team --</option>
                  {availableTeams.map((team) => (
                    <option 
                      key={team._id} 
                      value={team._id}
                      disabled={team._id === formData.homeTeam}
                    >
                      {team.name} ({team.shortName || 'FC'}) {team._id === formData.homeTeam ? '(Already Selected as Home)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span className="font-semibold text-slate-400">Participating Clubs:</span>
              <span className="font-bold text-white">
                {match.homeTeam?.name || 'Home'} vs {match.awayTeam?.name || 'Away'}
              </span>
            </div>
          )}

          {/* Date & Time, Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kickoff Date &amp; Time <span className="text-emerald-400">*</span>
              </label>
              <input
                type="datetime-local"
                name="scheduledAt"
                required
                value={formData.scheduledAt}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Duration (Minutes)
              </label>
              <input
                type="number"
                name="durationMinutes"
                min={10}
                max={180}
                value={formData.durationMinutes}
                onChange={handleChange}
                placeholder="90"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Competition & Match Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Competition Name
              </label>
              <input
                type="text"
                name="competitionName"
                value={formData.competitionName}
                onChange={handleChange}
                placeholder="e.g. Grassroots Premier League"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Match Type
              </label>
              <select
                name="matchType"
                value={formData.matchType}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {MATCH_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Venue / Stadium
            </label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              placeholder="Defaults to home ground if left blank"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Fixture Notes <span className="text-slate-500 text-[10px]">(Optional)</span>
            </label>
            <textarea
              name="notes"
              rows={2}
              maxLength={1000}
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Match official details, broadcast info, kit colors..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors flex items-center space-x-2 shadow-lg shadow-sky-950/40 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? 'Update Fixture' : 'Schedule Fixture'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

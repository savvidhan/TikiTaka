import mongoose from 'mongoose';
import { Match, Team, Player } from '../models/index.js';
import { matchStatusEnum, matchTypeEnum, goalTypeEnum } from '../models/Match.js';

/**
 * Valid allowed status transitions for matches
 */
const ALLOWED_STATUS_TRANSITIONS = {
  Scheduled: ['Live', 'Cancelled'],
  Live: ['Completed', 'Cancelled'],
  Completed: [], // Terminal state: completed matches cannot be restarted
  Cancelled: []  // Terminal state: cancelled matches cannot be revived
};

/**
 * @desc    List all matches with query filters and pagination
 * @route   GET /api/matches
 */
export const getMatches = async (req, res, next) => {
  try {
    const { status, team, matchType, competitionName, page = 1, limit = 20 } = req.query;
    const filter = {};

    // 1. Filter by status
    if (status) {
      if (!matchStatusEnum.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter. Allowed values: ${matchStatusEnum.join(', ')}`
        });
      }
      filter.status = status;
    }

    // 2. Filter by participating team
    if (team) {
      if (!mongoose.Types.ObjectId.isValid(team)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid team ID filter'
        });
      }
      filter.$or = [{ homeTeam: team }, { awayTeam: team }];
    }

    // 3. Filter by matchType
    if (matchType) {
      if (!matchTypeEnum.includes(matchType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid matchType filter. Allowed values: ${matchTypeEnum.join(', ')}`
        });
      }
      filter.matchType = matchType;
    }

    // 4. Filter by competitionName
    if (competitionName && typeof competitionName === 'string') {
      filter.competitionName = new RegExp(competitionName.trim(), 'i');
    }

    // Pagination numbers
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Sorting: upcoming scheduled matches sort ascending, otherwise descending
    const sortOrder = status === 'Scheduled' ? { scheduledAt: 1 } : { scheduledAt: -1 };

    const [total, matches] = await Promise.all([
      Match.countDocuments(filter),
      Match.find(filter)
        .populate('homeTeam', 'name shortName logoUrl homeGround isActive')
        .populate('awayTeam', 'name shortName logoUrl homeGround isActive')
        .sort(sortOrder)
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      count: matches.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single match by ID with populated teams and goals
 * @route   GET /api/matches/:id
 */
export const getMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const match = await Match.findById(id)
      .populate('homeTeam', 'name shortName logoUrl homeGround captain roster isActive')
      .populate('awayTeam', 'name shortName logoUrl homeGround captain roster isActive')
      .populate('goals.player', 'firstName lastName displayName primaryPosition profileImageUrl')
      .populate('goals.team', 'name shortName logoUrl')
      .lean();

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new match fixture
 * @route   POST /api/matches
 */
export const createMatch = async (req, res, next) => {
  try {
    const {
      title,
      homeTeam,
      awayTeam,
      scheduledAt,
      venue,
      competitionName,
      matchType,
      durationMinutes,
      notes
    } = req.body;

    // 1. Validate homeTeam and awayTeam IDs format
    if (!homeTeam || !mongoose.Types.ObjectId.isValid(homeTeam)) {
      return res.status(400).json({
        success: false,
        message: 'A valid homeTeam ObjectId is required'
      });
    }
    if (!awayTeam || !mongoose.Types.ObjectId.isValid(awayTeam)) {
      return res.status(400).json({
        success: false,
        message: 'A valid awayTeam ObjectId is required'
      });
    }

    // 2. Reject identical teams
    if (homeTeam.toString() === awayTeam.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Home team and away team must be different'
      });
    }

    // 3. Verify both teams exist and are active
    const [home, away] = await Promise.all([
      Team.findById(homeTeam),
      Team.findById(awayTeam)
    ]);

    if (!home) {
      return res.status(400).json({
        success: false,
        message: 'Designated home team does not exist'
      });
    }
    if (!away) {
      return res.status(400).json({
        success: false,
        message: 'Designated away team does not exist'
      });
    }

    if (!home.isActive) {
      return res.status(400).json({
        success: false,
        message: `Home team "${home.name}" is deactivated and cannot be scheduled for matches`
      });
    }
    if (!away.isActive) {
      return res.status(400).json({
        success: false,
        message: `Away team "${away.name}" is deactivated and cannot be scheduled for matches`
      });
    }

    // 4. Default venue to home ground if omitted
    const matchVenue = venue?.trim() || home.homeGround || 'TBD Ground';

    // 5. Initialize fixture with clean state (ignore arbitrary client scores/goals)
    const newMatch = new Match({
      title,
      homeTeam,
      awayTeam,
      scheduledAt,
      venue: matchVenue,
      competitionName,
      matchType,
      durationMinutes,
      notes,
      status: 'Scheduled',
      homeScore: 0,
      awayScore: 0,
      goals: []
    });

    const savedMatch = await newMatch.save();

    await savedMatch.populate('homeTeam', 'name shortName logoUrl homeGround');
    await savedMatch.populate('awayTeam', 'name shortName logoUrl homeGround');

    res.status(201).json({
      success: true,
      message: 'Match fixture created successfully',
      data: savedMatch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update permitted match metadata
 * @route   PATCH /api/matches/:id
 */
export const updateMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Enforce state-based update restrictions
    if (match.status === 'Completed' || match.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit metadata for a ${match.status.toLowerCase()} match`
      });
    }

    if (match.status === 'Live' && req.body.scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule a live match'
      });
    }

    // Allowed updatable metadata fields (prevent modifying scores/goals directly)
    const allowedFields = [
      'title',
      'venue',
      'scheduledAt',
      'durationMinutes',
      'competitionName',
      'matchType',
      'notes'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        match[field] = req.body[field];
      }
    }

    const updatedMatch = await match.save();

    await updatedMatch.populate('homeTeam', 'name shortName logoUrl homeGround');
    await updatedMatch.populate('awayTeam', 'name shortName logoUrl homeGround');

    res.status(200).json({
      success: true,
      message: 'Match details updated successfully',
      data: updatedMatch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Transition match status (Scheduled -> Live -> Completed / Cancelled)
 * @route   PATCH /api/matches/:id/status
 */
export const updateMatchStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: targetStatus } = req.body;

    if (!targetStatus || !matchStatusEnum.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${matchStatusEnum.join(', ')}`
      });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const currentStatus = match.status;

    // No-op if target status equals current status
    if (currentStatus === targetStatus) {
      return res.status(200).json({
        success: true,
        message: `Match is already in ${targetStatus} status`,
        data: match
      });
    }

    // Check transition rules
    const allowedTargets = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: Cannot transition match from "${currentStatus}" to "${targetStatus}". Permitted targets: [${allowedTargets.join(', ')}]`
      });
    }

    // Apply state side-effects
    match.status = targetStatus;
    if (targetStatus === 'Live' && !match.startedAt) {
      match.startedAt = new Date();
    } else if (targetStatus === 'Completed' && !match.completedAt) {
      match.completedAt = new Date();
    }

    const updatedMatch = await match.save();

    await updatedMatch.populate('homeTeam', 'name shortName logoUrl');
    await updatedMatch.populate('awayTeam', 'name shortName logoUrl');

    res.status(200).json({
      success: true,
      message: `Match status successfully transitioned from "${currentStatus}" to "${targetStatus}"`,
      data: updatedMatch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record a goal event during a live match
 * @route   POST /api/matches/:id/goals
 */
export const recordGoal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { player: playerId, team: teamId, minute, type = 'OpenPlay' } = req.body;

    // 1. Fetch match and verify status is Live
    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.status !== 'Live') {
      return res.status(400).json({
        success: false,
        message: `Goals can only be recorded when the match is Live. Current status: "${match.status}"`
      });
    }

    // 2. Validate scoring team ID format and match participation
    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid team ObjectId is required'
      });
    }

    const homeIdStr = match.homeTeam.toString();
    const awayIdStr = match.awayTeam.toString();
    const scoringTeamIdStr = teamId.toString();

    if (scoringTeamIdStr !== homeIdStr && scoringTeamIdStr !== awayIdStr) {
      return res.status(400).json({
        success: false,
        message: 'Scoring team must be either the home team or away team participating in this match'
      });
    }

    // 3. Validate goal type enum
    if (type && !goalTypeEnum.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid goal type. Allowed values: ${goalTypeEnum.join(', ')}`
      });
    }

    // 4. Validate scorer player existence and roster membership
    if (!playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid scorer player ObjectId is required'
      });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(400).json({
        success: false,
        message: 'Scorer player does not exist in the database'
      });
    }

    if (!player.isActive) {
      return res.status(400).json({
        success: false,
        message: `Scorer "${player.displayName}" is inactive and cannot be attributed goals`
      });
    }

    // Check roster membership: scorer must be registered on the scoring team's roster
    const isPlayerInTeamRoster = await Team.exists({
      _id: teamId,
      'roster.player': playerId
    });

    if (!isPlayerInTeamRoster) {
      return res.status(400).json({
        success: false,
        message: `Scorer "${player.displayName}" is not a registered member of the scoring team roster`
      });
    }

    // 5. Validate minute
    let goalMinute = minute !== undefined ? parseInt(minute, 10) : undefined;
    if (goalMinute !== undefined) {
      if (isNaN(goalMinute) || goalMinute < 0 || goalMinute > 130) {
        return res.status(400).json({
          success: false,
          message: 'Goal minute must be an integer between 0 and 130'
        });
      }
    } else {
      // Auto-compute minute from match.startedAt if available
      goalMinute = match.startedAt
        ? Math.min(130, Math.max(0, Math.floor((Date.now() - new Date(match.startedAt).getTime()) / 60000)))
        : 1;
    }

    // 6. Concurrency-safe atomic update ($push goal and $inc score)
    const isHome = scoringTeamIdStr === homeIdStr;
    const scoreField = isHome ? 'homeScore' : 'awayScore';

    const goalObject = {
      player: playerId,
      team: teamId,
      minute: goalMinute,
      type
    };

    const updatedMatch = await Match.findOneAndUpdate(
      { _id: id, status: 'Live' },
      {
        $push: { goals: goalObject },
        $inc: { [scoreField]: 1 }
      },
      { new: true, runValidators: true }
    )
      .populate('homeTeam', 'name shortName logoUrl')
      .populate('awayTeam', 'name shortName logoUrl')
      .populate('goals.player', 'firstName lastName displayName primaryPosition profileImageUrl')
      .populate('goals.team', 'name shortName logoUrl');

    if (!updatedMatch) {
      return res.status(400).json({
        success: false,
        message: 'Could not record goal. The match status may have changed from Live during the request.'
      });
    }

    res.status(201).json({
      success: true,
      message: `Goal recorded successfully at minute ${goalMinute}! New score: ${updatedMatch.homeScore}-${updatedMatch.awayScore}`,
      data: updatedMatch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Safely delete or cancel a match fixture
 * @route   DELETE /api/matches/:id
 */
export const deleteMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Preserve historical completed matches and in-progress live games
    if (match.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed matches cannot be deleted to preserve historical scoring and club statistics.'
      });
    }

    if (match.status === 'Live') {
      return res.status(400).json({
        success: false,
        message: 'Live matches cannot be deleted. Transition match status to "Cancelled" instead.'
      });
    }

    // Scheduled or Cancelled fixtures can be cleanly removed
    await Match.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      action: 'deleted',
      message: `Fixture "${match.title}" deleted successfully`,
      data: {
        _id: id,
        title: match.title
      }
    });
  } catch (error) {
    next(error);
  }
};

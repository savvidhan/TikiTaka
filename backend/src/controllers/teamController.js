import mongoose from 'mongoose';
import { Team, Player, Match } from '../models/index.js';

/**
 * Helper to verify that an array of player ObjectIds all physically exist in the database
 * @param {Array<string|mongoose.Types.ObjectId>} playerIds
 * @returns {Promise<{ valid: boolean, missingId?: string }>}
 */
const verifyPlayersExist = async (playerIds) => {
  const uniqueIds = [...new Set(playerIds.map((id) => id.toString()))];
  for (const id of uniqueIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { valid: false, missingId: id, reason: 'Invalid ObjectId format' };
    }
  }

  const count = await Player.countDocuments({ _id: { $in: uniqueIds } });
  if (count !== uniqueIds.length) {
    // Find which ID is missing for a descriptive error message
    const foundPlayers = await Player.find({ _id: { $in: uniqueIds } }, '_id').lean();
    const foundSet = new Set(foundPlayers.map((p) => p._id.toString()));
    const missing = uniqueIds.find((id) => !foundSet.has(id));
    return { valid: false, missingId: missing, reason: 'Player does not exist' };
  }

  return { valid: true };
};

/**
 * @desc    List all teams with roster counts and captain summaries
 * @route   GET /api/teams
 */
export const getTeams = async (req, res, next) => {
  try {
    const { search, q, isActive } = req.query;
    const filter = {};

    // 1. Search by name or shortName
    const searchTerm = search || q;
    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
      const regex = new RegExp(searchTerm.trim(), 'i');
      filter.$or = [{ name: regex }, { shortName: regex }];
    }

    // 2. Active status filter
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const teams = await Team.find(filter)
      .populate('captain', 'displayName primaryPosition profileImageUrl')
      .sort({ name: 1 })
      .lean();

    // Map to include lightweight rosterCount without bloated nested payloads
    const formattedTeams = teams.map((team) => ({
      _id: team._id,
      name: team.name,
      shortName: team.shortName,
      description: team.description,
      logoUrl: team.logoUrl,
      homeGround: team.homeGround,
      captain: team.captain,
      rosterCount: Array.isArray(team.roster) ? team.roster.length : 0,
      isActive: team.isActive,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: formattedTeams.length,
      data: formattedTeams
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single team by ID with populated captain and full roster details
 * @route   GET /api/teams/:id
 */
export const getTeamById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('captain', 'firstName lastName displayName primaryPosition profileImageUrl phone')
      .populate(
        'roster.player',
        'firstName lastName displayName primaryPosition preferredFoot profileImageUrl phone isActive'
      )
      .lean();

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...team,
        rosterCount: Array.isArray(team.roster) ? team.roster.length : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new team
 * @route   POST /api/teams
 */
export const createTeam = async (req, res, next) => {
  try {
    const { name, shortName, description, logoUrl, homeGround, captain, roster, isActive } =
      req.body;

    // 1. Verify existence of referenced players in roster and captain
    const playersToCheck = [];
    if (Array.isArray(roster)) {
      for (const item of roster) {
        if (item.player) playersToCheck.push(item.player);
      }
    }
    if (captain) {
      playersToCheck.push(captain);
    }

    if (playersToCheck.length > 0) {
      const verification = await verifyPlayersExist(playersToCheck);
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: `Referenced player with ID "${verification.missingId}" does not exist in the database.`
        });
      }
    }

    const newTeam = new Team({
      name,
      shortName,
      description,
      logoUrl,
      homeGround,
      captain,
      roster: roster || [],
      isActive
    });

    const savedTeam = await newTeam.save();

    // Populate for clean response
    await savedTeam.populate('captain', 'displayName primaryPosition');
    await savedTeam.populate('roster.player', 'displayName primaryPosition preferredFoot');

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: savedTeam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a team
 * @route   PATCH /api/teams/:id
 */
export const updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // 1. Verify existence of any updated player references
    const playersToCheck = [];
    if (Array.isArray(req.body.roster)) {
      for (const item of req.body.roster) {
        if (item.player) playersToCheck.push(item.player);
      }
    }
    if (req.body.captain) {
      playersToCheck.push(req.body.captain);
    }

    if (playersToCheck.length > 0) {
      const verification = await verifyPlayersExist(playersToCheck);
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: `Referenced player with ID "${verification.missingId}" does not exist in the database.`
        });
      }
    }

    // 2. Assign updatable fields
    const updatableFields = [
      'name',
      'shortName',
      'description',
      'logoUrl',
      'homeGround',
      'captain',
      'roster',
      'isActive'
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        team[field] = req.body[field];
      }
    }

    // 3. Save to trigger schema validation & pre-validate hooks
    const updatedTeam = await team.save();

    await updatedTeam.populate('captain', 'displayName primaryPosition profileImageUrl');
    await updatedTeam.populate('roster.player', 'displayName primaryPosition preferredFoot');

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: updatedTeam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Safely delete or deactivate a team
 * @route   DELETE /api/teams/:id
 */
export const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if team is referenced in any scheduled or completed matches
    const isReferencedInMatch = await Match.exists({
      $or: [{ homeTeam: id }, { awayTeam: id }]
    });

    if (isReferencedInMatch) {
      // Safely deactivate instead of deleting to prevent broken fixture schedules
      team.isActive = false;
      await team.save();

      return res.status(200).json({
        success: true,
        action: 'deactivated',
        message:
          'Team is referenced in scheduled or completed matches. Safely deactivated team instead of deleting.',
        data: {
          _id: team._id,
          name: team.name,
          isActive: false
        }
      });
    }

    // If not referenced in any matches, perform safe document deletion
    await Team.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      action: 'deleted',
      message: 'Team deleted successfully',
      data: {
        _id: id,
        name: team.name
      }
    });
  } catch (error) {
    next(error);
  }
};

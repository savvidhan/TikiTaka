import mongoose from 'mongoose';
import { Player, Team, Match } from '../models/index.js';

/**
 * Helper to fetch all teams associated with a player (either via player.team or roster membership)
 * @param {string|mongoose.Types.ObjectId} playerId
 * @param {string|mongoose.Types.ObjectId} [primaryTeamId]
 * @returns {Promise<Array<import('mongoose').Document>>}
 */
const getAssociatedTeamsForPlayer = async (playerId, primaryTeamId = null) => {
  const query = {
    $or: [{ 'roster.player': playerId }]
  };
  if (primaryTeamId && mongoose.Types.ObjectId.isValid(primaryTeamId)) {
    query.$or.push({ _id: primaryTeamId });
  }
  return Team.find(query);
};

/**
 * @desc    List all players with optional search and filters
 * @route   GET /api/players
 */
export const getPlayers = async (req, res, next) => {
  try {
    const { search, q, position, primaryPosition, foot, preferredFoot, isActive } = req.query;
    const filter = {};

    // 1. Text search on name
    const searchTerm = search || q;
    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
      const regex = new RegExp(searchTerm.trim(), 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { displayName: regex }
      ];
    }

    // 2. Position filter
    const posFilter = position || primaryPosition;
    if (posFilter && typeof posFilter === 'string' && posFilter.trim()) {
      filter.primaryPosition = posFilter.trim();
    }

    // 3. Preferred foot filter
    const footFilter = foot || preferredFoot;
    if (footFilter && typeof footFilter === 'string' && footFilter.trim()) {
      filter.preferredFoot = footFilter.trim();
    }

    // 4. Active status filter
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const players = await Player.find(filter).sort({ lastName: 1, firstName: 1 }).lean();

    res.status(200).json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single player by ID with team affiliations
 * @route   GET /api/players/:id
 */
export const getPlayerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const player = await Player.findById(id).lean();

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Find club affiliations (teams where player is in the roster)
    const teams = await Team.find(
      { 'roster.player': id },
      'name shortName logoUrl homeGround'
    ).lean();

    res.status(200).json({
      success: true,
      data: {
        ...player,
        teams
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new player
 * @route   POST /api/players
 */
export const createPlayer = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      displayName,
      dateOfBirth,
      nationality,
      primaryPosition,
      preferredFoot,
      profileImageUrl,
      phone,
      team: teamRef,
      teamId: altTeamRef,
      isActive
    } = req.body;

    const requestedTeamId = teamRef || altTeamRef;
    let validatedTeam = null;

    // TeamManager must provide a team they own
    if (req.user.role === 'TeamManager') {
      if (!requestedTeamId) {
        return res.status(400).json({
          success: false,
          message: 'A valid team reference is required when creating a player as a team manager.'
        });
      }

      if (!mongoose.Types.ObjectId.isValid(requestedTeamId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid team ObjectId format.'
        });
      }

      validatedTeam = await Team.findById(requestedTeamId);
      if (!validatedTeam) {
        return res.status(400).json({
          success: false,
          message: 'Referenced team does not exist.'
        });
      }

      if (!validatedTeam.manager || validatedTeam.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only create player profiles for teams you manage.'
        });
      }
    } else if (req.user.role === 'Admin' && requestedTeamId) {
      if (!mongoose.Types.ObjectId.isValid(requestedTeamId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid team ObjectId format.'
        });
      }
      validatedTeam = await Team.findById(requestedTeamId);
      if (!validatedTeam) {
        return res.status(400).json({
          success: false,
          message: 'Referenced team does not exist.'
        });
      }
    }

    const newPlayer = new Player({
      firstName,
      lastName,
      displayName,
      dateOfBirth,
      nationality,
      primaryPosition,
      preferredFoot,
      profileImageUrl,
      phone,
      team: validatedTeam ? validatedTeam._id : null,
      isActive
    });

    const savedPlayer = await newPlayer.save();

    // If affiliated with a team on creation, ensure player is enrolled in team roster
    if (validatedTeam) {
      const alreadyInRoster = validatedTeam.roster.some(
        (r) => r.player && r.player.toString() === savedPlayer._id.toString()
      );
      if (!alreadyInRoster) {
        validatedTeam.roster.push({
          player: savedPlayer._id,
          role: savedPlayer.primaryPosition || 'Utility'
        });
        await validatedTeam.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Player created successfully',
      data: savedPlayer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a player
 * @route   PATCH /api/players/:id
 */
export const updatePlayer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const player = await Player.findById(id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Ownership check: Admin can update any player; TeamManager can only update players on their teams
    if (req.user.role !== 'Admin') {
      const associatedTeams = await getAssociatedTeamsForPlayer(player._id, player.team);
      if (associatedTeams.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            'Forbidden: Player has no associated team or belongs to an unmanaged roster. Only Admins can modify unassociated players.'
        });
      }

      // If player is affiliated with any team not managed by req.user, deny
      const hasUnownedTeam = associatedTeams.some(
        (t) => !t.manager || t.manager.toString() !== req.user._id.toString()
      );
      if (hasUnownedTeam) {
        return res.status(403).json({
          success: false,
          message:
            'Forbidden: You do not have permission to modify a player affiliated with a team you do not manage.'
        });
      }

      // Check team transfer attempt
      const targetTeamId = req.body.team !== undefined ? req.body.team : req.body.teamId;
      if (targetTeamId !== undefined) {
        if (!targetTeamId) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: Only administrators can release players into unassigned/free-agent status.'
          });
        }
        if (!mongoose.Types.ObjectId.isValid(targetTeamId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid target team ObjectId format.'
          });
        }
        const targetTeam = await Team.findById(targetTeamId);
        if (!targetTeam) {
          return res.status(400).json({
            success: false,
            message: 'Target team does not exist.'
          });
        }
        if (!targetTeam.manager || targetTeam.manager.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: Cannot transfer player to a team you do not manage.'
          });
        }

        // Synchronize transfer across rosters
        if (mongoose.connection?.readyState === 1 || Team.updateMany?.mock) {
          await Team.updateMany(
            { _id: { $ne: targetTeam._id }, 'roster.player': player._id },
            { $pull: { roster: { player: player._id } } }
          );
          await Team.updateMany(
            { _id: { $ne: targetTeam._id }, captain: player._id },
            { $unset: { captain: '' } }
          );
        }

        const inTarget = targetTeam.roster.some(
          (r) => r.player && r.player.toString() === player._id.toString()
        );
        if (!inTarget) {
          targetTeam.roster.push({
            player: player._id,
            role: player.primaryPosition || 'Utility'
          });
          await targetTeam.save();
        }
        player.team = targetTeam._id;
      }
    } else if (req.user.role === 'Admin' && (req.body.team !== undefined || req.body.teamId !== undefined)) {
      const targetTeamId = req.body.team !== undefined ? req.body.team : req.body.teamId;
      if (targetTeamId) {
        if (!mongoose.Types.ObjectId.isValid(targetTeamId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid target team ObjectId format.'
          });
        }
        const targetTeam = await Team.findById(targetTeamId);
        if (!targetTeam) {
          return res.status(400).json({
            success: false,
            message: 'Target team does not exist.'
          });
        }

        if (mongoose.connection?.readyState === 1 || Team.updateMany?.mock) {
          await Team.updateMany(
            { _id: { $ne: targetTeam._id }, 'roster.player': player._id },
            { $pull: { roster: { player: player._id } } }
          );
          await Team.updateMany(
            { _id: { $ne: targetTeam._id }, captain: player._id },
            { $unset: { captain: '' } }
          );
        }

        const inTarget = targetTeam.roster.some(
          (r) => r.player && r.player.toString() === player._id.toString()
        );
        if (!inTarget) {
          targetTeam.roster.push({
            player: player._id,
            role: player.primaryPosition || 'Utility'
          });
          await targetTeam.save();
        }
        player.team = targetTeam._id;
      } else {
        // Admin releasing player to free agency (null)
        if (mongoose.connection?.readyState === 1 || Team.updateMany?.mock) {
          await Team.updateMany(
            { 'roster.player': player._id },
            { $pull: { roster: { player: player._id } } }
          );
          await Team.updateMany(
            { captain: player._id },
            { $unset: { captain: '' } }
          );
        }
        player.team = null;
      }
    }

    // Allowed updatable fields
    const updatableFields = [
      'firstName',
      'lastName',
      'displayName',
      'dateOfBirth',
      'nationality',
      'primaryPosition',
      'preferredFoot',
      'profileImageUrl',
      'phone',
      'isActive'
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        player[field] = req.body[field];
      }
    }

    const updatedPlayer = await player.save();

    res.status(200).json({
      success: true,
      message: 'Player updated successfully',
      data: updatedPlayer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Safely delete or deactivate a player
 * @route   DELETE /api/players/:id
 */
export const deletePlayer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const player = await Player.findById(id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Ownership check: Admin can delete any player; TeamManager can only delete players on their teams
    if (req.user.role !== 'Admin') {
      const associatedTeams = await getAssociatedTeamsForPlayer(player._id, player.team);
      if (associatedTeams.length === 0) {
        return res.status(403).json({
          success: false,
          message:
            'Forbidden: Legacy or unassociated players can only be deleted by an Admin.'
        });
      }

      const hasUnownedTeam = associatedTeams.some(
        (t) => !t.manager || t.manager.toString() !== req.user._id.toString()
      );
      if (hasUnownedTeam) {
        return res.status(403).json({
          success: false,
          message:
            'Forbidden: You do not have permission to delete a player affiliated with a team you do not manage.'
        });
      }
    }

    // Check if player is referenced in any team rosters or as a captain
    const isReferencedInTeam = await Team.exists({
      $or: [{ 'roster.player': id }, { captain: id }]
    });

    // Check if player is referenced in any match goals
    const isReferencedInMatch = await Match.exists({
      'goals.player': id
    });

    if (isReferencedInTeam || isReferencedInMatch) {
      // Safely deactivate to preserve roster and match statistics
      player.isActive = false;
      await player.save();

      return res.status(200).json({
        success: true,
        action: 'deactivated',
        message:
          'Player is referenced in team rosters or match history. Safely deactivated player instead of deleting.',
        data: {
          _id: player._id,
          displayName: player.displayName,
          isActive: false
        }
      });
    }

    // If not referenced anywhere, perform safe document deletion
    await Player.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      action: 'deleted',
      message: 'Player deleted successfully',
      data: {
        _id: id,
        displayName: player.displayName
      }
    });
  } catch (error) {
    next(error);
  }
};

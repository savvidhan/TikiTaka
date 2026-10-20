import { Player, Team, Match } from '../models/index.js';

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
      isActive
    } = req.body;

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
      isActive
    });

    const savedPlayer = await newPlayer.save();

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

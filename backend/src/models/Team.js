import mongoose from 'mongoose';
import { positionEnum } from './Player.js';

// Roster subdocument schema without unnecessary _id
const rosterSubSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Player reference is required in roster']
    },
    jerseyNumber: {
      type: Number,
      validate: [
        {
          validator: function (val) {
            if (val === null || val === undefined) return true;
            return Number.isInteger(val) && val >= 1 && val <= 99;
          },
          message: 'Jersey number must be an integer between 1 and 99'
        }
      ]
    },
    role: {
      type: String,
      enum: {
        values: positionEnum,
        message: '{VALUE} is not a valid squad role'
      },
      default: 'Utility'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
      maxlength: [100, 'Team name cannot exceed 100 characters']
    },
    shortName: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Short team name cannot exceed 10 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    logoUrl: {
      type: String,
      trim: true
    },
    homeGround: {
      type: String,
      trim: true,
      maxlength: [100, 'Home ground cannot exceed 100 characters']
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    roster: {
      type: [rosterSubSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-validate hook for cross-field and roster-level validation
teamSchema.pre('validate', function (next) {
  if (Array.isArray(this.roster)) {
    // 1. Prevent duplicate players in the same team roster
    const playerIds = this.roster.map((r) => r.player?.toString()).filter(Boolean);
    const uniquePlayerIds = new Set(playerIds);
    if (playerIds.length !== uniquePlayerIds.size) {
      return next(new Error('A player cannot appear more than once in a team roster'));
    }

    // 2. Prevent duplicate jersey numbers within a team when assigned
    const jerseyNumbers = this.roster
      .map((r) => r.jerseyNumber)
      .filter((jn) => jn !== undefined && jn !== null);
    const uniqueJerseys = new Set(jerseyNumbers);
    if (jerseyNumbers.length !== uniqueJerseys.size) {
      return next(new Error('Jersey numbers must be unique within a team'));
    }

    // 3. Ensure a team captain is a member of the roster when assigned
    if (this.captain) {
      const captainIdStr = this.captain.toString();
      const isCaptainInRoster = this.roster.some(
        (r) => r.player && r.player.toString() === captainIdStr
      );
      if (!isCaptainInRoster) {
        return next(
          new Error('The assigned team captain must be a registered member of the roster')
        );
      }
    }
  }

  next();
});

// Indexes for query optimization
teamSchema.index({ name: 1 }, { unique: true });
teamSchema.index({ isActive: 1 });
teamSchema.index({ 'roster.player': 1 });

const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);

export default Team;

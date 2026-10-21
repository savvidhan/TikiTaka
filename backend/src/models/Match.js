import mongoose from 'mongoose';

const matchTypeEnum = ['Friendly', 'League', 'Tournament', 'Practice'];
const matchStatusEnum = ['Scheduled', 'Live', 'Completed', 'Cancelled'];
const goalTypeEnum = ['OpenPlay', 'Penalty', 'FreeKick', 'OwnGoal'];

// Goal / scorer subdocument schema
const goalSubSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team reference is required for a goal']
    },
    minute: {
      type: Number,
      validate: [
        {
          validator: function (val) {
            if (val === null || val === undefined) return true;
            return Number.isInteger(val) && val >= 0 && val <= 130;
          },
          message: 'Goal minute must be an integer between 0 and 130'
        }
      ]
    },
    type: {
      type: String,
      enum: {
        values: goalTypeEnum,
        message: '{VALUE} is not a valid goal type'
      },
      default: 'OpenPlay'
    }
  },
  { _id: true }
);

const matchSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Match title is required'],
      trim: true,
      minlength: [2, 'Match title must be at least 2 characters'],
      maxlength: [150, 'Match title cannot exceed 150 characters']
    },
    homeTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Home team reference is required']
    },
    awayTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Away team reference is required']
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled match date and time is required'],
      validate: [
        {
          validator: function (val) {
            return val instanceof Date && !isNaN(val.getTime());
          },
          message: 'Scheduled date must be a valid date'
        }
      ]
    },
    venue: {
      type: String,
      trim: true,
      maxlength: [100, 'Venue cannot exceed 100 characters']
    },
    competitionName: {
      type: String,
      trim: true,
      maxlength: [100, 'Competition name cannot exceed 100 characters']
    },
    matchType: {
      type: String,
      enum: {
        values: matchTypeEnum,
        message: '{VALUE} is not a valid match type'
      },
      default: 'Friendly'
    },
    durationMinutes: {
      type: Number,
      default: 90,
      validate: [
        {
          validator: function (val) {
            return Number.isInteger(val) && val >= 10 && val <= 180;
          },
          message: 'Duration must be an integer between 10 and 180 minutes'
        }
      ]
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: {
        values: matchStatusEnum,
        message: '{VALUE} is not a valid match status'
      },
      default: 'Scheduled'
    },
    homeScore: {
      type: Number,
      default: 0,
      validate: [
        {
          validator: function (val) {
            return Number.isInteger(val) && val >= 0;
          },
          message: 'Home score must be a non-negative integer'
        }
      ]
    },
    awayScore: {
      type: Number,
      default: 0,
      validate: [
        {
          validator: function (val) {
            return Number.isInteger(val) && val >= 0;
          },
          message: 'Away score must be a non-negative integer'
        }
      ]
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    goals: {
      type: [goalSubSchema],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Cross-field validation for distinct teams and valid goal attribution
matchSchema.pre('validate', function (next) {
  // 1. Home and Away teams must be distinct
  if (this.homeTeam && this.awayTeam && this.homeTeam.toString() === this.awayTeam.toString()) {
    this.invalidate('awayTeam', 'Home team and away team must be different');
  }

  // 2. Goal records must belong to either homeTeam or awayTeam
  if (Array.isArray(this.goals) && this.homeTeam && this.awayTeam) {
    const homeId = this.homeTeam.toString();
    const awayId = this.awayTeam.toString();

    for (const goal of this.goals) {
      if (goal.team) {
        const goalTeamId = goal.team.toString();
        if (goalTeamId !== homeId && goalTeamId !== awayId) {
          this.invalidate(
            'goals',
            'Goal team must be either the designated home team or away team'
          );
          break;
        }
      }
    }
  }

  next();
});

// Indexes for common query patterns
matchSchema.index({ scheduledAt: 1, status: 1 });
matchSchema.index({ homeTeam: 1 });
matchSchema.index({ awayTeam: 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ createdBy: 1 });
matchSchema.index({ referee: 1 });

const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);

export default Match;
export { matchTypeEnum, matchStatusEnum, goalTypeEnum };

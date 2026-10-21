import mongoose from 'mongoose';

const positionEnum = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Utility'];
const footEnum = ['Left', 'Right', 'Both'];

const playerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [1, 'First name must be at least 1 character'],
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [1, 'Last name must be at least 1 character'],
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters']
    },
    dateOfBirth: {
      type: Date,
      validate: [
        {
          validator: function (value) {
            if (!value) return true;
            // Reject future dates and unrealistic historical dates
            return value <= new Date() && value >= new Date('1900-01-01');
          },
          message: 'Date of birth must be a valid date in the past after 1900'
        }
      ]
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: [60, 'Nationality cannot exceed 60 characters']
    },
    primaryPosition: {
      type: String,
      enum: {
        values: positionEnum,
        message: '{VALUE} is not a valid player position'
      },
      default: 'Utility'
    },
    preferredFoot: {
      type: String,
      enum: {
        values: footEnum,
        message: '{VALUE} is not a valid preferred foot option'
      },
      default: 'Right'
    },
    profileImageUrl: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [25, 'Phone number cannot exceed 25 characters']
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null
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

// Derive displayName from firstName and lastName if not explicitly provided
playerSchema.pre('validate', function (next) {
  if (!this.displayName && (this.firstName || this.lastName)) {
    this.displayName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  next();
});

// Indexes for common search and listing queries
playerSchema.index({ lastName: 1, firstName: 1 });
playerSchema.index({ primaryPosition: 1 });
playerSchema.index({ isActive: 1 });
playerSchema.index({ team: 1 });

const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

export default Player;
export { positionEnum, footEnum };

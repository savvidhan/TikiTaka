import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const userRolesEnum = ['Admin', 'TeamManager', 'Referee', 'Spectator'];
export const publicRegistrationRoles = ['TeamManager', 'Spectator'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'User name must be at least 2 characters'],
      maxlength: [100, 'User name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Exclude password from query projections by default
    },
    role: {
      type: String,
      enum: {
        values: userRolesEnum,
        message: '{VALUE} is not a valid user role'
      },
      default: 'Spectator'
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

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare candidate password against hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error('Password field not selected in query');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Database indexes (email uniqueness is already indexed via schema field definition)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;

import { User, publicRegistrationRoles } from '../models/index.js';
import { generateToken, getCookieOptions, COOKIE_NAME } from '../utils/jwt.js';

/**
 * Standard RFC-compliant email regex pattern (rejects consecutive dots, invalid labels)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

/**
 * Password complexity requirements:
 * - At least 8 characters long
 * - Maximum 128 characters (prevents bcrypt DoS)
 * - Contains at least one letter
 * - Contains at least one number or special character
 */
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-zA-Z])(?=.*[\d\W]).{8,128}$/;

/**
 * @desc    Register a new user account
 * @route   POST /api/auth/register
 * @access  Public (Self-registration for TeamManager and Spectator only)
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters'
      });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password cannot exceed 128 characters'
      });
    }

    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one letter and at least one number or special character'
      });
    }

    // 2. Validate and enforce role restrictions
    // Default safe role: Spectator (least privileged, read-only)
    let assignedRole = 'Spectator';

    if (role !== undefined && role !== null && role !== '') {
      const trimmedRole = typeof role === 'string' ? role.trim() : role;

      // Reject attempts to self-assign privileged administrative roles
      if (trimmedRole === 'Admin' || trimmedRole === 'Referee') {
        return res.status(400).json({
          success: false,
          message: `Registration as ${trimmedRole} is not permitted. Privileged roles must be assigned through an authorized administrative workflow.`
        });
      }

      // Reject any arbitrary or unknown role string
      if (!publicRegistrationRoles.includes(trimmedRole)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Allowed public registration roles are: ${publicRegistrationRoles.join(', ')}.`
        });
      }

      assignedRole = trimmedRole;
    }

    // 3. Check for existing user with normalized email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    // 4. Instantiate and save user
    // The User model pre-save hook handles bcrypt salt and hashing automatically.
    // Plaintext password is never stored or double-hashed.
    const user = new User({
      name: trimmedName,
      email: normalizedEmail,
      password,
      role: assignedRole
    });

    await user.save();

    // 5. Generate session token and set HTTP-only cookie
    const token = generateToken(user);
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    // 6. Return safe response containing token and user profile
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    // Handle concurrent registration duplicate-key race condition safely
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }
    next(error);
  }
};

/**
 * @desc    Authenticate user and issue session token / HTTP-only cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate required fields
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // 2. Normalize email consistently with registration
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Query user explicitly selecting the password hash
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // 4. Return generic authentication error for non-existent account
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 5. Verify password hash using instance method
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 6. Check active account status
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // 7. Generate JWT token
    const token = generateToken(user);

    // 8. Set HTTP-only session cookie
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    // 9. Return safe response containing token and user profile (never password/hash)
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (requires authentication)
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log out user by clearing the HTTP-only session cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = async (req, res, next) => {
  try {
    const cookieOptions = getCookieOptions();
    res.clearCookie(COOKIE_NAME, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};


import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'tikitaka_token';

/**
 * Fallback secret used only in development/test if JWT_SECRET is not configured.
 * Production strictly throws an error if JWT_SECRET is absent.
 */
const DEV_FALLBACK_SECRET = 'tikitaka_dev_jwt_secret_do_not_use_in_production_12345';

/**
 * Safely retrieve the JWT signing secret from environment configuration.
 * Enforces that production environments MUST provide a strong JWT_SECRET.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is required in production.'
      );
    }
    return DEV_FALLBACK_SECRET;
  }
  if (
    process.env.NODE_ENV === 'production' &&
    (secret === 'your_jwt_secret_min_32_chars' || secret.length < 16)
  ) {
    throw new Error(
      'CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET in production must not use template placeholders or weak secrets (minimum 16-32 characters).'
    );
  }
  return secret;
};

/**
 * Retrieve the token expiration window string (e.g. '7d', '24h', '1h').
 */
export const getJwtExpiresIn = () => {
  return process.env.JWT_EXPIRES_IN || '7d';
};

/**
 * Convert duration string (e.g. '7d', '24h', '1h') to milliseconds for cookie maxAge.
 */
export const parseDurationToMs = (durationStr) => {
  if (typeof durationStr === 'number') return durationStr;
  if (!durationStr || typeof durationStr !== 'string') return 7 * 24 * 60 * 60 * 1000;

  const match = durationStr.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
};

/**
 * Configure cookie attributes based on environment and deployment architecture.
 *
 * Development:
 * - Frontend: http://localhost:5173, Backend: http://localhost:5000 (same-site: 'localhost')
 * - httpOnly: true, secure: false (plain HTTP), sameSite: 'lax', path: '/'
 *
 * Production:
 * - httpOnly: true, secure: true (HTTPS required)
 * - SameSite: Defaults to 'none' in production to support separate domains (e.g., Vercel and Render).
 *   Can be explicitly configured to 'lax' or 'strict' via COOKIE_SAMESITE if frontend and backend share an apex domain.
 */
export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSiteEnv = (process.env.COOKIE_SAMESITE || '').toLowerCase();

  let sameSite = 'lax';
  if (sameSiteEnv === 'none') {
    sameSite = 'none';
  } else if (sameSiteEnv === 'strict') {
    sameSite = 'strict';
  } else if (sameSiteEnv === 'lax') {
    sameSite = 'lax';
  } else if (isProduction) {
    // Default to 'none' in production to allow cross-site cookie transmission between Vercel frontend and Render backend
    sameSite = 'none';
  }

  // SameSite=None requires Secure=true in all modern browsers
  const secure = isProduction || sameSite === 'none';
  const maxAge = parseDurationToMs(getJwtExpiresIn());

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge
  };
};

/**
 * Generate a signed JWT token containing minimal, safe identity claims.
 * Never includes passwords, password hashes, or sensitive PII.
 *
 * @param {Object} user - Mongoose user document or sanitized user object
 * @returns {string} - Signed JWT string
 */
export const generateToken = (user) => {
  const payload = {
    id: user._id.toString(),
    role: user.role
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn()
  });
};

/**
 * Verify and decode a JWT token string.
 *
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

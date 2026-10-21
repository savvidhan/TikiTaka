import mongoose from 'mongoose';
import { User, userRolesEnum } from '../models/index.js';
import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';

/**
 * Helper to parse raw Cookie header into key-value map
 * @param {string} cookieHeader
 * @returns {Record<string, string>}
 */
export const parseCookies = (cookieHeader) => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};
  return cookieHeader.split(';').reduce((acc, pair) => {
    const [key, ...vals] = pair.trim().split('=');
    if (key && vals.length > 0) {
      acc[key.trim()] = decodeURIComponent(vals.join('='));
    }
    return acc;
  }, {});
};

/**
 * Protect middleware:
 * - Accepts tikitaka_token HTTP-only cookie as primary browser credential.
 * - Supports Authorization: Bearer <token> for API consumers and test clients.
 * - Detects and safely rejects conflicting credentials when both cookie and Bearer header
 *   are supplied and identify different users (never silently authenticates as a different user).
 * - Verifies JWT signature and expiry.
 * - Loads current user from database, verifies existence and active status.
 * - Populates verified req.user without trusting any client-supplied body/header claims.
 */
export const protect = async (req, res, next) => {
  try {
    // 1. Extract cookie credential
    const cookieToken =
      (req.cookies && req.cookies[COOKIE_NAME]) ||
      parseCookies(req.headers.cookie)[COOKIE_NAME] ||
      null;

    // 2. Extract Bearer header credential
    let bearerToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.substring(7).trim();
    }

    // 3. Resolve credential presence and conflict resolution
    let token = null;

    if (cookieToken && bearerToken) {
      // Both credentials supplied: verify both and ensure they decode to the same user
      let cookiePayload, bearerPayload;
      try {
        cookiePayload = verifyToken(cookieToken);
      } catch {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed: Session cookie is invalid or expired.'
        });
      }

      try {
        bearerPayload = verifyToken(bearerToken);
      } catch {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed: Bearer authorization token is invalid or expired.'
        });
      }

      if (cookiePayload.id !== bearerPayload.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication conflict: Cookie and Bearer credentials identify different users.'
        });
      }

      token = bearerToken;
    } else if (bearerToken) {
      token = bearerToken;
    } else if (cookieToken) {
      token = cookieToken;
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in or provide a valid Bearer token.'
      });
    }

    // 4. Verify token signature and expiry
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please log in again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid or malformed authentication token.'
      });
    }

    // 5. Verify payload structure
    if (!decoded || !decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token payload.'
      });
    }

    // 6. Retrieve active user from database (excluding password hash)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account associated with this token no longer exists.'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // 7. Attach verified, safe user object to request
    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) authorization middleware.
 * Verifies that the authenticated user's role is included in allowedRoles.
 * Must run after protect middleware.
 *
 * @param  {...string} allowedRoles - Allowed user roles
 */
export const authorize = (...allowedRoles) => {
  const roles = allowedRoles.flat();

  if (roles.length === 0 || roles.some((r) => !userRolesEnum.includes(r))) {
    throw new Error(
      `Invalid authorization configuration: all allowed roles must be valid members of userRolesEnum: ${userRolesEnum.join(', ')}`
    );
  }

  return (req, res, next) => {
    // 1. Ensure user has been authenticated by protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No authenticated user context found.'
      });
    }

    // 2. Enforce verified database role permissions
    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role "${userRole}" is not authorized to access this resource.`
      });
    }

    next();
  };
};

/**
 * Action-aware authorization middleware for match status transitions (PATCH /api/matches/:id/status).
 * Ensures that different transition actions enforce distinct role permissions:
 * - Starting a match (-> 'Live'): Admin, Referee
 * - Completing a match (-> 'Completed'): Admin, Referee
 * - Cancelling a match (-> 'Cancelled'): Admin, TeamManager
 * Must run after protect middleware.
 */
export const authorizeMatchStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No authenticated user context found.'
    });
  }

  const userRole = req.user.role;

  // Admin has full administrative override across all status transitions
  if (userRole === 'Admin') {
    return next();
  }

  // Spectator is never permitted to mutate match status
  if (userRole === 'Spectator') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Spectators are not permitted to change match status.'
    });
  }

  const { status: targetStatus } = req.body;

  if (targetStatus === 'Live' || targetStatus === 'Completed') {
    if (userRole !== 'Referee') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role "${userRole}" is not authorized to transition match to "${targetStatus}". Only Referees and Admins can start or complete matches.`
      });
    }
  } else if (targetStatus === 'Cancelled') {
    if (userRole !== 'TeamManager') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role "${userRole}" is not authorized to cancel matches. Only Team Managers and Admins can cancel scheduled matches.`
      });
    }
  } else if (targetStatus) {
    if (userRole !== 'Referee' && userRole !== 'TeamManager') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role "${userRole}" is not authorized to modify match status.`
      });
    }
  }

  next();
};

export default protect;

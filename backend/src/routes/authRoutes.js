import express from 'express';
import { register, login, getMe, logout } from '../controllers/authController.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Public self-registration (TeamManager or Spectator)
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user, issue HTTP-only cookie and JWT token
 * @access  Public
 */
router.post('/login', loginLimiter, login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get('/me', protect, getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Clear session cookie and log out
 * @access  Public
 */
router.post('/logout', logout);

export default router;


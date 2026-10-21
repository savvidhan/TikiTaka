import rateLimit from 'express-rate-limit';

/**
 * Dedicated login rate limiter to mitigate brute-force and credential-stuffing attacks.
 * Configured per IP address with standard RateLimit headers.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: process.env.LOGIN_RATE_LIMIT_MAX
    ? parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10)
    : (process.env.NODE_ENV === 'test' ? 100 : (process.env.NODE_ENV === 'production' ? 5 : 20)),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  }
});

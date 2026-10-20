import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getDatabaseState } from './config/database.js';
import playerRoutes from './routes/playerRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import matchRoutes from './routes/matchRoutes.js';

const app = express();

// Reverse Proxy Configuration:
// Trust the first-hop reverse proxy (e.g. Render, Railway, Fly.io, Heroku, AWS ALB, Nginx).
// This ensures req.ip correctly reflects the client's actual IP address for rate limiting
// rather than the reverse proxy's internal load balancer IP.
app.set('trust proxy', 1);

// Security HTTP headers
app.use(helmet());

/**
 * Parse and normalize allowed origins from FRONTEND_URL environment variable.
 * Supports comma-separated list of URLs and strips any trailing slashes.
 */
export const getAllowedOrigins = () => {
  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const allOrigins = new Set([...defaultOrigins, ...envOrigins]);
  return Array.from(allOrigins);
};

// CORS configuration:
// Supports comma-separated frontend origins, strips trailing slashes, and rejects
// unapproved cross-origin requests safely without throwing an unhandled application error.
app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Allow requests with no origin (e.g. mobile apps, server-to-server, curl)
      if (!origin) {
        return callback(null, true);
      }

      // 2. Normalize incoming origin by removing trailing slashes
      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      const allowedOrigins = getAllowedOrigins();

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // 3. Reject unapproved origins without throwing an application error
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

// Rate limiting: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api', apiLimiter);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = getDatabaseState();
  const isHealthy = true; // API server itself is running

  res.status(200).json({
    status: 'ok',
    server: 'reachable',
    service: 'tikitaka-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbState.status,
      connected: dbState.isConnected,
      ...(dbState.message ? { message: dbState.message } : {})
    }
  });
});

// API Resource Routes
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TikiTaka API',
    description: 'Football team, match, and live score management system',
    status: 'online',
    health: '/api/health',
    endpoints: {
      players: '/api/players',
      teams: '/api/teams',
      matches: '/api/matches'
    }
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  // 1. Mongoose Duplicate Key Error (e.g. unique team name)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Conflict: A record with that ${field} already exists.`
    });
  }

  // 2. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. ')
    });
  }

  // 3. Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for field "${err.path}".`
    });
  }

  // 4. Custom App or Generic Error
  const statusCode = err.statusCode || (err.message && err.message.includes('must be') ? 400 : 500);
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;

import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { getJwtSecret } from './utils/jwt.js';

const PORT = process.env.PORT || 5000;

// Attempt database connection first before accepting requests
const startServer = async () => {
  console.log('⚽ Starting TikiTaka Backend API Server...');

  // Fail-fast security validation in production
  if (process.env.NODE_ENV === 'production') {
    getJwtSecret();
  }

  await connectDatabase();

  const server = app.listen(PORT, () => {
    console.log(`🚀 TikiTaka API server listening at http://localhost:${PORT}`);
    console.log(`🩺 Health check available at: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('🔒 HTTP server closed');
      await disconnectDatabase();
      console.log('👋 Process exiting cleanly');
      process.exit(0);
    });

    // Force exit if shutdown takes longer than 10 seconds
    setTimeout(() => {
      console.error('⚠️ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
  console.error('Fatal error during server startup:', err);
  process.exit(1);
});

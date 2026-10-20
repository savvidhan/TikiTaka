import mongoose from 'mongoose';

const connectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized'
};

let lastConnectionError = null;

export const getDatabaseState = () => {
  const stateCode = mongoose.connection.readyState;
  return {
    code: stateCode,
    status: connectionStates[stateCode] || 'unknown',
    isConnected: stateCode === 1,
    ...(stateCode === 1 ? {} : { message: lastConnectionError || 'Database disconnected' })
  };
};

export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    lastConnectionError = 'MONGODB_URI contains placeholder credentials or is unconfigured';
    console.warn(
      '⚠️  MONGODB_URI is not configured or contains placeholder credentials in .env. MongoDB connection skipped.'
    );
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // 5-second timeout to avoid blocking indefinitely
    });

    lastConnectionError = null;
    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    let sanitizedMessage = 'Database connection failed';
    if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
      sanitizedMessage = 'Authentication failed: invalid MongoDB Atlas username or password';
    } else if (error.message.includes('timed out') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
      sanitizedMessage = 'Connection timed out: Check MongoDB Atlas Network Access (IP whitelist)';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('querySrv ENOTFOUND')) {
      sanitizedMessage = 'DNS lookup failed: Check MongoDB cluster hostname in URI';
    } else {
      sanitizedMessage = error.message;
    }

    lastConnectionError = sanitizedMessage;
    console.error(`❌ MongoDB connection error: ${sanitizedMessage}`);
    return false;
  }
};

export const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB connection closed gracefully');
    }
  } catch (error) {
    console.error(`Error disconnecting MongoDB: ${error.message}`);
  }
};

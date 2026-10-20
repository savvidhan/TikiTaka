import mongoose from 'mongoose';

const connectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized'
};

export const getDatabaseState = () => {
  const stateCode = mongoose.connection.readyState;
  return {
    code: stateCode,
    status: connectionStates[stateCode] || 'unknown',
    isConnected: stateCode === 1
  };
};

export const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    console.warn(
      '⚠️  MONGODB_URI is not configured or contains placeholder credentials in .env. MongoDB connection skipped.'
    );
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // 5-second timeout to avoid blocking indefinitely
    });

    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
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

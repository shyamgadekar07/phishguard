import mongoose from 'mongoose';

/**
 * Connect to MongoDB Atlas or local MongoDB instance.
 * Reads connection string securely from process.env.MONGO_URI.
 */
export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.warn(
      '[Database Warning] MONGO_URI is not set in environment variables. Database features will be unavailable until configured.'
    );
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    // In production, database failure might require process exit; in development, allow health check to function
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return false;
  }
};

export default connectDB;

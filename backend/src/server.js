import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize server and database connection
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Start listening
  app.listen(PORT, () => {
    console.log(`[Server] PhishGuard Backend is running on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();

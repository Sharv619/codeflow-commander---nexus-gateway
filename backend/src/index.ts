import 'dotenv/config';
import app from './app.js';
import database from './config/database.js';

const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Validate environment variables
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      console.error('❌ CRITICAL: JWT_SECRET is not properly configured!');
      console.error('Please set JWT_SECRET environment variable to a secure random string.');
      process.exit(1);
    }

    // Initialize database connection
    console.log('🔌 Connecting to MongoDB...');
    await database.connect();

    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Codeflow Commander Backend Server Started');
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🌐 Server listening on: http://localhost:${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 API endpoints: http://localhost:${PORT}/api/*`);
      console.log('');

      if (NODE_ENV === 'development') {
        console.log('💡 Development mode features:');
        console.log('   - Detailed error messages');
        console.log('   - Request logging');
        console.log('   - Hot reload available');
        console.log('');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('📴 SIGTERM received, shutting down gracefully...');
      await database.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('📴 SIGINT received, shutting down gracefully...');
      await database.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error('💥 Startup error:', error);
  process.exit(1);
});

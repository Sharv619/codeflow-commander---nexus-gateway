import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private getConfig(): DatabaseConfig {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/codeflow';

    // Validate the MongoDB URI
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
    }

    return {
      uri: mongoUri,
      options: {
        maxPoolSize: 10, // Maximum number of connections in the connection pool
        minPoolSize: 2,  // Minimum number of connections in the connection pool
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable Mongoose buffering
      }
    };
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('MongoDB already connected');
      return;
    }

    try {
      const { uri, options } = this.getConfig();

      console.log('🔌 Attempting to connect to MongoDB...');

      await mongoose.connect(uri, options);

      this.isConnected = true;

      console.log('✅ MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📴 MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📴 MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionState(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const state = mongoose.connection.readyState;
    return states[state as keyof typeof states] || 'unknown';
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected || !mongoose.connection.db) {
        return false;
      }

      // Perform a simple ping to check if the database is responding
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  public async dropDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Database drop is only allowed in test environment');
    }

    try {
      if (!mongoose.connection.db) {
        throw new Error('Database connection not available');
      }
      await mongoose.connection.db.dropDatabase();
      console.log('🗑️ Database dropped successfully');
    } catch (error) {
      console.error('❌ Failed to drop database:', error);
      throw error;
    }
  }
}

// Create singleton instance
const database = Database.getInstance();

export default database;

// Export for testing purposes
export { Database };

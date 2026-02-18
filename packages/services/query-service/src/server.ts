import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Import resolvers and types
import { resolvers, GraphQLContext } from './resolvers/index';
import { NeptuneClient } from './services/neptune';

// Load environment variables
config();

// Read GraphQL schema
const schemaPath = path.join(__dirname, 'schemas', 'schema.graphql');
const typeDefs = fs.readFileSync(schemaPath, 'utf8');

/**
 * EKG Query Service - GraphQL API for Enterprise Knowledge Graph queries
 *
 * Provides a powerful GraphQL interface to query repository intelligence,
 * patterns, dependencies, and similarity analysis from the Neptune graph database.
 */
class EKGQueryService {
  private app: express.Express;
  private server!: ApolloServer;
  private neptuneClient: NeptuneClient;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '4000', 10);
    this.neptuneClient = new NeptuneClient();

    this.setupMiddleware();
    this.setupGraphQLServer();
    this.setupRoutes();
  }

  /**
   * Configure Express middleware for security and performance
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174'
        ];

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Apollo-Tracing'],
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Rate limiting to prevent abuse
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Request logging middleware
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });

      next();
    });
  }

  /**
   * Set up Apollo GraphQL server with schema and resolvers
   */
  private async setupGraphQLServer(): Promise<void> {
    try {
      console.log('Setting up GraphQL server...');

      // Create Apollo Server instance
      this.server = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({ req }): GraphQLContext => {
          // Extract user ID from headers (would be set by auth middleware in production)
          const userId = req.headers['x-user-id'] as string | undefined;
          const requestId = req.headers['x-request-id'] as string | undefined;

          const context: GraphQLContext = {
            neptune: this.neptuneClient
          };
          
          if (userId) context.userId = userId;
          if (requestId) context.requestId = requestId;
          
          return context;
        },
        // Validation rules for production safety
        validationRules: [
          depthLimit(10), // Prevent deeply nested queries
          createComplexityLimitRule(1000, { // Limit query complexity
            onCost: (cost: number) => {
              console.log(`Query cost: ${cost}`);
            }
          })
        ],
        // Production optimizations
        debug: process.env.NODE_ENV !== 'production',

        // Error formatting for production
        formatError: (error) => {
          console.error('GraphQL Error:', {
            message: error.message,
            locations: error.locations,
            path: error.path,
            extensions: error.extensions,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });

          const result: any = {
            message: error.message,
          };

          if (error.path) {
            result.path = error.path;
          }

          if (error.extensions?.code) {
            result.extensions = { code: error.extensions.code };
          }

          return result;
        },

        // Health checks and introspection
        introspection: process.env.NODE_ENV !== 'production'
      });

      console.log('Apollo Server created, starting...');

      // Apply Apollo GraphQL middleware to Express
      await this.server.start();
      console.log('Apollo Server started, applying middleware...');

      this.server.applyMiddleware({
        app: this.app as any,
        path: '/graphql',
        cors: false // CORS is handled by Express middleware
      });

      console.log('GraphQL middleware applied successfully');
    } catch (error) {
      console.error('Failed to setup GraphQL server:', error);
      throw error;
    }
  }

  /**
   * Configure additional HTTP routes
   */
  private setupRoutes(): void {

    // Health check endpoint
    this.app.get('/health', (_req: express.Request, res: express.Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'ekg-query-service',
        version: '1.0.0'
      });
    });

    // Ready check endpoint with database connectivity check
    this.app.get('/ready', async (_req: express.Request, res: express.Response) => {
      try {
        const isHealthy = await this.neptuneClient.healthCheck();

        if (isHealthy) {
          res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            checks: {
              neptune: 'connected'
            }
          });
        } else {
          res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: 'Neptune database unavailable'
          });
        }
      } catch (error) {
        console.error('Readiness check failed:', error);
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          error: 'Database connectivity check failed'
        });
      }
    });

    // Metrics endpoint for monitoring
    this.app.get('/metrics', async (_req: express.Request, res: express.Response) => {
      try {
        const stats = await this.neptuneClient.getStatistics();
        const nodeMetrics = process.memoryUsage();

        res.json({
          timestamp: new Date().toISOString(),
          database: {
            vertices: stats.vertexCount,
            edges: stats.edgeCount,
            repositoryCount: stats.vertexCount, // Approximation
            patternCount: 0,
            dependencyCount: stats.edgeCount
          },
          process: {
            uptime: process.uptime(),
            memory: {
              rss: Math.round(nodeMetrics.rss / 1024 / 1024), // MB
              heapUsed: Math.round(nodeMetrics.heapUsed / 1024 / 1024), // MB
              heapTotal: Math.round(nodeMetrics.heapTotal / 1024 / 1024), // MB
            },
            version: process.version
          }
        });
      } catch (error) {
        console.error('Metrics collection failed:', error);
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

    // GraphQL Playground info for development
    if (process.env.NODE_ENV === 'development') {
      this.app.get('/playground', (req: express.Request, res: express.Response) => {
        res.json({
          message: 'GraphQL Playground available at /graphql',
          endpoints: {
            graphql: `${req.protocol}://${req.get('host')}/graphql`,
            health: `${req.protocol}://${req.get('host')}/health`,
            ready: `${req.protocol}://${req.get('host')}/ready`,
            metrics: `${req.protocol}://${req.get('host')}/metrics`
          },
          exampleQueries: [
            'query { repositories(limit: 5) { id name fullName owner } }',
            'query { graphStatistics { repositoryCount edgeCount analyzedLanguages } }',
            'query { repositoryIntelligence(repositoryId: "123") { repository { name } patterns { name confidence } } }'
          ]
        });
      });
    }

    // Catch-all handler for undefined routes
    this.app.use('*', (req: express.Request, res: express.Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found in EKG Query Service`,
        availableEndpoints: [
          '/graphql',
          '/health',
          '/ready',
          '/metrics'
        ]
      });
    });
  }

  /**
   * Start the GraphQL service
   */
  async start(): Promise<void> {
    try {
      // Initialize Neptune connection (skip for smoke test)
      if (process.env.SKIP_NEPTUNE !== 'true') {
        console.log('Connecting to Neptune database...');
        await this.neptuneClient.connect();
        console.log('Connected to Neptune successfully');
      } else {
        console.log('Skipping Neptune connection (smoke test mode)');
      }

      // Start Express server
      this.app.listen(this.port, () => {
        console.log(`🚀 EKG Query Service running on port ${this.port}`);
        console.log(`📊 GraphQL endpoint: http://localhost:${this.port}/graphql`);
        console.log(`❤️  Health check: http://localhost:${this.port}/health`);
        console.log(`📈 Ready check: http://localhost:${this.port}/ready`);
        console.log(`📋 Metrics: http://localhost:${this.port}/metrics`);

        if (process.env.NODE_ENV === 'development') {
          console.log(`🖥️  Playground info: http://localhost:${this.port}/playground`);
        }
      });

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        await this.stop();
      });

      process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await this.stop();
      });

    } catch (error) {
      console.error('Failed to start EKG Query Service:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the service and cleanup connections
   */
  async stop(): Promise<void> {
    try {
      console.log('Cleaning up connections...');
      await this.neptuneClient.disconnect();

      if (this.server) {
        await this.server.stop();
      }

      console.log('Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new EKGQueryService();
  service.start().catch(error => {
    console.error('Failed to start service:', error);
    process.exit(1);
  });
}

export default EKGQueryService;

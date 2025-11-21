import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Webhooks } from '@octokit/webhooks';
import { config } from 'dotenv';

// Load environment variables
config();

// Import handlers (we'll create these next)
import { webhookHandler } from './handlers/webhooks';
import { GitHubClient } from './services/github';
import { NeptuneClient } from './services/neptune';
import { RepositoryProcessor } from './services/repositoryProcessor';

// Types

/**
 * EKG Ingestion Service - Enterprise Knowledge Graph Ingestion Microservice
 *
 * Handles webhooks from Git platforms, processes repositories with PRISM analysis,
 * and populates the Neptune graph database.
 */
class EKGMicroservice {
  private app: Express;
  private webhooks: Webhooks;
  private githubClient: GitHubClient;
  private neptuneClient: NeptuneClient;
  private repositoryProcessor: RepositoryProcessor;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);

    // Initialize webhook handler with secret
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('WEBHOOK_SECRET environment variable is required');
    }
    this.webhooks = new Webhooks({
      secret: webhookSecret,
      log: console // Use console for development
    });

    // Initialize services
    this.githubClient = new GitHubClient();
    this.neptuneClient = new NeptuneClient();
    this.repositoryProcessor = new RepositoryProcessor(
      this.githubClient,
      this.neptuneClient
    );

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebhookHandlers();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // CORS configuration for webhook endpoints - SECURITY: Restrict origins
    const allowedOrigins = process.env.CORS_ORIGIN ?
      process.env.CORS_ORIGIN.split(',') :
      ['https://github.com', 'https://api.github.com']; // Default to GitHub only

    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        } else {
          return callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'X-GitHub-Delivery', 'X-GitHub-Event', 'X-Hub-Signature-256'],
      credentials: false // Webhooks don't need credentials
    }));

    // Security headers
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });

    // Parse JSON payloads (without verify - we'll handle verification in the webhook handler)
    this.app.use(express.json({
      limit: '50mb' // Large limit for webhook payloads with repository data
    }));

    // Request logging middleware
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] ${_req.method} ${_req.path}`);

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ${_req.method} ${_req.path} ${res.statusCode} ${duration}ms`);
      });

      next();
    });
  }

  /**
   * Configure HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'ekg-ingestion-service',
        version: '1.0.0'
      });
    });

    // Ready check endpoint (includes database connectivity)
    this.app.get('/ready', async (_req: Request, res: Response) => {
      try {
        // Check Neptune connectivity
        await this.neptuneClient.healthCheck();

        res.json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          checks: {
            neptune: 'connected'
          }
        });
      } catch (error) {
        console.error('Readiness check failed:', error);
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          error: (error as Error).message
        });
      }
    });

    // Metrics endpoint for monitoring
    this.app.get('/metrics', async (_req: Request, res: Response) => {
      try {
        // Basic metrics - will be expanded with proper monitoring
        const metrics = {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        };

        res.json(metrics);
      } catch (error) {
        console.error('Failed to get metrics:', error);
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // Debug endpoint for troubleshooting
    if (process.env.NODE_ENV === 'development') {
      this.app.get('/debug', (_req: Request, res: Response) => {
        res.json({
          env: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT
          },
          webhookConfigured: !!process.env.WEBHOOK_SECRET,
          neptuneConfigured: !!(process.env.NEPTUNE_ENDPOINT && process.env.NEPTUNE_PORT),
          githubConfigured: !!process.env.GITHUB_TOKEN
        });
      });
    }
  }

  /**
   * Configure GitHub webhook event handlers
   */
  private setupWebhookHandlers(): void {
    // GitHub webhook endpoint with authentication
    this.app.post('/webhooks/github', webhookHandler(this.webhooks));

    // Repository events (push, create, etc.)
    this.webhooks.on('push', async ({ payload }: { payload: any }) => {
      const { repository, sender } = payload;
      console.log(`Processing push event for ${repository.full_name} by ${sender.login}`);

      try {
        await this.repositoryProcessor.processRepository({
          id: repository.id.toString(),
          fullName: repository.full_name,
          cloneUrl: repository.clone_url,
          owner: repository.owner.login,
          triggeredBy: sender.login,
          eventType: 'push',
          branch: payload.ref?.replace('refs/heads/', '') || 'main'
        });
      } catch (error) {
        console.error(`Failed to process push event for ${repository.full_name}:`, error);
      }
    });

    // Repository creation events
    this.webhooks.on('repository.created', async ({ payload }: { payload: any }) => {
      const { repository, sender } = payload;
      console.log(`Processing repository creation for ${repository.full_name} by ${sender.login}`);

      try {
        await this.repositoryProcessor.processRepository({
          id: repository.id.toString(),
          fullName: repository.full_name,
          cloneUrl: repository.clone_url,
          owner: repository.owner.login,
          triggeredBy: sender.login,
          eventType: 'repository.created'
        });
      } catch (error) {
        console.error(`Failed to process repository creation for ${repository.full_name}:`, error);
      }
    });

    // Pull request events
    this.webhooks.on('pull_request.opened', async ({ payload }: { payload: any }) => {
      const { repository, pull_request, sender } = payload;
      console.log(`Processing PR #${pull_request.number} for ${repository.full_name} by ${sender.login}`);

      try {
        await this.repositoryProcessor.processPullRequest({
          id: pull_request.id.toString(),
          number: pull_request.number,
          repositoryId: repository.id.toString(),
          repositoryFullName: repository.full_name,
          cloneUrl: repository.clone_url,
          author: pull_request.user.login,
          headBranch: pull_request.head.ref,
          baseBranch: pull_request.base.ref,
          title: pull_request.title
        });
      } catch (error) {
        console.error(`Failed to process PR #${pull_request.number} for ${repository.full_name}:`, error);
      }
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Initialize connections
      await this.neptuneClient.connect();
      console.log('Connected to Neptune database');

      // Start HTTP server
      this.app.listen(this.port, () => {
        console.log(`🎯 EKG Ingestion Service running on port ${this.port}`);
        console.log(`🚀 Webhook endpoint: http://localhost:${this.port}/webhooks/github`);
        console.log(`❤️  Health check: http://localhost:${this.port}/health`);
        console.log(`📊 Ready check: http://localhost:${this.port}/ready`);
        console.log(`📈 Metrics: http://localhost:${this.port}/metrics`);
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
      console.error('Failed to start EKG Ingestion Service:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server and cleanup connections
   */
  async stop(): Promise<void> {
    try {
      console.log('Cleaning up connections...');
      await this.neptuneClient.disconnect();
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
  const service = new EKGMicroservice();
  service.start().catch(error => {
    console.error('Failed to start service:', error);
    process.exit(1);
  });
}

export default EKGMicroservice;

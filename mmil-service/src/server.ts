import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import { Logger, defaultLogger } from './utils/logger';
import { ErrorHandler } from './validation/ErrorHandler';

dotenv.config();

interface WebhookPayload {
  source: 'github' | 'jira' | 'slack';
  eventType: string;
  payload: any;
}

interface ChatPayload {
  userId: string;
  channelId: string;
  text: string;
  timestamp: string;
}

interface DesignPayload {
  source: 'figma' | 'confluence';
  designId: string;
  version: string;
  content: any;
}

export class MultiModalInterfaceLayer extends EventEmitter {
  public app: Application;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private port: number;

  constructor(port: number = 3000) {
    super();
    this.port = port;
    this.logger = defaultLogger;
    this.errorHandler = new ErrorHandler(this.logger);
    this.app = express();

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(this.requestLogger.bind(this));
  }

  private initializeRoutes(): void {
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', service: 'mmil' });
    });
    this.app.post('/hooks/:source', this.handleWebhook.bind(this));
    this.app.post('/chat/command', this.handleChatCommand.bind(this));
    this.app.post('/design/ingest', this.handleDesignIngest.bind(this));
  }

  private initializeErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        this.errorHandler.handleError(err, { operation: 'http_request', path: req.path });
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    });
  }

  private requestLogger(req: Request, res: Response, next: NextFunction): void {
    this.logger.info(`[MMIL] Received: ${req.method} ${req.path}`);
    next();
  }

  private async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const source = req.params.source as 'github' | 'jira' | 'slack';
      const eventType = req.headers['x-github-event'] as string || 'unknown';

      const payload: WebhookPayload = {
        source,
        eventType,
        payload: req.body,
      };

      this.logger.info(`[MMIL] Processing webhook from ${source}`, { eventType });
      this.emit('webhook', payload);

      res.status(202).json({ status: 'accepted', message: 'Webhook received and queued for processing.' });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandler.handleError(err, { operation: 'handleWebhook' });
      res.status(400).json({ error: 'Bad Request', message: 'Invalid webhook payload.' });
    }
  }

  private async handleChatCommand(req: Request, res: Response): Promise<void> {
    try {
        const payload: ChatPayload = req.body;

        this.logger.info(`[MMIL] Processing chat command from user ${payload.userId}`);
        this.emit('chatCommand', payload);

        res.status(200).json({ status: 'ok', message: 'Command received.' });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandler.handleError(err, { operation: 'handleChatCommand' });
      res.status(400).json({ error: 'Bad Request', message: 'Invalid chat payload.' });
    }
  }

  private async handleDesignIngest(req: Request, res: Response): Promise<void> {
    try {
        const payload: DesignPayload = req.body;

        this.logger.info(`[MMIL] Ingesting design from ${payload.source}`, { designId: payload.designId });
        this.emit('designIngest', payload);

        res.status(202).json({ status: 'accepted', message: 'Design received for processing.' });
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.errorHandler.handleError(err, { operation: 'handleDesignIngest' });
        res.status(400).json({ error: 'Bad Request', message: 'Invalid design payload.' });
    }
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      this.logger.info(`[MMIL] Service is running on http://localhost:${this.port}`);
    });
  }
}

if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const mmil = new MultiModalInterfaceLayer(port);
  mmil.listen();
}

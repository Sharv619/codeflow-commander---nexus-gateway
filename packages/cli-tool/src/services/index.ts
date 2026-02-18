// File: src/services/index.ts
// Service initialization and dependency injection for Phase 2

import { Logger, defaultLogger } from '../utils/logger.js';
import { ErrorHandler, ValidationPipeline, SafetyGovernor } from '../validation/index.js';
import { StorageManager, storageManager } from '../storage/index.js';
import { stateManager } from '../state/index.js';

/**
 * Service Container - Manages all service instances
 */
export class ServiceContainer {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private validationPipeline: ValidationPipeline;
  private safetyGovernor: SafetyGovernor;
  private storageManager: StorageManager;
  private initialized: boolean = false;

  constructor() {
    this.logger = defaultLogger;
    this.errorHandler = new ErrorHandler(this.logger);
    this.validationPipeline = new ValidationPipeline(this.logger);
    this.safetyGovernor = new SafetyGovernor(this.logger);
    this.storageManager = storageManager;
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.logger.info('Initializing services...');

      // Register default validation stages
      this.registerValidationStages();

      this.initialized = true;
      this.logger.info('Services initialized successfully');
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'service-initialization' });
      throw error;
    }
  }

  /**
   * Register default validation stages
   */
  private registerValidationStages(): void {
    // Basic validation stage
    this.validationPipeline.registerStage({
      id: 'basic',
      name: 'Basic Validation',
      priority: 1,
      run: async (context) => ({
        passed: true,
        score: 1.0,
        message: 'Basic validation passed'
      })
    });
  }

  /**
   * Get logger instance
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Get error handler instance
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * Get validation pipeline
   */
  getValidationPipeline(): ValidationPipeline {
    return this.validationPipeline;
  }

  /**
   * Get safety governor
   */
  getSafetyGovernor(): SafetyGovernor {
    return this.safetyGovernor;
  }

  /**
   * Get storage manager
   */
  getStorageManager(): StorageManager {
    return this.storageManager;
  }

  /**
   * Get state manager
   */
  getStateManager() {
    return stateManager;
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown services
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down services...');
    this.initialized = false;
  }
}

// Export singleton instance
export const serviceContainer = new ServiceContainer();

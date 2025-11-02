// File: src/agents/GenerativeAgent.ts
// Base GenerativeAgent framework implementing Phase 3 generative capabilities
// Provides foundational pattern for confidence-scored, safety-validated code generation

import { Logger, defaultLogger } from '../utils/logger';
import { ErrorHandler, ValidationPipeline, ConfidenceCalculator, SafetyGovernor } from '../validation';
import { StateManager } from '../state';
import { StorageManager } from '../storage';
import { RAGService } from '../services/rag';
import { PRISMService } from '../services/prism';
import { PatchEngine } from '../services/patch-engine';
import {
  CodeSuggestion,
  DeveloperFeedback,
  CodeEntity,
  ArchitecturePattern,
} from '../types/entities';
import { ConfidenceScore, ValidationResult } from '../types/core';
import { AgentContext, GenerationRequest, GenerationResult, AgentCapabilities, GenerationStrategy, LearningData } from '../types/generative-agent-types';


/**
 * Base GenerativeAgent Framework - Foundation for all Phase 3 generative agents
 * Implements confidence-validated, context-aware code generation with learning capabilities
 */
export abstract class GenerativeAgent {
  protected logger: Logger;
  protected errorHandler: ErrorHandler;
  protected stateManager: StateManager;
  protected storageManager: StorageManager;
  protected ragService: RAGService;
  protected prismService: PRISMService;
  protected patchEngine: PatchEngine;

  protected capabilities: AgentCapabilities;
  protected strategies: GenerationStrategy[] = [];
  protected learningHistory: LearningData[] = [];
  protected confidenceCalculator: ConfidenceCalculator;
  protected safetyGovernor: SafetyGovernor;
  protected validationPipeline: ValidationPipeline;

  protected startTime: number;

  constructor(
    capabilities: AgentCapabilities,
    stateManager: StateManager,
    storageManager: StorageManager,
    ragService: RAGService,
    prismService: PRISMService,
    patchEngine: PatchEngine,
    logger?: Logger
  ) {
    this.startTime = Date.now();
    this.logger = logger || defaultLogger;
    this.errorHandler = new ErrorHandler(this.logger);
    this.stateManager = stateManager;
    this.storageManager = storageManager;
    this.ragService = ragService;
    this.prismService = prismService;
    this.patchEngine = patchEngine;

    this.capabilities = capabilities;
    this.confidenceCalculator = new ConfidenceCalculator();
    this.safetyGovernor = new SafetyGovernor(this.logger);
    this.validationPipeline = new ValidationPipeline(this.logger);

    this.initializeStrategies();
    this.loadLearningData();
  }

  /**
   * Main generation entry point - orchestrates generation and validation
   */
  async generate(request: GenerationRequest, context: AgentContext = {
    sessionId: `session_${Date.now()}`,
    projectPath: process.cwd(),
    developerId: process.env.USER || 'system',
    trigger: 'manual',
    contextFiles: []
  }): Promise<GenerationResult> {

    this.logger.info('Starting code generation', {
      agentId: this.capabilities.id,
      target: request.target,
      requirements: request.requirements.description?.substring(0, 100)
    });

    const startTime = Date.now();

    try {

      // Validate agent capabilities for this request
      const capabilityValidation = await this.validateCapabilities(request, context);
      if (!capabilityValidation.valid) {
        throw new Error(`Request not suitable for ${this.capabilities.name}: ${capabilityValidation.reason}`);
      }

      // Gather comprehensive context using PRIME intelligence
      const gatheredContext = await this.gatherContext(request, context);

      // Select and execute optimal generation strategy
      const strategy = this.selectStrategy(request, context, gatheredContext);
      if (!strategy) {
        throw new Error(`No suitable generation strategy found for request`);
      }

      // Execute generation with strategy
      const rawResult = await strategy.execute(request, context);

      // Validate and enhance result
      const enhancedResult = await this.validateAndEnhanceResult(rawResult, request, context);

      // Calculate comprehensive confidence score
      const confidence = this.confidenceCalculator.calculateConfidence(
        this.getHistoricalAccuracy(),
        this.calculateContextualRelevance(gatheredContext, request),
        enhancedResult.validation.score,
        { version: this.capabilities.version, specialization: this.capabilities.specialization }
      );

      // Apply learning adjustments
      const adjustedConfidence = this.confidenceCalculator.adjustForFeedback(
        confidence,
        this.getRecentFeedback()
      );

      // Assess safety for application
      const safetyAssessment = await this.safetyGovernor.assessSafety(
        adjustedConfidence,
        await this.getSafetyControls(),
        this.extractRiskFactors(request)
      );

      // Build comprehensive result
      const finalResult: GenerationResult = {
        suggestion: enhancedResult.suggestion,
        confidence: adjustedConfidence,
        validation: enhancedResult.validation,
        metadata: {
          agentId: this.capabilities.id,
          agentVersion: this.capabilities.version,
          generationTime: Date.now() - startTime,
          tokensUsed: rawResult.metadata?.tokensUsed || 0,
          processingSteps: enhancedResult.processingSteps || []
        },
        alternatives: rawResult.alternatives
      };

      // Update learning data
      if (safetyAssessment.approved) {
        await this.recordLearningResult(finalResult, request, context);
      }

      this.logger.info('Generation completed successfully', {
        agentId: this.capabilities.id,
        confidence: finalResult.confidence.value,
        approved: safetyAssessment.approved,
        generationTime: finalResult.metadata.generationTime
      });

      return finalResult;

    } catch (error: unknown) {
      this.errorHandler.handleError(error, { operation: 'generate', request, context });
      throw error;
    }
  }

  /**
   * Analyze and learn from feedback to improve future generations
   */
  async learnFromFeedback(suggestionId: string, feedback: DeveloperFeedback): Promise<void> {
    try {
      this.logger.debug('Processing learning feedback', { suggestionId, feedback });

      // Find relevant generation record
      const learningRecord = this.learningHistory.find(l => l.suggestionId === suggestionId);

      if (!learningRecord) {
        this.logger.warn('No learning record found for suggestion', { suggestionId });
        return;
      }

      // Update learning record with feedback
      learningRecord.accepted = feedback.accepted;
      if (feedback.usefulnessRating !== undefined) {
        learningRecord.rating = feedback.usefulnessRating;
      }

      if (feedback.customNotes) {
        learningRecord.feedbackComments = [feedback.customNotes];
      }

      // Calculate performance improvements
      const performanceMetrics = this.calculatePerformanceMetrics(
        learningRecord,
        feedback
      );
      learningRecord.performanceMetrics = performanceMetrics;


      // Update internal model parameters
      await this.updateModelParameters(learningRecord, feedback);

      // Store learning data for future use
      await this.persistLearningData();

      this.logger.debug('Learning feedback processed', {
        suggestionId,
        accepted: feedback.accepted,
        rating: feedback.usefulnessRating
      });

    } catch (error: unknown) {
      this.logger.warn('Failed to process learning feedback', { error: error instanceof Error ? error.message : String(error), suggestionId });
    }
  }

  /**
   * Analyze agent performance and provide insights
   */
  getPerformanceInsights(): {
    overallAccuracy: number;
    specializationMetrics: Record<string, number>;
    learningProgress: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    // Calculate overall metrics
    const acceptedCount = this.learningHistory.filter(l => l.accepted).length;
    const overallAccuracy = this.learningHistory.length > 0 ?
      acceptedCount / this.learningHistory.length : 0;

    // Calculate specialization metrics
    const specMetrics: Record<string, number> = {};
    this.capabilities.specialization.forEach(spec => {
      const relevantRecords = this.learningHistory.filter(l =>
        l.entityType.toLowerCase().includes(spec.toLowerCase()) ||
        spec.toLowerCase().includes(l.entityType.toLowerCase())
      );

      if (relevantRecords.length > 0) {
        const accepted = relevantRecords.filter(r => r.accepted).length;
        specMetrics[spec] = accepted / relevantRecords.length;
      } else {
        specMetrics[spec] = 0;
      }
    });

    // Generate insights
    const insights = this.analyzePerformanceTrends();

    return {
      overallAccuracy,
      specializationMetrics: specMetrics,
      learningProgress: insights.learningProgress,
      strengths: insights.strengths,
      weaknesses: insights.weaknesses,
      recommendations: insights.recommendations
    };
  }

  // Abstract methods to be implemented by specialized agents

  /**
   * Validate if this agent is capable of handling the request
   */
  protected abstract validateCapabilities(request: GenerationRequest, context: AgentContext):
    Promise<{ valid: boolean; reason: string; }>;

  /**
   * Implement agent's specific generation strategies
   */
  protected abstract initializeStrategies(): void;

  /**
   * Gather domain-specific context for generation
   */
  protected abstract gatherContext(request: GenerationRequest, context: AgentContext):
    Promise<Record<string, any>>;

  /**
   * Validate and enhance generated results using domain knowledge
   */
  protected abstract validateAndEnhanceResult(result: GenerationResult, request: GenerationRequest, context: AgentContext):
    Promise<{ suggestion: CodeSuggestion; validation: ValidationResult; processingSteps: string[]; }>;

  // Standard implementation methods

  /**
   * Select optimal generation strategy based on request and context
   */
  protected selectStrategy(
    request: GenerationRequest,
    context: AgentContext,
    gatheredContext: Record<string, any>
  ): GenerationStrategy | null {
    // Sort strategies by priority and applicability
    const applicableStrategies = this.strategies
      .filter(strategy => strategy.condition(request, context))
      .sort((a, b) => b.priority - a.priority);

    return applicableStrategies[0] || null;
  }

  /**
   * Gather context using VECTOR and PRISM intelligence
   */
  protected async gatherStandardContext(request: GenerationRequest, context: AgentContext):
    Promise<Record<string, any>> {

    const standardContext: Record<string, any> = {};

    // Gather project structure context
    if (context.contextFiles.length > 0) {
      const projectAnalysis = await this.prismService.analyzeProject({
        includeMetrics: false,
        detectPatterns: true,
        generateRecommendations: false
      });

      standardContext.projectStructure = projectAnalysis.projectStructure;
      standardContext.architectureInsights = projectAnalysis.architectureInsights;
    }

    // Gather relevant code context via RAG
    if (request.target.filePath) {
      const ragQuery = {
        content: request.requirements.description,
        vector: new Array(768).fill(0).map(() => Math.random() - 0.5), // Mock vector
        options: {
          maxChunks: 5,
          contextFilters: {
            fileTypes: [request.target.filePath!.split('.').pop() || 'ts']
          }
        }
      };

      const ragResult = await this.ragService.retrieveContext(ragQuery);
      standardContext.relevantCode = ragResult.chunks;
    }

    // Gather related entities
    if (request.target.entityName) {
      const entities = await this.prismService.getEntities(undefined, {
        name: request.target.entityName
      });
      standardContext.relatedEntities = entities;
    }

    return standardContext;
  }

  /**
   * Calculate contextual relevance score
   */
  protected calculateContextualRelevance(context: Record<string, any>, request: GenerationRequest): number {
    let relevance = 0.5; // Base relevance

    // File type relevance
    if (request.target.filePath && context.relevantCode?.length > 0) {
      relevance += 0.3;
    }

    // Entity type relevance
    if (request.target.entityType && context.relatedEntities?.length > 0) {
      relevance += 0.2;
    }

    // Project context relevance
    if (context.projectStructure || context.architectureInsights) {
      relevance += 0.1;
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * Extract risk factors from request
   */
  private extractRiskFactors(request: GenerationRequest): string[] {
    const risks: string[] = [];

    // High-risk patterns
    if (request.requirements.description.toLowerCase().includes('security')) {
      risks.push('security-critical');
    }

    if (request.requirements.description.toLowerCase().includes('breaking')) {
      risks.push('breaking-change');
    }

    // Check for critical path operations
    if (request.target.entityName?.toLowerCase().includes('auth') ||
        request.target.entityName?.toLowerCase().includes('login') ||
        request.target.entityName?.toLowerCase().includes('payment')) {
      risks.push('critical-path');
    }

    return risks;
  }

  /**
   * Get safety controls for this agent
   */
  private async getSafetyControls() {
    // Load from global state or use agent defaults
    const globalState = await this.stateManager.getGlobalState();
    return globalState.ai.safety;
  }

  /**
   * Calculate historical accuracy
   */
  private getHistoricalAccuracy(): number {
    if (this.learningHistory.length === 0) return 0.5;

    const accepted = this.learningHistory.filter(l => l.accepted).length;
    return accepted / this.learningHistory.length;
  }

  /**
   * Get recent feedback for confidence adjustment
   */
  private getRecentFeedback(): Array<{ accepted: boolean; rating?: number }> {
    // Get last 50 feedback records
    return this.learningHistory.slice(-50).map(l => ({
      accepted: l.accepted,
      ...(l.rating !== undefined && { rating: l.rating }),
    }));
  }

  /**
   * Record learning data from successful generations
   */
  private async recordLearningResult(
    result: GenerationResult,
    request: GenerationRequest,
    context: AgentContext
  ): Promise<void> {
    const learningData: LearningData = {
      timestamp: new Date(),
      suggestionId: result.suggestion.id,
      entityType: request.target.entityType || 'unknown',
      contextHash: this.calculateContextHash(request),
      accepted: false, // Will be updated via learnFromFeedback
      performanceMetrics: {
        confidence: result.confidence.value,
        accuracy: this.calculateGenerationAccuracy(result),
        usefulness: result.confidence.value // Placeholder
      }
    };

    this.learningHistory.push(learningData);

    // Keep only recent learning data (last 1000 records)
    if (this.learningHistory.length > 1000) {
      this.learningHistory = this.learningHistory.slice(-1000);
    }
  }

  /**
   * Calculate context hash for learning deduplication
   */
  private calculateContextHash(request: GenerationRequest): string {
    const contextString = JSON.stringify({
      description: request.requirements.description,
      targetType: request.target.entityType,
      constraints: request.requirements.constraints
    });

import { createHash } from 'crypto';
    return createHash('md5').update(contextString).digest('hex');
  }

  /**
   * Calculate generation accuracy (placeholder implementation)
   */
  private calculateGenerationAccuracy(result: GenerationResult): number {
    // This would be calculated based on validation results
    // For now, use confidence score as proxy
    return result.confidence.value;
  }

  /**
   * Calculate performance metrics updates
   */
  private calculatePerformanceMetrics(
    record: LearningData,
    feedback: DeveloperFeedback
  ): { confidence: number; accuracy: number; usefulness: number } {
    return {
      confidence: record.performanceMetrics.confidence,
      accuracy: feedback.accepted ? 1 : 0,
      usefulness: feedback.usefulnessRating ? (feedback.usefulnessRating / 5) : (feedback.accepted ? 0.8 : 0.2)
    };
  }

  /**
   * Update internal model parameters based on feedback
   */
  private async updateModelParameters(record: LearningData, feedback: DeveloperFeedback): Promise<void> {
    // Agent-specific parameter updates would be implemented by subclasses
    // For now, store feedback patterns for future strategy improvements
    await this.storageManager.storeMetadata(
      'global',
      `agent:${this.capabilities.id}:learning:pattern:${record.contextHash}`,
      {
        feedback: feedback.accepted,
        rating: feedback.usefulnessRating,
        timestamp: record.timestamp
      }
    );
  }

  /**
   * Load previous learning data from storage
   */
  private async loadLearningData(): Promise<void> {
    try {
      const learningKey = `agent:${this.capabilities.id}:learning`;
      const learningData = await this.storageManager.getMetadata('global', learningKey);

      if (learningData && learningData.history) {
        // Load and restore learning history
        this.learningHistory = learningData.history || [];
        this.logger.debug('Agent learning data loaded', {
          agentId: this.capabilities.id,
          recordsLoaded: this.learningHistory.length
        });
      }
    } catch (error: unknown) {
      this.logger.warn('Failed to load learning data, starting fresh', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Persist learning data to storage
   */
  private async persistLearningData(): Promise<void> {
    try {
      const learningKey = `agent:${this.capabilities.id}:learning`;
      await this.storageManager.storeMetadata('global', learningKey, {
        history: this.learningHistory.slice(-500), // Keep last 500 records
        lastUpdated: new Date(),
        version: this.capabilities.version
      });
    } catch (error: unknown) {
      this.logger.warn('Failed to persist learning data', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Analyze performance trends and generate insights
   */
  private analyzePerformanceTrends(): {
    learningProgress: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    const learningProgress: Record<string, number> = {};

    // Analyze learning progress over time
    this.learningHistory.forEach((record, index) => {
      // Simple trend analysis - would be more sophisticated in production
      if (index > this.learningHistory.length / 2) {
        learningProgress[record.entityType] = (learningProgress[record.entityType] ?? 0) + (record.accepted ? 1 : 0);
      }
    });

    // Generate insights
    const accuracy = this.getHistoricalAccuracy();
    if (accuracy > 0.8) {
      strengths.push('High accuracy in code generation');
    } else if (accuracy < 0.6) {
      weaknesses.push('Lower-than-expected accuracy');
      recommendations.push('Consider collecting more diverse training feedback');
    }

    // Specialization analysis
    const performanceInsights = this.getPerformanceInsights();
    if (performanceInsights) {
        this.capabilities.specialization.forEach(spec => {
          const specAccuracy = performanceInsights.specializationMetrics[spec];

          if (specAccuracy !== undefined) {
            if (specAccuracy > 0.8) {
              strengths.push(`Strong performance in ${spec} generation`);
            } else if (specAccuracy < 0.5) {
              weaknesses.push(`Room for improvement in ${spec} generation`);
              recommendations.push(`Focus on ${spec}-specific examples and feedback`);
            }
          }
        });
    }


    return {
      learningProgress,
      strengths,
      weaknesses,
      recommendations
    };
  }

  /**
   * Get agent capabilities for introspection
   */
  getCapabilities(): AgentCapabilities {
    return this.capabilities;
  }

  /**
   * Get agent health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'serious' | 'critical';
    uptime: number;
    learningRecords: number;
    averageConfidence: number;
    lastLearningUpdate: Date | null;
  } {
    const averageConfidence = this.learningHistory.length > 0 ?
      this.learningHistory.reduce((sum, record) => sum + record.performanceMetrics.confidence, 0) /
      this.learningHistory.length : 0;

    const lastRecord = this.learningHistory[this.learningHistory.length - 1];
    const lastLearningUpdate = lastRecord ? lastRecord.timestamp : null;

    // Determine status based on metrics
    let status: 'healthy' | 'degraded' | 'serious' | 'critical' = 'healthy';
    if (this.learningHistory.length < 10) status = 'serious';
    else if (averageConfidence < 0.6) status = 'degraded';

    return {
      status,
      uptime: Date.now() - this.startTime,
      learningRecords: this.learningHistory.length,
      averageConfidence,
      lastLearningUpdate
    };
  }
}

/**
 * Export interfaces and utilities
 */
export type {
  AgentContext,
  GenerationRequest,
  GenerationResult,
  AgentCapabilities,
  GenerationStrategy,
  LearningData
};

export default GenerativeAgent;

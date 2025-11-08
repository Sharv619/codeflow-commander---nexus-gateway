// ------------------------------------------------------------------------------
// Phase 5: Autonomous Agent Network - Base Agent Implementation
// Core AutonomousAgent class that all specialized agents inherit from
// Implements lifecycle management, safety controls, and communication protocols
// ------------------------------------------------------------------------------
import { v4 as generateUuid } from 'uuid';
import { EventEmitter } from 'events';

// Local type definitions (to be moved to proper type files later)
interface DeveloperFeedback {
  action: string;
  originalConfidence: number;
  analysisType: string;
  timestamp: Date;
  reason?: string;
}

interface AnalysisFinding {
  id: string;
  type: string;
  severity: string;
  confidence: number;
  location: any;
  message: string;
  metadata?: Record<string, any>;
}

import {
  AgentType,
  AgentState,
  AgentIdentity,
  AgentConfiguration,
  AgentStateData,
  StateTransition,
  HealthScore,
  PerformanceMetrics,
  TriggerEvent,
  AnalysisContext,
  AnalysisResult,
  ConfidenceRecommendation,
  AgentLearningState,
  AgentSafetyControls,
  ActiveAnalysisContext,
  EmergencyOverride,
  SafetyViolation,
  MessageType,
  MessagePriority,
  TriggerPattern,
  AnalysisScope,
  NotificationChannel
} from '../types/agent.js';

import { MessageBus } from '../communication/MessageBus.js';
import { RateLimiter } from '../safety/RateLimiter.js';
import { CircuitBreaker } from '../safety/CircuitBreaker.js';
import { StorageManager } from '../storage/StorageManager.js';
import { EKGClient } from '../integration/EKGClient.js';

/**
 * Base class for all autonomous agents in the Phase 5 AAN
 * Provides lifecycle management, state transitions, safety mechanisms, and communication
 */
export abstract class AutonomousAgent extends EventEmitter {
  // Core properties
  public readonly id: string;
  public readonly type: AgentType;
  protected identity: AgentIdentity;
  protected configuration: AgentConfiguration;
  protected currentState: AgentState;
  protected stateHistory: StateTransition[];

  // System components
  protected messageBus: MessageBus;
  protected storage: StorageManager;
  protected ekgClient: EKGClient;

  // Performance & Safety
  protected rateLimiter: RateLimiter;
  protected circuitBreaker: CircuitBreaker;

  // State management
  protected performanceMetrics: PerformanceMetrics;
  protected healthScore: HealthScore;
  protected learningState: AgentLearningState;
  protected safetyControls: AgentSafetyControls;

  // Active session data
  protected currentAnalysis?: ActiveAnalysisContext;
  protected startTime: Date;
  protected lastActiveTime: Date;

  // Configuration
  protected readonly agentVersion = '1.0.0';

  constructor(
    repositoryId: string,
    type: AgentType,
    configuration: Partial<AgentConfiguration> = {},
    messageBus: MessageBus,
    storage: StorageManager,
    ekgClient: EKGClient
  ) {
    super();

    // Initialize identity
    this.id = this.generateAgentId(type, repositoryId);
    this.type = type;
    this.identity = this.createIdentity(type, repositoryId);
    this.currentState = AgentState.IDLE;
    this.stateHistory = [];

    // System dependencies
    this.messageBus = messageBus;
    this.storage = storage;
    this.ekgClient = ekgClient;

    // Configuration with defaults
    this.configuration = this.createDefaultConfiguration(repositoryId, type, configuration);

    // Performance tracking
    this.startTime = new Date();
    this.lastActiveTime = new Date();
    this.performanceMetrics = this.createInitialMetrics();
    this.healthScore = this.createInitialHealthScore();

    // Learning and adaptation
    this.learningState = this.createInitialLearningState();
    this.safetyControls = this.createInitialSafetyControls();

    // Safety mechanisms
    this.rateLimiter = new RateLimiter({
      maxActions: this.configuration.maxRecommendationsPerDay,
      windowMs: 24 * 60 * 60 * 1000 // 24 hours
    });

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: this.configuration.circuitBreakerThreshold,
      recoveryTimeout: this.configuration.circuitBreakerResetTime
    });

    // Subscribe to agent-specific messages
    this.setupMessageSubscriptions();

    // Load existing state if available
    this.loadExistingState();
  }

  // ----------------------------------------------------------------------
  // Abstract Methods - Must be implemented by specialized agents
  // ----------------------------------------------------------------------

  /**
   * Perform the core analysis for this agent type
   */
  abstract analyze(context: AnalysisContext): Promise<AnalysisResult>;

  /**
   * Validate if this agent should trigger for the given event
   */
  abstract validateTrigger(triggerEvent: TriggerEvent): boolean;

  /**
   * Get the specialization capabilities of this agent
   */
  abstract getSpecializationCapabilities(): any[];

  /**
   * Perform agent-specific safety checks before taking action
   */
  protected abstract additionalSafetyChecks(recommendation: ConfidenceRecommendation): boolean;

  /**
   * Handle state transition side effects specific to this agent
   */
  protected abstract onStateTransition(transition: StateTransition): Promise<void>;

  // ----------------------------------------------------------------------
  // Public API Methods
  // ----------------------------------------------------------------------

  /**
   * Primary entry point - activate agent for analysis
   */
  public async activate(analysisId: string, triggerEvent: TriggerEvent): Promise<void> {
    try {
      // Create analysis context
      this.currentAnalysis = {
        analysisId,
        triggerEvent,
        startTime: new Date(),
        currentStep: 'initialization',
        progress: 0,
        estimatedCompletion: new Date(Date.now() + this.configuration.maxAnalysisTime)
      };

      await this.transitionState(AgentState.ACTIVATED, 'external_activation', { triggerEvent });

      // Context enrichment via EKG
      const enrichedContext = await this.enrichContext(triggerEvent);
      await this.transitionState(AgentState.INITIALIZING, 'context_enriched');

      await this.transitionState(AgentState.ANALYZING, 'analysis_started');
      const analysis = await this.analyze(enrichedContext);

      await this.transitionState(AgentState.SYNTHESIZING, 'analysis_completed');
      const recommendations = await this.synthesizeRecommendations(analysis);

      await this.transitionState(AgentState.REPORTING, 'recommendations_ready');
      await this.reportFindings(recommendations);

      await this.transitionState(AgentState.LEARNING, 'reporting_completed');
      await this.processLearningCycle(analysis, recommendations);

      await this.transitionState(AgentState.IDLE, 'cycle_completed');

    } catch (error) {
      await this.handleError(error, 'activation_cycle');
    }
  }

  /**
   * Pause agent operations
   */
  public async pause(reason: string = 'manual_pause'): Promise<void> {
    await this.transitionState(AgentState.MAINTENANCE, reason);
    this.emit('paused', { reason, timestamp: new Date() });
  }

  /**
   * Resume agent operations
   */
  public async resume(reason: string = 'manual_resume'): Promise<void> {
    await this.transitionState(AgentState.IDLE, reason);
    this.emit('resumed', { reason, timestamp: new Date() });
  }

  /**
   * Shutdown agent permanently
   */
  public async shutdown(reason: string = 'manual_shutdown'): Promise<void> {
    await this.transitionState(AgentState.SHUTDOWN, reason);
    await this.saveFinalState();

    this.removeAllListeners();
    this.circuitBreaker.close();
    this.emit('shutdown', { reason, timestamp: new Date() });
  }

  /**
   * Get current agent status
   */
  public getStatus(): AgentStateData {
    return {
      identity: this.identity,
      configuration: this.configuration,
      currentState: this.currentState,
      stateTransitionHistory: this.stateHistory,
      lastActiveTimestamp: this.lastActiveTime,
      uptime: Date.now() - this.startTime.getTime(),
      performanceMetrics: this.performanceMetrics,
      healthScore: this.healthScore,
      isEnabled: this.currentState !== AgentState.SHUTDOWN,
      maintenanceMode: this.currentState === AgentState.MAINTENANCE,
      emergencyShutdown: this.currentState === AgentState.SHUTDOWN,
      currentAnalysis: this.currentAnalysis,
      learningState: this.learningState,
      safetyControls: this.safetyControls,
      version: this.agentVersion,
      schemaVersion: '1.0',
      lastModified: new Date()
    };
  }

  /**
   * Process developer feedback on agent recommendations
   */
  public async processFeedback(feedback: DeveloperFeedback): Promise<void> {
    // Update performance metrics
    this.updateFeedbackMetrics(feedback);

    // Update learning state
    await this.adaptBasedOnFeedback(feedback);

    // Log learning event
    await this.messageBus.publish({
      messageId: generateUuid(),
      correlationId: generateUuid(),
      sender: this.identity,
      type: MessageType.FEEDBACK_RECEIVED,
      payload: {
        agentId: this.id,
        feedback,
        timestamp: new Date()
      },
      priority: MessagePriority.LOW,
      createdAt: new Date()
    });

    this.emit('feedback_processed', { feedback, timestamp: new Date() });
  }

  // ----------------------------------------------------------------------
  // Protected Implementation Methods
  // ----------------------------------------------------------------------

  protected async enrichContext(triggerEvent: TriggerEvent): Promise<AnalysisContext> {
    const context: AnalysisContext = {
      repositoryId: triggerEvent.repositoryId,
      triggerEvent,
      analysisTimestamp: new Date(),
      analysisId: this.currentAnalysis?.analysisId || generateUuid()
    };

    try {
      // Query EKG for repository intelligence
      const ekgData = await this.ekgClient.getRepositoryIntelligence(triggerEvent.repositoryId);
      context.ekgIntelligence = ekgData;

      // Get organizational patterns
      const patterns = await this.ekgClient.getRelevantPatterns(triggerEvent.repositoryId, this.type);
      context.organizationalPatterns = patterns;

      // Add recent repository activity
      const recentActivity = await this.ekgClient.getRecentActivity(triggerEvent.repositoryId);
      context.recentActivity = recentActivity;

    } catch (error) {
      // Continue with limited context if EKG is unavailable
      console.warn(`[Agent ${this.id}] EKG enrichment failed:`, error);
    }

    return context;
  }

  protected async synthesizeRecommendations(analysis: AnalysisResult): Promise<ConfidenceRecommendation[]> {
    const recommendations: ConfidenceRecommendation[] = [];

    for (const finding of analysis.findings) {
      const recommendation = await this.createRecommendation(finding);
      if (recommendation && this.shouldTakeAction(recommendation)) {
        recommendations.push(recommendation);
      }
    }

    // Apply cross-cutting concerns
    await this.applyOrganizationalContext(recommendations);
    await this.rankRecommendations(recommendations);

    return recommendations;
  }

  protected shouldTakeAction(recommendation: ConfidenceRecommendation): boolean {
    // Check confidence threshold
    if (recommendation.confidence < this.configuration.confidenceThreshold) {
      return false;
    }

    // Check rate limits
    if (!this.rateLimiter.canTakeAction()) {
      this.recordSafetyViolation('rate_limit_exceeded', { recommendation });
      return false;
    }

    // Check circuit breaker
    if (this.circuitBreaker.isOpen) {
      this.recordSafetyViolation('circuit_breaker_triggered', { recommendation });
      return false;
    }

    // Agent-specific safety checks
    return this.additionalSafetyChecks(recommendation);
  }

  protected async reportFindings(recommendations: ConfidenceRecommendation[]): Promise<void> {
    // Group recommendations by priority
    const notifications = this.groupByChannel(recommendations);

    // Send to each configured channel
    for (const [channel, channelRecommendations] of Object.entries(notifications)) {
      await this.sendNotification(channel, channelRecommendations);
    }

    // Store recommendations in EKG for learning
    await this.ekgClient.storeRecommendations(this.id, recommendations);
  }

  protected async adaptBasedOnFeedback(feedback: DeveloperFeedback): Promise<void> {
    this.learningState.confidenceHistory.push({
      timestamp: new Date(),
      confidenceScore: feedback.originalConfidence,
      analysisType: feedback.analysisType,
      outcome: feedback.action as any
    });

    // Adjust confidence threshold based on feedback pattern
    if (feedback.action === 'rejected' && feedback.reason === 'false_positive') {
      // Increase threshold to be more conservative
      this.learningState.confidenceAdjustment += this.configuration.adaptationRate;
    } else if (feedback.action === 'accepted') {
      // Gradually lower threshold for positive feedback
      this.learningState.confidenceAdjustment -= this.configuration.adaptationRate * 0.1;
    }

    // Update effective confidence threshold
    const effectiveThreshold = Math.max(
      0.6,
      Math.min(
        0.95,
        this.configuration.confidenceThreshold + this.learningState.confidenceAdjustment
      )
    );

    // Log adaptation event for learning
    if (Math.abs(this.learningState.confidenceAdjustment) > 0.05) {
      await this.messageBus.publish({
        messageId: generateUuid(),
        correlationId: generateUuid(),
        sender: this.identity,
        type: MessageType.ADAPTATION_UPDATE,
        payload: {
          agentId: this.id,
          adaptationType: 'confidence_threshold',
          oldValue: this.configuration.confidenceThreshold,
          newValue: effectiveThreshold,
          feedbackCount: this.learningState.confidenceHistory.length
        },
        priority: MessagePriority.LOW,
        createdAt: new Date()
      });
    }
  }

  // ----------------------------------------------------------------------
  // Internal Implementation Methods
  // ----------------------------------------------------------------------

  private generateAgentId(type: AgentType, repositoryId: string): string {
    const timestamp = Date.now();
    return `${type}-${repositoryId}-${timestamp}`;
  }

  private createIdentity(type: AgentType, repositoryId: string): AgentIdentity {
    return {
      id: this.id,
      type,
      version: this.agentVersion,
      createdAt: new Date(),
      repositoryId,
      sessionId: generateUuid()
    };
  }

  private createDefaultConfiguration(
    repositoryId: string,
    type: AgentType,
    overrides: Partial<AgentConfiguration>
  ): AgentConfiguration {
    return {
      repositoryId,
      type,
      confidenceThreshold: 0.8,
      maxAnalysisTime: 300000, // 5 minutes
      maxRecommendationsPerDay: 10,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTime: 300000, // 5 minutes
      learningEnabled: true,
      adaptationRate: 0.1,
      minimumExperiencePoints: 100,
      triggerPatterns: this.getDefaultTriggerPatterns(type),
      analysisScope: this.getDefaultAnalysisScope(),
      notificationChannels: this.getDefaultNotificationChannels(),
      escalationThreshold: 0.9,
      analysisTimeout: 30000, // 30 seconds
      batchProcessingSize: 10,
      memoryLimit: 256, // 256 MB
      ...overrides
    };
  }

  private async transitionState(
    newState: AgentState,
    trigger: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const transition: StateTransition = {
      id: generateUuid(),
      fromState: this.currentState,
      toState: newState,
      timestamp: new Date(),
      trigger,
      metadata
    };

    this.stateHistory.push(transition);
    this.currentState = newState;
    this.lastActiveTime = new Date();

    // Agent-specific side effects
    try {
      await this.onStateTransition(transition);
    } catch (error) {
      console.error(`State transition handler failed for ${this.id}:`, error);
    }

    // Emit state change event
    this.emit('state_changed', transition);

    // Broadcast state change
    await this.messageBus.broadcast({
      messageId: generateUuid(),
      correlationId: generateUuid(),
      sender: this.identity,
      type: MessageType.AGENT_ACTIVATED,
      payload: {
        agentId: this.id,
        previousState: transition.fromState,
        newState: transition.toState,
        timestamp: transition.timestamp
      },
      priority: MessagePriority.NORMAL,
      createdAt: new Date()
    });

    // Save state checkpoint
    await this.saveStateCheckpoint();
  }

  private async handleError(error: any, context: string): Promise<void> {
    console.error(`[Agent ${this.id}] Error in ${context}:`, error);

    // Update circuit breaker
    this.circuitBreaker.recordFailure();

    // Record safety violation
    this.recordSafetyViolation('unspecified_error', {
      error: error.message,
      context,
      currentState: this.currentState,
      timestamp: new Date()
    });

    // Update health score
    this.healthScore.components.reliability = Math.max(0, this.healthScore.components.reliability - 0.1);
    this.recalculateHealthScore();

    // Send error notification
    await this.messageBus.publish({
      messageId: generateUuid(),
      correlationId: generateUuid(),
      sender: this.identity,
      type: MessageType.AGENT_ERROR,
      payload: {
        agentId: this.id,
        error: error.message,
        context,
        currentState: this.currentState,
        timestamp: new Date()
      },
      priority: MessagePriority.HIGH,
      createdAt: new Date()
    });

    // Transition to error state
    await this.transitionState(AgentState.ERROR, `error_in_${context}`, { error: error.message });
  }

  private recordSafetyViolation(type: string, details: Record<string, any>): void {
    const violation: SafetyViolation = {
      id: generateUuid(),
      violationType: type as any,
      timestamp: new Date(),
      severity: 'medium',
      details,
      mitigated: false
    };

    this.safetyControls.safetyViolations.push(violation);

    // Check if we need emergency action
    if (this.safetyControls.safetyViolations.filter(v => !v.mitigated).length > 5) {
      this.triggerEmergencyShutdown('excessive_safety_violations');
    }
  }

  private async triggerEmergencyShutdown(reason: string): Promise<void> {
    const emergencyOverride: EmergencyOverride = {
      id: generateUuid(),
      triggeredBy: 'safety_system',
      triggerTime: new Date(),
      reason,
      action: 'emergency_shutdown',
      resolved: false,
      result: 'success' as any
    };

    this.safetyControls.emergencyOverrides.push(emergencyOverride);
    await this.shutdown(`emergency: ${reason}`);
  }

  // Placeholder implementations - to be defined by specialized agents
  private getDefaultTriggerPatterns(type: AgentType): TriggerPattern[] {
    // This would be implemented based on agent type
    return [];
  }

  private getDefaultAnalysisScope(): AnalysisScope {
    return {
      maxFilesPerAnalysis: 100,
      maxLinesPerFile: 1000,
      supportedLanguages: ['javascript', 'typescript', 'python', 'java'],
      excludedPaths: ['node_modules/**', '.git/**'],
      customAnalysisDepth: 2
    };
  }

  private getDefaultNotificationChannels(): NotificationChannel[] {
    return [{
      type: 'cli',
      enabled: true,
      settings: { type: 'cli', command: 'echo', args: ['notification'] },
      priorityThreshold: 0.7
    }];
  }

  private async createRecommendation(finding: AnalysisFinding): Promise<ConfidenceRecommendation | null> {
    // This would analyze findings and create specific recommendations
    // Implementation depends on specialized agent
    return null;
  }

  private async processLearningCycle(analysis: AnalysisResult, recommendations: ConfidenceRecommendation[]): Promise<void> {
    // Update experience points
    this.learningState.experiencePoints += analysis.findings.length;

    // Update skill level based on experience
    this.learningState.skillLevel = Math.floor(this.learningState.experiencePoints / 100) + 1;

    // Store successful patterns
    for (const recommendation of recommendations) {
      if (recommendation.confidence > 0.8) {
        this.learningState.effectiveStrategies.push({
          strategyId: generateUuid(),
          description: recommendation.title || 'Unnamed strategy',
          successRate: 1.0,
          usageCount: 1,
          lastUsed: new Date()
        });
      }
    }

    await this.saveLearningState();
  }

  // Storage and persistence methods
  private async loadExistingState(): Promise<void> {
    try {
      const existingState = await this.storage.get(`agent:${this.id}`) as AgentStateData;
      if (existingState) {
        this.restoreFromState(existingState);
      }
    } catch (error) {
      // Continue with default state if loading fails
      console.warn(`Failed to load existing state for agent ${this.id}:`, error);
    }
  }

  private async saveStateCheckpoint(): Promise<void> {
    if (this.currentState === AgentState.SHUTDOWN) {
      return; // Don't save during shutdown
    }

    const state = this.getStatus();
    await this.storage.set(`agent:${this.id}`, state, 3600000); // 1 hour TTL
  }

  private async saveFinalState(): Promise<void> {
    const state = this.getStatus();
    await this.storage.set(`agent:${this.id}:final`, state); // No TTL for final state
    await this.storage.set(`agent:${this.id}:shutdown_time`, new Date());
  }

  private async saveLearningState(): Promise<void> {
    await this.storage.set(`agent:${this.id}:learning`, this.learningState, 86400000); // 24 hours
  }

  private restoreFromState(state: AgentStateData): void {
    this.performanceMetrics = state.performanceMetrics;
    this.healthScore = state.healthScore;
    this.learningState = state.learningState;
    this.safetyControls = state.safetyControls;

    if (state.currentAnalysis) {
      this.currentAnalysis = state.currentAnalysis;
    }
  }

  private createInitialMetrics(): PerformanceMetrics {
    return {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      averageAnalysisTime: 0,
      totalFindings: 0,
      totalRecommendations: 0,
      analysesLast24Hours: 0,
      analysesLastWeek: 0,
      analysesLastMonth: 0,
      avgConfidenceScore: 0,
      falsePositiveRate: 0,
      developerAcceptanceRate: 0,
      averageCpuUsage: 0,
      averageMemoryUsage: 0,
      peakMemoryUsage: 0
    };
  }

  private createInitialHealthScore(): HealthScore {
    return {
      overallScore: 1.0,
      components: {
        performance: 1.0,
        reliability: 1.0,
        learning: 1.0,
        safety: 1.0
      },
      healthStatus: 'healthy',
      lastAssessment: new Date()
    };
  }

  private createInitialLearningState(): AgentLearningState {
    return {
      experiencePoints: 0,
      skillLevel: 1,
      confidenceHistory: [],
      knownPatterns: [],
      effectiveStrategies: [],
      avoidedMistakes: [],
      confidenceAdjustment: 0,
      triggerModifications: [],
      strategyWeights: {}
    };
  }

  private createInitialSafetyControls(): AgentSafetyControls {
    return {
      rateLimiter: {
        maxActionsPerHour: this.configuration.maxRecommendationsPerDay,
        currentHourCount: 0,
        lastResetTime: new Date()
      },
      circuitBreaker: {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: new Date(0),
        nextRetryTime: new Date(0)
      },
      emergencyOverrides: [],
      safetyViolations: []
    };
  }

  private setupMessageSubscriptions(): void {
    // Subscribe to agent-specific messages
    this.messageBus.subscribe(MessageType.ANALYSIS_REQUEST, async (message) => {
      if (this.validateTrigger(message.payload.triggerEvent)) {
        const analysisId = message.payload.analysisId;
        await this.activate(analysisId, message.payload.triggerEvent);
      }
    }, this.id);

    this.messageBus.subscribe(MessageType.FEEDBACK_RECEIVED, async (message) => {
      await this.processFeedback(message.payload.feedback);
    }, this.id);

    // Subscribe to cross-agent coordination messages
    this.messageBus.subscribe(MessageType.CORRELATION_REQUEST, async (message) => {
      // Handle correlation requests from other agents
      await this.handleCorrelationRequest(message);
    });

    // Health monitoring
    this.messageBus.subscribe(MessageType.HEALTH_CHECK, async (message) => {
      await this.respondToHealthCheck(message);
    });
  }

  private async handleCorrelationRequest(message: any): Promise<void> {
    // Implementation would depend on agent specialization
    // This is a placeholder for the correlation handling logic
  }

  private async respondToHealthCheck(message: any): Promise<void> {
    const healthResponse = this.getStatus();
    await this.messageBus.publish({
      messageId: generateUuid(),
      correlationId: message.correlationId,
      sender: this.identity,
      type: MessageType.PERFORMANCE_METRICS,
      payload: healthResponse,
      priority: MessagePriority.NORMAL,
      createdAt: new Date()
    });
  }

  private groupByChannel(recommendations: ConfidenceRecommendation[]): Record<string, ConfidenceRecommendation[]> {
    const grouped: Record<string, ConfidenceRecommendation[]> = {};

    for (const recommendation of recommendations) {
      const suitableChannels = this.configuration.notificationChannels.filter(
        channel => recommendation.confidence >= channel.priorityThreshold
      );

      for (const channel of suitableChannels) {
        if (!grouped[channel.type]) {
          grouped[channel.type] = [];
        }
        grouped[channel.type]!.push(recommendation);
      }
    }

    return grouped;
  }

  private async sendNotification(channel: string, recommendations: ConfidenceRecommendation[]): Promise<void> {
    const channelConfig = this.configuration.notificationChannels.find(c => c.type === channel);
    if (!channelConfig?.enabled) {
      return;
    }

    // Implementation would send to specific channels (GitHub, Slack, etc.)
    this.emit('notification_sent', { channel, count: recommendations.length });
  }

  private recalculateHealthScore(): void {
    const components = this.healthScore.components;
    this.healthScore.overallScore = (components.performance + components.reliability +
                                    components.learning + components.safety) / 4;

    if (this.healthScore.overallScore >= 0.8) {
      this.healthScore.healthStatus = 'healthy';
    } else if (this.healthScore.overallScore >= 0.5) {
      this.healthScore.healthStatus = 'degraded';
    } else {
      this.healthScore.healthStatus = 'critical';
    }

    this.healthScore.lastAssessment = new Date();
  }

  private updateFeedbackMetrics(feedback: DeveloperFeedback): void {
    if (feedback.action === 'accepted') {
      this.performanceMetrics.developerAcceptanceRate =
        (this.performanceMetrics.developerAcceptanceRate * this.performanceMetrics.totalRecommendations +
         1) / (this.performanceMetrics.totalRecommendations + 1);
    }
  }

  // Stub implementations for missing methods - defined within the class
  protected async applyOrganizationalContext(recommendations: any[]): Promise<void> {
    return Promise.resolve();
  }

  protected async rankRecommendations(recommendations: any[]): Promise<void> {
    return Promise.resolve();
  }
}

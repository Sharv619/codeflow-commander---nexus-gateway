// File: src/validation/index.ts
// Core validation and safety framework implementing risk mitigation strategies
// Provides multi-layer validation pipeline for generated patches

import { ValidationResult, ErrorInfo, SafetyControls, ConfidenceScore } from '@/types/core';
import { Logger } from '@/utils/logger';

/**
 * Validation Context - Provides context for validation operations
 * Enables validation-aware code analysis and synthesis
 */
export interface ValidationContext {
  sessionId: string;
  projectId: string;
  developerId: string;
  safetyControls: SafetyControls;
  metadata?: Record<string, any>;
}

/**
 * Validation Stage - Represents individual validation checkpoints
 * Enables modular validation pipeline construction
 */
export interface ValidationStage {
  id: string;
  name: string;
  priority: number;
  run: (context: ValidationContext) => Promise<ValidationResult>;
  canSkip?: (context: ValidationContext) => boolean;
}

/**
 * Validation Pipeline - Orchestrates multi-stage validation
 * Implements graduated safety controls from risk mitigation strategies
 */
export class ValidationPipeline {
  private stages: ValidationStage[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a validation stage in the pipeline
   * Stages are executed in priority order (lower number = higher priority)
   */
  registerStage(stage: ValidationStage): void {
    this.stages.push(stage);
    this.stages.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute complete validation pipeline
   * Returns comprehensive validation result with all stage outcomes
   */
  async validate(context: ValidationContext, forceAllStages = false): Promise<ValidationResult> {
    const results: ValidationResult[] = [];
    let overallScore = 0;
    let overallPassed = true;
    const messages: string[] = [];
    const details: string[] = [];

    for (const stage of this.stages) {
      try {
        // Check if stage can be skipped
        if (!forceAllStages && stage.canSkip && stage.canSkip(context)) {
          this.logger.debug(`Skipping validation stage: ${stage.name}`);
          continue;
        }

        this.logger.debug(`Running validation stage: ${stage.name}`);
        const result = await stage.run(context);

        results.push(result);
        overallPassed = overallPassed && result.passed;
        overallScore += result.score;

        if (result.message) messages.push(result.message);
        if (result.details) details.push(...result.details);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        const errorResult: ValidationResult = {
          passed: false,
          score: 0,
          message: `Stage ${stage.name} failed: ${errorMessage}`,
        };
        if (errorStack) {
            errorResult.details = [errorStack];
        } else {
            errorResult.details = ['No stack trace available'];
        }

        results.push(errorResult);
        overallPassed = false;
        messages.push(errorResult.message || 'Validation failed');
        if(errorResult.details) {
            details.push(...errorResult.details);
        }
      }
    }

    // Average score across all stages
    const averageScore = this.stages.length > 0 ? overallScore / this.stages.length : 0;

    const result: ValidationResult = {
      passed: overallPassed,
      score: averageScore,
      message: messages.join('; '),
    };
    if (details.length > 0) {
      result.details = details;
    }
    return result;
  }
}

/**
 * Safety Governor - Implements graduated rollout and emergency controls
 * Provides centralized safety monitoring and control
 */
export class SafetyGovernor {
  private logger: Logger;
  private emergencyMode: boolean = false;
  private violationCount: number = 0;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Evaluate if operation is safe to proceed
   * Implements confidence threshold controls from safety settings
   */
  async assessSafety(
    confidence: ConfidenceScore,
    controls: SafetyControls,
    riskFactors?: string[]
  ): Promise<{
    approved: boolean;
    confidenceScore: number;
    requiresReview: boolean;
    reasoning: string[]
  }> {

    const reasoning: string[] = [];

    // Emergency mode override
    if (this.emergencyMode) {
      return {
        approved: false,
        confidenceScore: confidence.value,
        requiresReview: true,
        reasoning: ['Emergency mode activated - manual review required']
      };
    }

    // Evaluate confidence thresholds
    const threshold = controls.confidenceThresholds.low; // Start conservative
    const meetsThreshold = confidence.value >= threshold;

    if (!meetsThreshold) {
      reasoning.push(`Confidence ${confidence.value} below threshold ${threshold}`);
    }

    // Risk assessment
    const riskAssessment = controls.riskAssessment;
    let requiresReview = false;

    if (riskFactors) {
      if (riskAssessment.criticalPath && riskFactors.includes('critical-path')) {
        requiresReview = true;
        reasoning.push('Critical path operation requires review');
      }

      if (riskAssessment.highImpact && riskFactors.includes('high-impact')) {
        requiresReview = true;
        reasoning.push('High impact operation requires review');
      }

      if (riskAssessment.securityRelated && riskFactors.includes('security')) {
        requiresReview = true;
        reasoning.push('Security-related operation requires review');
      }

      if (riskAssessment.breakingChanges && riskFactors.includes('breaking-change')) {
        requiresReview = true;
        reasoning.push('Breaking change requires review');
      }
    }

    // Operational limits
    const withinLimits = this.checkOperationalLimits(controls.operationalLimits);

    if (!withinLimits.withinLimit) {
      requiresReview = true;
      reasoning.push(withinLimits.reason);
    }

    const approved = meetsThreshold && !requiresReview;

    return {
      approved,
      confidenceScore: confidence.value,
      requiresReview,
      reasoning
    };
  }

  /**
   * Check operational safety limits
   * Prevents overuse and maintains system stability
   */
  private checkOperationalLimits(limits: SafetyControls['operationalLimits']): {
    withinLimit: boolean;
    reason: string;
  } {
    // Implementation would check session counts, hourly limits, etc.
    // Placeholder for now
    return {
      withinLimit: true,
      reason: ''
    };
  }

  /**
   * Trigger emergency mode
   * Automatically activated when critical failures are detected
   */
  triggerEmergency(reason: string): void {
    this.logger.error(`Emergency mode triggered: ${reason}`);
    this.emergencyMode = true;

    // In a real implementation, this would:
    // - Disable auto-application
    // - Increase logging verbosity
    // - Send alerts to stakeholders
    // - Trigger review workflows
  }

  /**
   * Clear emergency mode
   * Gradually restore normal operations after verification
   */
  clearEmergency(): void {
    this.logger.info('Emergency mode cleared, restoring normal operations');
    this.emergencyMode = false;
    this.violationCount = 0;
  }

  /**
   * Record safety violation for monitoring
   * Tracks patterns to prevent recurring issues
   */
  recordViolation(violation: string): void {
    this.violationCount++;
    this.logger.warn(`Safety violation recorded: ${violation} (count: ${this.violationCount})`);

    // Auto-trigger emergency mode if violations exceed threshold
    if (this.violationCount >= 5) {
      this.triggerEmergency(`Too many violations: ${this.violationCount} in short period`);
    }
  }
}

/**
 * Confidence Calculator - Computes confidence scores for suggestions
 * Implements multi-factor confidence scoring from agent evolution plan
 */
export class ConfidenceCalculator {
  /**
   * Calculate comprehensive confidence score
   * Uses historical, contextual, and validation factors
   */
  calculateConfidence(
    historicalAccuracy: number,  // Past acceptance rates
    contextualRelevance: number, // Current context fit
    validationStrength: number,  // Validation pipeline results
    agentMetadata?: { version: string; specialization: string[] }
  ): ConfidenceScore {

    const reasoning: string[] = [];

    // Weight factors based on importance
    const historicalWeight = 0.4;
    const contextualWeight = 0.3;
    const validationWeight = 0.3;

    // Calculate weighted score
    const weightedScore =
      (historicalAccuracy * historicalWeight) +
      (contextualRelevance * contextualWeight) +
      (validationStrength * validationWeight);

    // Add reasoning based on factors
    reasoning.push(`Historical accuracy: ${historicalAccuracy}`);
    reasoning.push(`Contextual relevance: ${contextualRelevance}`);
    reasoning.push(`Validation strength: ${validationStrength}`);

    if (agentMetadata) {
      reasoning.push(`Agent: v${agentMetadata.version}`);
      if (agentMetadata.specialization.length > 0) {
        reasoning.push(`Specialized in: ${agentMetadata.specialization.join(', ')}`);
      }
    }

    return {
      value: Math.min(weightedScore, 1.0), // Cap at 1.0
      factors: {
        historical: historicalAccuracy,
        contextual: contextualRelevance,
        validation: validationStrength
      },
      reasoning
    };
  }

  /**
   * Adjust confidence based on feedback history
   * Enables learning from developer responses
   */
  adjustForFeedback(
    baseConfidence: ConfidenceScore,
    feedbackHistory: Array<{ accepted: boolean; rating?: number }>
  ): ConfidenceScore {

    if (feedbackHistory.length === 0) {
      return baseConfidence;
    }

    // Calculate acceptance rate
    const acceptedCount = feedbackHistory.filter(f => f.accepted).length;
    const acceptanceRate = acceptedCount / feedbackHistory.length;

    // Average rating if available
    const ratings = feedbackHistory
      .map(f => f.rating)
      .filter(r => r !== undefined) as number[];

    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : undefined;

    // Adjust confidence based on recent performance
    let adjustedValue = baseConfidence.value;

    // Reward high acceptance rates
    if (acceptanceRate > 0.8) {
      adjustedValue = Math.min(adjustedValue * 1.1, 1.0);
    } else if (acceptanceRate < 0.5) {
      adjustedValue = adjustedValue * 0.9;
    }

    // Incorporate rating feedback
    if (averageRating !== undefined) {
      const ratingMultiplier = (averageRating - 3) * 0.1; // +/- 10% per point from neutral
      adjustedValue = Math.max(0.1, adjustedValue + ratingMultiplier);
    }

    const adjustedFactors = {
      ...baseConfidence.factors,
      acceptance_rate: acceptanceRate
    };

    const adjustedReasoning = [
      ...baseConfidence.reasoning,
      `Acceptance rate: ${(acceptanceRate * 100).toFixed(1)}%`,
      ...(averageRating !== undefined ? [`Average rating: ${averageRating.toFixed(1)}`] : [])
    ];

    return {
      value: adjustedValue,
      factors: adjustedFactors,
      reasoning: adjustedReasoning
    };
  }
}

/**
 * Error Handler - Centralized error management and recovery
 * Implements error classification and automated responses
 */
export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Handle and classify errors with recovery strategies
   */
  handleError(error: unknown, context?: Record<string, any>): ErrorInfo {
    const normalizedError = this.normalizeError(error);
    const classifiedError = this.classifyError(normalizedError);

    // Log based on severity
    switch (classifiedError.severity) {
      case 'critical':
        this.logger.error('Critical error:', { error: classifiedError, context });
        break;
      case 'high':
        this.logger.error('High severity error:', { error: classifiedError, context });
        break;
      case 'medium':
        this.logger.warn('Medium severity error:', { error: classifiedError, context });
        break;
      case 'low':
        this.logger.info('Low severity error:', { error: classifiedError, context });
        break;
    }

    // Trigger recovery if available
    if (classifiedError.recovery?.automatic) {
      this.executeRecovery(classifiedError, context);
    }

    return classifiedError;
  }

  /**
   * Normalize diverse error types into consistent format
   */
  private normalizeError(error: unknown): { message: string; stack?: string; cause?: unknown } {
    if (error instanceof Error) {
      const normalized: { message: string; stack?: string; cause?: unknown } = {
        message: error.message,
        cause: (error as any).cause
      };
      if (error.stack) {
        normalized.stack = error.stack;
      }
      return normalized;
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    return {
      message: 'Unknown error occurred',
      cause: error
    };
  }

  /**
   * Classify error with category, severity, and recovery strategy
   */
  private classifyError(error: { message: string; stack?: string; cause?: unknown }): ErrorInfo {
    const message = error.message.toLowerCase();

    // Category classification
    let category: ErrorInfo['category'] = 'infrastructure';
    if (message.includes('validation') || message.includes('invalid')) {
      category = 'validation';
    } else if (message.includes('generation') || message.includes('ai') || message.includes('model')) {
      category = 'generation';
    } else if (message.includes('apply') || message.includes('patch')) {
      category = 'application';
    } else if (message.includes('config') || message.includes('setting')) {
      category = 'configuration';
    }

    // Severity classification
    let severity: ErrorInfo['severity'] = 'medium';
    if (message.includes('timeout') || message.includes('network') || message.includes('unavailable')) {
      severity = 'low'; // Expected transient issues
    } else if (message.includes('security') || message.includes('breach')) {
      severity = 'critical';
    } else if (message.includes('validation failed') || message.includes('syntax error')) {
      severity = 'high';
    }

    // Recovery strategy
    const recovery = this.determineRecovery(category, severity, message);

  const errorDetails: Record<string, any> = {};
  if (error.cause) {
    errorDetails.cause = error.cause;
  }

  const result: ErrorInfo = {
    code: `ERR_${category}_${Date.now()}`,
    category,
    severity,
    message: error.message,
    recovery: recovery || {
      automatic: false,
      strategy: 'manual_analysis',
      rollbackRequired: false
    }
  };

  if (error.stack) {
    result.stackTrace = error.stack;
  }

  if (Object.keys(errorDetails).length > 0) {
    result.details = errorDetails;
  }

  return result;
  }

  /**
   * Determine appropriate recovery strategy based on error characteristics
   */
  private determineRecovery(
    category: ErrorInfo['category'],
    severity: ErrorInfo['severity'],
    message: string
  ): ErrorInfo['recovery'] {

    // Critical errors always require manual intervention
    if (severity === 'critical') {
      return {
        automatic: false,
        strategy: 'manual_intervention',
        rollbackRequired: true
      };
    }

    // Category-specific recovery
    switch (category) {
      case 'generation':
        return {
          automatic: true,
          strategy: 'retry_with_fallback',
          rollbackRequired: false
        };

      case 'validation':
        return {
          automatic: false,
          strategy: 'manual_review',
          rollbackRequired: false
        };

      case 'application':
        return {
          automatic: true,
          strategy: 'rollback_and_retry',
          rollbackRequired: true
        };

      case 'configuration':
        return {
          automatic: false,
          strategy: 'reload_configuration',
          rollbackRequired: false
        };

      default:
        return {
          automatic: false,
          strategy: 'manual_analysis',
          rollbackRequired: false
        };
    }
  }

  /**
   * Execute automatic recovery strategy
   */
  private executeRecovery(error: ErrorInfo, context?: Record<string, any>): void {
    this.logger.info(`Executing recovery strategy: ${error.recovery?.strategy}`);

    // Implementation would trigger appropriate recovery actions
    // This is a placeholder - real implementation would coordinate with
    // appropriate recovery services based on strategy type
  }
}

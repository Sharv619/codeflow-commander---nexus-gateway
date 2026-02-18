// File: src/validation/index.ts
// Core validation and safety framework implementing risk mitigation strategies
// Provides multi-layer validation pipeline for generated patches
/**
 * Validation Pipeline - Orchestrates multi-stage validation
 * Implements graduated safety controls from risk mitigation strategies
 */
export class ValidationPipeline {
    constructor(logger) {
        this.stages = [];
        this.logger = logger;
    }
    /**
     * Register a validation stage in the pipeline
     * Stages are executed in priority order (lower number = higher priority)
     */
    registerStage(stage) {
        this.stages.push(stage);
        this.stages.sort((a, b) => a.priority - b.priority);
    }
    /**
     * Execute complete validation pipeline
     * Returns comprehensive validation result with all stage outcomes
     */
    async validate(context, forceAllStages = false) {
        const results = [];
        let overallScore = 0;
        let overallPassed = true;
        const messages = [];
        const details = [];
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
                if (result.message)
                    messages.push(result.message);
                if (result.details)
                    details.push(...result.details);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;
                const errorResult = {
                    passed: false,
                    score: 0,
                    message: `Stage ${stage.name} failed: ${errorMessage}`,
                };
                if (errorStack) {
                    errorResult.details = [errorStack];
                }
                else {
                    errorResult.details = ['No stack trace available'];
                }
                results.push(errorResult);
                overallPassed = false;
                messages.push(errorResult.message || 'Validation failed');
                if (errorResult.details) {
                    details.push(...errorResult.details);
                }
            }
        }
        // Average score across all stages
        const averageScore = this.stages.length > 0 ? overallScore / this.stages.length : 0;
        const result = {
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
    constructor(logger) {
        this.emergencyMode = false;
        this.violationCount = 0;
        this.logger = logger;
    }
    /**
     * Evaluate if operation is safe to proceed
     * Implements confidence threshold controls from safety settings
     */
    async assessSafety(confidence, controls, riskFactors) {
        const reasoning = [];
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
    checkOperationalLimits(limits) {
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
    triggerEmergency(reason) {
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
    clearEmergency() {
        this.logger.info('Emergency mode cleared, restoring normal operations');
        this.emergencyMode = false;
        this.violationCount = 0;
    }
    /**
     * Record safety violation for monitoring
     * Tracks patterns to prevent recurring issues
     */
    recordViolation(violation) {
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
    calculateConfidence(historicalAccuracy, // Past acceptance rates
    contextualRelevance, // Current context fit
    validationStrength, // Validation pipeline results
    agentMetadata) {
        const reasoning = [];
        // Weight factors based on importance
        const historicalWeight = 0.4;
        const contextualWeight = 0.3;
        const validationWeight = 0.3;
        // Calculate weighted score
        const weightedScore = (historicalAccuracy * historicalWeight) +
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
    adjustForFeedback(baseConfidence, feedbackHistory) {
        if (feedbackHistory.length === 0) {
            return baseConfidence;
        }
        // Calculate acceptance rate
        const acceptedCount = feedbackHistory.filter(f => f.accepted).length;
        const acceptanceRate = acceptedCount / feedbackHistory.length;
        // Average rating if available
        const ratings = feedbackHistory
            .map(f => f.rating)
            .filter(r => r !== undefined);
        const averageRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : undefined;
        // Adjust confidence based on recent performance
        let adjustedValue = baseConfidence.value;
        // Reward high acceptance rates
        if (acceptanceRate > 0.8) {
            adjustedValue = Math.min(adjustedValue * 1.1, 1.0);
        }
        else if (acceptanceRate < 0.5) {
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
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Handle and classify errors with recovery strategies
     */
    handleError(error, context) {
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
    normalizeError(error) {
        if (error instanceof Error) {
            const normalized = {
                message: error.message,
                cause: error.cause
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
    classifyError(error) {
        const message = error.message.toLowerCase();
        // Category classification
        let category = 'infrastructure';
        if (message.includes('validation') || message.includes('invalid')) {
            category = 'validation';
        }
        else if (message.includes('generation') || message.includes('ai') || message.includes('model')) {
            category = 'generation';
        }
        else if (message.includes('apply') || message.includes('patch')) {
            category = 'application';
        }
        else if (message.includes('config') || message.includes('setting')) {
            category = 'configuration';
        }
        // Severity classification
        let severity = 'medium';
        if (message.includes('timeout') || message.includes('network') || message.includes('unavailable')) {
            severity = 'low'; // Expected transient issues
        }
        else if (message.includes('security') || message.includes('breach')) {
            severity = 'critical';
        }
        else if (message.includes('validation failed') || message.includes('syntax error')) {
            severity = 'high';
        }
        // Recovery strategy
        const recovery = this.determineRecovery(category, severity, message);
        const errorDetails = {};
        if (error.cause) {
            errorDetails.cause = error.cause;
        }
        const result = {
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
    determineRecovery(category, severity, message) {
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
    executeRecovery(error, context) {
        this.logger.info(`Executing recovery strategy: ${error.recovery?.strategy}`);
        // Implementation would trigger appropriate recovery actions
        // This is a placeholder - real implementation would coordinate with
        // appropriate recovery services based on strategy type
    }
}

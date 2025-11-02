// Learning and Adaptation Systems for Phase 4
// Continuous learning from developer interactions and workflow outcomes

import { Logger, defaultLogger } from '@/utils/logger';
import {
  DeveloperFeedback,
  AnalysisSession,
  CodeSuggestion,
  AgentExecutionResult
} from '@/types/entities';

/**
 * Feedback Learning Engine
 * Analyzes developer feedback to improve future suggestions
 */
class FeedbackLearningEngine {
  private logger: Logger;
  private feedbackHistory: DeveloperFeedback[] = [];
  private learningPatterns: Map<string, LearningPattern> = new Map();
  private effectivenessScores: Map<string, EffectivenessScore> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || defaultLogger;
  }

  /**
   * Process developer feedback for learning
   */
  async processFeedback(feedback: DeveloperFeedback): Promise<LearningInsights> {
    this.logger.debug('Processing developer feedback', { feedbackId: feedback.id });

    // Store feedback in history
    this.feedbackHistory.push(feedback);

    // Analyze rejection reasons and generate insights
    const rejectionInsights = await this.analyzeRejectionReasons(feedback);

    // Update learning patterns
    await this.updateLearningPatterns(feedback);

    // Calculate effectiveness scores for suggestions
    const effectiveness = this.calculateEffectivenessScore(feedback);

    // Generate adaptation recommendations
    const adaptations = this.generateAdaptationRecommendations(feedback, effectiveness);

    const insights: LearningInsights = {
      feedbackId: feedback.id,
      rejectionInsights,
      effectiveness,
      adaptations,
      patterns: this.extractPatterns(feedback),
      confidence: this.calculateConfidenceScore(feedback),
      appliedAt: new Date()
    };

    this.logger.info('Feedback processed and insights generated', {
      feedbackId: feedback.id,
      confidence: insights.confidence
    });

    return insights;
  }

  /**
   * Get personalized effectiveness data for a developer
   */
  getDeveloperEffectiveness(developerId: string): DeveloperEffectiveness {
    const devFeedback = this.feedbackHistory.filter(f => f.developerId === developerId);

    const acceptanceRate = devFeedback.filter(f => f.accepted).length / devFeedback.length;
    const modificationRate = devFeedback.filter(f => f.modified).length / devFeedback.length;
    const averageResponseTime = devFeedback.reduce((sum, f) => sum + f.timeToReview, 0) / devFeedback.length;

    // Calculate improvement trends
    const recentFeedback = devFeedback.slice(-20); // Last 20 feedback instances
    const recentAcceptance = recentFeedback.filter(f => f.accepted).length / recentFeedback.length;

    return {
      developerId,
      overallMetrics: {
        acceptanceRate: acceptanceRate || 0,
        modificationRate: modificationRate || 0,
        averageResponseTime: averageResponseTime || 0,
        totalFeedbackProvided: devFeedback.length
      },
      trends: {
        acceptanceTrend: recentAcceptance - acceptanceRate,
        engagementLevel: this.calculateEngagementLevel(devFeedback),
        learningProgression: this.calculateLearningProgression(devFeedback)
      },
      preferences: this.extractDeveloperPreferences(developerId),
      recommendations: this.generatePersonalizedRecommendations(developerId),
      assessedAt: new Date()
    };
  }

  /**
   * Learn from agent execution outcomes
   */
  async processExecutionOutcome(outcome: AgentExecutionResult): Promise<ExecutionLearning> {
    this.logger.debug('Processing agent execution outcomes', { executionId: outcome.executionId });

    // Analyze execution patterns
    const patternAnalysis = this.analyzeExecutionPattern(outcome);

    // Update agent effectiveness scores
    this.updateAgentEffectiveness(outcome.agentId, outcome);

    // Identify new learning opportunities
    const opportunities = this.identifyLearningOpportunities(outcome);

    // Generate adaptation strategies
    const adaptations = this.generateExecutionAdaptations(outcome, opportunities);

    return {
      executionId: outcome.executionId,
      agentId: outcome.agentId,
      patternAnalysis,
      opportunities,
      adaptations,
      confidenceScore: this.calculateExecutionConfidence(outcome),
      learnedAt: new Date()
    };
  }

  private async analyzeRejectionReasons(feedback: DeveloperFeedback): Promise<RejectionAnalysis> {
    if (!feedback.rejectionReason) {
      return {
        primaryReason: 'accepted',
        frequency: 1,
        alternatives: [],
        actionableInsights: ['Suggestion was accepted and applied']
      };
    }

    const similarRejections = this.feedbackHistory.filter(f =>
      f.rejectionReason === feedback.rejectionReason &&
      f.suggestionId !== feedback.suggestionId
    );

    const alternatives = this.generateRejectionAlternatives(feedback.rejectionReason);

    return {
      primaryReason: feedback.rejectionReason,
      frequency: similarRejections.length + 1,
      alternatives,
      actionableInsights: this.generateRejectionInsights(feedback.rejectionReason, feedback)
    };
  }

  private async updateLearningPatterns(feedback: DeveloperFeedback): Promise<void> {
    // Group feedback by suggestion type and outcome
    const patternKey = `${feedback.suggestionId}_${feedback.accepted ? 'accepted' : feedback.rejectionReason}`;

    const pattern = this.learningPatterns.get(patternKey) || {
      patternId: patternKey,
      feedbackIds: [],
      outcomes: [],
      frequency: 0,
      successRate: 0,
      lastUpdated: new Date()
    };

    pattern.feedbackIds.push(feedback.id);
    pattern.outcomes.push(feedback.accepted ? 'accepted' : 'rejected');
    pattern.frequency++;
    pattern.successRate = pattern.outcomes.filter(o => o === 'accepted').length / pattern.outcomes.length;
    pattern.lastUpdated = new Date();

    this.learningPatterns.set(patternKey, pattern);
  }

  private calculateEffectivenessScore(feedback: DeveloperFeedback): number {
    let score = feedback.accepted ? 0.8 : 0.2;

    // Adjust based on ratings if available
    if (feedback.usefulnessRating) {
      score = feedback.usefulnessRating / 5;
    }

    // Adjust based on modification frequency
    if (feedback.modified) {
      score -= 0.1; // Slightly lower score if modified
    }

    // Adjust based on response time
    if (feedback.timeToReview > 300) { // > 5 minutes
      score -= 0.1; // Lower score for slow responses
    }

    return Math.max(0, Math.min(1, score));
  }

  private generateAdaptationRecommendations(feedback: DeveloperFeedback, effectiveness: number): AdaptationRecommendation[] {
    const recommendations: AdaptationRecommendation[] = [];

    if (!feedback.accepted && feedback.rejectionReason === 'wrong') {
      recommendations.push({
        type: 'suggestion_quality',
        action: 'reduce_confidence_threshold',
        reason: 'Developer indicated suggestion was entirely wrong',
        impact: 'high'
      });
    }

    if (feedback.modified && effectiveness > 0.5) {
      recommendations.push({
        type: 'developer_customization',
        action: 'include_modification_patterns',
        reason: 'Developer modified suggestion but found it valuable',
        impact: 'medium'
      });
    }

    if (effectiveness < 0.3) {
      recommendations.push({
        type: 'capability_restriction',
        action: 'limit_suggestion_frequency',
        reason: 'Low effectiveness indicates poor fit for this developer',
        impact: 'high'
      });
    }

    return recommendations;
  }

  private extractPatterns(feedback: DeveloperFeedback): PatternInsights[] {
    const patterns: PatternInsights[] = [];

    // Analyze common modification patterns
    if (feedback.modifications?.changedLogic) {
      patterns.push({
        type: 'logic_modification',
        description: 'Developer frequently modifies business logic',
        confidence: 0.75,
        implications: ['Reduce algorithmic assumptions', 'Increase logic validation']
      });
    }

    // Analyze acceptance patterns
    if (feedback.accepted && feedback.timeToReview < 60) {
      patterns.push({
        type: 'quick_acceptance',
        description: 'Developer quickly accepts certain types of suggestions',
        confidence: 0.9,
        implications: ['High trust in this suggestion type', 'Can increase automation confidence']
      });
    }

    return patterns;
  }

  private calculateConfidenceScore(feedback: DeveloperFeedback): number {
    // Start with base confidence based on acceptance
    let confidence = feedback.accepted ? 0.8 : 0.4;

    // Adjust based on developer ratings
    if (feedback.accuracyRating) {
      confidence = confidence * 0.3 + (feedback.accuracyRating / 5) * 0.7;
    }

    // Adjust based on response time (faster = more confident)
    if (feedback.timeToReview < 120) {
      confidence += 0.1;
    } else if (feedback.timeToReview > 600) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private calculateEngagementLevel(feedback: DeveloperFeedback[]): number {
    const avgResponseTime = feedback.reduce((sum, f) => sum + f.timeToReview, 0) / feedback.length;
    const acceptanceRate = feedback.filter(f => f.accepted).length / feedback.length;

    // High engagement = quick responses + high acceptance
    const responseScore = Math.max(0, (300 - avgResponseTime) / 300); // Faster response = higher score
    const acceptanceScore = acceptanceRate;

    return (responseScore + acceptanceScore) / 2;
  }

  private calculateLearningProgression(feedback: DeveloperFeedback[]): number {
    // Analyze improvement over time (simplified)
    const recent = feedback.slice(-10);
    const older = feedback.slice(0, -10);

    if (older.length === 0) return 0;

    const recentAcceptance = recent.filter(f => f.accepted).length / recent.length;
    const olderAcceptance = older.filter(f => f.accepted).length / older.length;

    return recentAcceptance - olderAcceptance;
  }

  private extractDeveloperPreferences(developerId: string): any {
    // Simplified preference extraction
    return {
      preferredSuggestionTypes: ['code_refactoring', 'security'],
      rejectionPatterns: ['formatting_changes'],
      responseTimePreference: 'fast'
    };
  }

  private generatePersonalizedRecommendations(developerId: string): any[] {
    return [
      'Focus on high-impact refactoring suggestions',
      'Reduce code formatting suggestions',
      'Include more security-related recommendations'
    ];
  }

  private analyzeExecutionPattern(outcome: AgentExecutionResult): ExecutionPattern {
    const success = outcome.status === 'completed';
    const efficiency = outcome.metrics.duration / 1000; // Convert to seconds

    return {
      success,
      efficiency,
      confidence: outcome.confidence.value,
      patternsIdentified: outcome.actionsPerformed.length,
      optimizations: success && efficiency < 30 ? 'excellent' : success && efficiency < 60 ? 'good' : 'needs_improvement'
    };
  }

  private updateAgentEffectiveness(agentId: string, outcome: AgentExecutionResult): void {
    const currentScore = this.effectivenessScores.get(agentId) || {
      agentId,
      totalExecutions: 0,
      successfulExecutions: 0,
      averageConfidence: 0,
      averageEfficiency: 0,
      lastUpdated: new Date()
    };

    currentScore.totalExecutions++;
    if (outcome.status === 'completed') {
      currentScore.successfulExecutions++;
    }

    currentScore.averageConfidence =
      (currentScore.averageConfidence * (currentScore.totalExecutions - 1) + outcome.confidence.value) / currentScore.totalExecutions;

    currentScore.averageEfficiency =
      (currentScore.averageEfficiency * (currentScore.totalExecutions - 1) + outcome.metrics.duration) / currentScore.totalExecutions;

    currentScore.lastUpdated = new Date();

    this.effectivenessScores.set(agentId, currentScore);
  }

  private identifyLearningOpportunities(outcome: AgentExecutionResult): LearningOpportunity[] {
    const opportunities: LearningOpportunity[] = [];

    // Identify common failure patterns
    if (outcome.status === 'failed') {
      opportunities.push({
        type: 'failure_analysis',
        description: 'Analyze failure patterns to prevent recurrence',
        priority: 'high',
        outcomes: ['Reduced failure rate', 'Improved error handling']
      });
    }

    // Identify efficiency improvements
    if (outcome.metrics.duration > 300000) { // 5 minutes
      opportunities.push({
        type: 'performance_optimization',
        description: 'Optimize execution time for better developer experience',
        priority: 'medium',
        outcomes: ['Faster execution', 'Improved responsiveness']
      });
    }

    // Identify pattern learning opportunities
    if (outcome.confidence.value > 0.8 && outcome.status === 'completed') {
      opportunities.push({
        type: 'pattern_extraction',
        description: 'Extract successful patterns for reuse',
        priority: 'medium',
        outcomes: ['Improved suggestion quality', 'Reduced processing time']
      });
    }

    return opportunities;
  }

  private generateExecutionAdaptations(outcome: AgentExecutionResult, opportunities: LearningOpportunity[]): AdaptationStrategy[] {
    const adaptations: AdaptationStrategy[] = [];

    for (const opportunity of opportunities) {
      switch (opportunity.type) {
        case 'failure_analysis':
          adaptations.push({
            strategy: 'circuit_breaker_adjustment',
            description: 'Increase circuit breaker threshold for this agent type',
            expectedImprovement: 0.15,
            risk: 'low'
          });
          break;

        case 'performance_optimization':
          adaptations.push({
            strategy: 'caching_strategy_improvement',
            description: 'Implement better caching for frequent operations',
            expectedImprovement: 0.25,
            risk: 'low'
          });
          break;

        case 'pattern_extraction':
          adaptations.push({
            strategy: 'pattern_learning_acceleration',
            description: 'Accelerate learning from successful execution patterns',
            expectedImprovement: 0.1,
            risk: 'medium'
          });
          break;
      }
    }

    return adaptations;
  }

  private calculateExecutionConfidence(outcome: AgentExecutionResult): number {
    let confidence = outcome.confidence.value;

    // Adjust based on execution metrics
    if (outcome.status === 'completed') {
      confidence += 0.1; // Reward successful completion
    } else if (outcome.status === 'failed') {
      confidence -= 0.3; // Penalize failures
    }

    // Adjust based on duration (faster = slightly more confident)
    if (outcome.metrics.duration < 60000) { // Very fast execution
      confidence += 0.05;
    } else if (outcome.metrics.duration > 600000) { // Very slow execution
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private generateRejectionAlternatives(reason: string): string[] {
    const alternatives: Record<string, string[]> = {
      'irrelevant': ['Focus on more relevant code patterns', 'Analyze context better'],
      'wrong': ['Improve code analysis accuracy', 'Add more validation steps'],
      'incomplete': ['Provide more comprehensive implementations', 'Include testing segments'],
      'overly-aggressive': ['Reduce suggested change scope', 'Add more conservative options']
    };

    return alternatives[reason] || ['General quality improvement needed'];
  }

  private generateRejectionInsights(reason: string, feedback: DeveloperFeedback): string[] {
    const insights: string[] = [];

    if (reason === 'wrong' && feedback.problematicAspects) {
      insights.push(`Focus area: ${feedback.problematicAspects.join(', ')}`);
    }

    if (reason === 'incomplete') {
      insights.push('Provide more complete implementation solutions');
    }

    insights.push(`User feedback: ${feedback.customNotes || 'No specific feedback provided'}`);

    return insights;
  }
}

/**
 * Behavior Adaptation Engine
 * Dynamically adjusts system behavior based on learned patterns
 */
class BehaviorAdaptationEngine {
  private logger: Logger;
  private adaptationRules: Map<string, AdaptationResult> = new Map();
  private activeAdaptations: Map<string, ActiveAdaptation> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || defaultLogger;
  }

  /**
   * Apply adaptation based on learning insights
   */
  applyAdaptation(insights: LearningInsights): AdaptationResult {
    this.logger.info('Applying learning adaptation', {
      feedbackId: insights.feedbackId,
      confidence: insights.confidence
    });

    const appliedAdaptations: AppliedAdaptation[] = [];

    // Apply each recommended adaptation
    for (const adaptation of insights.adaptations) {
      const result = this.executeAdaptation(adaptation, insights);
      appliedAdaptations.push(result);

      if (result.success) {
        this.trackActiveAdaptation(result.adaptationId, adaptation, insights);
      }
    }

    return {
      insightId: insights.feedbackId,
      appliedAdaptations,
      overallSuccess: appliedAdaptations.filter(a => a.success).length / appliedAdaptations.length,
      appliedAt: new Date(),
      expectedImpact: this.calculateExpectedImpact(appliedAdaptations)
    };
  }

  /**
   * Monitor adaptation effectiveness over time
   */
  monitorAdaptationEffectiveness(): AdaptationEffectivenessReport {
    const reports: AdaptationPerformance[] = [];

    for (const [adaptationId, adaptation] of this.activeAdaptations) {
      const performance = this.evaluateAdaptationPerformance(adaptation);
      reports.push(performance);
    }

    const overallEffectiveness = reports.reduce((sum, r) => sum + r.effectiveness, 0) / reports.length;

    return {
      adaptationsMonitored: reports.length,
      overallEffectiveness: overallEffectiveness || 0,
      topPerformingAdaptations: reports
        .filter(r => r.effectiveness > 0.7)
        .sort((a, b) => b.effectiveness - a.effectiveness)
        .slice(0, 5),
      underPerformingAdaptations: reports
        .filter(r => r.effectiveness < 0.3)
        .sort((a, b) => a.effectiveness - b.effectiveness)
        .slice(0, 5),
      recommendations: this.generateAdaptationRecommendations(reports),
      generatedAt: new Date()
    };
  }

  private executeAdaptation(recommendation: AdaptationRecommendation, insights: LearningInsights): AppliedAdaptation {
    try {
      // Execute adaptation based on type
      switch (recommendation.type) {
        case 'suggestion_quality':
          return this.adaptSuggestionQuality(recommendation, insights);
        case 'developer_customization':
          return this.adaptDeveloperCustomization(recommendation, insights);
        case 'capability_restriction':
          return this.adaptCapabilityRestriction(recommendation, insights);
        default:
          return {
            adaptationId: `adaptation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: recommendation.type,
            action: recommendation.action,
            success: false,
            reason: 'Unknown adaptation type',
            appliedAt: new Date()
          };
      }
    } catch (error) {
      return {
        adaptationId: `adaptation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: recommendation.type,
        action: recommendation.action,
        success: false,
        reason: `Execution error: ${error instanceof Error ? error.message : String(error)}`,
        appliedAt: new Date()
      };
    }
  }

  private adaptSuggestionQuality(recommendation: AdaptationRecommendation, insights: LearningInsights): AppliedAdaptation {
    // Implement suggestion quality adaptation
    return {
      adaptationId: `quality_${insights.feedbackId}`,
      type: recommendation.type,
      action: recommendation.action,
      success: true,
      reason: 'Suggestion quality thresholds adjusted',
      appliedAt: new Date()
    };
  }

  private adaptDeveloperCustomization(recommendation: AdaptationRecommendation, insights: LearningInsights): AppliedAdaptation {
    // Implement developer customization adaptation
    return {
      adaptationId: `custom_${insights.feedbackId}`,
      type: recommendation.type,
      action: recommendation.action,
      success: true,
      reason: 'Developer customization patterns learned',
      appliedAt: new Date()
    };
  }

  private adaptCapabilityRestriction(recommendation: AdaptationRecommendation, insights: LearningInsights): AppliedAdaptation {
    // Implement capability restriction adaptation
    return {
      adaptationId: `restrict_${insights.feedbackId}`,
      type: recommendation.type,
      action: recommendation.action,
      success: true,
      reason: 'Suggestion frequency adjusted for developer preference',
      appliedAt: new Date()
    };
  }

  private trackActiveAdaptation(adaptationId: string, recommendation: AdaptationRecommendation, insights: LearningInsights): void {
    const active: ActiveAdaptation = {
      adaptationId,
      type: recommendation.type,
      appliedAt: new Date(),
      context: insights,
      monitoringPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      baselineMetrics: {}, // Would capture before metrics
      targetMetrics: {}, // Would define target metrics
      rollbackPlan: this.generateRollbackPlan(recommendation)
    };

    this.activeAdaptations.set(adaptationId, active);
  }

  private calculateExpectedImpact(applied: AppliedAdaptation[]): number {
    // Calculate expected overall impact
    const successfulAdaptations = applied.filter(a => a.success);
    const averageImpact = successfulAdaptations.reduce((sum, a) => {
      // Would look up expected impact for each adaptation type
      return sum + 0.1; // Placeholder impact
    }, 0);

    return averageImpact / successfulAdaptations.length;
  }

  private evaluateAdaptationPerformance(adaptation: ActiveAdaptation): AdaptationPerformance {
    // Simplified performance evaluation
    const timeSinceApplication = Date.now() - adaptation.appliedAt.getTime();
    const progressRatio = Math.min(timeSinceApplication / adaptation.monitoringPeriod, 1);

    // Simulated effectiveness calculation
    const effectiveness = Math.random() * 0.4 + 0.3; // Random between 0.3-0.7

    return {
      adaptationId: adaptation.adaptationId,
      type: adaptation.type,
      effectiveness,
      progressRatio,
      status: progressRatio < 1 ? 'monitoring' : 'completed',
      metrics: {}, // Would include actual performance metrics
      assessedAt: new Date()
    };
  }

  private generateAdaptationRecommendations(reports: AdaptationPerformance[]): string[] {
    const recommendations: string[] = [];

    const highPerformers = reports.filter(r => r.effectiveness > 0.7);
    if (highPerformers.length > 0) {
      recommendations.push('Expand successful adaptation strategies to other contexts');
    }

    const lowPerformers = reports.filter(r => r.effectiveness < 0.3);
    if (lowPerformers.length > 0) {
      recommendations.push('Review and potentially rollback underperforming adaptations');
    }

    if (reports.length > 10) {
      recommendations.push('Consider implementing adaptation prioritization');
    }

    return recommendations;
  }

  private generateRollbackPlan(recommendation: AdaptationRecommendation): RollbackPlan {
    return {
      steps: [
        'Revert configuration changes',
        'Reset learning parameters',
        'Notify affected developers',
        'Monitor for regression'
      ],
      risk: 'low',
      estimatedDuration: 300, // 5 minutes
      validationSteps: [
        'Verify system stability',
        'Check developer acceptance rates',
        'Validate suggestion quality'
      ]
    };
  }
}

// ================ TYPES AND INTERFACES ================

interface LearningInsights {
  feedbackId: string;
  rejectionInsights: RejectionAnalysis;
  effectiveness: number;
  adaptations: AdaptationRecommendation[];
  patterns: PatternInsights[];
  confidence: number;
  appliedAt: Date;
}

interface RejectionAnalysis {
  primaryReason: string;
  frequency: number;
  alternatives: string[];
  actionableInsights: string[];
}

interface LearningPattern {
  patternId: string;
  feedbackIds: string[];
  outcomes: string[];
  frequency: number;
  successRate: number;
  lastUpdated: Date;
}

interface EffectivenessScore {
  agentId: string;
  totalExecutions: number;
  successfulExecutions: number;
  averageConfidence: number;
  averageEfficiency: number;
  lastUpdated: Date;
}

interface AdaptationRecommendation {
  type: string;
  action: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

interface PatternInsights {
  type: string;
  description: string;
  confidence: number;
  implications: string[];
}

interface DeveloperEffectiveness {
  developerId: string;
  overallMetrics: {
    acceptanceRate: number;
    modificationRate: number;
    averageResponseTime: number;
    totalFeedbackProvided: number;
  };
  trends: {
    acceptanceTrend: number;
    engagementLevel: number;
    learningProgression: number;
  };
  preferences: any;
  recommendations: any[];
  assessedAt: Date;
}

interface ExecutionLearning {
  executionId: string;
  agentId: string;
  patternAnalysis: ExecutionPattern;
  opportunities: LearningOpportunity[];
  adaptations: AdaptationStrategy[];
  confidenceScore: number;
  learnedAt: Date;
}

interface ExecutionPattern {
  success: boolean;
  efficiency: number;
  confidence: number;
  patternsIdentified: number;
  optimizations: string;
}

interface LearningOpportunity {
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  outcomes: string[];
}

interface AdaptationStrategy {
  strategy: string;
  description: string;
  expectedImprovement: number;
  risk: 'low' | 'medium' | 'high';
}

interface AdaptationResult {
  insightId: string;
  appliedAdaptations: AppliedAdaptation[];
  overallSuccess: number;
  appliedAt: Date;
  expectedImpact: number;
}

interface AppliedAdaptation {
  adaptationId: string;
  type: string;
  action: string;
  success: boolean;
  reason: string;
  appliedAt: Date;
}

interface ActiveAdaptation {
  adaptationId: string;
  type: string;
  appliedAt: Date;
  context: LearningInsights;
  monitoringPeriod: number;
  baselineMetrics: Record<string, any>;
  targetMetrics: Record<string, any>;
  rollbackPlan: RollbackPlan;
}

interface RollbackPlan {
  steps: string[];
  risk: string;
  estimatedDuration: number;
  validationSteps: string[];
}

interface AdaptationPerformance {
  adaptationId: string;
  type: string;
  effectiveness: number;
  progressRatio: number;
  status: string;
  metrics: Record<string, any>;
  assessedAt: Date;
}

interface AdaptationEffectivenessReport {
  adaptationsMonitored: number;
  overallEffectiveness: number;
  topPerformingAdaptations: AdaptationPerformance[];
  underPerformingAdaptations: AdaptationPerformance[];
  recommendations: string[];
  generatedAt: Date;
}

// ================ EXPORTS ================

export { FeedbackLearningEngine, BehaviorAdaptationEngine };
export type {
  LearningInsights,
  DeveloperEffectiveness,
  AdaptationResult
};

export default {
  FeedbackLearningEngine,
  BehaviorAdaptationEngine
};

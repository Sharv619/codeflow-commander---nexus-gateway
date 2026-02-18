// File: src/types/core.ts
// Core type definitions implementing the Data Model blueprint
// Provides TypeScript foundation for safety, validation, and architectural integrity

/**
 * Core Suggestion Types - Defines the categories of suggestions Codeflow can generate
 * Aligned with PRISM intelligence system and NEURON agent specialization
 */
export type SuggestionType =
  | 'security'        // Security vulnerabilities and vulnerabilities fixes
  | 'architecture'    // Architectural pattern violations and improvements
  | 'maintainability' // Code quality, documentation, and maintainability issues
  | 'performance'     // Performance bottlenecks and optimization opportunities
  | 'testing'         // Testing gaps, coverage issues, and test quality improvements
  | 'integration';    // API compatibility, dependencies, and system integration issues

/**
 * Suggestion Severity Levels - Hierarchical severity classification
 * Used for prioritization, filtering, and governance controls
 */
export type SuggestionSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Suggestion Status Lifecycle - Tracks suggestion state through validation, application, and feedback
 * Critical for state management and learning loop functionality
 */
export type SuggestionStatus =
  | 'pending'      // Initial state after generation
  | 'validated'    // Passed validation pipeline
  | 'presented'    // Shown to developer via CLI
  | 'accepted'     // Developer approved for application
  | 'applied'      // Successfully applied to codebase
  | 'rejected'     // Developer rejected or dismissed
  | 'expired'      // Time-based expiration
  | 'conflicted'   // Conflicts with other suggestions
  | 'deferred';    // Temporarily postponed by developer

/**
 * Feedback Action Types - Categorizes developer responses for learning algorithms
 * Enables personalized suggestion adaptation and trust building
 */
export type FeedbackAction =
  | 'accepted'     // Developer approved without changes
  | 'modified'     // Developer made changes before accepting
  | 'rejected'     // Developer completely rejected
  | 'deferred'     // Developer chose to address later
  | 'collapsed';   // Developer hid/dismissed permanently

/**
 * Rejection Reasons - Detailed tracking of rejection motivations
 * Feeds into learning algorithms to improve suggestion quality
 */
export type RejectionReason =
  | 'irrelevant'           // Suggestion doesn't apply to current context
  | 'wrong'               // Suggestion contains factual errors
  | 'incomplete'          // Only partial solution provided
  | 'overly-aggressive'   // Suggestion too sweeping/conservative
  | 'breaks-functionality' // Would break existing functionality
  | 'style-preference'    // Conflicts with team coding preferences
  | 'timing-issue'        // Wrong time/context for suggestion
  | 'duplicate'           // Same suggestion already exists
  | 'not-applicable';     // Doesn't fit current architectural state

/**
 * Confidence Score - Continuous range with semantic interpretation
 * Used for safety controls, prioritization, and auto-application thresholds
 */
export interface ConfidenceScore {
  value: number;        // 0.0 to 1.0 confidence level
  factors: {
    historical: number;     // Based on past acceptance rates
    contextual: number;     // Based on current context relevance
    validation: number;     // Based on validation pipeline results
  };
  reasoning: string[];  // Human-readable justification
}

/**
 * Location Context - Precise code location tracking
 * Enables target-specific patch application and rollback capabilities
 */
export interface Location {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

/**
 * Code Range - Enhanced location with scope information
 * Supports hierarchical code understanding for PRISM intelligence
 */
export interface Range {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
  scope?: {
    type: 'function' | 'class' | 'interface' | 'module';
    name: string;
  };
}

/**
 * Standardized Validation Result - Consistent error/quality reporting
 * Implements the validation pipeline from risk mitigation strategies
 */
export interface ValidationResult {
  passed: boolean;
  score: number;        // 0.0 to 1.0 quality score
  message?: string;
  details?: string[];
  suggestions?: string[]; // Auto-generated fix suggestions
  metadata?: Record<string, any>;
}

/**
 * Audit Trail Entry - Comprehensive action tracking for governance
 * Implements the compliance and audit requirements from risk mitigation
 */
export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: AuditAction;
  actor: {
    type: 'developer' | 'agent' | 'automation' | 'system';
    identifier: string;
    metadata?: Record<string, any>;
  };
  target: {
    type: 'suggestion' | 'patch' | 'analysis' | 'config';
    identifier: string;
    metadata?: Record<string, any>;
  };
  context: {
    sessionId: string;
    projectId: string;
    gitCommit?: string;
    environment: Record<string, any>;
  };
  impact: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    autoApproved: boolean;
    rollbackAvailable: boolean;
    complianceChecked: boolean;
  };
  evidence: {
    validationResults?: ValidationResult[];
    confidenceScores?: ConfidenceScore[];
    diffContent?: string;
  };
}

/**
 * Audit Action Categories - Hierarchical action classification
 * Supports compliance reporting and security monitoring
 */
export type AuditAction =
  | 'generated'      // AI model generated suggestion
  | 'validated'      // Passed validation pipeline
  | 'presented'      // Shown to developer
  | 'accepted'       // Developer approved
  | 'applied'        // Applied to codebase
  | 'rejected'       // Rejected by developer
  | 'rolled-back'    // Reverted after application
  | 'modified'       // Changed by developer before application
  | 'expired'        // Suggestion expired
  | 'learned'        // Feedback incorporated into learning
  | 'flagged';       // Marked for review by governance system

/**
 * Provider Configuration - Multi-provider AI service abstraction
 * Enables future expansion and fallback strategies
 */
export interface ProviderConfig {
  provider: 'gemini' | 'openai' | 'claude' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryConfig?: {
    attempts: number;
    backoff: 'linear' | 'exponential';
    maxDelay: number;
  };
  safetySettings?: {
    blockUnsupported: boolean;
    contentFiltering: boolean;
  };
}

/**
 * Session Tracking - Analysis session lifecycle management
 * Enables performance monitoring and state recovery
 */
export interface SessionInfo {
  id: string;
  startTime: Date;
  endTime?: Date;
  type: 'analysis' | 'generation' | 'review' | 'application';
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  metadata: Record<string, any>;
}

/**
 * Error Classification - Hierarchical error categorization for monitoring
 * Supports automated response and escalation strategies
 */
export interface ErrorInfo {
  code: string;
  category: 'validation' | 'generation' | 'application' | 'infrastructure' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, any>;
  stackTrace?: string;
  context?: SessionInfo;
  recovery?: {
    automatic: boolean;
    strategy: string;
    rollbackRequired: boolean;
  };
}

/**
 * Safety Controls - Configuration-driven safety thresholds
 * Implements graduated rollout strategy from risk mitigation
 */
export interface SafetyControls {
  // Confidence thresholds for auto-application
  confidenceThresholds: {
    low: 0.95;      // Auto-apply safe modifications only
    medium: 0.90;   // Conservative trust building phase
    high: 0.85;     // Mature system full automation
  };

  // Risk-based validation requirements
  riskAssessment: {
    criticalPath: boolean;        // Require manual review
    highImpact: boolean;         // Require testing verification
    securityRelated: boolean;    // Require security audit
    breakingChanges: boolean;    // Require integration testing
  };

  // Application limits and controls
  operationalLimits: {
    maxSuggestionsPerSession: number;
    maxAutoApplyPerHour: number;
    requireRollbackCapability: boolean;
    forceSequentialApplication: boolean;
  };

  // Emergency controls
  emergencyMode: {
    enabled: boolean;
    triggerConditions: string[];
    fallbackBehavior: 'manual-only' | 'conservative-validation' | 'halt-operations';
  };
}

/**
 * Learning Feedback - Structured feedback for model improvement
 * Enables continuous improvement of suggestion quality
 */
export interface LearningFeedback {
  suggestionId: string;
  sessionId: string;
  accepted: boolean;
  modified: boolean;
  acceptanceTime: Date;
  usefulRating?: number;     // 1-5 scale
  accuracyRating?: number;   // 1-5 scale
  rejectionReason?: RejectionReason;
  helpfulAspects?: string[];
  improvementSuggestions?: string[];
  developerId: string;       // For personalization
}

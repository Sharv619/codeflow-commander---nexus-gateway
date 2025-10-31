// ------------------------------------------------------------------------------
// Phase 5: Autonomous Agent Network - Core Agent Types
// TypeScript interfaces and enums for the AAN implementation
// ------------------------------------------------------------------------------
// Import core types from the data models specification
export enum AgentType {
  SECURITY = 'security',
  ARCHITECTURE = 'architecture',
  PERFORMANCE = 'performance',
  QUALITY = 'quality',
  MONITORING = 'monitoring'
}

export enum AgentState {
  IDLE = 'idle',
  ACTIVATED = 'activated',
  INITIALIZING = 'initializing',
  ANALYZING = 'analyzing',
  PROCESSING = 'processing',
  SYNTHESIZING = 'synthesizing',
  REPORTING = 'reporting',
  LEARNING = 'learning',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  SHUTDOWN = 'shutdown'
}

export enum MessageType {
  // Lifecycle Messages
  AGENT_ACTIVATED = 'agent.lifecycle.activated',
  AGENT_COMPLETED = 'agent.lifecycle.completed',
  AGENT_ERROR = 'agent.lifecycle.error',
  AGENT_SHUTDOWN = 'agent.lifecycle.shutdown',

  // Analysis Messages
  ANALYSIS_REQUEST = 'analysis.request',
  ANALYSIS_RESULTS = 'analysis.results',
  ANALYSIS_CORRELATION = 'analysis.correlation',
  PATTERN_ANALYZED = 'analysis.pattern',

  // Learning & Collaboration
  CORRELATION_REQUEST = 'learning.correlation.request',
  CORRELATION_RESPONSE = 'learning.correlation.response',
  PATTERN_SUGGESTION = 'learning.pattern.suggestion',
  FEEDBACK_RECEIVED = 'learning.feedback.received',
  ADAPTATION_UPDATE = 'learning.adaptation.update',

  // Coordination & Consensus
  CONSENSUS_REQUEST = 'coordination.consensus.request',
  CONSENSUS_RESPONSE = 'coordination.consensus.response',
  RESOURCE_CONFLICT = 'coordination.resource.conflict',
  PRIORITY_NEGOTIATION = 'coordination.priority.negotiation',

  // Monitoring & Health
  HEALTH_CHECK = 'monitoring.health.check',
  PERFORMANCE_METRICS = 'monitoring.performance.metrics',
  ALERT_TRIGGERED = 'monitoring.alert.triggered',

  // Configuration & Updates
  CONFIG_UPDATE = 'config.update',
  BEHAVIOR_ADJUSTMENT = 'config.behavior.adjustment'
}

export enum MessagePriority {
  LOW = 0,       // Background learning, housekeeping
  NORMAL = 1,    // Standard analysis requests
  HIGH = 2,      // Important findings, escalations
  URGENT = 3,    // Security issues, system problems
  CRITICAL = 4   // Immediate action required, system failures
}

// Core agent identity and configuration
export interface AgentIdentity {
  id: string;                    // Unique agent instance ID (type-repo-timestamp)
  type: AgentType;              // Agent specialization type
  specialization?: string;       // Additional specialization focus
  version: string;              // Agent software version
  createdAt: Date;              // Agent creation timestamp
  repositoryId: string;         // Repository this agent serves
  sessionId?: string;           // Current analysis session
}

export interface AgentConfiguration {
  // Identity
  repositoryId: string;
  type: AgentType;

  // Core Settings
  confidenceThreshold: number;           // 0.0 - 1.0, default 0.8
  maxAnalysisTime: number;               // Max analysis time in ms
  maxRecommendationsPerDay: number;      // Daily recommendation limit

  // Safety Bounds
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;       // Failures before circuit open
  circuitBreakerResetTime: number;       // Reset timeout in ms

  // Learning Parameters
  learningEnabled: boolean;
  adaptationRate: number;                // How quickly agent adapts (0.0-1.0)
  minimumExperiencePoints: number;       // Experience threshold for suggestions

  // Trigger Conditions
  triggerPatterns: TriggerPattern[];
  analysisScope: AnalysisScope;

  // Notification Preferences
  notificationChannels: NotificationChannel[];
  escalationThreshold: number;           // Confidence threshold for escalation

  // Performance Tuning
  analysisTimeout: number;               // Individual analysis timeout
  batchProcessingSize: number;           // Batch processing size
  memoryLimit: number;                   // Memory usage limit in MB
}

// Agent state management
export interface AgentStateData {
  identity: AgentIdentity;
  configuration: AgentConfiguration;
  currentState: AgentState;
  stateTransitionHistory: StateTransition[];
  lastActiveTimestamp: Date;
  uptime: number;
  performanceMetrics: AgentPerformanceMetrics;
  healthScore: HealthScore;
  isEnabled: boolean;
  maintenanceMode: boolean;
  emergencyShutdown: boolean;
  lastShutdownReason?: string;
  currentAnalysis?: ActiveAnalysisContext;
  learningState: AgentLearningState;
  safetyControls: AgentSafetyControls;
  version: string;
  schemaVersion: string;
  lastModified: Date;
}

// State transition tracking
export interface StateTransition {
  id: string;
  fromState: AgentState;
  toState: AgentState;
  timestamp: Date;
  trigger: string;                    // What caused the transition
  metadata?: Record<string, any>;     // Additional context
}

// Performance metrics
export interface AgentPerformanceMetrics {
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  averageAnalysisTime: number;
  totalFindings: number;
  totalRecommendations: number;
  analysesLast24Hours: number;
  analysesLastWeek: number;
  analysesLastMonth: number;
  avgConfidenceScore: number;
  falsePositiveRate: number;
  developerAcceptanceRate: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
  peakMemoryUsage: number;
}

// Health scoring
export interface HealthScore {
  overallScore: number;
  components: {
    performance: number;              // Based on analysis success rate
    reliability: number;              // Based on failure rate
    learning: number;                 // Based on improvement over time
    safety: number;                   // Based on safety mechanism performance
  };
  healthStatus: 'healthy' | 'degraded' | 'critical';
  lastAssessment: Date;
}

// Learning state
export interface AgentLearningState {
  experiencePoints: number;
  skillLevel: number;
  confidenceHistory: ConfidenceHistoryPoint[];
  knownPatterns: LearnedPattern[];
  effectiveStrategies: EffectiveStrategy[];
  avoidedMistakes: AvoidedMistake[];
  confidenceAdjustment: number;
  triggerModifications: TriggerModification[];
  strategyWeights: StrategyWeights;
}

// Safety controls
export interface AgentSafetyControls {
  rateLimiter: {
    maxActionsPerHour: number;
    currentHourCount: number;
    lastResetTime: Date;
  };
  circuitBreaker: {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: Date;
    nextRetryTime: Date;
  };
  emergencyOverrides: EmergencyOverride[];
  safetyViolations: SafetyViolation[];
}

// Supporting types
export interface TriggerPattern {
  eventType: EventType;
  filePatterns?: string[];
  contentPatterns?: RegExp[];
  dependencyPatterns?: string[];
  severityThreshold?: number;
  cooldownPeriod?: number;
}

export interface AnalysisScope {
  maxFilesPerAnalysis: number;
  maxLinesPerFile: number;
  supportedLanguages: string[];
  excludedPaths: string[];
  customAnalysisDepth: number;
}

export interface NotificationChannel {
  type: 'github_comment' | 'email' | 'slack' | 'webhook' | 'cli';
  enabled: boolean;
  settings: ChannelSettings;
  priorityThreshold: number;
}

// Union type for channel settings (from architecture doc)
export type ChannelSettings =
  | { type: 'github_comment'; template: string; }
  | { type: 'email'; recipients: string[]; template: string; }
  | { type: 'slack'; webhookUrl: string; channel: string; template: string; }
  | { type: 'webhook'; url: string; headers: Record<string, string>; }
  | { type: 'cli'; command: string; args: string[]; };

// Additional types
export interface ConfidenceHistoryPoint {
  timestamp: Date;
  confidenceScore: number;
  analysisType: string;
  outcome: 'accepted' | 'rejected' | 'ignored' | 'escalated';
}

export interface LearnedPattern {
  patternId: string;
  description: string;
  confidence: number;
  occurrences: number;
  lastTriggered: Date;
  effectiveness: number;
}

export interface EffectiveStrategy {
  strategyId: string;
  description: string;
  successRate: number;
  usageCount: number;
  lastUsed: Date;
}

export interface AvoidedMistake {
  mistakeId: string;
  description: string;
  lessonLearned: string;
  preventionsImplemented: string[];
}

export interface TriggerModification {
  modificationId: string;
  type: 'add' | 'remove' | 'modify';
  pattern: TriggerPattern;
  reason: string;
  timestamp: Date;
}

export interface StrategyWeights {
  [strategy: string]: number;
}

export interface EmergencyOverride {
  id: string;
  triggeredBy: string;
  triggerTime: Date;
  reason: string;
  action: string;
  resolved: boolean;
  resolutionTime?: Date;
  result: 'success' | 'failure' | 'partial';
}

export interface SafetyViolation {
  id: string;
  violationType: 'rate_limit_exceeded' | 'circuit_breaker_triggered' |
                   'confidence_too_low' | 'analysis_timeout';
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  mitigated: boolean;
}

export interface ActiveAnalysisContext {
  analysisId: string;
  triggerEvent: TriggerEvent;
  startTime: Date;
  currentStep: string;
  progress: number;
  estimatedCompletion: Date;
}

// Event types (placeholder - detailed in monitoring engine)
export enum EventType {
  REPOSITORY_PUSH = 'repo.push',
  CODE_FILE_ADDED = 'code.file.added',
  // ... additional types as needed
}

export interface TriggerEvent {
  eventId: string;
  timestamp: Date;
  eventType: EventType;
  source: string;
  repositoryId: string;
  changes?: any[];
  context?: Record<string, any>;
}

// Additional types for analysis and recommendations
export interface AnalysisFinding {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  location: CodeLocation;
  message: string;
  metadata?: Record<string, any>;
}

export interface ConfidenceRecommendation {
  id: string;
  title?: string;
  confidence: number;
  actions?: RecommendedAction[];
}

export interface RecommendedAction {
  type: string;
  parameters: Record<string, any>;
}

export interface CodeLocation {
  file: string;
  line?: number;
  column?: number;
}

// Analysis and context types
export interface AnalysisContext {
  repositoryId: string;
  triggerEvent: TriggerEvent;
  analysisTimestamp: Date;
  analysisId: string;
  ekgIntelligence?: any;
  organizationalPatterns?: any[];
  recentActivity?: any[];
}

export interface AnalysisResult {
  agentId: string;
  timestamp: Date;
  findings: AnalysisFinding[];
  confidence: number;
  metadata?: Record<string, any>;
}

// Learning and feedback types
export interface DeveloperFeedback {
  recommendationId: string;
  action: 'accepted' | 'rejected' | 'ignored' | 'escalated';
  reason?: string;
  originalConfidence: number;
  analysisType: string;
  timestamp: Date;
}

// Agent capabilities
export interface AgentCapability {
  name: string;
  description: string;
  confidenceBoost?: number;
}

// Message and communication types
export interface AgentMessage {
  messageId: string;
  correlationId: string;
  sender: AgentIdentity;
  to?: string;
  type: MessageType;
  priority: MessagePriority;
  payload: any;
  routingInfo?: RoutingInfo;
  deliveryGuarantees?: DeliveryGuarantee;
  createdAt: Date;
  expiresAt?: Date;
  signature?: MessageSignature;
}

export interface DeliveryGuarantee {
  deliveryRequired: boolean;
  persistenceRequired: boolean;
  ordered: boolean;
  expirationSeconds: number;
}

export interface RoutingInfo {
  destinationType: 'direct' | 'broadcast' | 'multicast';
  routingKey?: string;
  agentFilter?: AgentFilter;
  geographicScope?: string;
}

export interface AgentFilter {
  agentTypes?: AgentType[];
  repositoryIds?: string[];
  stabilityRequirement?: string;
  specialtyMatch?: string[];
}

export interface MessageSignature {
  algorithm: string;
  signature: string;
  signingAgent: string;
  validateSignature(): boolean;
}

// Alias for backward compatibility
export type PerformanceMetrics = AgentPerformanceMetrics;

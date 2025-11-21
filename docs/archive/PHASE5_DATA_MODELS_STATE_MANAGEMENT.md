# Phase 5: Data Models & State Management - Implementation Specifications

## Executive Summary

This document defines the **complete data schema architecture** for the Autonomous Agent Network (AAN), providing the structural foundation for agent state management, message passing, learning data persistence, and configuration management.

### **Key Deliverables:**
- **Complete TypeScript interfaces** for all agent data structures
- **State persistence strategies** using existing StorageManager + Redis
- **Message schema definitions** for inter-agent communication
- **Configuration management framework** with Learning & Adaptation integration
- **Data flow specifications** for agent lifecycle management

---

## 1. Core Agent Data Models

### 1.1 Agent Identity & Configuration

```typescript
// Base agent identity and configuration
export interface AgentIdentity {
  id: string;                    // Unique agent instance ID (type-repo-timestamp)
  type: AgentType;              // Security, Architecture, Performance, Quality
  specialization: string;       // Specialized focus within type
  version: string;              // Agent software version
  createdAt: Date;              // Agent creation timestamp
  repositoryId: string;         // Repository this agent serves
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
}

// Detailed trigger pattern matching
export interface TriggerPattern {
  eventType: EventType;
  filePatterns?: string[];           // Glob patterns (e.g., "*.js", "src/**")
  contentPatterns?: RegExp[];        // Content pattern matches
  dependencyPatterns?: string[];     // Dependency matching
  severityThreshold?: number;        // Minimum severity to trigger
  cooldownPeriod?: number;           // Cooldown after trigger (ms)
}

// Analysis scope configuration
export interface AnalysisScope {
  maxFilesPerAnalysis: number;
  maxLinesPerFile: number;
  supportedLanguages: string[];
  excludedPaths: string[];
  customAnalysisDepth: number;
}

// Notification channel configuration
export interface NotificationChannel {
  type: 'github_comment' | 'email' | 'slack' | 'webhook' | 'cli';
  enabled: boolean;
  settings: ChannelSettings;
  priorityThreshold: number;          // Confidence threshold for this channel
}

// Union type for channel settings
export type ChannelSettings =
  | { type: 'github_comment'; template: string; }
  | { type: 'email'; recipients: string[]; template: string; }
  | { type: 'slack'; webhookUrl: string; channel: string; template: string; }
  | { type: 'webhook'; url: string; headers: Record<string, string>; }
  | { type: 'cli'; command: string; args: string[]; };
```

### 1.2 Agent State Management

```typescript
// Complete agent state representation
export interface AgentState {
  identity: AgentIdentity;
  configuration: AgentConfiguration;

  // Lifecycle State
  currentState: AgentStateEnum;
  stateTransitionHistory: StateTransition[];
  lastActiveTimestamp: Date;
  uptime: number;                      // Total time agent has been active (ms)

  // Performance Metrics
  performanceMetrics: AgentPerformanceMetrics;
  healthScore: HealthScore;            // Overall agent health (0.0-1.0)

  // Operational Status
  isEnabled: boolean;
  maintenanceMode: boolean;
  emergencyShutdown: boolean;
  lastShutdownReason?: string;

  // Active Analysis Context
  currentAnalysis?: ActiveAnalysisContext;

  // Learning State
  learningState: AgentLearningState;

  // Safety Controls
  safetyControls: AgentSafetyControls;

  // Metadata
  version: string;                    // Agent software version
  schemaVersion: string;             // State schema version for migrations
  lastModified: Date;
}

// Enumeration of possible agent states
export enum AgentStateEnum {
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

// State transition record
export interface StateTransition {
  id: string;
  fromState: AgentStateEnum;
  toState: AgentStateEnum;
  timestamp: Date;
  trigger: string;                    // What caused the transition
  metadata?: Record<string, any>;     // Additional context
}

// Performance metrics tracking
export interface AgentPerformanceMetrics {
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  averageAnalysisTime: number;
  totalFindings: number;
  totalRecommendations: number;

  // Time-based breakdowns
  analysesLast24Hours: number;
  analysesLastWeek: number;
  analysesLastMonth: number;

  // Quality metrics
  avgConfidenceScore: number;
  falsePositiveRate: number;
  developerAcceptanceRate: number;

  // Resource usage
  averageCpuUsage: number;
  averageMemoryUsage: number;
  peakMemoryUsage: number;
}

// Health scoring system
export interface HealthScore {
  overallScore: number;               // 0.0-1.0
  components: {
    performance: number;              // Based on analysis success rate
    reliability: number;              // Based on failure rate
    learning: number;                 // Based on improvement over time
    safety: number;                   // Based on safety mechanism performance
  };

  healthStatus: 'healthy' | 'degraded' | 'critical';
  lastAssessment: Date;
}

// Active analysis context (when agent is mid-analysis)
export interface ActiveAnalysisContext {
  analysisId: string;
  triggerEvent: TriggerEvent;
  startTime: Date;
  currentStep: string;
  progress: number;                   // 0.0-1.0
  interimResults: any[];
  estimatedCompletion: Date;
}

// Learning state tracking
export interface AgentLearningState {
  experiencePoints: number;           // Total XP from analyses
  skillLevel: number;                 // Current proficiency level
  confidenceHistory: ConfidenceHistoryPoint[];

  // Acquired knowledge
  knownPatterns: LearnedPattern[];
  effectiveStrategies: EffectiveStrategy[];
  avoidedMistakes: AvoidedMistake[];

  // Adaptation data
  confidenceAdjustment: number;
  triggerModifications: TriggerModification[];
  strategyWeights: StrategyWeights;
}

// Confidence evolution tracking
export interface ConfidenceHistoryPoint {
  timestamp: Date;
  confidenceScore: number;
  analysisType: string;
  outcome: 'accepted' | 'rejected' | 'ignored' | 'escalated';
}

// Learned patterns from experience
export interface LearnedPattern {
  patternId: string;
  description: string;
  confidence: number;
  occurrences: number;
  lastTriggered: Date;
  effectiveness: number;              // Improvement after application (0.0-1.0)
}

// Safety control state
export interface AgentSafetyControls {
  // Rate limiting
  rateLimiter: {
    maxActionsPerHour: number;
    currentHourCount: number;
    lastResetTime: Date;
  };

  // Circuit breaker
  circuitBreaker: {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: Date;
    nextRetryTime: Date;
  };

  // Emergency controls
  emergencyOverrides: EmergencyOverride[];
  safetyViolations: SafetyViolation[];
}

// Emergency override record
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

// Safety violation tracking
export interface SafetyViolation {
  id: string;
  violationType: 'rate_limit_exceeded' | 'circuit_breaker_triggered' |
                   'confidence_too_low' | 'analysis_timeout';
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  mitigated: boolean;
}
```

---

## 2. Communication & Message Data Models

### 2.1 Message Bus Schema

```typescript
// Core message structure for inter-agent communication
export interface AgentMessage {
  // Meta Information
  messageId: string;                  // Unique message identifier
  correlationId: string;              // Links related messages
  conversationId?: string;            // Multi-turn conversations

  // Participants
  sender: AgentIdentity;
  recipient?: string;                 // Agent ID, undefined for broadcasts
  replyTo?: string;                   // Response message ID

  // Message Content
  type: MessageType;
  priority: MessagePriority;
  payload: MessagePayload;

  // Routing & Delivery
  routingInfo: RoutingInfo;
  deliveryGuarantees: DeliveryGuarantee;

  // Timestamps & Metadata
  createdAt: Date;
  expiresAt?: Date;                   // TTL for time-sensitive messages
  deliveryCount?: number;             // Retry tracking
  lastAttemptTime?: Date;

  // Security & Verification
  signature?: MessageSignature;
}

// Message type enumeration
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
  BEHAVIOR_ADJUSTMENT = 'config.behavior.adjustment',
}

// Priority levels for message routing
export enum MessagePriority {
  LOW = 0,       // Background learning, housekeeping
  NORMAL = 1,    // Standard analysis requests
  HIGH = 2,      // Important findings, escalations
  URGENT = 3,    // Security issues, system problems
  CRITICAL = 4   // Immediate action required, system failures
}

// Delivery guarantee specifications
export interface DeliveryGuarantee {
  deliveryRequired: boolean;          // At least once, at most once, best effort
  persistenceRequired: boolean;       // Persist for durability
  ordered: boolean;                   // Maintain message order
  expirationSeconds: number;          // Time to live
}

// Routing information for message delivery
export interface RoutingInfo {
  destinationType: 'direct' | 'broadcast' | 'multicast';
  routingKey?: string;                // For pub-sub routing
  agentFilter?: AgentFilter;          // For selective broadcasts
  geographicScope?: string;           // For multi-region deployments
}

// Agent filtering for selective broadcasts
export interface AgentFilter {
  agentTypes?: AgentType[];           // Only these agent types
  repositoryIds?: string[];           // Only these repositories
  stabilityRequiremente?: string;     // Min stability score
  specialtyMatch?: string[];          // Agents with specific capabilities
}

// Message signature for security
export interface MessageSignature {
  algorithm: string;                  // e.g., 'SHA-256'
  signature: string;                  // The actual signature
  signingAgent: string;               // Agent that signed the message
 .validateSignature(): boolean;
}
```

### 2.2 Specialized Message Payloads

```typescript
// Union type for all message payloads
export type MessagePayload =
  | AgentActivatedPayload
  | AgentCompletedPayload
  | AnalysisRequestPayload
  | AnalysisResultsPayload
  | CorrelationRequestPayload
  | ConsensusRequestPayload
  | ConfigUpdatePayload;

// Lifecycle message payloads
export interface AgentActivatedPayload {
  repositoryId: string;
  triggerEvent: TriggerEvent;
  expectedAnalysisTime: number;
  priority: AnalysisPriority;
}

export interface AgentCompletedPayload {
  analysisId: string;
  totalFindings: number;
  totalRecommendations: number;
  averageConfidence: number;
  analysisTime: number;
  outcome: 'success' | 'partial' | 'failure';
}

// Analysis message payloads
export interface AnalysisRequestPayload {
  analysisId: string;
  repositoryId: string;
  triggerEvent: TriggerEvent;
  analysisScope: AnalysisScope;
  requestedCapabilities: AgentCapability[];
  deadline?: Date;
  priority: AnalysisPriority;
}

export interface AnalysisResultsPayload {
  analysisId: string;
  findings: AnalysisFinding[];
  confidence: number;
  analysisTime: number;
  nextActions?: RecommendedAction[];
  requiresCorrelation: boolean;
  collaborationHints?: string[];
}

// Correlation and collaboration payloads
export interface CorrelationRequestPayload {
  targetRepositoryId: string;
  correlationType: CorrelationType;
  contextFindings: AnalysisFinding[];
  requestedAgents: AgentType[];
  confidenceThreshold: number;
  timeoutMs: number;
}

export interface ConsensusRequestPayload {
  topicId: string;
  repositoryId: string;
  proposals: AgentRecommendation[];
  decisionContext: DecisionContext;
  deadline: Date;
  requiredParticipants: AgentType[];
}

// Configuration update payloads
export interface ConfigUpdatePayload {
  updateType: 'behavior' | 'threshold' | 'scope' | 'integration';
  changes: ConfigurationChange[];
  effectiveFrom: Date;
  rollbackPlan?: ConfigurationChange[];
  affectedAgents: string[];           // Agent IDs affected by this change
  initiatedBy: 'admin' | 'learning' | 'self_healing';
}
```

### 2.3 Event & Trigger Data Models

```typescript
// Webhook and system event structure
export interface TriggerEvent {
  eventId: string;                    // Unique event identifier
  timestamp: Date;                    // When event occurred
  eventType: EventType;               // Type of triggering event
  source: EventSource;                // Where event originated

  // Core event data
  repositoryId: string;
  organizationId?: string;
  changes: CodeChange[];              // What actually changed

  // Context and metadata
  context: EventContext;
  severity: EventSeverity;
  priority: EventPriority;

  // Processing tracking
  processed: boolean;
  processedBy?: string[];             // Agent IDs that handled this
  processingStarted?: Date;
  processingCompleted?: Date;
}

// Event type taxonomy
export enum EventType {
  // Repository Events
  REPOSITORY_PUSH = 'repo.push',
  REPOSITORY_PULL_REQUEST_CREATED = 'repo.pr.created',
  REPOSITORY_PULL_REQUEST_UPDATED = 'repo.pr.updated',
  REPOSITORY_COMMIT_COMMENT = 'repo.commit.comment',
  REPOSITORY_BRANCH_CREATED = 'repo.branch.created',

  // Code Change Events
  CODE_FILE_ADDED = 'code.file.added',
  CODE_FILE_MODIFIED = 'code.file.modified',
  CODE_FILE_DELETED = 'code.file.deleted',
  CODE_DEPENDENCY_ADDED = 'code.dependency.added',
  CODE_DEPENDENCY_UPDATED = 'code.dependency.updated',
  CODE_DEPENDENCY_REMOVED = 'code.dependency.removed',

  // Scheduled Events
  SCHEDULED_ANALYSIS = 'schedule.analysis',
  SCHEDULED_MAINTENANCE = 'schedule.maintenance',
  SCHEDULED_LEARNING_UPDATE = 'schedule.learning.update',

  // System Events
  SYSTEM_AGENT_ERROR = 'system.agent.error',
  SYSTEM_HEALTH_CHECK = 'system.health.check',
  SYSTEM_CONFIG_UPDATE = 'system.config.update',
}

// Event context information
export interface EventContext {
  userId?: string;                    // User who triggered the event
  userRole?: string;                  // User permissions/role
  branch: string;                     // Branch where event occurred
  commitSha: string;                  // Specific commit hash
  pullRequestId?: number;             // If related to PR

  // Additional context
  tags?: string[];                    // Descriptive tags
  riskIndicators?: string[];          // Any red flags detected
  recommendedAgents?: AgentType[];    // Which agents should handle this
}

// Code change representation
export interface CodeChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  previousPath?: string;
  language: string;
  linesAdded: number;
  linesDeleted: number;
  content?: string[];

  // Language-specific metadata
  functions?: FunctionSignature[];
  classes?: ClassSignature[];
  dependencies?: string[];            // New dependencies referenced
}

export interface FunctionSignature {
  name: string;
  signature: string;
  parameters: ParameterInfo[];
  returnType?: string;
  visibility: 'public' | 'private' | 'protected';
  lineNumber: number;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
}
```

---

## 3. State Persistence & Storage Strategies

### 3.1 Multi-Layer Storage Architecture

```typescript
// Storage layer abstraction
export interface StorageLayer {
  name: string;
  type: 'persistent' | 'ephemeral' | 'distributed';
  priority: number;                   // Higher number = more critical data

  // Core operations
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;

  // Batch operations
  readBatch(keys: string[]): Promise<Map<string, any>>;
  writeBatch(entries: Map<string, any>): Promise<void>;

  // Metadata operations
  getMetadata(key: string): Promise<StorageMetadata>;
  list(namespace?: string): Promise<string[]>;
  search(pattern: string): Promise<string[]>;
}

export interface StorageMetadata {
  key: string;
  size: number;
  createdAt: Date;
  lastModified: Date;
  ttl?: number;
  compressed: boolean;
  checksum: string;
}
```

### 3.2 Storage Strategy Configuration

```typescript
// Complete storage strategy for AAN
export interface StorageStrategy {
  // Layer definitions
  layers: StorageLayer[];

  // Data classification rules
  classificationRules: DataClassificationRule[];

  // Consistency and synchronization
  synchronizationSettings: SynchronizationSettings;

  // Backup and recovery
  backupConfiguration: BackupConfiguration;

  // Performance and monitoring
  performanceSettings: StoragePerformanceSettings;
}

// Data classification for appropriate storage layer selection
export interface DataClassificationRule {
  dataTypePattern

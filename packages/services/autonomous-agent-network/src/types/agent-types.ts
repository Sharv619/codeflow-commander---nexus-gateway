/**
 * Agent Type Definitions
 * 
 * TypeScript interfaces and types for the Autonomous Agent Network
 * Based on the specifications in docs/AGENT_ORCHESTRATION.md
 */

// Core Event and Context Types
export interface ChangeEvent {
  id: string;                    // UUID v4
  file: string;                  // Relative path from repo root
  repository: string;            // Repository name
  changeType: 'modify' | 'create' | 'delete';
  timestamp: string;             // ISO 8601
  gitStatus: 'modified' | 'untracked' | 'new';
  fileSize: number;              // Bytes
  checksum: string;              // SHA-256 of file content
}

export interface AnalysisContext {
  fileMetadata: FileMetadata;
  gitDiff: GitDiff;
  ekdContext: EKGContext;
  repositoryPolicies: RepositoryPolicy[];
}

export interface FileMetadata {
  fileType: 'source' | 'test' | 'config' | 'docs';
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java' | 'csharp';
  complexity: 'low' | 'medium' | 'high' | 'critical';
  lastModified: string;           // ISO 8601
  authors: string[];              // Recent contributors
  testCoverage: number;           // Percentage
  securityLevel: 'public' | 'internal' | 'restricted';
}

export interface GitDiff {
  file: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];  // Unified diff lines
}

export interface EKGContext {
  dependencies: EKGDependency[];
  owners: EKGOwner[];
  riskFactors: EKGRiskFactor[];
}

export interface EKGDependency {
  target: {
    path: string;
    type: string;
    criticality: string;
  };
  type: string;
  version: string;
}

export interface EKGOwner {
  team: {
    name: string;
    members: string[];
  };
  responsibility: string;
}

export interface EKGRiskFactor {
  securityLevel: string;
  testCoverage: number;
  lastModified: string;
}

export interface RepositoryPolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
}

export interface PolicyRule {
  type: string;
  condition: any;
  action: 'allow' | 'deny' | 'require_review';
}

// Agent Result Types
export interface AgentResult {
  agentId: string;
  agentType: AgentType;
  timestamp: Date;
  suggestions: AgentSuggestion[];
  metadata: AgentMetadata;
  executionTime: number;
  confidence: number;
}

export interface AgentSuggestion {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  confidence: number;
  codePatch?: CodePatch;
  reasoning: string;
  validationResults?: ValidationResults;
  tags: string[];
}

export interface AgentMetadata {
  analysisDepth: AnalysisDepth;
  contextUsed: string[];
  dependenciesAnalyzed: string[];
  policiesApplied: string[];
  executionMetrics: ExecutionMetrics;
}

export interface CodePatch {
  file: string;                    // Target file path
  lineStart: number;               // Start line (1-based)
  lineEnd: number;                 // End line (1-based)
  originalCode: string;            // Code to replace
  suggestedCode: string;           // New code
  language: string;                // Programming language
  patchType: 'replace' | 'insert' | 'delete';
  dependencies?: DependencyUpdate[];
}

export interface DependencyUpdate {
  package: string;
  currentVersion: string;
  targetVersion: string;
  updateType: 'patch' | 'minor' | 'major';
}

export interface ValidationResults {
  testsPass: boolean;
  securityScanPass: boolean;
  performanceImpact: 'positive' | 'neutral' | 'negative';
}

export interface ExecutionMetrics {
  executionTime: number;
  suggestionsCount: number;
  success: boolean;
  memoryUsage?: number;
  cpuUsage?: number;
}

// Configuration Types
export interface AgentConfig {
  // Core configuration
  id: string;
  type: AgentType;
  version: string;
  capabilities: AgentCapability[];
  confidenceThreshold: number;
  
  // Performance settings
  timeout: number;                    // Maximum execution time in ms
  retryAttempts: number;              // Number of retry attempts
  retryDelay: number;                 // Delay between retries in ms
  
  // Analysis settings
  maxSuggestions: number;             // Maximum suggestions per analysis
  contextWindowSize: number;          // Lines of context to analyze
  fileTypes: string[];                // Supported file extensions
  
  // Integration settings
  enabled: boolean;                   // Whether agent is active
  priority: AgentPriority;            // Execution priority
  dependencies: string[];             // Required agent dependencies
  
  // Learning settings
  feedbackEnabled: boolean;           // Whether to accept feedback
  learningRate: number;               // How quickly to adapt
  memoryRetention: number;            // How long to remember patterns
  
  // Policies
  policies: AgentPolicy[];
}

export interface AgentPolicy {
  id: string;
  type: 'confidence_threshold' | 'severity_filter' | 'file_pattern_filter';
  config: any;
}

// Enumerations and Constants
export type AgentType = 'security' | 'quality' | 'architecture' | 'performance';
export type AgentSpecialization = 'security_analysis' | 'code_quality' | 'architecture_analysis' | 'performance_analysis';
export type AgentCapability = 'static_analysis' | 'dependency_scanning' | 'pattern_detection' | 'performance_optimization';

export enum AgentPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4
}

export enum SeverityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum AnalysisDepth {
  SHALLOW = 'shallow',
  MEDIUM = 'medium',
  DEEP = 'deep',
  COMPREHENSIVE = 'comprehensive'
}

// Health and Monitoring Types
export interface AgentHealth {
  agentId: string;
  isActive: boolean;
  lastExecutionTime: Date;
  executionCount: number;
  successRate: number;
  status: 'healthy' | 'unhealthy' | 'inactive';
  memoryUsage: number;
  cpuUsage: number;
  errorCount: number;
}

export interface HealthCheckResult {
  passed: boolean;
  healthScore: number;
  metrics: AgentHealth;
  errors: string[];
  dependencies: DependencyHealth[];
}

export interface DependencyHealth {
  agentId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
}

// Agent Lifecycle Types
export interface AgentLifecycleEvent {
  agentId: string;
  eventType: 'initialized' | 'activated' | 'deactivated' | 'error' | 'completed';
  timestamp: Date;
  details: any;
}

export interface AgentState {
  agentId: string;
  status: 'idle' | 'analyzing' | 'completed' | 'error';
  currentTask?: string;
  lastActivity: Date;
  queueLength: number;
}

// Communication Types
export interface AgentMessage {
  id: string;
  type: MessageType;
  sender: string;
  recipients: string[];
  payload: any;
  timestamp: Date;
  priority: MessagePriority;
  correlationId?: string;
}

export enum MessageType {
  ANALYSIS_REQUEST = 'analysis_request',
  ANALYSIS_RESULT = 'analysis_result',
  CONSENSUS_VOTE = 'consensus_vote',
  CONFLICT_NOTIFICATION = 'conflict_notification',
  FEEDBACK_REQUEST = 'feedback_request',
  FEEDBACK_RESPONSE = 'feedback_response'
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Consensus and Coordination Types
export interface ConsensusResult {
  status: ConsensusStatus;
  suggestions: AgentSuggestion[];
  consensusLevel: number;  // 0.0 to 1.0
  conflicts: Conflict[];
  resolutionStrategy: ResolutionStrategy;
  executionTime: number;
}

export enum ConsensusStatus {
  UNANIMOUS = 'unanimous',           // All agents agree
  MAJORITY = 'majority',             // >50% agreement
  CONSENSUS = 'consensus',           // >75% agreement
  DISAGREED = 'disagreed',           // No agreement reached
  TIMEOUT = 'timeout'                // Consensus timeout
}

export interface Conflict {
  type: 'semantic' | 'implementation';
  suggestions: AgentSuggestion[];
  severity: ConflictSeverity;
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ResolutionStrategy {
  type: 'authority_based' | 'evidence_based' | 'consensus_based';
  details: any;
}

export interface ResolutionResult {
  resolvedSuggestion: AgentSuggestion;
  resolutionStrategy: ResolutionStrategy;
  justification: string;
}

// Factory and Registry Types
export interface AgentFactory {
  createAgent(config: AgentConfig): any; // AutonomousAgent type would cause circular dependency
  getAgentTypes(): AgentType[];
  getAgentCapabilities(type: AgentType): AgentCapability[];
}

export interface AgentRegistry {
  registerAgent(agent: any): void; // AutonomousAgent type would cause circular dependency
  getAgent(id: string): any | undefined; // AutonomousAgent type would cause circular dependency
  getAgentsByType(type: AgentType): any[]; // AutonomousAgent type would cause circular dependency
  getAgentsByCapability(capability: AgentCapability): any[]; // AutonomousAgent type would cause circular dependency
  getAllAgents(): any[]; // AutonomousAgent type would cause circular dependency
  removeAgent(id: string): void;
}

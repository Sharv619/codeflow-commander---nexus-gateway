/**
 * TypeScript type definitions for the Codeflow Intelligence Dashboard (Project Phoenix)
 * These types define the data models for the EKG, AAN, and dashboard components.
 */

export enum UserRole {
  Developer = 'developer',
  TeamLead = 'team_lead',
  Architect = 'architect',
  Admin = 'admin'
}

export enum DashboardView {
  GlobalEKG = 'global_ekg',
  RepositoryHealth = 'repository_health',
  AgentReview = 'agent_review',
  MyCodeflow = 'my_codeflow',
  AgentConfig = 'agent_config',
  PipelineSandbox = 'pipeline_sandbox'
}

export enum AgentType {
  Security = 'security',
  Architecture = 'architecture',
  Performance = 'performance',
  Testing = 'testing',
  Documentation = 'documentation',
  CodeQuality = 'code_quality'
}

export enum SuggestionStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Implemented = 'implemented',
  Expired = 'expired'
}

export enum Severity {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  Info = 'info'
}

export enum HealthStatus {
  Excellent = 'excellent',
  Good = 'good',
  Warning = 'warning',
  Critical = 'critical',
  Unknown = 'unknown'
}

// Repository and Health Data Models
export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  lastCommit: Date;
  health: RepositoryHealth;
  agentActivity: AgentActivity;
  dependencies: Dependency[];
  team?: string;
  owner?: string;
}

export interface RepositoryHealth {
  techDebtScore: number; // 0-100, lower is better
  securityPosture: HealthStatus;
  testCoverage: number; // 0-100 percentage
  codeComplexity: number; // Average complexity score
  vulnerabilityCount: number;
  maintainabilityIndex: number; // 0-100
  duplicationPercentage: number; // 0-100
  lastHealthCheck: Date;
}

export interface AgentActivity {
  suggestionsCount: number;
  acceptedSuggestions: number;
  rejectedSuggestions: number;
  pendingReviews: number;
  autoAppliedCount: number;
  lastActivity: Date;
}

export interface Dependency {
  name: string;
  version: string;
  type: 'direct' | 'transitive';
  vulnerabilities: number;
  outdated: boolean;
  latestVersion?: string;
}

// Agent Suggestion Models
export interface AgentSuggestion {
  id: string;
  repositoryId: string;
  agentType: AgentType;
  title: string;
  description: string;
  severity: Severity;
  confidence: number; // 0.0 to 1.0
  status: SuggestionStatus;
  createdAt: Date;
  updatedAt?: Date;
  expiresAt?: Date;
  codePatch: CodePatch;
  reasoning: string;
  validationResults: ValidationResults;
  tags: string[];
  assignedTo?: string;
  reviewedBy?: string;
  prUrl?: string;
}

export interface CodePatch {
  file: string;
  lineStart: number;
  lineEnd: number;
  originalCode: string;
  suggestedCode: string;
  language: string;
  contextLines?: number;
}

export interface ValidationResults {
  testsPass: boolean;
  securityScanPass: boolean;
  performanceImpact: 'positive' | 'neutral' | 'negative';
  breakingChanges: boolean;
  testCoverageChange?: number;
  complexityChange?: number;
}

// Enterprise Knowledge Graph Models
export interface EKGNode {
  id: string;
  type: 'repository' | 'library' | 'service' | 'infrastructure' | 'person' | 'team';
  label: string;
  data: Record<string, any>;
  position?: { x: number; y: number };
  style?: Record<string, any>;
}

export interface EKGEdge {
  id: string;
  source: string;
  target: string;
  type: 'depends_on' | 'imports' | 'calls' | 'owns' | 'maintains' | 'uses';
  data: Record<string, any>;
  style?: Record<string, any>;
}

export interface EKGData {
  nodes: EKGNode[];
  edges: EKGEdge[];
  metadata: {
    lastUpdated: Date;
    nodeCount: number;
    edgeCount: number;
    coverage: number; // Percentage of org covered
  };
}

// Agent Configuration Models
export interface AgentConfiguration {
  id: string;
  agentType: AgentType;
  repositoryId?: string; // If null, applies globally
  enabled: boolean;
  confidenceThreshold: number; // 0.0 to 1.0
  autoApplyEnabled: boolean;
  autoApplyThreshold: number; // Higher than confidenceThreshold
  rateLimit: {
    suggestionsPerHour: number;
    suggestionsPerDay: number;
  };
  scope: {
    filePatterns: string[];
    excludePatterns: string[];
  };
  customRules: Record<string, any>;
  lastModified: Date;
  modifiedBy: string;
}

export interface AgentNetworkStatus {
  totalAgents: number;
  activeAgents: number;
  suggestionsGenerated: number;
  suggestionsAccepted: number;
  averageResponseTime: number;
  uptime: number;
  lastHealthCheck: Date;
}

// Analytics and Metrics Models
export interface RepositoryMetrics {
  repositoryId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  healthTrends: HealthTrend[];
  agentActivity: AgentActivityMetrics[];
  codeQuality: CodeQualityMetrics;
  teamProductivity: ProductivityMetrics;
}

export interface HealthTrend {
  date: Date;
  techDebtScore: number;
  testCoverage: number;
  vulnerabilityCount: number;
  codeComplexity: number;
}

export interface AgentActivityMetrics {
  date: Date;
  suggestionsCreated: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
  autoApplied: number;
  averageConfidence: number;
}

export interface CodeQualityMetrics {
  totalLines: number;
  commentRatio: number;
  functionLength: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: {
    hours: number;
    cost: number;
  };
}

export interface ProductivityMetrics {
  commitsPerDay: number;
  prMergeTime: number; // hours
  reviewTime: number; // hours
  deploymentFrequency: number;
  failureRate: number;
}

// User and Permission Models
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  teams: string[];
  repositories: string[];
  preferences: UserPreferences;
  lastLogin: Date;
  permissions: Permission[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    browser: boolean;
    agentSuggestions: boolean;
    securityAlerts: boolean;
  };
  dashboard: {
    defaultView: DashboardView;
    autoRefresh: boolean;
    refreshInterval: number;
  };
}

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'admin';
  scope: 'global' | 'team' | 'repository';
}

// API Response Models
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: Date;
    requestId: string;
    processingTime: number;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Real-time Update Models
export interface RealTimeUpdate {
  type: 'suggestion_created' | 'suggestion_updated' | 'health_changed' | 'agent_status_changed';
  id: string;
  timestamp: Date;
  data: any;
  affectedUsers: string[];
}

// Search and Filter Models
export interface SearchFilters {
  query?: string;
  repository?: string[];
  agentType?: AgentType[];
  severity?: Severity[];
  status?: SuggestionStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  assignee?: string[];
  tags?: string[];
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Notification Models
export interface Notification {
  id: string;
  userId: string;
  type: 'suggestion' | 'alert' | 'update' | 'reminder';
  title: string;
  message: string;
  severity: Severity;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// Integration Models
export interface GitIntegration {
  provider: 'github' | 'gitlab' | 'bitbucket';
  repository: string;
  branch: string;
  webhookUrl: string;
  lastSync: Date;
  syncStatus: 'success' | 'failed' | 'in_progress';
}

export interface SlackIntegration {
  webhookUrl: string;
  channels: string[];
  notifications: {
    suggestions: boolean;
    alerts: boolean;
    dailyReports: boolean;
  };
}

// Export utility types
export type RepositoryId = string;
export type SuggestionId = string;
export type UserId = string;
export type AgentConfigId = string;

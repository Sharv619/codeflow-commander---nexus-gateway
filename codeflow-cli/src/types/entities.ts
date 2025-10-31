// File: src/types/entities.ts
// Entity interfaces implementing the Data Model blueprint
// Comprehensive data structures for Phase 3 state management

import {
  SuggestionType,
  SuggestionSeverity,
  SuggestionStatus,
  FeedbackAction,
  RejectionReason,
  ConfidenceScore,
  Range,
  AuditEntry,
  LearningFeedback,
  ProviderConfig,
  SessionInfo,
  ErrorInfo
} from './core';

/**
 * CodeSuggestion - Core entity representing AI-generated improvement suggestions
 * Implements the comprehensive suggestion model from Data Model blueprint
 * Foundation for VECTOR knowledge store and NEURON agent interactions
 */
export interface CodeSuggestion {
  // Identification & Metadata
  id: string; // UUID for unique identification
  sessionId: string; // Links to originating analysis session

  // Suggestion Characteristics
  type: SuggestionType;
  severity: SuggestionSeverity;
  title: string; // Human-readable title (max 100 chars)
  description: string; // Detailed explanation with context

  // Code Generation Data (Generated patches)
  patch: {
    content: string; // Unified diff format patch content
    targetFiles: string[]; // Files affected by this patch
    affectedRanges: Range[]; // Specific code ranges modified
    dependencies: {
      added: string[]; // New imports/dependencies added
      removed: string[]; // Dependencies no longer needed
      changed: Array<{ from: string; to: string }>; // Modified dependencies
    };
    breakingChanges: BreakingChange[]; // Non-backward compatible changes
    rollbackPlan: string[]; // Commands to undo this change
  };

  // Context and Generation Intelligence (PRISM inputs)
  context: {
    retrievedChunks: CodeChunk[]; // VECTOR chunks used for generation
    relevantPatterns: PatternMatch[]; // Similar patterns found in codebase
    projectContext: {
      architecture: string; // Architectural style (MVC, layered, etc.)
      dependencies: string[]; // Key project dependencies
      conventions: string[]; // Coding conventions detected
      priorities: string[]; // Project priorities (performance, security, etc.)
    };
    generationPrompt: string; // Actual prompt sent to AI for audit/debugging
  };

  // AI Generation Metadata
  generation: {
    model: string; // AI model used (e.g., "gemini-pro", "claude-3-opus")
    provider: string; // AI provider (gemini, openai, claude)
    confidence: ConfidenceScore; // Multi-factor confidence assessment
    timestamp: Date; // When this suggestion was generated
    agentId: string; // Which agent generated this suggestion
    agentVersion: string; // Agent implementation version
    tokensUsed: {
      prompt: number; // Tokens used for input
      completion: number; // Tokens used for output
      total: number; // Total tokens consumed
    };
    processingTimeMs: number; // Time spent generating this suggestion
  };

  // Validation Results (from Safety Framework)
  validation: {
    syntaxCheck: ValidationResult; // Language syntax validation
    logicValidation: ValidationResult; // Business logic correctness
    testGeneration: {
      unitTests: TestFile[]; // Generated unit tests for this patch
      integrationTests: TestFile[]; // Generated integration tests
      coverage: number; // Estimated code coverage percentage
      edgeCases: string[]; // Edge cases that tests cover
    };
    dependencyImpact: {
      added: DependencyChange[]; // New dependencies introduced
      modified: DependencyChange[]; // Modified existing dependencies
      risks: string[]; // Potential security or compatibility risks
    };
    compatibility: CompatibilityAssessment; // Breaking change analysis
  };

  // Lifecycle Management
  status: SuggestionStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // Time-based expiration for stale suggestions

  // Relationship Mapping (for graph-based intelligence)
  relationships: {
    parentSuggestion?: string; // For suggestion chains/sequences
    relatedSuggestions: string[]; // Related suggestions in same session
    dependentSuggestions: string[]; // Suggestions that depend on this one
    conflictSuggestions: string[]; // Suggestions that conflict with this one
    similarHistorical: string[]; // Past suggestions with similar patterns
  };

  // Origin Analysis Metadata
  originatingAnalysis: {
    sessionId: string;
    analysisType: 'diff' | 'file' | 'project' | 'daemon';
    triggerSource: 'manual' | 'pre-commit' | 'pre-push' | 'daemon' | 'scheduled';
    analyzedContent: {
      filePath?: string;
      diffSize?: number; // Lines changed in diff
      contextSize?: number; // KB of context analyzed
    };
  };

  // Extension Points for System Growth
  metadata: Record<string, any>; // Extensible metadata for future features
  extensions: {
    [key: string]: any;
  };
}

/**
 * DeveloperFeedback - Learning data captured from developer interactions
 * Critical for continuous learning loops and personalization
 * Foundation for adaptive VECTOR retrieval and NEURON agent improvement
 */
export interface DeveloperFeedback {
  // Identification & Linking
  id: string;
  suggestionId: string; // Links to the suggestion this feedback addresses
  sessionId: string;
  developerId: string; // Anonymized developer identifier

  // Action Taken
  action: FeedbackAction;
  accepted: boolean;
  modified: boolean; // True if developer changed the suggestion before accepting

  // Temporal Tracking
  timeToReview: number; // Minutes spent reviewing (for efficiency metrics)
  reviewedAt: Date;
  appliedAt?: Date;

  // Context Information
  context: {
    sessionId: string;
    gitBranch: string;
    projectState: {
      commitHash: string;
      filesModified: string[];
    };
    environment: {
      editor?: string; // VS Code, JetBrains, etc.
      shell?: string;
      platform: string;
    };
  };

  // Detailed Feedback Content
  rejectionReason?: RejectionReason;
  customNotes?: string;
  modifications?: {
    addedFeatures?: string[]; // Features developer added
    removedParts?: string[]; // Parts developer removed
    changedLogic?: CodeModification[]; // Logic changes made
    betterApproach?: string;
    alternativeImplementation?: string;
  };

  // Quality Assessments (for learning)
  usefulnessRating?: number; // 1-5: How useful was the suggestion?
  accuracyRating?: number; // 1-5: How accurate was the suggestion?
  relevanceRating?: number; // 1-5: How relevant to the current task?
  confidenceAlignment?: number; // 1-5: Did confidence match actual quality?

  // Learning Context
  usefulAspects?: string[]; // What parts were good to preserve?
  problematicAspects?: string[]; // What parts need fixing?
  improvementRecommendations?: string[]; // How to improve future suggestions

  // Categorization for Analytics
  tags?: string[]; // Custom categorization (e.g., "security", "react-pattern")
  suggestedCategory?: SuggestionType; // Developer's suggested category

  // Audit Trail
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>; // Extensible for future analytics
}

/**
 * AgentExecutionResult - Result of agent execution within autonomous networks
 * Tracks performance, reasoning, and outcomes of agent interactions
 */
export interface AgentExecutionResult {
  executionId: string;
  agentId: string;
  status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  confidence: ConfidenceScore;
  actionsPerformed: Array<{
    type: string;
    description: string;
    timestamp: Date;
    success: boolean;
  }>;
  metrics: {
    duration: number; // milliseconds
    tokens: number;
    cost: number;
    memoryUsage: number;
  };
  reasoning: {
    strategy: string;
    considerations: string[];
    decisionFactors: Record<string, any>;
  };
  artifacts: {
    generatedCode?: string;
    suggestions?: CodeSuggestion[];
    logs: string[];
    metadata: Record<string, any>;
  };
  evaluation: {
    qualityScore: number;
    efficiencyScore: number;
    safetyScore: number;
    recommendations: string[];
  };
  timestamp: Date;
  context: AgentExecutionContext;
}

interface AgentExecutionContext {
  sessionId: string;
  projectId: string;
  trigger: string;
  environment: Record<string, any>;
}

/**
 * ProjectKnowledge - Persistent project intelligence store
 * Implements VECTOR knowledge base with learning from team interactions
 * Core of PRISM project intelligence system
 */
export interface ProjectKnowledge {
  // Identity & Metadata
  id: string; // Derived from git remote or path hash
  projectPath: string;
  schemaVersion: string; // For migration support
  lastUpdated: Date;
  createdAt: Date;

  // Codebase Understanding (PRISM core)
  codebase: {
    indexedAt: Date;
    languages: LanguageProfile[];
    files: FileIndex[];
    statistics: {
      totalLines: number;
      fileCount: number;
      languageBreakdown: Record<string, number>; // Lines per language
      avgFileSize: number;
      largestFiles: Array<{ path: string; size: number }>;
    };
    dependencies: DependencyGraph;
    architecture: {
      pattern: string; // MVC, layered, event-driven, etc.
      directories: DirectoryStructure[];
      relationships: CodeRelationship[];
      antiPatterns: AntiPattern[]; // Problems identified
      strengths: ArchitectureStrength[]; // Architectural advantages
    };
    patterns: CodePattern[]; // Common patterns identified
  };

  // Team Intelligence & Learning
  team: {
    preferences: {
      codingStyle: CodingStylePreferences;
      namingConventions: NamingConvention[];
      testing: TestingPreferences;
      architecture: ArchitecturePreferences;
      documentation: DocumentationPreferences;
    };
    conventions: {
      commitMessageFormat: string;
      branchNaming: string;
      codeReviewProcess: CodeReviewProcess;
      deploymentProcess: DeploymentProcess;
    };
    learning: {
      acceptedSuggestions: LearningPattern[]; // What team accepts
      rejectedSuggestions: LearningPattern[]; // What team rejects
      adaptationHistory: AdaptationEntry[]; // How system has adapted
      effectivenessMetrics: EffectivenessMetrics;
    };
    members: TeamMember[]; // Team member profiles (learning)
  };

  // System Performance & Health
  performance: {
    analysisMetrics: {
      averageAnalysisTime: number;
      totalAnalyses: number;
      cacheHitRate: number;
      errorRate: number;
    };
    suggestionMetrics: {
      totalSuggestions: number;
      acceptanceRate: number;
      averageAcceptanceRate: number; // By type/severity
      rejectionRate: number;
      modificationRate: number; // How often developers modify suggestions
    };
    safetyMetrics: {
      validationFailures: number;
      emergencyModeTriggers: number;
      rollbackCount: number;
      complianceViolations: number;
    };
  };

  // Configuration & Governance
  governance: {
    qualityGates: QualityGate[];
    securityPolicies: SecurityPolicy[];
    complianceRequirements: ComplianceRequirement[];
    accessControl: AccessPolicy[];
    auditSettings: AuditSettings;
  };

  // Extension Mechanisms
  extensions: {
    [key: string]: any; // For plugins, custom analyses, etc.
  };
}

/**
 * AnalysisSession - Complete lifecycle tracking of analysis operations
 * Foundation for session state management and performance monitoring
 * Enables debugging, optimization, and learning across analysis runs
 */
export interface AnalysisSession {
  // Identity & Timing
  id: string;
  projectId: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // Calculated from startedAt to completedAt

  // Trigger & Context
  trigger: AnalysisTrigger;
  triggerData: {
    source: 'manual' | 'pre-commit' | 'pre-push' | 'daemon' | 'scheduled';
    userId?: string; // For manual triggers
    diffContent?: string;
    fileContext?: {
      path: string;
      contentType: 'diff' | 'full-file' | 'directory';
      size: number; // KB
    };
    projectContext?: {
      scope: 'file' | 'directory' | 'project';
      paths: string[];
      excludePatterns: string[];
    };
  };

  // Processing Results
  results: {
    suggestions: SuggestionResult[];
    statistics: {
      totalSuggestions: number;
      byType: Record<SuggestionType, number>;
      bySeverity: Record<SuggestionSeverity, number>;
      highConfidence: number; // Confidence > 0.8
      autoApplied: number; // Applied without human review
      generatedTests: number; // Test files generated
      breakingChanges: number; // Suggestions with breaking changes
    };
    conflicts: SuggestionConflict[];
    orchestrationMetrics: OrchestrationMetrics;
  };

  // Performance Tracking
  performance: {
    totalProcessingTime: number;
    agentExecutionTimes: Record<string, number>; // Time per agent
    vectorSearchTimes: number[];
    aiApiCalls: {
      total: number;
      byProvider: Record<string, number>;
      totalTokens: number;
      averageResponseTime: number;
    };
    cacheMetrics: {
      hitRate: number;
      totalQueries: number;
      cacheSize: number; // Items in cache
    };
  };

  // Quality & Reliability
  quality: {
    validationPassRate: number;
    confidenceAccuracy?: number; // Correlation with actual acceptance
    errorCount: number;
    errorTypes: Record<string, number>;
    recoveryActions: RecoveryAction[];
  };

  // Learning & Evolution
  learning: {
    patternsDiscovered: CodePattern[]; // New patterns learned
    feedbackCollected: number;
    adaptationsTriggered: AdaptationEntry[];
    confidenceAdjustments: ConfidenceAdjustment[];
  };

  // State & Relationships
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  parentSession?: string; // For incremental analysis
  childSessions: string[]; // Sessions spawned from this one
  daemonUpdates?: BackgroundAnalysis[]; // Background analysis that contributed

  // Audit & Compliance
  audit: {
    environment: Record<string, string>; // System environment info
    versions: {
      cli: string;
      agents: Record<string, string>;
      schemaVersion: string;
    };
  };
}

/**
 * Support Types - Define supporting data structures
 */

export interface CodeChunk {
  id: string;
  content: string;
  source: {
    filePath: string;
    lineStart: number;
    lineEnd: number;
  };
  type: 'function' | 'class' | 'interface' | 'comment' | 'documentation' | 'config';
  context: string; // Surrounding code for context
  relevanceScore?: number;
  lastUsed?: Date;
  usageCount?: number;
}

export interface PatternMatch {
  patternId: string;
  pattern: CodePattern;
  confidence: number;
  locations: Location[];
  context: string;
  metadata?: Record<string, any>;
}

export interface Location {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  columnStart?: number;
  columnEnd?: number;
}

export interface CodePattern {
  id: string;
  name: string;
  description: string;
  category: 'architecture' | 'security' | 'performance' | 'maintainability' | 'testing';
  type: 'positive' | 'negative'; // Good pattern vs. anti-pattern
  examples: CodeExample[];
  detectionRules: DetetectionRule[];
  relatedPatterns: string[]; // Pattern IDs
  learning: {
    acceptanceRate: number; // Historical acceptance rate
    contexts: string[]; // Where this pattern is commonly found
    confidence: number; // How confident we are in this pattern
  };
}

export interface DetetectionRule {
  type: 'ast' | 'regex' | 'semantic';
  pattern: string | Record<string, any>;
  conditions: string[];
  exceptions: string[];
}

export interface BreakingChange {
  type: 'api' | 'data' | 'behavior' | 'performance' | 'compatibility';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'breaking';
  affected: string[]; // API methods, data structures, etc.
  migrationGuide?: string;
  riskAssessment: string;
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0.0 to 1.0
  message: string;
  details: string[];
  suggestions?: string[];
  remediationSteps?: string[];
  metadata: Record<string, any>;
}

export interface ImpactAnalysis {
  scope: 'file' | 'module' | 'project';
  changes: {
    added: number;
    modified: number;
    removed: number;
    dependencies: DependencyChange[];
  };
  risk: {
    breaking: boolean;
    security: boolean;
    performance: {
      direction: 'neutral' | 'positive' | 'negative';
      magnitude: number;
    };
    maintenance: {
      direction: 'neutral' | 'positive' | 'negative';
      magnitude: number;
    };
  };
  suggestions: string[];
}

// Additional supporting types would go here...

// Placeholder imports for types that would be implemented in later phases
interface AntiPattern { pattern: string; severity: SuggestionSeverity; description: string; }
interface ArchitectureStrength { aspect: string; strength: string; description: string; }
interface CodingStylePreferences { indentation: string; semicolons: boolean; quotes: string; }
interface CodingConvention { type: string; rule: string; examples: string[]; }
interface TestingPreferences { framework: string; coverage: number; style: string; }
interface ArchitecturePreferences { patterns: string[]; constraints: string[]; }
interface DocumentationPreferences { style: string; required: string[]; format: string; }
interface NamingConvention { type: string; pattern: string; examples: string[]; }
interface CodeReviewProcess { steps: string[]; tools: string[]; }
interface DeploymentProcess { stages: string[]; requirements: string[]; }
interface LearningPattern { pattern: string; confidence: number; examples: string[]; }
interface AdaptationEntry { date: Date; trigger: string; change: string; result: string; }
interface EffectivenessMetrics { acceptance: number; accuracy: number; efficiency: number; }
interface TeamMember { id: string; preferences: Record<string, any>; learning: LearningFeedback[]; }
interface FileIndex { path: string; hash: string; size: number; language: string; lastModified: Date; }
interface DirectoryStructure { path: string; type: string; contents: string[]; }
interface CodeRelationship { from: string; to: string; type: string; strength: number; }
interface LanguageProfile { name: string; files: number; lines: number; extensions: string[]; }
interface DependencyGraph { root: DependencyNode; }
interface DependencyNode { name: string; version: string; dependencies: DependencyNode[]; }
interface SuggestionResult { suggestionId: string; status: SuggestionStatus; confidence: number; }
interface SuggestionConflict { suggestions: string[]; reason: string; resolution?: string; }
interface OrchestrationMetrics { totalTime: number; agentCooperation: number; conflictsResolved: number; }
interface RecoveryAction { action: string; success: boolean; timestamp: Date; }
interface ConfidenceAdjustment { suggestionId: string; oldConfidence: number; newConfidence: number; reason: string; }
interface EffectivenessMetrics { acceptance: number; accuracy: number; efficiency: number; }
interface QualityGate { name: string; type: string; threshold: number; action: string; }
interface SecurityPolicy { name: string; rules: string[]; enforcement: string; }
interface ComplianceRequirement { standard: string; requirements: string[]; auditFrequency: string; }
interface AccessPolicy { resource: string; principal: string; action: string[]; conditions: any[]; }
interface AuditSettings { enabled: boolean; retention: number; level: string; reports: string[]; }
interface AnalysisTrigger { type: string; source: string; timestamp: Date; metadata: Record<string, any>; }
interface BackgroundAnalysis { sessionId: string; triggeredAt: Date; contribution: string; }
interface CodeModification { type: string; description: string; lines: number[] }
interface TestFile { name: string; content: string; type: 'unit' | 'integration' | 'e2e'; coverage: number; }
interface DependencyChange { name: string; oldVersion?: string; newVersion?: string; impact: string; }
interface CompatibilityAssessment { compatible: boolean; issues: string[]; severity: SuggestionSeverity; fix: string; }
interface CodeExample { file: string; lines: number[]; description: string; }

/**
 * CodeEntity - Represents code constructs identified by PRISM analysis
 */
export interface CodeEntity {
  id: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'method' | 'property';
  name: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  signature?: string;
  dependencies: string[];
  complexity?: number;
  metadata: Record<string, any>;
}

/**
 * ArchitecturePattern - Represents architectural patterns identified in codebases
 */
export interface ArchitecturePattern {
  id: string;
  name: string;
  type: 'structural' | 'behavioral' | 'creational';
  description: string;
  components: string[];
  relationships: string[];
  benefits: string[];
  drawbacks: string[];
  whenToUse: string[];
  examples: string[];
}

// ============================================================================
// PHASE 4: ENTERPRISE KNOWLEDGE GRAPH DATA MODELS
// Extends Phase 3 with organization-wide intelligence and cross-repository capabilities
// ============================================================================

/**
 * RepositoryNode - Core entity for the Enterprise Knowledge Graph (EKG)
 * Represents a single repository in the organization-wide dependency mesh
 * Evolves from Phase 3 single repository focus to multi-repository federation
 */
export interface RepositoryNode {
  // Core identification
  id: string;                                // Unique repository identifier (UUID)
  organizationId: string;                  // Parent organization
  platform: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'other';
  name: string;                            // Repository name
  fullName: string;                        // Organization/Repo format
  url: string;                             // Repository URL

  // Repository metadata
  metadata: {
    language: string;                      // Primary language
    languages: Record<string, number>;     // Language distribution (%)
    size: number;                          // Repository size (KB)
    stars: number;                         // GitHub/GitLab stars
    forks: number;                         // Fork count
    watchers: number;                      // Watchers
    isPrivate: boolean;                    // Visibility status
    isArchived: boolean;                   // Archive status
    isTemplate: boolean;                   // Template repository
    license: string;                       // SPDX license identifier
    topics: string[];                      // Repository topics/tags
  };

  // Temporal data
  temporalData: {
    createdAt: ISODateString;
    updatedAt: ISODateString;
    pushedAt: ISODateString;
    analyzedAt: ISODateString;
    lastActivityAt: ISODateString;
  };

  // Relationship mappings
  relationships: {
    parentOrganization: string;             // Organization reference
    teamOwnership: string[];               // Team IDs with access
    technicalDebt: TechnicalDebtMetrics;
    securityPosture: SecurityPostureMetrics;
    activityMetrics: ActivityMetrics;
  };

  // Embeddings for semantic search
  embeddings: {
    descriptionEmbedding: number[];        // Repository description vector
    codeEmbedding: number[];              // Representative code fragments
    patternEmbedding: number[];            // Architectural patterns
  };
}

/**
 * DependencyEdge - Represents dependencies between repositories and components in EKG
 * Models complex cross-repository relationships including code dependencies, data flow, and service communication
 * Supports semantic versioning, security analysis, and migration assessment
 */
export interface DependencyEdge {
  // Edge identification
  id: string;                              // Unique edge identifier
  sourceId: string;                       // Source repository ID
  targetId: string;                       // Target repository/component
  edgeType: DependencyEdgeType;

  // Edge properties
  properties: {
    // Temporal validity
    startDate: ISODateString;              // When dependency was introduced
    endDate?: ISODateString;               // When dependency was removed
    lastConfirmed: ISODateString;          // Last verification date

    // Dependency details
    dependencyType: 'runtime' | 'development' | 'peer' | 'optional';
    versionConstraint: string;             // Semantic version constraint
    currentVersion: string;                // Currently used version
    latestVersion: string;                 // Latest available version

    // Usage metrics
    usageFrequency: number;                // How often referenced
    transitiveDepth: number;               // Depths through dependency tree
    confidence: number;                    // Confidence in dependency detection
  };

  // Analysis results
  analysis: {
    security: {
      vulnerabilities: VulnerabilityAssessment[];
      licenseCompatibility: LicenseCompatibilityCheck;
      supplyChainRisk: number;              // 0-100 risk score
    };

    reliability: {
      maintenanceScore: number;             // Package maintenance score
      popularityScore: number;              // npm/pypi download metrics
      communitySupport: boolean;            // Active community indicator
    };

    alternatives: {
      suggestedAlternatives: AlternativePackage[];
      migrationDifficulty: number;          // 1-10 migration complexity
      benefitAnalysis: BenefitAssessment;
    };
  };
}

/**
 * KnowledgePatternNode - Representation of architectural and design patterns in EKG
 * Captures patterns identified across the organization with quality assessments and learning data
 * Supports expert discovery and organizational standards enforcement
 */
export interface KnowledgePatternNode {
  id: string;                              // Unique pattern identifier
  repositoryId: string;                   // Source repository

  // Pattern metadata
  metadata: {
    patternType: PatternCategoryType;     // Classification
    name: string;                         // Pattern name (e.g., "Factory Pattern")
    category: string;                     // High-level category (e.g., "Creational")
    complexity: 'low' | 'medium' | 'high';
    confidence: number;                   // Detection confidence (0-1)

    discoveredAt: ISODateString;
    lastObservedAt: ISODateString;
    observationCount: number;             // How many times seen
  };

  // Pattern content
  content: {
    description: string;                  // Pattern description
    stakeholders: string[];               // Who should care about this pattern

    // Structural elements
    participants: PatternParticipant[];    // Classes/interfaces involved
    relationships: PatternRelationship[];  // How participants relate

    // Evidence and examples
    codeExamples: CodeExample[];          // Concrete implementations
    locations: PatternLocation[];         // Where pattern appears

    // Quality assessment
    qualityMetrics: {
      cohesion: number;                   // Internal relatedness
      coupling: number;                   // External dependencies
      maintainability: number;            // Ease of maintenance
      testability: number;                // Ease of testing
    };
  };

  // Learning data
  learningData: {
    effectiveness: EffectivenessMetricsEKG[];
    feedback: PatternFeedback[];
    improvements: SuggestedImprovements[];
  };
}

// ============================================================================
// PREDICTIVE INTELLIGENCE DATA MODELS
// Enterprise forecasting and anomaly detection for autonomous decision making
// ============================================================================

/**
 * TechnicalDebtForecast - AI-powered prediction of future technical debt hotspots
 * Uses time-series analysis and machine learning to forecast maintenance challenges
 * Provides actionable recommendations for proactive debt management
 */
export interface TechnicalDebtForecast {
  // Forecast identification
  id: string;                             // Unique forecast identifier
  repositoryId: string;                  // Target repository
  forecastType: 'overall' | 'file' | 'component';

  // Forecast temporal scope
  metadata: {
    forecastDate: ISODateString;         // When forecast was generated
    dataRange: TimeRange;                // What data was analyzed
    confidenceInterval: number;          // Statistical confidence (0-1)

    modelVersion: string;                // ML model version used
    algorithm: string;                   // Forecasting algorithm
    featureImportance: Record<string, number>; // Which factors mattered most
  };

  // Current state assessment
  currentState: {
    debtScore: number;                   // Current technical debt (0-100)
    maintenanceVelocity: number;         // Daily maintenance effort (hours)
    codeQualityTrend: number;            // Trend direction (-1 to 1)

    riskAreas: TechDebtRiskArea[];       // Specific problem areas
    codeSmells: CodeSmell[];             // Identified maintainability issues
    complexityHotspots: ComplexityHotspot[]; // High-complexity areas
  };

  // Forecast projections
  projections: {
    shortTerm: DebtProjection;           // Next 3 months
    mediumTerm: DebtProjection;          // Next 12 months
    longTerm: DebtProjection;            // Next 24 months
  };

  // Recommended actions
  recommendations: {
    immediateActions: ActionItem[];      // Do now (< 1 week)
    scheduledActions: ActionItem[];      // Plan for (< 1 month)
    strategicActions: ActionItem[];      // Long-term investment
  };
}

/**
 * PerformanceAnomaly - Representation of performance regressions and anomalies
 * Combines monitoring data with code analysis to identify and explain performance issues
 * Supports automated remediation and root cause analysis
 */
export interface PerformanceAnomaly {
  id: string;                             // Unique anomaly identifier
  repositoryId: string;                  // Affected repository

  // Anomaly metadata
  metadata: {
    detectedAt: ISODateString;           // When anomaly was detected
    lastUpdated: ISODateString;          // Last analysis update

    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;                  // Detection confidence (0-1)
    modelVersion: string;                // ML model version
  };

  // Anomaly characteristics
  characteristics: {
    anomalyType: AnomalyType;
    affectedComponents: string[];         // Components experiencing issues
    performanceMetrics: PerformanceMetric[];

    // Historical context
    baselinePerformance: BaselineMetrics;
    regressionStart: ISODateString;       // When regression began
    correlationFactors: CorrelationFactor[]; // Contributing factors
  };

  // Impact assessment
  impact: {
    userImpact: number;                  // Impact on end users (0-100)
    businessImpact: number;              // Business impact ($) estimated
    technicalDebtImpact: number;         // Technical debt contribution

    affectedWorkflows: WorkflowImpact[];
    downstreamEffects: DownstreamEffect[];
  };

  // Root cause analysis
  rootCause: {
    primaryCause: RootCause;
    contributingFactors: ContributingFactor[];
    evidence: EvidenceItem[];
    confidence: number;                  // Root cause confidence (0-1)
  };

  // Remediation recommendations
  remediation: {
    immediateActions: ActionItem[];      // Immediate fixes (<1 day)
    scheduledActions: ActionItem[];      // Planned fixes (<1 week)
    preventiveActions: ActionItem[];     // Long-term prevention

    // Automated fixes available
    automatedFixes: AutomatedFix[];      // Can be applied automatically
    scriptedFixes: ScriptedFix[];        // Require approval but automatable
    manualFixes: ManualFix[];           // Require developer intervention
  };
}

// ============================================================================
// CROSS-REPOSITORY ANALYSIS DATA MODELS
// Organization-wide standards and compliance tracking
// ============================================================================

/**
 * OrganizationStandards - Centralized repository for organizational coding standards
 * Tracks patterns, conventions, and quality requirements across the entire organization
 * Dynamically learns and enforces best practices from successful projects
 */
export interface OrganizationStandards {
  id: string;                            // Unique standards document ID
  organizationId: string;               // Organization identifier

  // Standards metadata
  metadata: {
    version: string;                    // Standards version
    createdAt: ISODateString;           // Creation date
    updatedAt: ISODateString;           // Last update
    author: string;                     // Standards owner
    reviewCycle: string;                // "quarterly", "biannual"
    approvalDate?: ISODateString;       // When standards were approved
  };

  // Quality standards
  quality: {
    codeQuality: {
      minMaintainabilityScore: number;   // Minimum acceptable maintainability
      maxComplexityScore: number;        // Maximum acceptable complexity
      minTestCoverage: number;           // Minimum test coverage required
      styleGuide: CodingStyleStandard[]; // Style rules to enforce
    };

    securityStandards: {
      OWASPTop10: OWASPRule[];          // OWASP Top 10 compliance rules
      encryption: EncryptionStandard[];  // Encryption requirements
      authRequirements: AuthStandard[]; // Authentication standards
    };

    performanceStandards: {
      responseTimeLimits: ResponseTimeLimit[]; // API response time limits
      throughputRequirements: ThroughputRequirement[]; // Minimum throughput
      resourceLimits: ResourceLimit[];   // Memory/CPU usage limits
    };
  };

  // Architectural patterns
  patterns: {
    recommended: ArchitecturalPattern[]; // Patterns to prefer
    deprecated: ArchitecturalPattern[];  // Patterns to avoid
    organizationSpecific: CustomPattern[]; // Organization-specific patterns
    domainPatterns: DomainPattern[];     // Industry/domain specific patterns
  };

  // Technology standards
  technology: {
    approvedTechnologies: TechnologyStandard[];
    deprecatedTechnologies: TechnologyStandard[];
    versionPolicies: VersionPolicy[];
    migrationRoadmaps: MigrationRoadmap[];
  };

  // Compliance tracking
  compliance: {
    regulatory: RegulatoryRequirement[];
    industry: IndustryStandard[];
    auditHistory: ComplianceAudit[];
    exceptionProcess: ExceptionRequestProcess;
  };

  // Learning and evolution
  evolution: {
    patternAdoption: PatternAdoptionHistory[];
    standardsEvolution: StandardsEvolution[];
    feedbackIntegration: FeedbackLoop[];
    continuousImprovement: ImprovementInitiative[];
  };
}

// ============================================================================
// SUPPORTING TYPES FOR PHASE 4 DATA MODELS
// ============================================================================

// Type definitions for supporting interfaces (minimal implementation for Phase 4A)
type ISODateString = string;
type TimeRange = { start: ISODateString; end: ISODateString; };

interface TechnicalDebtMetrics {
  score: number;
  trends: number[];
  hotspots: string[];
}

interface SecurityPostureMetrics {
  vulnerabilityCount: number;
  riskScore: number;
  complianceScore: number;
}

interface ActivityMetrics {
  commitsLastWeek: number;
  activeContributors: number;
  deploymentFrequency: string;
}

type DependencyEdgeType =
  | 'depends_on'
  | 'dev_depends_on'
  | 'build_depends_on'
  | 'runtime_calls'
  | 'data_exchange'
  | 'shared_library'
  | 'microservice_communication';

export { DependencyEdgeType };

interface VulnerabilityAssessment {
  id: string;
  severity: string;
  description: string;
  cvssScore: number;
  affectedVersions: string[];
  fixedVersion: string;
}

interface LicenseCompatibilityCheck {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
}

interface AlternativePackage {
  name: string;
  version: string;
  benefits: string[];
  drawbacks: string[];
  migrationComplexity: number;
}

interface BenefitAssessment {
  maintenanceCost: number;
  performanceGain: number;
  securityImprovement: number;
  totalBenefit: number;
}

type PatternCategoryType = 'architectural' | 'design' | 'idiomatic' | 'anti_pattern' | 'custom';

interface PatternParticipant {
  name: string;
  role: string;
  description: string;
  codeReference: string;
}

interface PatternRelationship {
  from: string;
  to: string;
  type: string;
  description: string;
}

interface PatternLocation {
  repositoryId: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

interface EffectivenessMetricsEKG {
  acceptanceRate: number;
  qualityImprovement: number;
  maintainabilityGain: number;
}

interface PatternFeedback {
  developerId: string;
  rating: number;
  comments: string;
  suggestedImprovements: string[];
}

interface SuggestedImprovements {
  type: string;
  description: string;
  implementation: string;
  benefit: number;
}

// Predictive Intelligence supporting types
interface DebtProjection {
  projectionDate: ISODateString;
  predictedDebt: number;
  confidenceUpper: number;
  confidenceLower: number;
  criticalThreshold: number;
  contributingFactors: Record<string, number>;
  mitigationsApplied: string[];
}

interface ActionItem {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  effort: number;
  impact: number;
  dependencies: string[];
  timeline: string;
  owner: string;
}

interface TechDebtRiskArea {
  area: string;
  riskScore: number;
  description: string;
  affectedFiles: string[];
}

interface CodeSmell {
  type: string;
  severity: number;
  location: string;
  description: string;
  fix: string;
}

interface ComplexityHotspot {
  file: string;
  complexity: number;
  risk: string;
  recommendations: string[];
}

type AnomalyType =
  | 'response_time_degradation'
  | 'memory_usage_increase'
  | 'cpu_usage_spike'
  | 'error_rate_elevation'
  | 'throughput_decline'
  | 'resource_leak'
  | 'garbage_collection_issues'
  | 'database_connection_issues';

interface PerformanceMetric {
  metric: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  trend: 'improving' | 'degrading' | 'stable';
  unit: string;
}

interface BaselineMetrics {
  averageResponseTime: number;
  p95ResponseTime: number;
  throughput: number;
  errorRate: number;
}

interface CorrelationFactor {
  factor: string;
  correlationCoefficient: number;
  direction: 'positive' | 'negative';
  significance: number;
}

interface WorkflowImpact {
  workflow: string;
  impact: number;
  affected: string[];
}

interface DownstreamEffect {
  component: string;
  severity: number;
  mitigation: string;
}

interface RootCause {
  type: string;
  component: string;
  change: string;
  commit: string;
  timestamp: string;
}

interface ContributingFactor {
  factor: string;
  weight: number;
  evidence: string;
}

interface EvidenceItem {
  type: string;
  location: string;
  content: string;
  confidence: number;
}

interface AutomatedFix {
  id: string;
  title: string;
  effort: 'low' | 'medium' | 'high';
  patch: string;
  validation: string;
}

interface ScriptedFix {
  id: string;
  title: string;
  script: string;
  rollbackScript: string;
  estimatedTime: number;
}

interface ManualFix {
  id: string;
  title: string;
  description: string;
  steps: string[];
  estimateTime: number;
}

// Organization Standards supporting types
interface CodingStyleStandard {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  language: string;
  examples: {
    correct: string;
    incorrect: string;
  };
}

interface OWASPRule {
  ruleId: string;
  severity: string;
  description: string;
  requirements: string[];
  automation: string;
}

interface EncryptionStandard {
  type: 'at-rest' | 'in-transit' | 'data-transmission';
  algorithm: string;
  keyLength: string;
  requirements: string[];
}

interface AuthStandard {
  type: 'authentication' | 'authorization' | 'session-management';
  requirements: string[];
  implementation: string;
  testing: string;
}

interface ResponseTimeLimit {
  endpoint: string;
  p50: number;  // milliseconds
  p95: number;  // milliseconds
  p99: number;  // milliseconds
}

interface ThroughputRequirement {
  operation: string;
  transactionsPerSecond: number;
  concurrency: number;
}

interface ResourceLimit {
  resource: 'memory' | 'cpu' | 'disk' | 'network';
  limit: number;
  unit: string;
  action: 'log' | 'throttle' | 'restart';
}

interface ArchitecturalPattern {
  name: string;
  category: string;
  description: string;
  whenToUse: string[];
  whenNotToUse: string[];
  examples: string[];
}

interface CustomPattern {
  name: string;
  originatingRepository: string;
  description: string;
  context: string;
  successMetrics: Record<string, number>;
}

interface DomainPattern {
  name: string;
  industry: string;
  description: string;
  applicability: string[];
  adoptionRate: number;
}

interface TechnologyStandard {
  name: string;
  category: string;
  status: 'approved' | 'deprecated' | 'under-review';
  rationale: string;
  alternatives: string[];
}

interface VersionPolicy {
  technology: string;
  policy: 'latest' | 'LTS' | 'specific' | 'maximum-age';
  specificVersion?: string;
  maxAgeDays?: number;
}

interface MigrationRoadmap {
  from: string;
  to: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedEffort: number;
  businessCase: string;
  migrationGuide: string;
}

interface RegulatoryRequirement {
  regulation: string;
  requirements: string[];
  auditFrequency: string;
  lastAudit?: ISODateString;
  compliance: number;
}

interface IndustryStandard {
  standard: string;
  body: string;
  requirements: string[];
  certification?: string;
}

interface ComplianceAudit {
  date: ISODateString;
  auditor: string;
  result: 'pass' | 'conditional' | 'fail';
  findings: string[];
  remediationPlan: string[];
  nextAudit: ISODateString;
}

interface ExceptionRequestProcess {
  process: string;
  approvers: string[];
  criteria: string[];
  reviewTimeline: string;
  archiveRequirement: boolean;
}

interface PatternAdoptionHistory {
  pattern: string;
  repository: string;
  adoptedAt: ISODateString;
  outcome: 'success' | 'partial' | 'failure';
  lessons: string[];
}

interface StandardsEvolution {
  version: string;
  changes: string[];
  rationale: string;
  impact: string;
}

interface FeedbackLoop {
  source: string;
  type: string;
  incorporatedAt: ISODateString;
  impact: string;
}

interface ImprovementInitiative {
  title: string;
  objective: string;
  owner: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  timeline: string;
  successMetrics: string[];
}

// cli-tool/src/types/entities.js
// Phase 3 & 4 entity definitions for codeflow-hook CLI
// Comprehensive data structures for knowledge store and enterprise graph

// =====================================================================================
// PHASE 3: PROJECT KNOWLEDGE STORE ENTITIES
// =====================================================================================

/**
 * CodeSuggestion - Core entity representing AI-generated improvement suggestions
 * Foundation for local VECTOR knowledge store and agent interactions
 */
export class CodeSuggestion {
  constructor(data = {}) {
    this.id = data.id || `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionId = data.sessionId || '';
    this.type = data.type || 'refactor';
    this.severity = data.severity || 'medium';
    this.title = data.title || '';
    this.description = data.description || '';
    this.patch = data.patch || { content: '', targetFiles: [], affectedRanges: [], dependencies: {}, breakingChanges: [], rollbackPlan: [] };
    this.context = data.context || { retrievedChunks: [], relevantPatterns: [], projectContext: {}, generationPrompt: '' };
    this.generation = data.generation || { model: 'gemini', provider: 'google', confidence: { value: 0.5 }, timestamp: new Date(), agentId: '', agentVersion: '', tokensUsed: {}, processingTimeMs: 0 };
    this.validation = data.validation || { syntaxCheck: { passed: true }, logicValidation: { passed: true }, testGeneration: { unitTests: [], integrationTests: [], coverage: 0, edgeCases: [] } };
    this.status = data.status || 'pending';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.relationships = data.relationships || { parentSuggestion: null, relatedSuggestions: [], dependentSuggestions: [], conflictSuggestions: [], similarHistorical: [] };
    this.metadata = data.metadata || {};
    this.extensions = data.extensions || {};
  }
}

/**
 * DeveloperFeedback - Learning data captured from developer interactions
 * Critical for continuous learning loops and personalization
 */
export class DeveloperFeedback {
  constructor(data = {}) {
    this.id = data.id || `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.suggestionId = data.suggestionId || '';
    this.sessionId = data.sessionId || '';
    this.developerId = data.developerId || 'anonymous';
    this.action = data.action || 'accepted';
    this.accepted = data.accepted !== undefined ? data.accepted : false;
    this.modified = data.modified || false;
    this.timeToReview = data.timeToReview || 0;
    this.reviewedAt = data.reviewedAt || new Date();
    this.appliedAt = data.appliedAt;
    this.context = data.context || {};
    this.customNotes = data.customNotes;
    this.modifications = data.modifications;
    this.usefulnessRating = data.usefulnessRating;
    this.accuracyRating = data.accuracyRating;
    this.relevanceRating = data.relevanceRating;
    this.confidenceAlignment = data.confidenceAlignment;
    this.tags = data.tags || [];
    this.suggestedCategory = data.suggestedCategory;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.metadata = data.metadata || {};
  }
}

/**
 * ProjectKnowledge - Persistent project intelligence store
 * Implements local knowledge base with learning from team interactions
 */
export class ProjectKnowledge {
  constructor(data = {}) {
    this.id = data.id || `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.projectPath = data.projectPath || '';
    this.schemaVersion = data.schemaVersion || '1.0';
    this.lastUpdated = data.lastUpdated || new Date();
    this.createdAt = data.createdAt || new Date();
    this.codebase = data.codebase || { indexedAt: new Date(), languages: [], files: [], statistics: {}, dependencies: {}, architecture: {}, patterns: [] };
    this.team = data.team || { preferences: {}, conventions: {}, learning: {} };
    this.performance = data.performance || {};
    this.governance = data.governance || {};
    this.extensions = data.extensions || {};
  }
}

/**
 * AnalysisSession - Complete lifecycle tracking of analysis operations
 * Foundation for session state management and performance monitoring
 */
export class AnalysisSession {
  constructor(data = {}) {
    this.id = data.id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.projectId = data.projectId || '';
    this.startedAt = data.startedAt || new Date();
    this.completedAt = data.completedAt;
    this.duration = data.duration;
    this.trigger = data.trigger || {};
    this.triggerData = data.triggerData || {};
    this.results = data.results || {};
    this.performance = data.performance || {};
    this.quality = data.quality || {};
    this.learning = data.learning || {};
    this.status = data.status || 'running';
    this.parentSession = data.parentSession;
    this.childSessions = data.childSessions || [];
    this.daemonUpdates = data.daemonUpdates;
    this.audit = data.audit || {};
  }
}

// =====================================================================================
// PHASE 4: ENTERPRISE KNOWLEDGE GRAPH ENTITIES
// =====================================================================================

/**
 * RepositoryNode - Core entity for the Enterprise Knowledge Graph
 * Represents a single repository in the organization-wide dependency mesh
 */
export class RepositoryNode {
  constructor(data = {}) {
    this.id = data.id || `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.organizationId = data.organizationId || '';
    this.platform = data.platform || 'github';
    this.name = data.name || '';
    this.fullName = data.fullName || '';
    this.url = data.url || '';
    this.metadata = data.metadata || {};
    this.temporalData = data.temporalData || {};
    this.relationships = data.relationships || {};
    this.embeddings = data.embeddings || {};
  }
}

/**
 * DependencyEdge - Represents dependencies between repositories and components
 * Models complex cross-repository relationships including code dependencies, data flow
 */
export class DependencyEdge {
  constructor(data = {}) {
    this.id = data.id || `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sourceId = data.sourceId || '';
    this.targetId = data.targetId || '';
    this.edgeType = data.edgeType || 'depends_on';
    this.properties = data.properties || {};
    this.analysis = data.analysis || {};
  }
}

/**
 * KnowledgePatternNode - Representation of architectural and design patterns
 * Captures patterns identified across the organization with quality assessments
 */
export class KnowledgePatternNode {
  constructor(data = {}) {
    this.id = data.id || `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.repositoryId = data.repositoryId || '';
    this.metadata = data.metadata || {};
    this.content = data.content || {};
    this.learningData = data.learningData || {};
  }
}

/**
 * TechnicalDebtForecast - AI-powered prediction of future technical debt hotspots
 * Uses time-series analysis and machine learning to forecast maintenance challenges
 */
export class TechnicalDebtForecast {
  constructor(data = {}) {
    this.id = data.id || `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.repositoryId = data.repositoryId || '';
    this.forecastType = data.forecastType || 'overall';
    this.metadata = data.metadata || {};
    this.currentState = data.currentState || {};
    this.projections = data.projections || {};
    this.recommendations = data.recommendations || {};
  }
}

/**
 * PerformanceAnomaly - Representation of performance regressions and anomalies
 * Combines monitoring data with code analysis to identify and explain performance issues
 */
export class PerformanceAnomaly {
  constructor(data = {}) {
    this.id = data.id || `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.repositoryId = data.repositoryId || '';
    this.metadata = data.metadata || {};
    this.characteristics = data.characteristics || {};
    this.impact = data.impact || {};
    this.rootCause = data.rootCause || {};
    this.remediation = data.remediation || {};
  }
}

// =====================================================================================
// UTILITY CLASSES AND ENUMS
// =====================================================================================

/**
 * Supported suggestion types
 */
export const SuggestionType = {
  REFACTOR: 'refactor',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  MAINTAINABILITY: 'maintainability',
  TESTING: 'testing',
  DOCUMENTATION: 'documentation'
};

/**
 * Supported severity levels
 */
export const SuggestionSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Supported suggestion statuses
 */
export const SuggestionStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  APPLIED: 'applied',
  REJECTED: 'rejected'
};

/**
 * Supported feedback actions
 */
export const FeedbackAction = {
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  MODIFIED: 'modified',
  IGNORED: 'ignored'
};

/**
 * Supported dependency edge types
 */
export const DependencyEdgeType = {
  DEPENDS_ON: 'depends_on',
  DEV_DEPENDS_ON: 'dev_depends_on',
  BUILD_DEPENDS_ON: 'build_depends_on',
  RUNTIME_CALLS: 'runtime_calls',
  DATA_EXCHANGE: 'data_exchange',
  SHARED_LIBRARY: 'shared_library',
  MICROSERVICE_COMMUNICATION: 'microservice_communication'
};

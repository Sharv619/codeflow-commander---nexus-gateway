import { CodeSuggestion, DeveloperFeedback, CodeEntity, ArchitecturePattern } from './entities';
import { ConfidenceScore, ValidationResult } from './core';

export interface AgentContext {
  sessionId: string;
  projectPath: string;
  developerId: string;
  trigger: 'manual' | 'pre-commit' | 'continuous' | 'background';
  contextFiles: string[];
  recentChanges?: string[];
  developmentGoals?: string[];
}

export interface GenerationRequest {
  target: {
    filePath?: string;
    entityName?: string;
    entityType?: string;
    context?: string;
  };
  requirements: {
    description: string;
    constraints?: string[];
    examples?: string[];
    qualityCriteria?: string[];
  };
  context?: {
    relatedEntities?: CodeEntity[];
    architecturalPatterns?: ArchitecturePattern[];
    projectContext?: Record<string, any>;
  };
}

export interface GenerationResult {
  suggestion: CodeSuggestion;
  confidence: ConfidenceScore;
  validation: ValidationResult;
  metadata: {
    agentId: string;
    agentVersion: string;
    generationTime: number;
    tokensUsed: number;
    processingSteps: string[];
  };
  alternatives?: CodeSuggestion[];
}

export interface AgentCapabilities {
  id: string;
  name: string;
  version: string;
  specialization: string[];
  supportsGeneration: boolean;
  supportedFileTypes: string[];
  supportedEntities: string[];
  requiredPermissions: string[];
  learningCapabilities: string[];
}

export interface GenerationStrategy {
  name: string;
  priority: number;
  condition: (request: GenerationRequest, context: AgentContext) => boolean;
  execute: (request: GenerationRequest, context: AgentContext) => Promise<GenerationResult>;
  confidenceFactors: {
    contextualRelevance: number;
    domainExpertise: number;
    pastPerformance: number;
    complexityMatch: number;
  };
}

export interface LearningData {
  timestamp: Date;
  suggestionId: string;
  entityType: string;
  contextHash: string;
  accepted: boolean;
  rating?: number;
  feedbackComments?: string[];
  performanceMetrics: {
    confidence: number;
    accuracy: number;
    usefulness: number;
  };
}

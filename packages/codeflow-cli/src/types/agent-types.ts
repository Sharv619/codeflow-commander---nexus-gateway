import { ConfidenceScore } from '../types/core';
import { AgentAction, AgentOutput, ValidationResult } from '../agents/AutonomousAgentNetwork';

// ================ SUPPORTING TYPE DEFINITIONS ================

// Type definitions for agent workflow execution
export interface TicketAnalysis {
  id: string;
  title: string;
  requirements: string[];
  acceptanceCriteria: string[];
  technicalDetails: {
    technologies: string[];
    complexity: number;
    estimatedEffort: string;
  };
  relatedTickets: string[];
  stakeholders: string[];
}

export interface RepositoryIntelligence {
  existingPatterns: string[];
  securityRequirements: string[];
  architecturalConstraints: string[];
  similarImplementations: string[];
  qualityStandards: string[];
}

export interface Solution {
  architecture: {
    components: string[];
    patterns: string[];
    technologies: string[];
  };
  implementation: {
    files: string[];
    endpoints: string[];
    tests: string[];
  };
  confidence: ConfidenceScore;
}

export interface Implementation {
  branchName: string;
  createdFiles: number;
  updatedFiles: number;
  testFilesGenerated: number;
  actions: AgentAction[];
}

export interface Validation {
  syntaxValid: boolean;
  securityValid: boolean;
  testsPassing: boolean;
  performanceTests: boolean;
  results: ValidationResult[];
}

export interface PRResult {
  prUrl: string;
  prNumber: number;
  branchName: string;
  title: string;
  description: string;
  reviewers: string[];
  labels: string[];
  outputs: AgentOutput[];
}

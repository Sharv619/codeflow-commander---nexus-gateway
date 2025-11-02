import { CodeEntity } from './entities';

export interface SecurityIssue {
  id: string;
  category: 'injection' | 'broken_auth' | 'sensitive_data' | 'xml_external' | 'broken_access' | 'misconfiguration' | 'xss' | 'deserialization' | 'vulnerable_components' | 'logging_monitoring';
  severity: 'low' | 'medium' | 'high' | 'critical';
  cwe: string; // Common Weakness Enumeration
  description: string;
  location: {
    filePath: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };
  vulnerableCode: string;
  remediation: {
    type: 'replace' | 'insert' | 'delete' | 'refactor';
    secureCode: string;
    contextChanges: string[];
    breaking: boolean;
  };
  evidence: {
    patterns: string[];
    indicators: string[];
    references: string[];
  };
  riskScore: number; // 0-100 based on CVSS-like scoring
}

export interface SecurityAnalysisResult {
  issues: SecurityIssue[];
  overallRiskScore: number;
  criticalCount: number;
  highCount: number;
  coverage: {
    analyzedFiles: number;
    linesAnalyzed: number;
    patternsChecked: number;
  };
  recommendations: {
    priority: 'immediate' | 'scheduled' | 'monitoring';
    action: string;
    impact: string;
  }[];
}

export interface SecurityRemediationContext {
  vulnerability: SecurityIssue;
  sourceAnalysis: CodeEntity[];
  relatedComponents: CodeEntity[];
  securityPatterns: SecurityPattern[];
  projectStandards: Record<string, any>;
  regulatoryRequirements?: string[];
}

export interface SecurityPattern {
  pattern: 'input_validation' | 'authentication' | 'authorization' | 'encryption' | 'logging' | 'session_management' | 'error_handling' | 'dependency_updates';
  implementation: string;
  confidence: number;
  examples: string[];
}

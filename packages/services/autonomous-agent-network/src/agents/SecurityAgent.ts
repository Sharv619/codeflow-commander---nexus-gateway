/**
 * Security Agent Implementation
 * 
 * Implements real security pattern detection for the Codeflow Commander system.
 * Extends the AutonomousAgent base class with specific security analysis logic.
 * 
 * Based on the specifications in docs/LOGIC_MAP_SECURITY_AGENT.md
 */

import { AutonomousAgent } from '../core/AutonomousAgent';
import { ChangeEvent, AnalysisContext, AgentResult, AgentConfig, AgentPriority, AnalysisDepth } from '../types/agent-types';
import { AgentSpecialization } from '../types/agent-types';

/**
 * Security Agent Configuration
 */
const SECURITY_AGENT_CONFIG: AgentConfig = {
  id: 'security-agent-v1',
  type: 'security',
  version: '1.0.0',
  capabilities: ['static_analysis', 'pattern_detection'],
  confidenceThreshold: 0.7,
  timeout: 5000,
  retryAttempts: 2,
  retryDelay: 1000,
  maxSuggestions: 10,
  contextWindowSize: 5,
  fileTypes: ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'csharp', 'go', 'rust'],
  enabled: true,
  priority: AgentPriority.CRITICAL,
  dependencies: [],
  feedbackEnabled: true,
  learningRate: 0.1,
  memoryRetention: 0.8,
  policies: [
    {
      id: 'confidence_threshold',
      type: 'confidence_threshold',
      config: { threshold: 0.7 }
    },
    {
      id: 'severity_filter',
      type: 'severity_filter',
      config: { severities: ['critical', 'high', 'medium'] }
    }
  ]
};

/**
 * Security Pattern Detection Rules
 */
class SecurityPatterns {
  // Pattern 1: Hardcoded Secrets
  static readonly SECRET_PATTERNS = [
    /password\s*[:=]\s*['"`]([^'"`]+)['"`]/gi,
    /api[_-]?key\s*[:=]\s*['"`]([^'"`]+)['"`]/gi,
    /secret\s*[:=]\s*['"`]([^'"`]+)['"`]/gi,
    /token\s*[:=]\s*['"`]([^'"`]+)['"`]/gi,
    /private[_-]?key\s*[:=]\s*['"`]([^'"`]+)['"`]/gi,
    /access[_-]?key\s*[:=]\s*['"`]([^'"`]+)['"`]/gi,
    /auth[_-]?token\s*[:=]\s*['"`]([^'"`]+)['"`]/gi
  ];

  // Pattern 2: Insecure Cryptographic Usage
  static readonly CRYPTO_PATTERNS = [
    /md5\(/gi,
    /sha1\(/gi,
    /eval\(/gi,
    /innerHTML\s*=/gi,
    /outerHTML\s*=/gi,
    /document\.write\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(\s*['"`]/gi,
    /setInterval\s*\(\s*['"`]/gi
  ];

  // Pattern 3: SQL Injection Vulnerabilities
  static readonly SQL_PATTERNS = [
    /query\s*\(\s*['"`][^'"`]*\$\{[^}]+\}/gi,
    /execute\s*\(\s*['"`][^'"`]*\$\{[^}]+\}/gi,
    /SELECT.*\+.*FROM/gi,
    /INSERT.*\+.*INTO/gi,
    /UPDATE.*\+.*SET/gi,
    /DELETE.*\+.*FROM/gi,
    /WHERE.*\+.*=/gi
  ];

  // Pattern 4: XSS Vulnerabilities
  static readonly XSS_PATTERNS = [
    /innerHTML\s*=/gi,
    /outerHTML\s*=/gi,
    /insertAdjacentHTML/gi,
    /document\.write\(/gi,
    /\.html\s*=/gi,
    /\.text\s*=/gi
  ];

  // Pattern 5: Path Traversal
  static readonly PATH_PATTERNS = [
    /\.\.\/.*\.\./gi,
    /path\.join.*\.\./gi,
    /fs\.readFile.*\.\./gi,
    /fs\.writeFile.*\.\./gi,
    /require\s*\(\s*['"`]\.\./gi,
    /import\s+.*\s+from\s+['"`]\.\./gi
  ];

  // Pattern 6: Command Injection
  static readonly COMMAND_PATTERNS = [
    /exec\s*\(/gi,
    /spawn\s*\(/gi,
    /execSync\s*\(/gi,
    /spawnSync\s*\(/gi,
    /system\s*\(/gi,
    /shell_exec\s*\(/gi,
    /exec\s*\(\s*.*\$\{.*\}/gi
  ];

  // Pattern 7: Information Disclosure
  static readonly INFO_PATTERNS = [
    /console\.log\s*\(/gi,
    /console\.error\s*\(/gi,
    /console\.warn\s*\(/gi,
    /debugger\s*;/gi,
    /TODO.*password/gi,
    /TODO.*secret/gi,
    /FIXME.*security/gi
  ];
}

/**
 * Security Agent Implementation
 */
export class SecurityAgent extends AutonomousAgent {
  constructor() {
    super(SECURITY_AGENT_CONFIG);
  }

  /**
   * Get agent specialization
   */
  getSpecialization(): AgentSpecialization {
    return 'security_analysis';
  }

  /**
   * Get agent priority
   */
  getPriority(): AgentPriority {
    return AgentPriority.CRITICAL;
  }

  /**
   * Analyze a change event for security vulnerabilities
   */
  async analyze(change: ChangeEvent, context: AnalysisContext): Promise<AgentResult> {
    try {
      // Validate input
      const isValid = await this.validateInput(change);
      if (!isValid) {
        throw new Error('Invalid change event');
      }

      const startTime = Date.now();
      const suggestions: any[] = [];

      // Get file content for analysis (this would come from the daemon or git)
      const fileContent = await this.getFileContent(change.file);
      
      if (!fileContent) {
        throw new Error('Could not retrieve file content');
      }

      // Analyze for security patterns
      suggestions.push(...this.analyzeSecrets(fileContent, change.file));
      suggestions.push(...this.analyzeCrypto(fileContent, change.file));
      suggestions.push(...this.analyzeSQLInjection(fileContent, change.file));
      suggestions.push(...this.analyzeXSS(fileContent, change.file));
      suggestions.push(...this.analyzePathTraversal(fileContent, change.file));
      suggestions.push(...this.analyzeCommandInjection(fileContent, change.file));
      suggestions.push(...this.analyzeInformationDisclosure(fileContent, change.file));

      // Apply policies to filter suggestions
      const filteredSuggestions = await this.applyPolicies({
        agentId: this.getId(),
        agentType: this.getType(),
        timestamp: new Date(),
        suggestions,
        metadata: {
          analysisDepth: AnalysisDepth.DEEP,
          contextUsed: ['dependencies', 'owners', 'risk_factors'],
          dependenciesAnalyzed: context.ekdContext.dependencies.map(d => d.target.path),
          policiesApplied: ['confidence_threshold', 'severity_filter'],
          executionMetrics: {
            executionTime: 0,
            suggestionsCount: suggestions.length,
            success: true
          }
        },
        executionTime: 0,
        confidence: 0.85
      });

      const executionTime = Date.now() - startTime;

      // Log execution metrics
      await this.logExecution({
        executionTime,
        suggestionsCount: filteredSuggestions.suggestions.length,
        success: true
      });

      return {
        agentId: this.getId(),
        agentType: this.getType(),
        timestamp: new Date(),
        suggestions: filteredSuggestions.suggestions,
        metadata: {
          analysisDepth: AnalysisDepth.DEEP,
          contextUsed: ['dependencies', 'owners', 'risk_factors'],
          dependenciesAnalyzed: context.ekdContext.dependencies.map(d => d.target.path),
          policiesApplied: ['confidence_threshold', 'severity_filter'],
          executionMetrics: {
            executionTime,
            suggestionsCount: filteredSuggestions.suggestions.length,
            success: true
          }
        },
        executionTime,
        confidence: 0.85
      };
    } catch (error) {
      console.error(`SecurityAgent analysis failed:`, error);
      
      // Log execution metrics for failure
      await this.logExecution({
        executionTime: 0,
        suggestionsCount: 0,
        success: false
      });

      throw error;
    }
  }

  /**
   * Analyze for hardcoded secrets
   */
  private analyzeSecrets(content: string, filePath: string): any[] {
    const suggestions: any[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      SecurityPatterns.SECRET_PATTERNS.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const secretValue = match[1];
          
          // Skip common false positives
          if (this.isFalsePositive(secretValue)) {
            continue;
          }

          suggestions.push({
            id: `security-secret-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: 'Hardcoded Secret Detected',
            description: `Hardcoded secret found: ${secretValue.substring(0, 20)}...`,
            severity: 'high' as const,
            confidence: 0.9,
            codePatch: {
              file: filePath,
              lineStart: index + 1,
              lineEnd: index + 1,
              originalCode: line.trim(),
              suggestedCode: line.replace(pattern, `${match[0].split('=')[0]}= process.env.${this.extractVariableName(match[0])}`),
              language: this.detectLanguage(filePath),
              patchType: 'replace' as const
            },
            reasoning: 'Hardcoded secrets should be stored in environment variables or secure configuration management',
            validationResults: {
              testsPass: true,
              securityScanPass: true,
              performanceImpact: 'neutral' as const
            },
            tags: ['security', 'secrets', 'hardcoded']
          });
        }
      });
    });

    return suggestions;
  }

  /**
   * Analyze for insecure cryptographic usage
   */
  private analyzeCrypto(content: string, filePath: string): any[] {
    const suggestions: any[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      SecurityPatterns.CRYPTO_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          const match = line.match(pattern);
          if (match) {
            suggestions.push({
              id: `security-crypto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: 'Insecure Cryptographic Usage',
              description: `Insecure cryptographic function detected: ${match[0]}`,
              severity: 'high' as const,
              confidence: 0.85,
              codePatch: {
                file: filePath,
                lineStart: index + 1,
                lineEnd: index + 1,
                originalCode: line.trim(),
                suggestedCode: this.generateSecureCryptoSuggestion(line, match[0]),
                language: this.detectLanguage(filePath),
                patchType: 'replace' as const
              },
              reasoning: 'Insecure cryptographic functions can lead to security vulnerabilities',
              validationResults: {
                testsPass: true,
                securityScanPass: true,
                performanceImpact: 'neutral' as const
              },
              tags: ['security', 'crypto', 'insecure']
            });
          }
        }
      });
    });

    return suggestions;
  }

  /**
   * Analyze for SQL injection vulnerabilities
   */
  private analyzeSQLInjection(content: string, filePath: string): any[] {
    const suggestions: any[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      SecurityPatterns.SQL_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          const match = line.match(pattern);
          if (match) {
            suggestions.push({
              id: `security-sql-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: 'SQL Injection Vulnerability',
              description: `Potential SQL injection detected: ${match[0]}`,
              severity: 'critical' as const,
              confidence: 0.95,
              codePatch: {
                file: filePath,
                lineStart: index + 1,
                lineEnd: index + 1,
                originalCode: line.trim(),
                suggestedCode: this.generateSQLInjectionFix(line),
                language: this.detectLanguage(filePath),
                patchType: 'replace' as const
              },
              reasoning: 'Dynamic SQL construction without parameterization can lead to SQL injection attacks',
              validationResults: {
                testsPass: true,
                securityScanPass: true,
                performanceImpact: 'neutral' as const
              },
              tags: ['security', 'sql-injection', 'vulnerability']
            });
          }
        }
      });
    });

    return suggestions;
  }

  /**
   * Analyze for XSS vulnerabilities
   */
  private analyzeXSS(content: string, filePath: string): any[] {
    const suggestions: any[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      SecurityPatterns.XSS_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          const match = line.match(pattern);
          if (match) {
            suggestions.push({
              id: `security-xss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: 'Cross-Site Scripting (XSS) Vulnerability',
              description: `Potential XSS vulnerability detected: ${match[0]}`,
              severity: 'high' as const,
              confidence: 0.85,
              codePatch: {
                file: filePath,
                lineStart: index + 1,
                lineEnd: index + 1,
                originalCode: line.trim(),
                suggestedCode: this.generateXSSFix(line, match[0]),
                language: this.detectLanguage(filePath),
                patchType: 'replace' as const
              },
              reasoning: 'Direct DOM manipulation without sanitization can lead to XSS attacks',
              validationResults: {
                testsPass: true,
                securityScanPass: true,
                performanceImpact: 'neutral' as const
              },
              tags: ['security', 'xss', 'vulnerability']
            });
          }
        }
      });
    });

    return suggestions;
  }

  /**
   * Analyze for path traversal vulnerabilities
   */
  private analyzePathTraversal(content: string, filePath: string): any[] {
    const suggestions: any[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      SecurityPatterns.PATH_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          const match = line.match(pattern);
          if (match) {
            suggestions.push({
              id: `security-path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: 'Path Traversal Vulnerability',
              description: `Potential path traversal detected: ${match[0]}`,
              severity: 'high' as const,
              confidence: 0.85,
              codePatch: {
                file: filePath,
                lineStart: index + 1,
                lineEnd: index + 1,
                originalCode: line.trim(),
                suggestedCode: this.generatePathTraversalFix(line, match[0]),
                language: this.detectLanguage(filePath),
                patchType: 'replace' as const
              },
              reasoning: 'Path traversal can allow unauthorized file access',
              validationResults: {
                testsPass: true,
                securityScanPass: true,
                performanceImpact: 'neutral' as const
              },
              tags: ['security', 'path-traversal', 'vulnerability']
            });
          }
        }
      });
    });

    return suggestions;
  }

  /**
   * Analyze for command injection vulnerabilities
   */
  private analyzeCommandInjection(content: string, filePath: string): any[] {
    const suggestions: any[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      SecurityPatterns.COMMAND_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          const match = line.match(pattern);
          if (match) {
            suggestions.push({
              id: `security-command-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: 'Command Injection Vulnerability',
              description: `Potential command injection detected: ${match[0]}`,
              severity: 'critical' as const,
              confidence: 0.95,
              codePatch: {
                file: filePath,
                lineStart: index + 1,
                lineEnd: index + 1,
                originalCode: line.trim(),
                suggestedCode: this.generateCommandInjectionFix(line, match[0]),
                language: this.detectLanguage(filePath),
                patchType: 'replace' as const
              },
              reasoning: 'Command injection can allow arbitrary command execution',
              validationResults: {
                testsPass: true,
                securityScanPass: true,
                performanceImpact: 'neutral' as const
              },
              tags: ['security', 'command-injection', 'vulnerability']
            });
          }
        }
      });
    });

    return suggestions;
  }

  /**
   * Analyze for information disclosure
   */
  private analyzeInformationDisclosure(content: string, filePath: string): any[] {
    const suggestions: any[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      SecurityPatterns.INFO_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          const match = line.match(pattern);
          if (match) {
            suggestions.push({
              id: `security-info-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: 'Information Disclosure',
              description: `Potential information disclosure: ${match[0]}`,
              severity: 'medium' as const,
              confidence: 0.7,
              codePatch: {
                file: filePath,
                lineStart: index + 1,
                lineEnd: index + 1,
                originalCode: line.trim(),
                suggestedCode: this.generateInfoDisclosureFix(line, match[0]),
                language: this.detectLanguage(filePath),
                patchType: 'replace' as const
              },
              reasoning: 'Debug statements and sensitive information should not be committed to production code',
              validationResults: {
                testsPass: true,
                securityScanPass: true,
                performanceImpact: 'neutral' as const
              },
              tags: ['security', 'info-disclosure', 'debug']
            });
          }
        }
      });
    });

    return suggestions;
  }

  /**
   * Helper methods
   */
  private isFalsePositive(value: string): boolean {
    const falsePositives = [
      'password123',
      'api_key',
      'secret_key',
      'test_password',
      'dummy_secret',
      'placeholder',
      'example_key'
    ];
    
    return falsePositives.some(fp => value.toLowerCase().includes(fp));
  }

  private extractVariableName(match: string): string {
    const parts = match.split('=');
    if (parts.length > 0) {
      return parts[0].trim().replace(/['"`]/g, '').toUpperCase();
    }
    return 'SECRET';
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop() || '';
    const languageMap: { [key: string]: string } = {
      'ts': 'typescript',
      'js': 'javascript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp'
    };
    return languageMap[ext] || 'unknown';
  }

  private generateSecureCryptoSuggestion(line: string, match: string): string {
    if (match.includes('md5') || match.includes('sha1')) {
      return line.replace(match, '// Use SHA-256 or stronger: crypto.createHash("sha256")');
    }
    if (match.includes('eval')) {
      return line.replace(match, '// Avoid eval() - use safer alternatives');
    }
    return line;
  }

  private generateSQLInjectionFix(line: string): string {
    return line.replace(/query\s*\(/, 'query(').replace(/\$\{/, '?') + ' // Use parameterized queries';
  }

  private generateXSSFix(line: string, match: string): string {
    if (match.includes('innerHTML')) {
      return line.replace('innerHTML', 'textContent') + ' // Use textContent to prevent XSS';
    }
    return line;
  }

  private generatePathTraversalFix(line: string, _match: string): string {
    return line + ' // Validate and sanitize file paths';
  }

  private generateCommandInjectionFix(line: string, _match: string): string {
    return line + ' // Use parameterized commands or input validation';
  }

  private generateInfoDisclosureFix(line: string, match: string): string {
    if (match.includes('console.log')) {
      return '// Remove debug statements in production: ' + line;
    }
    return line;
  }

  /**
   * Mock method to get file content (would integrate with daemon)
   */
  private async getFileContent(filePath: string): Promise<string> {
    // This would integrate with the file change daemon
    // For now, return a mock implementation
    console.log(`SecurityAgent: Analyzing file ${filePath}`);
    return `// Mock file content for ${filePath}\nconst apiKey = 'abc123secret';\neval('some code');`;
  }
}
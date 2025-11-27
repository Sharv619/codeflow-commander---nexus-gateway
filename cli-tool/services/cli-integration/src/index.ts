#!/usr/bin/env node

/**
 * CLI Integration Service - Phase 4
 *
 * Bridges the local CLI commands with EKG backend services.
 * Transforms CLI operations from local processing to backend-driven workflows.
 *
 * Key transformations:
 * - `codeflow index` → EKG Ingestion Service webhook simulation
 * - `codeflow analyze-diff` → EKG Query Service context-enhanced analysis
 */

import axios, { AxiosError } from 'axios';
import simpleGit from 'simple-git';
import { config } from 'dotenv';
import winston from 'winston';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Load environment variables
config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cli-integration' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'cli-integration.log' })
  ]
});

/**
 * Configuration for backend services
 */
interface EKGBackendConfig {
  ingestionServiceUrl: string;
  queryServiceUrl: string;
  timeout: number;
  retries: number;
}

/**
 * CLI Integration Service
 * Provides methods that CLI commands can call to interact with EKG backend
 */
export class CLIIntegrationService {
  private config: EKGBackendConfig;
  private git: simpleGit.SimpleGit;

  constructor() {
    this.config = {
      ingestionServiceUrl: process.env.INGESTION_SERVICE_URL || 'http://localhost:3000',
      queryServiceUrl: process.env.QUERY_SERVICE_URL || 'http://localhost:4000',
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
      retries: parseInt(process.env.REQUEST_RETRIES || '3')
    };

    this.git = simpleGit();
    logger.info('CLI Integration Service initialized', this.config);
  }

  /**
   * Index repository for EKG - equivalent to `codeflow index`
   *
   * Sends repository URL to EKG Ingestion Service for analysis and graph population
   */
  async indexRepository(options: {
    repositoryUrl?: string;
    dryRun?: boolean;
  } = {}): Promise<{
    success: boolean;
    repositoryId?: string;
    message: string;
    stats?: {
      indexedFiles: number;
      analysisTime: number;
      webhookAccepted: boolean;
    }
  }> {
    const startTime = Date.now();

    try {
      // Get repository information
      const repoInfo = await this.getRepositoryInfo();

      if (options.dryRun) {
        logger.info('Dry run mode - would index repository', repoInfo);
        const filesToIndex = await this.getIndexableFiles(repoInfo.repositoryPath);

        return {
          success: true,
          message: `Dry run: Would index ${filesToIndex.length} files from ${repoInfo.fullName}`,
          stats: {
            indexedFiles: filesToIndex.length,
            analysisTime: Date.now() - startTime,
            webhookAccepted: true // Would be accepted
          }
        };
      }

      // Calculate repository ID for tracking
      const repositoryId = this.generateRepositoryId(repoInfo.fullName);

      logger.info('Indexing repository via EKG backend', {
        repositoryId,
        fullName: repoInfo.fullName,
        url: repoInfo.cloneUrl
      });

      // Send webhook payload to EKG Ingestion Service
      const webhookPayload = {
        action: 'repository.indexed',
        repository: {
          id: repositoryId,
          name: repoInfo.name,
          full_name: repoInfo.fullName,
          clone_url: repoInfo.cloneUrl,
          html_url: repoInfo.htmlUrl,
          private: repoInfo.isPrivate
        },
        sender: {
          login: this.getCurrentUser(),
          type: 'User'
        },
        installation: {
          id: 'cli-integration',
          node_id: 'cli-integration-node'
        },
        // Add PRISM analysis request
        prism: {
          includePatterns: true,
          includeDependencies: true,
          includeMetrics: true
        }
      };

      const response = await this.makeBackendRequest(
        `${this.config.ingestionServiceUrl}/webhooks/github`,
        webhookPayload,
        {
          'X-GitHub-Event': 'repository.indexed',
          'X-GitHub-Delivery': `delivery-cli-${repositoryId}-${Date.now()}`,
          'X-Request-ID': `req-cli-index-${repositoryId}`,
          'Content-Type': 'application/json'
        }
      );

      const analysisTime = Date.now() - startTime;

      logger.info('Repository indexing initiated', {
        repositoryId,
        responseStatus: response.status,
        analysisTime
      });

      return {
        success: true,
        repositoryId,
        message: `Repository ${repoInfo.fullName} submitted for EKG analysis`,
        stats: {
          indexedFiles: 0, // Will be populated by backend
          analysisTime,
          webhookAccepted: response.status === 200
        }
      };

    } catch (error) {
      const errorMessage = this.formatError(error);
      logger.error('Repository indexing failed', { error: errorMessage });

      return {
        success: false,
        message: `Repository indexing failed: ${errorMessage}`,
        stats: {
          indexedFiles: 0,
          analysisTime: Date.now() - startTime,
          webhookAccepted: false
        }
      };
    }
  }

  /**
   * Analyze code diff with local knowledge and pattern analysis
   *
   * Uses local RAG and knowledge graph for context-aware analysis
   */
  async analyzeDiff(diffContent: string, options: {
    legacy?: boolean;
    outputFormat?: 'console' | 'json';
  } = {}): Promise<{
    success: boolean;
    analysis: any;
    message: string;
    stats?: {
      local_patterns_found: number;
      context_chunks_used: number;
      analysis_time: number;
    }
  }> {
    const startTime = Date.now();

    try {
      if (!diffContent.trim()) {
        return {
          success: true,
          analysis: { type: 'no-changes', message: 'No changes to analyze' },
          message: 'No changes to analyze'
        };
      }

      logger.info('Analyzing diff with local knowledge enhancement', {
        diffSize: diffContent.length,
        lines: diffContent.split('\n').length
      });

      // Analyze diff and extract context
      const diffAnalysis = this.analyzeDiffContent(diffContent);

      if (diffAnalysis.files.length === 0) {
        return {
          success: true,
          analysis: { type: 'no-relevant-changes', message: 'No code changes detected' },
          message: 'No code changes detected in diff'
        };
      }

      // Get local knowledge context
      const localContext = await this.getLocalKnowledgeContext(diffAnalysis);

      // Generate enhanced analysis with local data
      const enhancedAnalysis = await this.generateLocalEnhancedAnalysis(diffAnalysis, localContext);

      const analysisTime = Date.now() - startTime;

      logger.info('Diff analysis completed with local enhancement', {
        affectedFiles: diffAnalysis.files.length,
        patternsFound: localContext.patternsFound,
        contextChunks: localContext.contextChunks.length,
        analysisTime
      });

      return {
        success: true,
        analysis: enhancedAnalysis,
        message: 'Diff analyzed with local knowledge enhancement',
        stats: {
          local_patterns_found: localContext.patternsFound,
          context_chunks_used: localContext.contextChunksUsed,
          analysis_time: analysisTime
        }
      };

    } catch (error) {
      const errorMessage = this.formatError(error);
      logger.error('Diff analysis failed', { error: errorMessage });

      return {
        success: false,
        analysis: null,
        message: `Diff analysis failed: ${errorMessage}`,
        stats: {
          local_patterns_found: 0,
          context_chunks_used: 0,
          analysis_time: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Analyze diff content and extract structured information
   */
  private analyzeDiffContent(diffContent: string): {
    files: Array<{
      path: string;
      additions: number;
      deletions: number;
      isNew: boolean;
      language: string;
    }>;
    totalAdditions: number;
    totalDeletions: number;
    summary: string;
  } {
    const files: Array<{
      path: string;
      additions: number;
      deletions: number;
      isNew: boolean;
      language: string;
    }> = [];

    const lines = diffContent.split('\n');
    let currentFile: Partial<typeof files[0]> | null = null;
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        // Save previous file if exists
        if (currentFile) {
          files.push(currentFile as typeof files[0]);
        }

        // Extract file path
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (match && match[2]) {
          currentFile = {
            path: match[2],
            additions: 0,
            deletions: 0,
            isNew: false,
            language: this.detectLanguage(match[2])
          };
        }
      } else if (line.startsWith('new file mode')) {
        if (currentFile) {
          currentFile.isNew = true;
        }
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        if (currentFile) {
          currentFile.additions!++;
          totalAdditions++;
        }
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        if (currentFile) {
          currentFile.deletions!++;
          totalDeletions++;
        }
      }
    }

    // Push final file
    if (currentFile) {
      files.push(currentFile as typeof files[0]);
    }

    const summary = `Modified ${files.length} files: +${totalAdditions} -${totalDeletions}`;

    return {
      files,
      totalAdditions,
      totalDeletions,
      summary
    };
  }

  /**
   * Get local knowledge context using RAG and project knowledge
   */
  private async getLocalKnowledgeContext(diffAnalysis: any): Promise<{
    patternsFound: number;
    contextChunks: any[];
    contextChunksUsed: number;
  }> {
    const contextChunks: any[] = [];
    let patternsFound = 0;

    try {
      // Generate context query from changes
      const contextQuery = this.generateContextQueryFromDiff(diffAnalysis);

      // Use local RAG system to retrieve context
      const { RAGSystem } = await import('../rag-system.js');
      const ragSystem = new RAGSystem();
      await ragSystem.initialize();

      // Get relevant context from local knowledge base
      const retrievedContext = await ragSystem.retrieveContext(contextQuery, {
        limit: 5,
        minScore: 0.6
      });

      // Convert to consistent format
      retrievedContext.forEach(ctx => {
        contextChunks.push({
          content: ctx.content,
          metadata: {
            filePath: ctx.filePath,
            language: ctx.language,
            score: ctx.score
          }
        });
      });

      // Get patterns from local project knowledge
      const projectPatterns = await this.getLocalProjectPatterns(diffAnalysis);
      patternsFound = projectPatterns.length;

      // Add patterns to context
      projectPatterns.forEach(pattern => {
        contextChunks.push({
          content: `Project Pattern: ${pattern.name} - ${pattern.description}`,
          metadata: {
            type: 'pattern',
            category: pattern.category,
            confidence: pattern.confidence,
            score: 0.9
          }
        });
      });

    } catch (error) {
      logger.warn('Failed to get local knowledge context', { error: this.formatError(error) });
    }

    return {
      patternsFound,
      contextChunks,
      contextChunksUsed: contextChunks.length
    };
  }

  /**
   * Generate analysis enhanced with local knowledge
   */
  private async generateLocalEnhancedAnalysis(diffAnalysis: any, localContext: any): Promise<any> {
    // Analyze changes with local context
    const issues: any[] = [];
    const recommendations: any[] = [];
    let patternsApplied = 0;

    // Check against learned patterns
    if (localContext.contextChunks) {
      const patternChunks = localContext.contextChunks.filter(chunk =>
        chunk.metadata?.type === 'pattern' &&
        chunk.metadata?.score > 0.7
      );

      patternsFound = patternChunks.length;

      for (const pattern of patternChunks) {
        // Check if pattern is relevant to changed files
        const relevantFiles = diffAnalysis.files.filter((file: any) =>
          this.isPatternRelevantToFile(pattern, file)
        );

        if (relevantFiles.length > 0) {
          recommendations.push({
            type: 'local_pattern_alignment',
            description: pattern.content,
            severity: 'info',
            file: relevantFiles[0].path,
            patternConfidence: pattern.metadata.confidence
          });
          patternsApplied++;
        }
      }
    }

    // Generate context-aware recommendations
    for (const file of diffAnalysis.files) {
      // Check for security implications
      if (file.additions > 0 && this.isSensitiveFileType(file.language)) {
        issues.push({
          type: 'security_review_required',
          description: `Security review recommended for changes to ${file.path}`,
          severity: 'medium',
          file: file.path
        });
      }

      // Check for testing requirements
      if (this.looksLikeCodeChange(file) && !this.hasTestsInDiff(diffAnalysis)) {
        recommendations.push({
          type: 'testing_recommended',
          description: `Consider adding tests for ${file.path}`,
          severity: 'info',
          file: file.path
        });
      }
    }

    // Repository context awareness
    const repoInfo = await this.getRepositoryInfo().catch(() => null);
    if (repoInfo) {
      recommendations.push({
        type: 'repository_context',
        description: `Changes in repository ${repoInfo.name} (${diffAnalysis.summary})`,
        severity: 'info'
      });
    }

    return {
      summary: {
        totalFiles: diffAnalysis.files.length,
        totalAdditions: diffAnalysis.totalAdditions,
        totalDeletions: diffAnalysis.totalDeletions,
        localEnhanced: true,
        patternsApplied,
        contextChunksUsed: localContext.contextChunksUsed
      },
      files: diffAnalysis.files.map(this.enhanceFileWithContext.bind(this)),
      issues,
      recommendations,
      local_context: {
        patterns_found: localContext.patternsFound,
        context_chunks_used: localContext.contextChunksUsed,
        knowledge_base_enhanced: true
      }
    };
  }

  /**
   * Generate context query from diff analysis
   */
  private generateContextQueryFromDiff(diffAnalysis: any): string {
    const keyTerms: string[] = [];
    const fileTypes = new Set<string>();

    // Extract keywords from changed files
    diffAnalysis.files.forEach((file: any) => {
      fileTypes.add(file.language);
      // Extract meaningful file name parts
      const parts = file.path.replace(/\.[^/.]+$/, "").split(/[\/\-_]/);
      parts.forEach((part: string) => {
        if (part.length > 3 && !['src', 'lib', 'test', 'spec'].includes(part)) {
          keyTerms.push(part);
        }
      });
    });

    // Combine with change types
    const changeType = diffAnalysis.totalAdditions > diffAnalysis.totalDeletions * 2 ?
      "new feature" : "code modification";

    const fileTypeList = Array.from(fileTypes).join(', ');

    return `${changeType} in ${fileTypeList} files: ${keyTerms.slice(0, 5).join(' ')}`.trim();
  }

  /**
   * Get patterns from local project knowledge
   */
  private async getLocalProjectPatterns(diffAnalysis: any): Promise<any[]> {
    const patterns: any[] = [];

    try {
      // Import local knowledge services
      const { initGraphService } = await import('../../src/knowledge/graphService.js');

      const graphService = await initGraphService();

      if (graphService && typeof graphService.findPatterns === 'function') {
        // Find patterns related to the changed files
        const languages = [...new Set(diffAnalysis.files.map((f: any) => f.language))];
        const relatedPatterns = await graphService.findPatterns({
          languages,
          categories: ['architecture', 'security', 'performance']
        });

        patterns.push(...relatedPatterns);
      }
    } catch (error) {
      logger.debug('Local pattern retrieval failed', { error: this.formatError(error) });
    }

    // Add fallback patterns based on file types
    if (patterns.length === 0) {
      const hasJSFiles = diffAnalysis.files.some((f: any) => f.language === 'javascript');
      const hasTSFiles = diffAnalysis.files.some((f: any) => f.language === 'typescript');

      if (hasJSFiles || hasTSFiles) {
        patterns.push({
          name: 'JavaScript/TypeScript Best Practices',
          category: 'code_quality',
          description: 'Consider using ESLint for code quality checks',
          confidence: 0.8
        });
      }
    }

    return patterns;
  }

  /**
   * Check if a pattern is relevant to a file
   */
  private isPatternRelevantToFile(pattern: any, file: any): boolean {
    // Simple relevance check - can be made more sophisticated
    if (pattern.metadata?.category === 'security' && this.isSensitiveFileType(file.language)) {
      return true;
    }

    if (pattern.metadata?.language && pattern.metadata.language === file.language) {
      return true;
    }

    // Pattern name contains keywords from file
    const fileKeywords = file.path.toLowerCase().split(/[-_\.\/]/);
    const patternKeywords = pattern.content.toLowerCase().split(/\s+/);

    return fileKeywords.some((keyword: string) =>
      keyword.length > 3 && patternKeywords.some((pkw: string) => pkw.includes(keyword))
    );
  }

  /**
   * Check if file type is security-sensitive
   */
  private isSensitiveFileType(language: string): boolean {
    return ['javascript', 'typescript', 'python', 'java', 'php', 'go', 'rust'].includes(language);
  }

  /**
   * Check if diff contains code changes
   */
  private looksLikeCodeChange(file: any): boolean {
    return ['javascript', 'typescript', 'python', 'java', 'php', 'go', 'rust', 'cpp', 'c'].includes(file.language);
  }

  /**
   * Check if diff includes test files
   */
  private hasTestsInDiff(diffAnalysis: any): boolean {
    return diffAnalysis.files.some((file: any) =>
      file.path.includes('test') ||
      file.path.includes('spec') ||
      file.path.endsWith('.test.js') ||
      file.path.endsWith('.test.ts')
    );
  }

  /**
   * Enhance file info with context
   */
  private enhanceFileWithContext(file: any): any {
    return {
      ...file,
      context: {
        isCodeFile: this.looksLikeCodeChange(file),
        isNewFeature: file.isNew && file.additions > file.deletions,
        isRefactor: !file.isNew && file.deletions > file.additions * 2,
        needsTesting: this.looksLikeCodeChange(file) && file.additions > 10
      }
    };
  }

  /**
   * Generate enhanced analysis using EKG context
   */
  private async generateEKGEnhancedAnalysis(diffAnalysis: any, ekgContext: any): Promise<any> {
    // Analyze changes with EKG context
    const issues: any[] = [];
    const recommendations: any[] = [];

    // Check against existing patterns
    if (ekgContext.patterns && ekgContext.patterns.length > 0) {
      for (const file of diffAnalysis.files) {
        const relevantPatterns = ekgContext.patterns.filter((p: any) =>
          p.type === 'security' || p.type === 'architecture'
        );

        if (relevantPatterns.length > 0) {
          recommendations.push({
            type: 'ekg_pattern_alignment',
            description: `File ${file.path} modified - consider these established patterns: ${relevantPatterns.map((p: any) => p.name).join(', ')}`,
            severity: 'info',
            file: file.path
          });
        }
      }
    }

    // Compare against similar repositories
    if (ekgContext.similarRepositories && ekgContext.similarRepositories.length > 0) {
      const similarRepoNames = ekgContext.similarRepositories.map((sr: any) => sr.repository.fullName);
      recommendations.push({
        type: 'similar_repositories',
        description: `Changes similar to patterns seen in: ${similarRepoNames.slice(0, 3).join(', ')}`,
        severity: 'info'
      });
    }

    // Add repository-specific context if available
    if (ekgContext.repositoryIntelligence) {
      const repo = ekgContext.repositoryIntelligence.repository;
      issues.push({
        type: 'repository_context',
        description: `Analyzing changes in repository ${repo.fullName} (${repo.language})`,
        severity: 'info'
      });
    }

    return {
      summary: {
        totalFiles: diffAnalysis.files.length,
        totalAdditions: diffAnalysis.totalAdditions,
        totalDeletions: diffAnalysis.totalDeletions,
        ekgEnhanced: true
      },
      files: diffAnalysis.files.map((file: any) => ({
        path: file.path,
        language: file.language,
        additions: file.additions,
        deletions: file.deletions,
        isNew: file.isNew
      })),
      issues,
      recommendations,
      ekg_context: {
        patterns_analyzed: ekgContext.patterns?.length || 0,
        similar_repositories_found: ekgContext.similarRepositories?.length || 0,
        repository_known: !!ekgContext.repositoryIntelligence
      }
    };
  }

  /**
   * Get current repository information
   */
  private async getRepositoryInfo(): Promise<{
    name: string;
    fullName: string;
    repositoryPath: string;
    cloneUrl: string;
    htmlUrl: string;
    isPrivate: boolean;
  }> {
    try {
      const remotes = await this.git.getRemotes(true);
      const originRemote = remotes.find(r => r.name === 'origin');

      if (!originRemote) {
        throw new Error('No origin remote found');
      }

      // Parse GitHub URL
      const urlMatch = originRemote.refs.fetch.match(/github\.com[:/](.+?)(\.git)?$/);
      if (!urlMatch) {
        throw new Error('Remote URL is not a GitHub repository');
      }

      const fullName = urlMatch[1];
      const [owner, repo] = fullName.split('/');

      return {
        name: repo,
        fullName,
        repositoryPath: process.cwd(),
        cloneUrl: `https://github.com/${fullName}.git`,
        htmlUrl: `https://github.com/${fullName}`,
        isPrivate: false // Assume public unless told otherwise
      };
    } catch (error) {
      throw new Error(`Could not determine repository information: ${this.formatError(error)}`);
    }
  }

  /**
   * Get list of files that would be indexed
   */
  private async getIndexableFiles(repoPath: string): Promise<string[]> {
    // This mimics the logic from the original RAG indexer
    const keyFileExtensions = [
      '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.cs',
      '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj'
    ];

    try {
      const files: string[] = [];

      const walkDirectory = (dir: string, relativePath = '') => {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const relativeFilePath = path.join(relativePath, item);
          const stat = fs.statSync(fullPath);

          // Skip common exclude patterns
          if (item.startsWith('.') || item === 'node_modules' || item === 'dist' ||
              item === 'build' || item === 'target' || item === '.git') {
            continue;
          }

          if (stat.isDirectory()) {
            walkDirectory(fullPath, relativeFilePath);
          } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (keyFileExtensions.includes(ext)) {
              files.push(relativeFilePath);
            }
          }
        }
      };

      walkDirectory(repoPath);
      return files;
    } catch (error) {
      logger.warn('Could not scan repository files', { error: this.formatError(error) });
      return [];
    }
  }

  /**
   * Make HTTP request to backend service with retry logic
   */
  private async makeBackendRequest(
    url: string,
    data: any,
    headers: Record<string, string> = {}
  ): Promise<any> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await axios.post(url, data, {
          headers: {
            ...headers,
            'X-Attempt': attempt.toString()
          },
          timeout: this.config.timeout
        });

        return response;
      } catch (error) {
        lastError = error;
        logger.warn(`Backend request attempt ${attempt} failed`, {
          url,
          attempt,
          error: this.formatError(error)
        });

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Make GraphQL request to Query Service
   */
  private async makeGraphQLRequest(query: string, variables: any = {}): Promise<any> {
    return this.makeBackendRequest(
      `${this.config.queryServiceUrl}/graphql`,
      { query, variables },
      { 'Content-Type': 'application/json' }
    );
  }

  /**
   * Generate repository ID (similar to ingestion service)
   */
  private generateRepositoryId(fullName: string): string {
    return `${fullName.replace('/', '-')}-${Date.now().toString(36)}`;
  }

  /**
   * Get current user information
   */
  private getCurrentUser(): string {
    return process.env.USER || process.env.USERNAME || 'anonymous';
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala'
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Format error for logging and display
   */
  private formatError(error: any): string {
    if (axios.isAxiosError(error)) {
      return `HTTP ${error.response?.status}: ${error.response?.statusText || error.message}`;
    }
    return error.message || 'Unknown error';
  }
}

// Export singleton instance for CLI use
export const cliIntegrationService = new CLIIntegrationService();

// Export main methods for backward compatibility
export const indexProject = cliIntegrationService.indexRepository.bind(cliIntegrationService);
export const analyzeDiff = cliIntegrationService.analyzeDiff.bind(cliIntegrationService);

// Default export
export default cliIntegrationService;

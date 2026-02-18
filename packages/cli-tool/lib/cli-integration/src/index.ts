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

import axios from 'axios';
import { simpleGit, SimpleGit } from 'simple-git';
import { config } from 'dotenv';
import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Load environment variables
config();

// Validate and sanitize environment variables
const validateEnvironmentVariables = () => {
  const envVars = {
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    INGESTION_SERVICE_URL: process.env.INGESTION_SERVICE_URL || 'http://localhost:3000',
    QUERY_SERVICE_URL: process.env.QUERY_SERVICE_URL || 'http://localhost:4000',
    REQUEST_TIMEOUT: process.env.REQUEST_TIMEOUT || '30000',
    REQUEST_RETRIES: process.env.REQUEST_RETRIES || '3'
  };

  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(envVars.LOG_LEVEL)) {
    throw new Error(`Invalid LOG_LEVEL: ${envVars.LOG_LEVEL}. Must be one of: ${validLogLevels.join(', ')}`);
  }

  // Validate URLs
  if (!envVars.INGESTION_SERVICE_URL.startsWith('http://') && !envVars.INGESTION_SERVICE_URL.startsWith('https://')) {
    throw new Error(`Invalid INGESTION_SERVICE_URL: ${envVars.INGESTION_SERVICE_URL}. Must start with http:// or https://`);
  }

  if (!envVars.QUERY_SERVICE_URL.startsWith('http://') && !envVars.QUERY_SERVICE_URL.startsWith('https://')) {
    throw new Error(`Invalid QUERY_SERVICE_URL: ${envVars.QUERY_SERVICE_URL}. Must start with http:// or https://`);
  }

  // Validate timeout
  const timeout = parseInt(envVars.REQUEST_TIMEOUT, 10);
  if (isNaN(timeout) || timeout <= 0 || timeout > 300000) { // Max 5 minutes
    throw new Error(`Invalid REQUEST_TIMEOUT: ${envVars.REQUEST_TIMEOUT}. Must be between 1 and 300000 milliseconds`);
  }

  // Validate retries
  const retries = parseInt(envVars.REQUEST_RETRIES, 10);
  if (isNaN(retries) || retries <= 0 || retries > 10) {
    throw new Error(`Invalid REQUEST_RETRIES: ${envVars.REQUEST_RETRIES}. Must be between 1 and 10`);
  }

  return envVars;
};

const envVars = validateEnvironmentVariables();

// Configure logger
const logger = winston.createLogger({
  level: envVars.LOG_LEVEL,
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
  private git: SimpleGit;

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
   * Analyze code diff with EKG context enhancement
   *
   * Sends diff to Query Service for EKG-enhanced analysis instead of local RAG
   */
  async analyzeDiff(diffContent: string, options: {
    legacy?: boolean;
    outputFormat?: 'console' | 'json';
  } = {}): Promise<{
    success: boolean;
    analysis: any;
    message: string;
    stats?: {
      ekg_queries: number;
      similar_repos_found: number;
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

      if (options.legacy) {
        // Fallback to local analysis (would integrate with existing agents)
        logger.warn('Legacy mode requested - falling back to local analysis');
        return {
          success: false,
          analysis: null,
          message: 'Legacy mode not yet implemented with EKG integration'
        };
      }

      logger.info('Analyzing diff with EKG context enhancement', {
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

      // Query EKG for context on affected files
      const ekgContext = await this.getEKGContext(diffAnalysis);

      // Generate enhanced analysis with EKG data
      const enhancedAnalysis = await this.generateEKGEnhancedAnalysis(diffAnalysis, ekgContext);

      const analysisTime = Date.now() - startTime;

      logger.info('Diff analysis completed with EKG enhancement', {
        affectedFiles: diffAnalysis.files.length,
        ekgQueries: ekgContext.queriesMade,
        similarReposFound: ekgContext.similarRepositories?.length || 0,
        analysisTime
      });

      return {
        success: true,
        analysis: enhancedAnalysis,
        message: 'Diff analyzed with EKG context enhancement',
        stats: {
          ekg_queries: ekgContext.queriesMade,
          similar_repos_found: ekgContext.similarRepositories?.length || 0,
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
          ekg_queries: 0,
          similar_repos_found: 0,
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
   * Query EKG for context on affected files
   */
  private async getEKGContext(diffAnalysis: any): Promise<{
    queriesMade: number;
    repositoryIntelligence?: any;
    similarRepositories: any[];
    patterns: any[];
  }> {
    let queriesMade = 0;

    try {
      // Get current repository information
      const repoInfo = await this.getRepositoryInfo();
      const repositoryId = this.generateRepositoryId(repoInfo.fullName);

      // Query repository intelligence if repository exists in EKG
      let repositoryIntelligence = null;
      try {
        const response = await this.makeGraphQLRequest(
          `
          query GetRepositoryIntelligence($repoId: ID!) {
            repositoryIntelligence(repositoryId: $repoId) {
              repository {
                id name fullName language
              }
              patterns {
                name type confidence category
              }
              dependencies {
                dependencyType currentVersion confidence
              }
            }
          }
          `,
          { repoId: repositoryId }
        );
        repositoryIntelligence = response.data?.repositoryIntelligence;
        queriesMade++;
      } catch (error) {
        logger.warn('Repository not found in EKG, continuing analysis', { repositoryId });
      }

      // Find similar repositories and patterns for context
      let similarRepositories: any[] = [];
      try {
        const response = await this.makeGraphQLRequest(
          `
          query FindSimilarRepositories($repoId: ID!, $limit: Int) {
            similarRepositories(repositoryId: $repoId, limit: $limit) {
              repository { name fullName language }
              similarityScore reasons
              sharedPatterns sizeComparison
            }
          }
          `,
          { repoId: repositoryId, limit: 5 }
        );
        similarRepositories = response.data?.similarRepositories || [];
        queriesMade++;
      } catch (error) {
        logger.warn('Could not fetch similar repositories', { error: this.formatError(error) });
      }

      // Get enterprise-wide patterns that might be relevant
      let patterns: any[] = [];
      try {
        const languages = [...new Set(diffAnalysis.files.map((f: any) => f.language))];

        const response = await this.makeGraphQLRequest(
          `
          query GetRelevantPatterns($language: String, $limit: Int) {
            patterns(language: $language, minConfidence: 0.7, limit: $limit) {
              name type category confidence observationCount
            }
          }
          `,
          { language: languages[0], limit: 10 }
        );
        patterns = response.data?.patterns || [];
        queriesMade++;
      } catch (error) {
        logger.warn('Could not fetch patterns', { error: this.formatError(error) });
      }

      return {
        queriesMade,
        repositoryIntelligence,
        similarRepositories,
        patterns
      };

    } catch (error) {
      logger.error('EKG context retrieval failed', { error: this.formatError(error) });
      return {
        queriesMade,
        similarRepositories: [],
        patterns: []
      };
    }
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
      const originRemote = remotes.find((r: any) => r.name === 'origin');

      if (!originRemote) {
        throw new Error('No origin remote found');
      }

      // Parse GitHub URL
      const urlMatch = originRemote.refs.fetch.match(/github\.com[:/](.+?)(\.git)?$/);
      if (!urlMatch) {
        throw new Error('Remote URL is not a GitHub repository');
      }

      const fullName = urlMatch[1];
      if (!fullName) {
        throw new Error('Could not extract repository name from remote URL');
      }

      const repoParts = fullName.split('/');
      const repo = repoParts[1];
      if (!repo) {
        throw new Error('Could not extract repository name from full name');
      }

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
   * Make HTTP request to backend service with retry logic and security validation
   */
  private async makeBackendRequest(
    url: string,
    data: any,
    headers: Record<string, string> = {}
  ): Promise<any> {
    let lastError: any;

    // Validate URL to prevent SSRF attacks
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // Sanitize headers to prevent header injection
    const sanitizedHeaders = this.sanitizeHeaders(headers);

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await axios.post(url, data, {
          headers: {
            ...sanitizedHeaders,
            'X-Attempt': attempt.toString(),
            'User-Agent': 'Codeflow-CLI-Integration/1.0'
          },
          timeout: this.config.timeout,
          maxRedirects: 3,
          validateStatus: (status) => status < 500 // Don't throw on 4xx errors
        });

        return response;
      } catch (error) {
        lastError = error;
        logger.warn(`Backend request attempt ${attempt} failed`, {
          url: this.sanitizeUrlForLogging(url),
          attempt,
          error: this.formatError(error)
        });

        if (attempt < this.config.retries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Validate URL to prevent SSRF attacks
   */
  private isValidUrl(url: string): boolean {
    // Allow localhost for local development
    if (process.env.ALLOW_LOCALHOST === 'true') {
      try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      } catch {
        return false;
      }
    }

    try {
      const urlObj = new URL(url);
      
      // Block internal network ranges
      const hostname = urlObj.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || 
          hostname.startsWith('192.168.') || hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)) {
        return false;
      }

      // Only allow HTTP/HTTPS protocols
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Sanitize headers to prevent header injection
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      // Remove potentially dangerous headers
      if (key.toLowerCase().includes('cookie') || key.toLowerCase().includes('authorization')) {
        continue;
      }
      
      // Sanitize header values
      sanitized[key] = value.replace(/[^\x20-\x7E]/g, '');
    }
    
    return sanitized;
  }

  /**
   * Sanitize URL for logging to prevent log injection
   */
  private sanitizeUrlForLogging(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url.replace(/[\r\n]/g, '');
    }
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

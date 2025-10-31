import { GitHubClient } from './github.js';
import { NeptuneClient } from './neptune.js';

export interface RepositoryProcessingRequest {
  id: string;
  fullName: string;
  cloneUrl: string;
  owner: string;
  triggeredBy: string;
  eventType: string;
  branch?: string;
}

export interface PullRequestProcessingRequest {
  id: string;
  number: number;
  repositoryId: string;
  repositoryFullName: string;
  cloneUrl: string;
  author: string;
  headBranch: string;
  baseBranch: string;
  title: string;
}

/**
 * Repository Processor - Core business logic for processing repositories
 *
 * Handles repository cloning, PRISM analysis, and EKG graph population.
 * This service coordinates between GitHub API operations and Neptune graph storage.
 */
export class RepositoryProcessor {
  private githubClient: GitHubClient;
  private neptuneClient: NeptuneClient;

  constructor(githubClient: GitHubClient, neptuneClient: NeptuneClient) {
    this.githubClient = githubClient;
    this.neptuneClient = neptuneClient;
  }

  /**
   * Process a repository webhook event
   */
  async processRepository(request: RepositoryProcessingRequest): Promise<void> {
    console.log(`Processing repository ${request.fullName} (event: ${request.eventType})`);

    try {
      // 1. Clone or pull the repository
      const repoPath = await this.prepareRepository(request);

      // 2. Run PRISM analysis
      const prismResults = await this.runPrismAnalysis(repoPath);

      // 3. Populate Neptune graph with results
      await this.populateGraph(request, prismResults);

      // 4. Cleanup temporary files
      await this.cleanup(repoPath);

      console.log(`Successfully processed repository ${request.fullName}`);

    } catch (error) {
      console.error(`Failed to process repository ${request.fullName}:`, error);
      throw error;
    }
  }

  /**
   * Process a pull request webhook event
   */
  async processPullRequest(request: PullRequestProcessingRequest): Promise<void> {
    console.log(`Processing PR #${request.number} for ${request.repositoryFullName}`);

    try {
      // 1. Create temporary directory for analysis
      const prPath = await this.preparePullRequest(request);

      // 2. Analyze the PR changes
      const analysisResults = await this.analyzePullRequest(prPath, request);

      // 3. Update graph with PR information
      await this.updateGraphWithPR(request, analysisResults);

      // 4. Cleanup temporary files
      await this.cleanup(prPath);

      console.log(`Successfully processed PR #${request.number}`);

    } catch (error) {
      console.error(`Failed to process PR #${request.number}:`, error);
      throw error;
    }
  }

  /**
   * Prepare repository for analysis
   */
  private async prepareRepository(request: RepositoryProcessingRequest): Promise<string> {
    // Create temporary directory for the repository
    const tempDir = `/tmp/ekg-ingestion-${request.id}-${Date.now()}`;

    console.log(`Cloning repository ${request.fullName} to ${tempDir}`);

    try {
      // Clone the repository
      await this.githubClient.cloneRepository(request.cloneUrl, tempDir);
      return tempDir;
    } catch (error) {
      console.error(`Failed to clone repository ${request.fullName}:`, error);
      throw new Error(`Repository preparation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Prepare pull request for analysis
   */
  private async preparePullRequest(request: PullRequestProcessingRequest): Promise<string> {
    const tempDir = `/tmp/ekg-pr-${request.id}-${Date.now()}`;

    console.log(`Preparing PR #${request.number} for analysis in ${tempDir}`);

    // For PRs, we might need to handle diff analysis rather than full clone
    // This is a simplified implementation
    return tempDir;
  }

  /**
   * Run PRISM analysis on the repository
   */
  private async runPrismAnalysis(repoPath: string): Promise<any> {
    console.log(`Running PRISM analysis on ${repoPath}`);

    // This would integrate with the existing PRISM service
    // For Phase 4A, we'll create a mock analysis result
    const prismResults = {
      codebase: {
        entities: [
          {
            path: 'src/server.ts',
            type: 'file',
            language: 'typescript',
            size: 1024
          }
        ],
        relationships: [
          {
            source: 'src/server.ts',
            target: 'package.json',
            type: 'imports'
          }
        ],
        patterns: [
          {
            type: 'architecture',
            name: 'microservice',
            confidence: 0.85
          }
        ]
      },
      architectureInsights: [
        {
          type: 'pattern',
          name: 'repository_pattern',
          confidence: 0.8
        }
      ],
      qualityMetrics: {
        maintainability: 0.82,
        testability: 0.79,
        complexity: 0.65
      }
    };

    return prismResults;
  }

  /**
   * Analyze pull request changes
   */
  private async analyzePullRequest(_prPath: string, request: PullRequestProcessingRequest): Promise<any> {
    console.log(`Analyzing PR #${request.number} changes`);

    // Analyze the diff and changes in the PR
    const analysis = {
      changedFiles: 5,
      linesAdded: 120,
      linesDeleted: 45,
      impact: {
        breaking: false,
        securityRisk: 'low',
        performanceImpact: 'neutral'
      }
    };

    return analysis;
  }

  /**
   * Populate the Neptune graph with analysis results
   */
  private async populateGraph(request: RepositoryProcessingRequest, prismResults: any): Promise<void> {
    console.log(`Populating Neptune graph for repository ${request.fullName}`);

    // Create repository vertex
    await this.neptuneClient.createVertex('repository', {
      id: request.id,
      name: request.fullName.split('/')[1],
      owner: request.owner,
      url: `https://github.com/${request.fullName}`,
      cloneUrl: request.cloneUrl,
      branch: request.branch || 'main',
      lastAnalyzed: new Date().toISOString(),
      triggeredBy: request.triggeredBy
    });

    // Create file vertices and relationships
    for (const entity of prismResults.codebase.entities) {
      await this.neptuneClient.createVertex('file', {
        id: `${request.id}_${entity.path}`,
        path: entity.path,
        type: entity.type,
        language: entity.language,
        size: entity.size
      });

      // Create relationship from repository to file
      await this.neptuneClient.createEdge(
        'repository',
        request.id,
        'file',
        `${request.id}_${entity.path}`,
        'contains',
        { relationship: 'file ownership' }
      );
    }

    // Create pattern vertices
    for (const pattern of prismResults.codebase.patterns) {
      await this.neptuneClient.createVertex('pattern', {
        id: `${request.id}_${pattern.name}`,
        type: pattern.type,
        name: pattern.name,
        confidence: pattern.confidence
      });

      // Connect pattern to repository
      await this.neptuneClient.createEdge(
        'repository',
        request.id,
        'pattern',
        `${request.id}_${pattern.name}`,
        'exhibits',
        { detectionMethod: 'prism_analysis', confidence: pattern.confidence }
      );
    }

    console.log(`Graph populated for repository ${request.fullName}`);
  }

  /**
   * Update graph with pull request information
   */
  private async updateGraphWithPR(request: PullRequestProcessingRequest, analysis: any): Promise<void> {
    console.log(`Updating graph with PR #${request.number} information`);

    // Create PR vertex
    await this.neptuneClient.createVertex('pull_request', {
      id: request.id,
      number: request.number,
      title: request.title,
      author: request.author,
      headBranch: request.headBranch,
      baseBranch: request.baseBranch,
      repositoryId: request.repositoryId,
      createdAt: new Date().toISOString(),
      changedFiles: analysis.changedFiles,
      linesAdded: analysis.linesAdded,
      linesDeleted: analysis.linesDeleted
    });

    // Connect PR to repository
    await this.neptuneClient.createEdge(
      'pull_request',
      request.id,
      'repository',
      request.repositoryId,
      'belongs_to',
      { relationship: 'pull request' }
    );

    console.log(`Graph updated with PR #${request.number}`);
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(path: string): Promise<void> {
    try {
      const { exec } = await import('child_process');
      await new Promise((resolve, reject) => {
        exec(`rm -rf "${path}"`, (error) => {
          if (error) reject(error);
          else resolve(undefined);
        });
      });
      console.log(`Cleaned up temporary path: ${path}`);
    } catch (error) {
      console.warn(`Failed to cleanup ${path}:`, error);
    }
  }
}

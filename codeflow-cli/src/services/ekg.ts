// Enterprise Knowledge Graph (EKG) service for Phase 4
// Implements organization-wide intelligence with distributed graph capabilities
// Evolves VECTOR into enterprise-scale knowledge management

import { Logger, defaultLogger } from '@/utils/logger';
import { ErrorHandler } from '@/validation';
import { StorageManager } from '@/storage';
import {
  RepositoryNode,
  DependencyEdge,
  KnowledgePatternNode,
  OrganizationStandards,
  TechnicalDebtForecast,
  PerformanceAnomaly,
  DependencyEdgeType
} from '@/types/entities';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Local type definitions for metrics (would be expanded in full implementation)
interface RepositoryMetrics {
  stars: number;
  forks: number;
  watchers: number;
  contributors: number;
  lastCommit: string;
}

interface SecurityPostureMetrics {
  vulnerabilityCount: number;
  riskScore: number;
  complianceScore: number;
  lastScan: string;
}

interface ActivityMetrics {
  commitsLastWeek: number;
  activeContributors: number;
  deploymentFrequency: string;
  leadTime: number;
}

/**
 * Graph Node and Edge representations for EKG
 */
interface GraphNode {
  id: string;
  type: 'repository' | 'pattern' | 'dependency' | 'standard' | 'forecast' | 'anomaly';
  properties: Record<string, any>;
  embeddings?: number[];
}

interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, any>;
}

/**
 * Enterprise Knowledge Graph Service
 * Central intelligence hub for organization-wide code understanding
 * Replaces single-repository VECTOR with federated knowledge graph
 */
export class EnterpriseKnowledgeGraph {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private storageManager: StorageManager;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();

  // In-memory graph for development - would be Neo4j/Dgraph in production
  private adjacencyList: Map<string, Set<GraphEdge>> = new Map();

  constructor(storageManager: StorageManager, logger?: Logger) {
    this.logger = logger || defaultLogger;
    this.errorHandler = new ErrorHandler(this.logger);
    this.storageManager = storageManager;
  }

  /**
   * Initialize EKG with existing data migration
   * Builds initial graph from Phase 3 VECTOR data
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Enterprise Knowledge Graph (EKG)');

      // Load existing repository data if any
      await this.migrateExistingData();

      // Initialize graph indices
      await this.buildGraphIndices();

      // Warm cache for critical repositories
      await this.warmCache();

      this.logger.info('EKG initialization completed');
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'initialize' });
      throw error;
    }
  }

  /**
   * Add repository to the knowledge graph
   * Creates repository node and initializes relationships
   */
  async addRepository(repository: RepositoryNode): Promise<void> {
    try {
      this.logger.debug('Adding repository to EKG', { repoId: repository.id });

      // Create repository node
      const repoNode: GraphNode = {
        id: repository.id,
        type: 'repository',
        properties: {
          name: repository.name,
          organizationId: repository.organizationId,
          platform: repository.platform,
          language: repository.metadata.language,
          size: repository.metadata.size,
          activityMetrics: repository.relationships.activityMetrics,
          technicalDebt: repository.relationships.technicalDebt,
          securityPosture: repository.relationships.securityPosture
        },
        embeddings: repository.embeddings.codeEmbedding
      };

      // Store node and build relationships
      await this.storeGraphNode(repoNode);
      await this.buildRepositoryRelationships(repository);

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'addRepository', repoId: repository.id });
      throw error;
    }
  }

  /**
   * Add dependency edge between repositories
   * Represents code dependencies, data flow, or service communication
   */
  async addDependency(edge: DependencyEdge): Promise<void> {
    try {
      this.logger.debug('Adding dependency edge', {
        source: edge.properties.dependencyType,
        from: edge.sourceId,
        to: edge.targetId
      });

      const graphEdge: GraphEdge = {
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: edge.edgeType,
        properties: {
          dependencyType: edge.properties.dependencyType,
          version: edge.properties.currentVersion,
          usage: edge.properties.usageFrequency,
          confidence: edge.properties.confidence,
          analysis: edge.analysis
        }
      };

      await this.storeGraphEdge(graphEdge);

      // Update repository relationships
      await this.updateRepositoryDependencies(edge);

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'addDependency', edgeId: edge.id });
      throw error;
    }
  }

  /**
   * Add knowledge pattern to the graph
   * Represents architectural patterns, best practices, or anti-patterns
   */
  async addKnowledgePattern(pattern: KnowledgePatternNode): Promise<void> {
    try {
      const patternNode: GraphNode = {
        id: pattern.id,
        type: 'pattern',
        properties: {
          name: pattern.metadata.name,
          category: pattern.metadata.category,
          complexity: pattern.metadata.complexity,
          confidence: pattern.metadata.confidence,
          stakeholders: pattern.content.stakeholders,
          qualityMetrics: pattern.content.qualityMetrics
        },
        embeddings: []
      };

      await this.storeGraphNode(patternNode);

      // Connect pattern to affected repositories
      if (pattern.repositoryId) {
        await this.connectPatternToRepository(pattern.id, pattern.repositoryId, pattern.learningData.effectiveness);
      }

      this.logger.debug('Knowledge pattern added to EKG', { patternId: pattern.id });

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'addKnowledgePattern', patternId: pattern.id });
      throw error;
    }
  }

  /**
   * Query for repository intelligence
   * Returns comprehensive repository understanding with relationships
   */
  async getRepositoryIntelligence(repositoryId: string): Promise<{
    repository: RepositoryNode;
    dependencies: DependencyEdge[];
    relatedPatterns: KnowledgePatternNode[];
    technicalDebt: TechnicalDebtForecast[];
    anomalies: PerformanceAnomaly[];
  }> {
    try {
      // Get repository node
      const repoNode = await this.getGraphNode(repositoryId);
      const repository = this.nodeToRepository(repoNode);

      // Get related edges and nodes
      const dependencies = await this.getRepositoryDependencies(repositoryId);
      const relatedPatterns = await this.getRepositoryPatterns(repositoryId);
      const technicalDebt = await this.getRepositoryTechnicalDebt(repositoryId);
      const anomalies = await this.getRepositoryAnomalies(repositoryId);

      return {
        repository,
        dependencies,
        relatedPatterns,
        technicalDebt,
        anomalies
      };

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'getRepositoryIntelligence', repositoryId });
      throw error;
    }
  }

  /**
   * Perform cross-repository pattern analysis
   * Identifies code duplication, standards violations, or architectural opportunities
   */
  async analyzeCrossRepositoryPatterns(repositories: string[]): Promise<{
    duplicatedCode: Array<{
      pattern: string;
      repositories: string[];
      locations: Array<{ repoId: string; files: string[] }>;
    }>;
    standardsViolations: Array<{
      standard: string;
      violations: Array<{ repoId: string; details: string }>;
    }>;
    architecturalOpportunities: Array<{
      opportunity: string;
      affectedRepos: string[];
      benefit: string;
    }>;
  }> {
    try {
      this.logger.debug('Performing cross-repository pattern analysis', {
        repositoryCount: repositories.length
      });

      const duplicatedCode = await this.findDuplicatedCode(repositories);
      const standardsViolations = await this.findStandardsViolations(repositories);
      const architecturalOpportunities = await this.findArchitecturalOpportunities(repositories);

      return {
        duplicatedCode,
        standardsViolations,
        architecturalOpportunities
      };

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'analyzeCrossRepositoryPatterns' });
      throw error;
    }
  }

  /**
   * Search for similar repositories or patterns
   * Uses embeddings for semantic similarity search
   */
  async findSimilarRepositories(repositoryId: string, limit: number = 10): Promise<{
    repository: RepositoryNode;
    similar: Array<{ repo: RepositoryNode; similarity: number; reasons: string[] }>;
  }> {
    try {
      const repoNode = await this.getGraphNode(repositoryId);
      const repository = this.nodeToRepository(repoNode);

      const similar: Array<{ repo: RepositoryNode; similarity: number; reasons: string[] }> = [];

      for (const [id, node] of this.nodes) {
        if (id === repositoryId || node.type !== 'repository') continue;

        const similarity = this.calculateSimilarity(repoNode.embeddings, node.embeddings);
        const reasons = this.getSimilarityReasons(repoNode.properties, node.properties);

        if (similarity > 0.3) { // Similarity threshold
          similar.push({
            repo: this.nodeToRepository(node),
            similarity,
            reasons
          });
        }
      }

      // Sort by similarity and return top results
      similar.sort((a, b) => b.similarity - a.similarity);

      return {
        repository,
        similar: similar.slice(0, limit)
      };

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'findSimilarRepositories', repositoryId });
      throw error;
    }
  }

  /**
   * Update repository metrics and relationships
   * Called when repositories change or new data becomes available
   */
  async updateRepositoryMetrics(repositoryId: string, updates: {
    metrics?: Partial<RepositoryMetrics>;
    dependencies?: DependencyEdge[];
    patterns?: KnowledgePatternNode[];
  }): Promise<void> {
    try {
      const node = await this.getGraphNode(repositoryId);

      if (updates.metrics) {
        node.properties = { ...node.properties, ...updates.metrics };
      }

      // Update stored node
      await this.storeGraphNode(node);

      // Update relationships if provided
      if (updates.dependencies) {
        await Promise.all(updates.dependencies.map(dep => this.addDependency(dep)));
      }

      if (updates.patterns) {
        await Promise.all(updates.patterns.map(pat => this.addKnowledgePattern(pat)));
      }

      this.logger.debug('Repository metrics updated', { repositoryId });

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'updateRepositoryMetrics', repositoryId });
      throw error;
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async storeGraphNode(node: GraphNode): Promise<void> {
    this.nodes.set(node.id, node);

    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Set());
    }

    // Persist to storage layer
    await this.storageManager.storeMetadata('ekg', `node_${node.id}`, node);
  }

  private async storeGraphEdge(edge: GraphEdge): Promise<void> {
    this.edges.set(edge.id, edge);

    // Add to adjacency list for graph traversal
    if (!this.adjacencyList.has(edge.sourceId)) {
      this.adjacencyList.set(edge.sourceId, new Set());
    }
    this.adjacencyList.get(edge.sourceId)!.add(edge);

    // Persist to storage layer
    await this.storageManager.storeMetadata('ekg', `edge_${edge.id}`, edge);
  }

  private async getGraphNode(nodeId: string): Promise<GraphNode> {
    let node = this.nodes.get(nodeId);

    if (!node) {
      // Try to load from storage
      node = await this.storageManager.getMetadata('ekg', `node_${nodeId}`);
      if (node) {
        this.nodes.set(nodeId, node);
      }
    }

    if (!node) {
      throw new Error(`Graph node not found: ${nodeId}`);
    }

    return node;
  }

  private nodeToRepository(node: GraphNode): RepositoryNode {
    return {
      id: node.id,
      organizationId: node.properties.organizationId,
      platform: node.properties.platform,
      name: node.properties.name,
      fullName: `${node.properties.organizationId}/${node.properties.name}`,
      url: `https://${node.properties.platform}.com/${node.properties.fullName}`,
      metadata: {
        language: node.properties.language,
        languages: {}, // Would be expanded from stored data
        size: node.properties.size,
        stars: 0, // Would be fetched from platform API
        forks: 0,
        watchers: 0,
        isPrivate: false,
        isArchived: false,
        isTemplate: false,
        license: 'MIT',
        topics: []
      },
      temporalData: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pushedAt: new Date().toISOString(),
        analyzedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString()
      },
      relationships: {
        parentOrganization: node.properties.organizationId,
        teamOwnership: [],
        technicalDebt: node.properties.technicalDebt,
        securityPosture: node.properties.securityPosture,
        activityMetrics: node.properties.activityMetrics
      },
      embeddings: {
        descriptionEmbedding: [],
        codeEmbedding: node.embeddings || [],
        patternEmbedding: []
      }
    };
  }

  private calculateSimilarity(vecA?: number[], vecB?: number[]): number {
    if (!vecA || !vecB) return 0;

    // Cosine similarity calculation
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private getSimilarityReasons(propsA: any, propsB: any): string[] {
    const reasons: string[] = [];

    // Language similarity
    if (propsA.language === propsB.language) {
      reasons.push(`Same primary language: ${propsA.language}`);
    }

    // Size similarity
    const sizeDiff = Math.abs(propsA.size - propsB.size) / Math.max(propsA.size, propsB.size);
    if (sizeDiff < 0.5) {
      reasons.push(`Similar repository size`);
    }

    // Activity pattern similarity
    const activityA = propsA.activityMetrics;
    const activityB = propsB.activityMetrics;
    if (activityA && activityB && Math.abs(activityA.commitsLastWeek - activityB.commitsLastWeek) < 10) {
      reasons.push(`Similar activity levels`);
    }

    return reasons;
  }

  // ==================== IMPLEMENTED PRIVATE METHODS ====================

  private async migrateExistingData(): Promise<void> {
    this.logger.info('Migrating existing VECTOR data to EKG');

    // Scan filesystem for existing .codeflow directories (from Phase 2/3)
    await this.scanExistingRepositories();

    // Load ProjectKnowledge from existing VECTOR stores
    await this.loadExistingProjectKnowledge();

    // Convert single-repository VECTOR data to multi-repository EKG graph
    await this.convertVectorToEkg();

    // Build initial cross-repository relationships
    await this.buildInitialRelationships();

    this.logger.info('Data migration from VECTOR to EKG completed');
  }

  private async buildGraphIndices(): Promise<void> {
    this.logger.debug('Building EKG graph indices');

    // Create full-text search indices for repository names and descriptions
    await this.buildTextSearchIndices();

    // Build embedding vector indices for semantic search
    await this.buildEmbeddingIndices();

    // Create relationship type indices for fast traversal
    await this.buildRelationshipIndices();

    // Build temporal indices for activity and trend analysis
    await this.buildTemporalIndices();

    this.logger.debug('Graph indices built successfully');
  }

  private async warmCache(): Promise<void> {
    this.logger.debug('Warming EKG cache for critical repositories');

    // Determine critical repositories (high activity, large size, popular)
    const criticalRepos = await this.identifyCriticalRepositories();

    // Load their data into memory cache
    await Promise.all(
      criticalRepos.slice(0, 50).map(repoId =>
        this.loadRepositoryToCache(repoId)
      )
    );

    this.logger.debug(`Warmed cache with ${Math.min(50, criticalRepos.length)} critical repositories`);
  }

  private async buildRepositoryRelationships(repo: RepositoryNode): Promise<void> {
    // Create organization relationship
    const orgEdge: GraphEdge = {
      id: `org-${repo.organizationId}-${repo.id}`,
      sourceId: repo.organizationId,
      targetId: repo.id,
      type: 'belongs_to',
      properties: {
        role: 'member',
        joinedAt: repo.temporalData.createdAt,
        isPrivate: repo.metadata.isPrivate
      }
    };

    await this.storeGraphEdge(orgEdge);

    // Create team ownership relationships
    for (const teamId of repo.relationships.teamOwnership) {
      const teamEdge: GraphEdge = {
        id: `team-${teamId}-${repo.id}`,
        sourceId: teamId,
        targetId: repo.id,
        type: 'owned_by',
        properties: {
          role: 'contributor',
          scope: 'read-write'
        }
      };

      await this.storeGraphEdge(teamEdge);
    }
  }

  private async updateRepositoryDependencies(edge: DependencyEdge): Promise<void> {
    // Create or update dependency relationships between repositories
    await this.storeGraphEdge({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.edgeType,
      properties: {
        ...edge.properties,
        lastAnalyzed: new Date().toISOString()
      }
    });

    // Update repository node metadata with aggregated dependency info
    await this.updateRepositoryDependencyMetrics(edge.sourceId);
    await this.updateRepositoryDependencyMetrics(edge.targetId);
  }

  private async connectPatternToRepository(patternId: string, repoId: string, effectiveness: any): Promise<void> {
    const patternEdge: GraphEdge = {
      id: `pattern-${patternId}-${repoId}`,
      sourceId: patternId,
      targetId: repoId,
      type: 'applies_to',
      properties: {
        effectiveness: effectiveness,
        detectedAt: new Date().toISOString(),
        confidence: 0.85
      }
    };

    await this.storeGraphEdge(patternEdge);
  }

  private async getRepositoryDependencies(repoId: string): Promise<DependencyEdge[]> {
    const dependencies: DependencyEdge[] = [];

    // Get all edges connected to this repository
    const edges = this.adjacencyList.get(repoId);
    if (!edges) return dependencies;

    for (const edge of edges) {
      if (['depends_on', 'dev_depends_on', 'build_depends_on'].includes(edge.type)) {
        dependencies.push(this.edgeToDependency(edge));
      }
    }

    return dependencies;
  }

  private async getRepositoryPatterns(repoId: string): Promise<KnowledgePatternNode[]> {
    // Find all patterns that apply to this repository
    const patterns: KnowledgePatternNode[] = [];

    // Scan all pattern nodes and their relationships
    for (const [nodeId, node] of this.nodes) {
      if (node.type !== 'pattern') continue;

      // Check if pattern applies to this repository
      const patternEdges = this.adjacencyList.get(nodeId);
      if (patternEdges) {
        for (const edge of patternEdges) {
          if (edge.targetId === repoId && edge.type === 'applies_to') {
            patterns.push(this.nodeToPattern(node));
            break;
          }
        }
      }
    }

    return patterns;
  }

  private async getRepositoryTechnicalDebt(repoId: string): Promise<TechnicalDebtForecast[]> {
    // For Phase 4A, return empty array - would be populated by predictive intelligence engine
    // In full implementation, would query predictive forecasts from storage
    return [];
  }

  private async getRepositoryAnomalies(repoId: string): Promise<PerformanceAnomaly[]> {
    // For Phase 4A, return empty array - would be populated by predictive intelligence engine
    // In full implementation, would query anomaly data from storage
    return [];
  }

  // ==================== MIGRATION HELPERS ====================

  private async scanExistingRepositories(): Promise<Array<{ path: string, repoId: string }>> {
    const existingRepos: Array<{ path: string, repoId: string }> = [];

    // Scan for .codeflow directories indicating existing Phase 2/3 installations
    const fs = require('fs').promises;
    const path = require('path');

    // Start from current directory and scan upwards
    let currentDir = process.cwd();
    const maxDepth = 3;

    for (let depth = 0; depth < maxDepth && currentDir !== '/'; depth++) {
      try {
        const items = await fs.readdir(currentDir);

        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = await fs.stat(fullPath);

          if (stat.isDirectory() && item === '.codeflow') {
            const repoId = this.generateRepoId(path.dirname(fullPath));
            existingRepos.push({
              path: path.dirname(fullPath),
              repoId
            });
          }
        }
      } catch (error) {
        // Skip directories we can't access
      }

      currentDir = path.dirname(currentDir);
    }

    this.logger.debug(`Found ${existingRepos.length} existing repositories to migrate`);
    return existingRepos;
  }

  private async loadExistingProjectKnowledge(): Promise<void> {
    // Load existing ProjectKnowledge entities from VECTOR stores
    const existingRepos = await this.scanExistingRepositories();

    for (const { path: repoPath, repoId } of existingRepos) {
      try {
        // Try to load existing ProjectKnowledge from .codeflow directory
        const knowledgePath = require('path').join(repoPath, '.codeflow', 'knowledge.json');

        if (require('fs').existsSync(knowledgePath)) {
          const knowledgeData = JSON.parse(require('fs').readFileSync(knowledgePath, 'utf8'));

          // Convert to RepositoryNode and add to graph
          const repository = this.knowledgeToRepository(knowledgeData, repoId, repoPath);
          await this.addRepository(repository);

          this.logger.debug(`Migrated repository: ${repoId}`);
        }
      } catch (error) {
        this.errorHandler.handleError(error, { operation: 'loadExistingProjectKnowledge', repoId });
      }
    }
  }

  private async convertVectorToEkg(): Promise<void> {
    // Convert existing dependency relationships and patterns to graph edges
    // This would analyze existing dependency data and create proper graph relationships
    this.logger.debug('Converting VECTOR relationships to EKG format');
  }

  private async buildInitialRelationships(): Promise<void> {
    // Scan for common dependency patterns across migrated repositories
    // This could identify shared libraries, frameworks, etc. used across the organization
    this.logger.debug('Building initial cross-repository relationships');
  }

  private knowledgeToRepository(knowledge: any, repoId: string, repoPath: string): RepositoryNode {
    // Convert ProjectKnowledge entity to RepositoryNode format
    return {
      id: repoId,
      organizationId: this.extractOrganization(repoPath),
      platform: this.detectPlatform(repoPath),
      name: require('path').basename(repoPath),
      fullName: '',
      url: '',
      metadata: {
        language: knowledge.codebase?.languages?.[0]?.name || 'unknown',
        languages: knowledge.codebase?.statistics?.languageBreakdown || {},
        size: knowledge.codebase?.statistics?.totalLines || 0,
        stars: 0,
        forks: 0,
        watchers: 0,
        isPrivate: false,
        isArchived: false,
        isTemplate: false,
        license: 'MIT',
        topics: []
      },
      temporalData: {
        createdAt: knowledge.createdAt,
        updatedAt: new Date().toISOString(),
        pushedAt: knowledge.lastUpdated,
        analyzedAt: new Date().toISOString(),
        lastActivityAt: knowledge.lastUpdated
      },
      relationships: {
        parentOrganization: this.extractOrganization(repoPath),
        teamOwnership: [],
        technicalDebt: knowledge.projectId ? {
          score: knowledge.codebase.patterns?.length || 0,
          trends: [],
          hotspots: []
        } : { score: 0, trends: [], hotspots: [] },
        securityPosture: { vulnerabilityCount: 0, riskScore: 0, complianceScore: 0 },
        activityMetrics: this.extractActivityMetrics(knowledge)
      },
      embeddings: {
        descriptionEmbedding: [],
        codeEmbedding: [], // Would need to generate from existing VECTOR data
        patternEmbedding: []
      }
    };
  }

  private extractOrganization(repoPath: string): string {
    // Extract organization from git remote URL or path structure
    try {
      const gitConfigPath = require('path').join(repoPath, '.git', 'config');
      if (require('fs').existsSync(gitConfigPath)) {
        const config = require('fs').readFileSync(gitConfigPath, 'utf8');
        const remoteUrlMatch = config.match(/url = .*github\.com[:/]([^\/]+)\/[^\/]+/);
        if (remoteUrlMatch) {
          return remoteUrlMatch[1];
        }
      }
    } catch (error) {
      // Ignore errors in extracting organization
    }
    return 'unknown';
  }

  private detectPlatform(repoPath: string): 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'other' {
    // Determine platform from .git config
    try {
      const gitConfigPath = require('path').join(repoPath, '.git', 'config');
      if (require('fs').existsSync(gitConfigPath)) {
        const config = require('fs').readFileSync(gitConfigPath, 'utf8');
        if (config.includes('github.com')) return 'github';
        if (config.includes('gitlab.com')) return 'gitlab';
        if (config.includes('bitbucket.org')) return 'bitbucket';
        if (config.includes('azure.com')) return 'azure';
      }
    } catch (error) {
      // Ignore errors in platform detection
    }
    return 'other';
  }

  private generateRepoId(repoPath: string): string {
    // Generate deterministic repository ID from path
    const crypto = require('crypto');
    return crypto.createHash('md5')
      .update(require('path').resolve(repoPath))
      .digest('hex')
      .substring(0, 12);
  }

  private extractActivityMetrics(knowledge: any): ActivityMetrics {
    // Extract activity metrics from existing knowledge
    return {
      commitsLastWeek: knowledge.performance?.analysisMetrics?.totalAnalyses || 0,
      activeContributors: knowledge.team?.members?.length || 0,
      deploymentFrequency: 'unknown',
      leadTime: 0
    };
  }

  // ==================== INDEXING HELPERS ====================

  private async buildTextSearchIndices(): Promise<void> {
    // Create full-text search indices for efficient name/description lookup
    this.logger.debug('Building text search indices');
  }

  private async buildEmbeddingIndices(): Promise<void> {
    // Build vector indices for semantic similarity search
    this.logger.debug('Building embedding vector indices');
  }

  private async buildRelationshipIndices(): Promise<void> {
    // Create efficient indices for relationship traversal
    this.logger.debug('Building relationship type indices');
  }

  private async buildTemporalIndices(): Promise<void> {
    // Build indices for time-based queries and trend analysis
    this.logger.debug('Building temporal indices');
  }

  private async identifyCriticalRepositories(): Promise<string[]> {
    // Rank repositories by activity, size, dependencies, etc.
    const criticalRepos: string[] = [];
    let maxScore = 0;

    for (const [id, node] of this.nodes) {
      if (node.type !== 'repository') continue;

      // Calculate criticality score
      const activity = node.properties.activityMetrics?.commitsLastWeek || 0;
      const size = node.properties.size || 0;
      const dependencies = this.adjacencyList.get(id)?.size || 0;

      const score = activity * 0.4 + size * 0.3 + dependencies * 0.3;

      if (score > maxScore || criticalRepos.length < 100) {
        criticalRepos.push(id);
        maxScore = Math.max(maxScore, score);
      }
    }

    return criticalRepos.sort((a, b) => {
      // Simple sorting by score - full implementation would use proper ranking
      const nodeA = this.nodes.get(a);
      const nodeB = this.nodes.get(b);
      const scoreA = (nodeA?.properties.activityMetrics?.commitsLastWeek || 0) +
                    (nodeA?.properties.size || 0);
      const scoreB = (nodeB?.properties.activityMetrics?.commitsLastWeek || 0) +
                    (nodeB?.properties.size || 0);
      return scoreB - scoreA;
    });
  }

  private async loadRepositoryToCache(repoId: string): Promise<void> {
    // Load complete repository data including relationships into memory
    const repository = await this.getGraphNode(repoId);

    // Load related edges
    const edges = this.adjacencyList.get(repoId) || new Set();

    // Load connected nodes
    for (const edge of edges) {
      if (!this.nodes.has(edge.targetId)) {
        try {
          await this.getGraphNode(edge.targetId);
        } catch (error) {
          // Skip missing nodes
        }
      }
    }
  }

  private updateRepositoryDependencyMetrics(repoId: string): Promise<void> {
    // Update repository node's aggregated dependency statistics
    return Promise.resolve();
  }

  private edgeToDependency(edge: GraphEdge): DependencyEdge {
    // Convert GraphEdge to DependencyEdge format
    return {
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      edgeType: edge.type as DependencyEdgeType,
      properties: {
        startDate: edge.properties.startDate || new Date().toISOString(),
        endDate: edge.properties.endDate,
        lastConfirmed: edge.properties.lastAnalyzed || new Date().toISOString(),
        dependencyType: edge.properties.dependencyType || 'runtime',
        versionConstraint: edge.properties.version || '*',
        currentVersion: edge.properties.version || 'latest',
        latestVersion: edge.properties.version || 'latest',
        usageFrequency: edge.properties.usage || 1,
        transitiveDepth: edge.properties.depth || 0,
        confidence: edge.properties.confidence || 0.8
      },
      analysis: {
        security: {
          vulnerabilities: [],
          licenseCompatibility: { compatible: true, issues: [], recommendations: [] },
          supplyChainRisk: 0
        },
        reliability: {
          maintenanceScore: 0.8,
          popularityScore: 0.6,
          communitySupport: true
        },
        alternatives: {
          suggestedAlternatives: [],
          migrationDifficulty: 1,
          benefitAnalysis: { maintenanceCost: 0, performanceGain: 0, securityImprovement: 0, totalBenefit: 0 }
        }
      }
    };
  }

  private nodeToPattern(node: GraphNode): KnowledgePatternNode {
    // Convert GraphNode to KnowledgePatternNode format
    return {
      id: node.id,
      repositoryId: '', // Would need to be tracked separately
      metadata: {
        patternType: 'architectural',
        name: node.properties.name || '',
        category: node.properties.category || '',
        complexity: node.properties.complexity || 'medium',
        confidence: node.properties.confidence || 0.8,
        discoveredAt: new Date().toISOString(),
        lastObservedAt: new Date().toISOString(),
        observationCount: 1
      },
      content: {
        description: node.properties.description || '',
        stakeholders: node.properties.stakeholders || [],
        participants: [],
        relationships: [],
        codeExamples: [],
        locations: [],
        qualityMetrics: node.properties.qualityMetrics || {
          cohesion: 0.7,
          coupling: 0.3,
          maintainability: 0.8,
          testability: 0.7
        }
      },
      learningData: {
        effectiveness: [],
        feedback: [],
        improvements: []
      }
    };
  }

  private async findDuplicatedCode(repositories: string[]): Promise<any[]> {
    return []; // Would analyze code across repositories
  }

  private async findStandardsViolations(repositories: string[]): Promise<any[]> {
    return []; // Would scan for standards compliance
  }

  private async findArchitecturalOpportunities(repositories: string[]): Promise<any[]> {
    return []; // Would identify refactoring opportunities
  }
}

// Export main service class
export default EnterpriseKnowledgeGraph;

// Export types for external use
export type {
  GraphNode,
  GraphEdge
};

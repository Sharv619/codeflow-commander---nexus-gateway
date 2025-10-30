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
  PerformanceAnomaly
} from '@/types/entities';

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

  // Placeholder implementations for Phase 4A - would be expanded in later phases
  private async migrateExistingData(): Promise<void> {
    this.logger.debug('Migrating existing VECTOR data to EKG');
    // Implementation would scan existing repositories and build initial graph
  }

  private async buildGraphIndices(): Promise<void> {
    this.logger.debug('Building EKG graph indices');
    // Create performance indices for graph traversal
  }

  private async warmCache(): Promise<void> {
    this.logger.debug('Warming EKG cache for critical repositories');
    // Load frequently accessed repositories into memory
  }

  private async buildRepositoryRelationships(repo: RepositoryNode): Promise<void> {
    // Create edges to organization, teams, etc.
  }

  private async updateRepositoryDependencies(edge: DependencyEdge): Promise<void> {
    // Update repository-to-repository relationship strength
  }

  private async connectPatternToRepository(patternId: string, repoId: string, effectiveness: any): Promise<void> {
    // Create edge between pattern and repository
  }

  private async getRepositoryDependencies(repoId: string): Promise<DependencyEdge[]> {
    return []; // Would query graph for dependency edges
  }

  private async getRepositoryPatterns(repoId: string): Promise<KnowledgePatternNode[]> {
    return []; // Would query graph for pattern nodes
  }

  private async getRepositoryTechnicalDebt(repoId: string): Promise<TechDebtForecast[]> {
    return []; // Would query predictive intelligence data
  }

  private async getRepositoryAnomalies(repoId: string): Promise<PerformanceAnomaly[]> {
    return []; // Would query anomaly detection data
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

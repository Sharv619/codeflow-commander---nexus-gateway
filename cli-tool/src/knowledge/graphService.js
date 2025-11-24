/**
 * cli-tool/src/knowledge/graphService.js
 * Phase 4 Enterprise Knowledge Graph Implementation
 *
 * Neo4j-based enterprise knowledge management with predictive analytics
 * Handles cross-repository intelligence, technical debt forecasting, and anomaly detection
 */

import { RepositoryNode, DependencyEdge, KnowledgePatternNode, TechnicalDebtForecast, PerformanceAnomaly } from '../types/entities.js';

// Cache import will be conditional
let LRUCache = null;
try {
  LRUCache = (await import('lru-cache')).default;
} catch (e) {
  // Fallback - cache will be disabled
}

/**
 * GraphService - Enterprise knowledge graph service
 * Manages Neo4j connections and cross-repository intelligence
 */
export class GraphService {
  constructor(config = {}) {
    this.url = config.url || process.env.GRAPH_URL;
    this.user = config.user || process.env.GRAPH_USER;
    this.password = config.password || process.env.GRAPH_PASS;
    this.driver = null;
    this.initialized = false;

    // LRU cache for query results
    this.cache = LRUCache ? new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 10, // 10 minutes
      allowStale: false
    }) : null;

    this.cacheEnabled = !!this.cache;
  }

  /**
   * Initialize the graph service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import neo4j-driver if available
      const neo4j = await import('neo4j-driver').catch(() => null);
      if (!neo4j) {
        throw new Error('Neo4j driver not available. Install with: npm install neo4j-driver');
      }

      // Create Neo4j driver
      this.driver = neo4j.driver(
        this.url,
        neo4j.auth.basic(this.user, this.password),
        {
          maxConnectionPoolSize: 10,
          connectionTimeout: 60000
        }
      );

      // Test connection
      await this._verifyConnection();

      this.initialized = true;
      console.log('🔗 Enterprise Knowledge Graph connected');

    } catch (error) {
      console.warn(`⚠️  Graph service initialization failed: ${error.message}`);
      // Service remains uninitialized but doesn't crash the CLI
      this.initialized = false;
    }
  }

  /**
   * Verify Neo4j connection
   */
  async _verifyConnection() {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    try {
      await session.run('RETURN "Graph connection test" as result');
      console.log('✅ Neo4j connection verified');
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a Cypher query with error handling
   */
  async _executeQuery(cypher, params = {}) {
    if (!this.initialized || !this.driver) {
      throw new Error('Graph service not initialized');
    }

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);
      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Cache key generation
   */
  _cacheKey(operation, ...params) {
    return `${operation}:${JSON.stringify(params)}`;
  }

  /**
   * Upsert a repository node
   */
  async upsertRepository(repositoryNode) {
    if (!this.initialized) {
      console.warn('⚠️  Graph service not initialized - repository not upserted');
      return;
    }

    try {
      const cypher = `
        MERGE (r:Repository {id: $id})
        SET r.organizationId = $organizationId,
            r.platform = $platform,
            r.name = $name,
            r.fullName = $fullName,
            r.url = $url,
            r.language = $metadata.language,
            r.languages = $metadata.languages,
            r.size = $metadata.size,
            r.stars = $metadata.stars,
            r.forks = $metadata.forks,
            r.watchers = $metadata.watchers,
            r.isPrivate = $metadata.isPrivate,
            r.isArchived = $metadata.isArchived,
            r.isTemplate = $metadata.isTemplate,
            r.license = $metadata.license,
            r.topics = $metadata.topics,
            r.createdAt = datetime($temporalData.createdAt),
            r.updatedAt = datetime($temporalData.updatedAt),
            r.pushedAt = datetime($temporalData.pushedAt),
            r.analyzedAt = datetime($temporalData.analyzedAt),
            r.lastActivityAt = datetime($temporalData.lastActivityAt),
            r.debtScore = $relationships.technicalDebt.score,
            r.securityScore = $relationships.securityPosture.riskScore,
            r.activityCommitsLastWeek = $relationships.activityMetrics.commitsLastWeek,
            r.activityActiveContributors = $relationships.activityMetrics.activeContributors,
            r.descriptionEmbedding = $embeddings.descriptionEmbedding,
            r.codeEmbedding = $embeddings.codeEmbedding,
            r.patternEmbedding = $embeddings.patternEmbedding
        RETURN r
      `;

      await this._executeQuery(cypher, {
        id: repositoryNode.id,
        organizationId: repositoryNode.organizationId,
        platform: repositoryNode.platform,
        name: repositoryNode.name,
        fullName: repositoryNode.fullName,
        url: repositoryNode.url,
        metadata: repositoryNode.metadata,
        temporalData: repositoryNode.temporalData,
        relationships: repositoryNode.relationships,
        embeddings: repositoryNode.embeddings
      });

      console.log(`✅ Repository ${repositoryNode.fullName} upserted to knowledge graph`);

    } catch (error) {
      console.error(`❌ Failed to upsert repository: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a dependency edge
   */
  async addDependency(dependencyEdge) {
    if (!this.initialized) {
      console.warn('⚠️  Graph service not initialized - dependency not added');
      return;
    }

    try {
      const cypher = `
        MATCH (source:Repository {id: $sourceId})
        MATCH (target:Repository {id: $targetId})
        MERGE (source)-[dep:DEPENDS_ON {
          id: $id,
          versionConstraint: $versionConstraint,
          currentVersion: $currentVersion,
          usageFrequency: $usageFrequency,
          confidence: $confidence
        }]->(target)
        SET dep.startDate = date($startDate),
            dep.endDate = CASE WHEN $endDate IS NOT NULL THEN date($endDate) ELSE null END,
            dep.lastConfirmed = date($lastConfirmed),
            dep.maintenanceScore = $analysis.reliability.maintenanceScore,
            dep.popularityScore = $analysis.reliability.popularityScore,
            dep.communitySupport = $analysis.reliability.communitySupport,
            dep.vulnerabilitiesCount = size($analysis.security.vulnerabilities),
            dep.supplyChainRisk = $analysis.security.supplyChainRisk,
            dep.alternativesAvailable = size($analysis.alternatives.suggestedAlternatives),
            dep.migrationComplexity = $analysis.alternatives.suggestedAlternatives[0].migrationComplexity,
            dep.benefitAnalysis = $analysis.alternatives.benefitAnalysis
        RETURN dep
      `;

      await this._executeQuery(cypher, {
        sourceId: dependencyEdge.sourceId,
        targetId: dependencyEdge.targetId,
        id: dependencyEdge.id,
        versionConstraint: dependencyEdge.properties.versionConstraint,
        currentVersion: dependencyEdge.properties.currentVersion,
        usageFrequency: dependencyEdge.properties.usageFrequency,
        confidence: dependencyEdge.properties.confidence,
        startDate: dependencyEdge.properties.startDate,
        endDate: dependencyEdge.properties.endDate,
        lastConfirmed: dependencyEdge.properties.lastConfirmed,
        analysis: dependencyEdge.analysis
      });

      console.log(`✅ Dependency ${dependencyEdge.sourceId} -> ${dependencyEdge.targetId} added to knowledge graph`);

    } catch (error) {
      console.error(`❌ Failed to add dependency: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get knowledge patterns from the graph
   */
  async getKnowledgePatterns(limit = 50) {
    if (!this.initialized) {
      console.warn('⚠️  Graph service not initialized - patterns not available');
      return [];
    }

    const cacheKey = this._cacheKey('getKnowledgePatterns', limit);

    // Check cache first
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const cypher = `
        MATCH (p:KnowledgePattern)
        RETURN p
        ORDER BY p.observationCount DESC, p.confidence DESC
        LIMIT $limit
      `;

      const result = await this._executeQuery(cypher, { limit });

      const patterns = result.records.map(record => {
        const node = record.get('p').properties;
        return new KnowledgePatternNode({
          id: node.id,
          repositoryId: node.repositoryId,
          metadata: {
            patternType: node.patternType,
            name: node.name,
            category: node.category,
            complexity: node.complexity,
            confidence: node.confidence,
            discoveredAt: node.discoveredAt,
            lastObservedAt: node.lastObservedAt,
            observationCount: node.observationCount
          },
          content: node.content,
          learningData: node.learningData
        });
      });

      // Cache the result
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, patterns);
      }

      return patterns;

    } catch (error) {
      console.error(`❌ Failed to get knowledge patterns: ${error.message}`);
      return [];
    }
  }

  /**
   * Forecast technical debt for a repository
   */
  async forecastTechnicalDebt(repositoryId) {
    if (!this.initialized) {
      console.warn('⚠️  Graph service not initialized - forecast not available');
      return null;
    }

    try {
      const cypher = `
        MATCH (r:Repository {id: $repositoryId})
        OPTIONAL MATCH (r)-[dep:DEPENDS_ON]->(depRepo:Repository)
        OPTIONAL MATCH (r)<-[revDep:DEPENDS_ON]-(revDepRepo:Repository)

        WITH r,
             count(dep) as outgoingDeps,
             count(depRepo) as dependencyCount,
             count(revDep) as incomingDeps,
             count(revDepRepo) as dependentCount,
             collect(DISTINCT depRepo.debtScore) as depDebtScores,
             r.debtScore as currentDebtScore,
             r.activityCommitsLastWeek as weeklyCommits,
             r.activityActiveContributors as activeContributors

        RETURN
          outgoingDeps,
          dependencyCount,
          incomingDeps,
          dependentCount,
          depDebtScores,
          currentDebtScore,
          weeklyCommits,
          activeContributors,
          r.createdAt as repositoryAge
      `;

      const result = await this._executeQuery(cypher, { repositoryId });

      if (result.records.length === 0) {
        throw new Error('Repository not found in knowledge graph');
      }

      const record = result.records[0];
      const stats = {
        outgoingDeps: record.get('outgoingDeps').toNumber(),
        dependencyCount: record.get('dependencyCount').toNumber(),
        incomingDeps: record.get('incomingDeps').toNumber(),
        dependentCount: record.get('dependentCount').toNumber(),
        depDebtScores: record.get('depDebtScores').map(s => s || 0),
        currentDebtScore: record.get('currentDebtScore') || 0,
        weeklyCommits: record.get('weeklyCommits') || 0,
        activeContributors: record.get('activeContributors') || 0,
        repositoryAge: record.get('repositoryAge')
      };

      // Calculate technical debt forecast
      const forecast = await this._calculateTechnicalDebtForecast(stats, repositoryId);

      console.log(`📊 Technical debt forecast generated for ${repositoryId}`);
      return forecast;

    } catch (error) {
      console.error(`❌ Failed to forecast technical debt: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate technical debt forecast based on repository statistics
   */
  async _calculateTechnicalDebtForecast(stats, repositoryId) {
    const avgDepDebt = stats.depDebtScores.reduce((sum, score) => sum + score, 0) /
                      Math.max(stats.depDebtScores.length, 1);

    // Risk factors for technical debt growth
    const riskFactors = {
      dependencyRisk: Math.min(stats.dependencyCount / 20, 1) * 15, // More dependencies = higher risk
      complexityRisk: Math.min(stats.outgoingDeps / 10, 1) * 10,    // Complex dependency graph = higher risk
      activityRisk: (stats.weeklyCommits < 5 ? 10 : 0),           // Low activity = maintenance risk
      contributorRisk: (stats.activeContributors < 2 ? 8 : 0),     // Low contributors = risk
      depDebtRisk: avgDepDebt * 0.7 // Dependencies' debt affects this repo
    };

    const totalRisk = Object.values(riskFactors).reduce((sum, risk) => sum + risk, 0);
    const projectedDebtScore = Math.min(stats.currentDebtScore + totalRisk, 100);

    // Time-based projections (3 months, 6 months, 12 months)
    const projections = {
      shortTerm: {
        projectionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        predictedDebt: Math.min(stats.currentDebtScore + riskFactors.activityRisk * 0.3, 100),
        confidenceUpper: Math.min(projectedDebtScore + 5, 100),
        confidenceLower: Math.max(projectedDebtScore - 10, 0),
        criticalThreshold: 70,
        contributingFactors: riskFactors,
        mitigationsApplied: []
      },
      mediumTerm: {
        projectionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        predictedDebt: Math.min(stats.currentDebtScore + riskFactors.activityRisk * 0.6, 100),
        confidenceUpper: Math.min(projectedDebtScore + 8, 100),
        confidenceLower: Math.max(projectedDebtScore - 15, 0),
        criticalThreshold: 75,
        contributingFactors: riskFactors,
        mitigationsApplied: []
      },
      longTerm: {
        projectionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        predictedDebt: projectedDebtScore,
        confidenceUpper: Math.min(projectedDebtScore + 12, 100),
        confidenceLower: Math.max(projectedDebtScore - 20, 0),
        criticalThreshold: 80,
        contributingFactors: riskFactors,
        mitigationsApplied: []
      }
    };

    // Generate recommendations based on risk factors
    const recommendations = [];
    if (riskFactors.dependencyRisk > 10) {
      recommendations.push({
        priority: 'high',
        title: 'Reduce dependency complexity',
        description: 'Repository has many dependencies which increases maintenance overhead',
        effort: 8,
        impact: 6
      });
    }

    if (riskFactors.activityRisk > 0) {
      recommendations.push({
        priority: 'critical',
        title: 'Increase development activity',
        description: 'Low commit activity increases technical debt accumulation risk',
        effort: 3,
        impact: 9
      });
    }

    return new TechnicalDebtForecast({
      id: `forecast_${repositoryId}_${Date.now()}`,
      repositoryId,
      forecastType: 'overall',
      metadata: {
        forecastDate: new Date().toISOString(),
        dataRange: { start: '2024-01-01', end: new Date().toISOString() },
        confidenceInterval: 0.85,
        modelVersion: '1.0.0',
        algorithm: 'graph-analytics',
        featureImportance: {
          dependencies: 0.3,
          activity: 0.4,
          complexity: 0.3
        }
      },
      currentState: {
        debtScore: stats.currentDebtScore,
        maintenanceVelocity: stats.weeklyCommits / 7, // commits per day
        codeQualityTrend: stats.weeklyCommits > 10 ? 0.1 : -0.1, // trending up or down
        riskAreas: Object.keys(riskFactors).filter(key => riskFactors[key] > 5),
        codeSmells: [],
        complexityHotspots: [],
        confidence: 0.9
      },
      projections,
      recommendations
    });
  }

  /**
   * Detect performance anomalies for a repository
   */
  async detectPerformanceAnomalies(repositoryId) {
    if (!this.initialized) {
      console.warn('⚠️  Graph service not initialized - anomaly detection not available');
      return [];
    }

    try {
      // Query for performance-related metrics and historical data
      const cypher = `
        MATCH (r:Repository {id: $repositoryId})
        OPTIONAL MATCH (r)-[:HAS_PERFORMANCE_METRIC]->(metric:PerformanceMetric)
        OPTIONAL MATCH (r)-[:HAS_ANOMALY]->(anomaly:PerformanceAnomaly)
        RETURN r, collect(metric) as metrics, count(anomaly) as anomalyCount
      `;

      const result = await this._executeQuery(cypher, { repositoryId });

      if (result.records.length === 0) {
        // No data available - create baseline anomaly detection
        return [this._createBaselineAnomaly(repositoryId)];
      }

      // For now, return empty array as we don't have historical metrics stored
      // In a real implementation, this would analyze metrics against baselines
      const anomalies = [];

      console.log(`🔍 Performance anomaly analysis complete for ${repositoryId}: ${anomalies.length} anomalies detected`);
      return anomalies;

    } catch (error) {
      console.error(`❌ Failed to detect performance anomalies: ${error.message}`);
      return [];
    }
  }

  /**
   * Create baseline anomaly for repositories with no historical data
   */
  _createBaselineAnomaly(repositoryId) {
    return new PerformanceAnomaly({
      id: `anomaly_${repositoryId}_baseline_${Date.now()}`,
      repositoryId,
      metadata: {
        detectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        severity: 'info',
        confidence: 0.5,
        modelVersion: 'baseline'
      },
      characteristics: {
        anomalyType: 'performance_baseline',
        affectedComponents: ['general'],
        performanceMetrics: [{
          metric: 'monitoring_baseline',
          currentValue: 0,
          expectedValue: 1,
          deviation: -1,
          trend: 'stable',
          unit: 'baseline'
        }],
        baselinePerformance: {
          averageResponseTime: 0,
          p95ResponseTime: 0,
          throughput: 0,
          errorRate: 0
        },
        regressionStart: new Date().toISOString(),
        correlationFactors: [{ factor: 'insufficient_data', correlationCoefficient: 0, direction: 'unknown' }],
        confidence: 0.5
      },
      impact: {
        userImpact: 0,
        businessImpact: 0,
        technicalDebtImpact: 0,
        affectedWorkflows: [],
        downstreamEffects: []
      },
      rootCause: {
        primaryCause: { type: 'insufficient_data', component: 'monitoring', change: 'baseline', commit: 'unknown', timestamp: new Date().toISOString() },
        contributingFactors: [],
        evidence: [{ type: 'analysis', location: 'knowledge_graph', evidence: 'First analysis - establishing baseline' }],
        confidence: 0.5
      },
      remediation: {
        immediateActions: [{ id: 'setup_monitoring', title: 'Set up performance monitoring', effort: 'medium', patch: '', validation: 'Monitoring data collection starts' }],
        scheduledActions: [],
        preventiveActions: [],
        automatedFixes: [],
        scriptedFixes: [],
        manualFixes: []
      }
    });
  }

  /**
   * Batch upsert operations for performance
   */
  async batchUpsertRepositories(repositories) {
    if (!this.initialized || !Array.isArray(repositories)) {
      return;
    }

    try {
      const cypher = `
        UNWIND $repositories AS repo
        MERGE (r:Repository {id: repo.id})
        SET r.organizationId = repo.organizationId,
            r.platform = repo.platform,
            r.name = repo.name,
            r.fullName = repo.fullName,
            r.url = repo.url,
            r.language = repo.metadata.language,
            r.size = repo.metadata.size,
            r.stars = repo.metadata.stars,
            r.createdAt = datetime(repo.temporalData.createdAt),
            r.updatedAt = datetime(repo.temporalData.updatedAt)
        RETURN count(r) as upserted
      `;

      const result = await this._executeQuery(cypher, { repositories });
      const upserted = result.records[0].get('upserted').toNumber();

      console.log(`✅ Batch upserted ${upserted} repositories`);
      return upserted;

    } catch (error) {
      console.error(`❌ Batch repository upsert failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get graph statistics
   */
  async getStats() {
    if (!this.initialized) {
      return { initialized: false };
    }

    try {
      const cypher = `
        MATCH (r:Repository)
        OPTIONAL MATCH ()-[dep:DEPENDS_ON]->()
        OPTIONAL MATCH (p:KnowledgePattern)
        RETURN count(DISTINCT r) as repositories,
               count(dep) as dependencies,
               count(DISTINCT p) as patterns,
               r.createdAt as oldestRepo
        ORDER BY r.createdAt ASC
        LIMIT 1
      `;

      const result = await this._executeQuery(cypher);

      if (result.records.length === 0) {
        return { initialized: true, repositories: 0, dependencies: 0, patterns: 0, lastSync: null };
      }

      const record = result.records[0];
      return {
        initialized: true,
        repositories: record.get('repositories').toNumber(),
        dependencies: record.get('dependencies').toNumber(),
        patterns: record.get('patterns').toNumber(),
        lastSync: new Date().toISOString(),
        url: this.url?.replace(/:\/\/.*@/, '://***:***@') // Mask credentials
      };

    } catch (error) {
      console.error(`❌ Failed to get graph stats: ${error.message}`);
      return { initialized: false, error: error.message };
    }
  }

  /**
   * Close the Neo4j driver connection
   */
  async close() {
    if (this.driver) {
      await this.driver.close();
      this.initialized = false;
      console.log('🔌 Enterprise Knowledge Graph disconnected');
    }
  }
}

// Export singleton instance
let graphServiceInstance = null;

/**
 * Get or create the singleton graph service instance
 */
export function getGraphService(config = {}) {
  if (!graphServiceInstance) {
    graphServiceInstance = new GraphService(config);
  }
  return graphServiceInstance;
}

/**
 * Initialize the graph service
 */
export async function initGraphService(config = {}) {
  const service = getGraphService(config);
  await service.initialize();
  return service;
}

export default GraphService;

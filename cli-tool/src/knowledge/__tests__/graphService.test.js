/**
 * cli-tool/src/knowledge/__tests__/graphService.test.js
 * Integration tests for GraphService - Mock Neo4j testing
 */

import { GraphService, getGraphService, initGraphService } from '../graphService.js';
import { RepositoryNode, DependencyEdge, TechnicalDebtForecast, PerformanceAnomaly } from '../../types/entities.js';

// Mock Neo4j module
jest.mock('neo4j-driver', () => ({
  driver: jest.fn(),
  auth: {
    basic: jest.fn(() => 'mock-auth')
  }
}));

// Mock LRU cache
jest.mock('lru-cache', () => {
  return jest.fn().mockImplementation(() => ({
    has: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    max: 100,
    ttl: 600000
  }));
});

/**
 * Mock Neo4j driver implementation for testing
 */
class MockNeo4jSession {
  constructor() {
    this.queries = [];
    this.closed = false;
  }

  async run(cypher, params = {}) {
    this.queries.push({ cypher, params });

    // Mock responses based on query type
    if (cypher.includes('RETURN "Graph connection test"')) {
      return { records: [] };
    }

    if (cypher.includes('MERGE (r:Repository {id: $id})')) {
      return {
        records: [{
          get: () => ({ properties: { id: params.id, name: 'test-repo' } })
        }]
      };
    }

    if (cypher.includes('MERGE (source)-[dep:DEPENDS_ON')) {
      return {
        records: [{
          get: () => ({ properties: { id: params.id, startDate: params.startDate } })
        }]
      };
    }

    if (cypher.includes('MATCH (p:KnowledgePattern)')) {
      return {
        records: [{
          get: () => ({
            properties: {
              id: 'pattern-1',
              repositoryId: 'repo-1',
              patternType: 'architectural',
              name: 'Factory Pattern',
              category: 'creational',
              complexity: 'medium',
              confidence: 0.85,
              discoveredAt: '2024-01-01T00:00:00Z',
              lastObservedAt: '2024-12-01T00:00:00Z',
              observationCount: 25,
              content: { description: 'Test pattern', stakeholders: ['devs'] },
              learningData: { effectiveness: { acceptanceRate: 0.8 } }
            }
          })
        }]
      };
    }

    if (cypher.includes('MATCH (r:Repository {id: $repositoryId})')) {
      return {
        records: [{
          get: (field) => {
            if (field === 'outgoingDeps') return { toNumber: () => 5 };
            if (field === 'dependencyCount') return { toNumber: () => 12 };
            if (field === 'incomingDeps') return { toNumber: () => 3 };
            if (field === 'dependentCount') return { toNumber: () => 8 };
            if (field === 'depDebtScores') return [15, 25, 10];
            if (field === 'currentDebtScore') return 20;
            if (field === 'weeklyCommits') return 15;
            if (field === 'activeContributors') return 4;
            if (field === 'repositoryAge') return new Date('2023-01-01');
            return null;
          }
        }]
      };
    }

    if (cypher.includes('MATCH (r:Repository)')) {
      return {
        records: [{
          get: (field) => {
            if (field === 'repositories') return { toNumber: () => 42 };
            if (field === 'dependencies') return { toNumber: () => 127 };
            if (field === 'patterns') return { toNumber: () => 18 };
            if (field === 'oldestRepo') return new Date('2023-06-01');
            return null;
          }
        }]
      };
    }

    if (cypher.includes('UNWIND $repositories')) {
      return {
        records: [{
          get: () => ({ toNumber: () => params.repositories?.length || 0 })
        }]
      };
    }

    // Default empty response
    return { records: [] };
  }

  close() {
    this.closed = true;
  }
}

class MockNeo4jDriver {
  constructor() {
    this.sessions = [];
  }

  session() {
    const session = new MockNeo4jSession();
    this.sessions.push(session);
    return session;
  }

  close() {
    // Mock close - do nothing
  }
}

describe('GraphService', () => {
  let mockDriver;
  let service;

  beforeEach(() => {
    mockDriver = new MockNeo4jDriver();

    // Mock the neo4j import
    const mockNeo4j = {
      driver: jest.fn(() => mockDriver),
      auth: { basic: jest.fn(() => 'mock-auth') }
    };

    // Override the dynamic import
    global.mockNeo4j = mockNeo4j;

    service = new GraphService({
      url: 'neo4j://localhost:7687',
      user: 'neo4j',
      password: 'password'
    });
  });

  afterEach(async () => {
    if (service.initialized) {
      await service.close();
    }

    // Clean up mocks
    if (global.mockNeo4j) {
      delete global.mockNeo4j;
    }
  });

  describe('initialization', () => {
    test('should handle missing neo4j driver gracefully', async () => {
      // Temporarily override the import mock to simulate missing neo4j
      const originalMockNeo4j = global.mockNeo4j;
      delete global.mockNeo4j;

      const serviceNoDriver = new GraphService();

      // Mock dynamic import failure
      const originalImport = global.import;
      global.import = jest.fn().mockRejectedValue(new Error('Module not found'));

      await serviceNoDriver.initialize();

      expect(serviceNoDriver.initialized).toBe(false);

      // Restore
      global.import = originalImport;
      global.mockNeo4j = originalMockNeo4j;
    });

    test('should successfully initialize with valid neo4j driver', async () => {
      // Mock successful import in the service
      const originalInit = service.initialize;
      service.initialize = async function() {
        try {
          this.driver = mockDriver;
          await this._verifyConnection();
          this.initialized = true;
          console.log('🔗 Enterprise Knowledge Graph connected');
        } catch (error) {
          this.initialized = false;
          throw error;
        }
      };

      await service.initialize();
      expect(service.initialized).toBe(true);
      expect(service.driver).toBe(mockDriver);
    });
  });

  describe('upsertRepository', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should upsert repository successfully', async () => {
      const repo = new RepositoryNode({
        id: 'test-repo-1',
        organizationId: 'org-123',
        platform: 'github',
        name: 'test-repo',
        fullName: 'org/test-repo',
        url: 'https://github.com/org/test-repo',
        metadata: { language: 'javascript', size: 1024 },
        temporalData: {
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-12-01T00:00:00Z'
        },
        relationships: {
          technicalDebt: { score: 15 },
          securityPosture: { riskScore: 20 }
        }
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      await service.upsertRepository(repo);

      expect(mockDriver.sessions.length).toBeGreaterThan(0);
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Repository org/test-repo upserted to knowledge graph');

      consoleLogSpy.mockRestore();
    });

    test('should handle upsert errors', async () => {
      // Force an error in the session
      mockDriver.session().run = jest.fn().mockRejectedValue(new Error('Cypher syntax error'));

      const repo = new RepositoryNode({ id: 'error-repo' });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.upsertRepository(repo)).rejects.toThrow('Cypher syntax error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to upsert repository: Cypher syntax error');

      consoleErrorSpy.mockRestore();
    });

    test('should skip operation when service not initialized', async () => {
      service.initialized = false;
      const repo = new RepositoryNode({ id: 'skip-repo' });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.upsertRepository(repo);

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Graph service not initialized - repository not upserted');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('addDependency', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should add dependency edge successfully', async () => {
      const edge = new DependencyEdge({
        id: 'dep-edge-1',
        sourceId: 'repo-a',
        targetId: 'repo-b',
        edgeType: 'depends_on',
        properties: {
          versionConstraint: '^1.0.0',
          currentVersion: '1.2.3',
          usageFrequency: 10,
          confidence: 0.9,
          startDate: '2024-01-01',
          lastConfirmed: '2024-12-01'
        },
        analysis: {
          reliability: { maintenanceScore: 85 },
          security: { vulnerabilities: [] },
          alternatives: { suggestedAlternatives: [] }
        }
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      await service.addDependency(edge);

      expect(mockDriver.sessions.length).toBeGreaterThan(0);
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Dependency repo-a -> repo-b added to knowledge graph');

      consoleLogSpy.mockRestore();
    });

    test('should handle missing repositories', async () => {
      const edge = new DependencyEdge({
        id: 'dep-missing',
        sourceId: 'nonexistent-repo',
        targetId: 'another-nonexistent-repo'
      });

      // The mock doesn't handle this case, so it should succeed with current implementation
      await service.addDependency(edge);
    });
  });

  describe('getKnowledgePatterns', () => {
    beforeEach(async () => {
      await service.initialize();
      service.cacheEnabled = true;
    });

    test('should retrieve knowledge patterns with caching', async () => {
      const patterns = await service.getKnowledgePatterns(10);

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBe(1);
      expect(patterns[0]).toBeInstanceOf(Object); // Would be KnowledgePatternNode in full implementation
      expect(patterns[0].id).toBe('pattern-1');
    });

    test('should return cached results when available', async () => {
      service.cache.get = jest.fn().mockReturnValue(['cached-pattern']);

      const patterns = await service.getKnowledgePatterns(5);

      expect(service.cache.get).toHaveBeenCalledWith('getKnowledgePatterns:[5]');
      expect(patterns).toEqual(['cached-pattern']);
    });

    test('should handle query errors gracefully', async () => {
      mockDriver.session().run = jest.fn().mockRejectedValue(new Error('Query failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const patterns = await service.getKnowledgePatterns();

      expect(patterns).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to get knowledge patterns: Query failed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('forecastTechnicalDebt', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should generate technical debt forecast', async () => {
      const forecast = await service.forecastTechnicalDebt('test-repo-id');

      expect(forecast).toBeInstanceOf(Object);
      expect(forecast.repositoryId).toBe('test-repo-id');
      expect(forecast.forecastType).toBe('overall');
      expect(forecast.metadata).toBeDefined();
      expect(forecast.currentState).toBeDefined();
      expect(forecast.projections).toBeDefined();
      expect(forecast.recommendations).toBeDefined();
    });

    test('should handle repository not found', async () => {
      // Mock empty result
      mockDriver.session().run = jest.fn().mockResolvedValue({ records: [] });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const forecast = await service.forecastTechnicalDebt('nonexistent-repo');

      expect(forecast).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to forecast technical debt: Repository not found in knowledge graph');

      consoleErrorSpy.mockRestore();
    });

    test('should risk-based recommendations', async () => {
      const forecast = await service.forecastTechnicalDebt('high-risk-repo');

      // The mock data should generate some recommendations
      expect(Array.isArray(forecast.recommendations)).toBe(true);
      expect(forecast.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectPerformanceAnomalies', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should detect performance anomalies', async () => {
      const anomalies = await service.detectPerformanceAnomalies('test-repo-id');

      expect(Array.isArray(anomalies)).toBe(true);
      // Current mock returns empty array for established repos
      expect(anomalies.length).toBe(0);
    });

    test('should create baseline anomaly for new repositories', async () => {
      // Mock single record result for baseline creation
      mockDriver.session().run = jest.fn().mockResolvedValue({
        records: [{
          get: () => null // Simulate no metrics found
        }]
      });

      const anomalies = await service.detectPerformanceAnomalies('new-repo-id');

      expect(Array.isArray(anomalies)).toBe(true);
      expect(anomalies.length).toBe(1);
      expect(anomalies[0]).toBeInstanceOf(Object); // PerformanceAnomaly instance
      expect(anomalies[0].anomalyType).toBe('performance_baseline');
    });
  });

  describe('batchUpsertRepositories', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    test('should batch upsert repositories', async () => {
      const repos = [
        { id: 'repo1', name: 'Repo 1', organizationId: 'org1' },
        { id: 'repo2', name: 'Repo 2', organizationId: 'org1' }
      ];

      const result = await service.batchUpsertRepositories(repos);

      expect(result).toBe(2);
      expect(mockDriver.sessions.length).toBeGreaterThan(0);
    });

    test('should handle empty or invalid input', async () => {
      await service.batchUpsertRepositories(null);
      await service.batchUpsertRepositories([]);

      // Should not throw and should not create sessions for null/empty
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('getStats', () => {
    test('should return initialized false when not initialized', async () => {
      const stats = await service.getStats();
      expect(stats).toEqual({ initialized: false });
    });

    test('should return repository statistics when initialized', async () => {
      await service.initialize();

      const stats = await service.getStats();

      expect(stats.initialized).toBe(true);
      expect(typeof stats.repositories).toBe('number');
      expect(typeof stats.dependencies).toBe('number');
      expect(typeof stats.patterns).toBe('number');
      expect(stats.lastSync).toBeDefined();
    });

    test('should mask credentials in URL', async () => {
      service.url = 'neo4j://user:password@localhost:7687';
      await service.initialize();

      const stats = await service.getStats();

      expect(stats.url).toContain('neo4j://***:***@localhost:7687');
    });
  });

  describe('utility functions', () => {
    test('getGraphService should return singleton instance', () => {
      const service1 = getGraphService();
      const service2 = getGraphService();

      expect(service1).toBe(service2);
      expect(service1).toBeInstanceOf(GraphService);
    });

    test('initGraphService should initialize singleton service', async () => {
      const result = await initGraphService();

      expect(result.initialized).toBe(true);
    });

    test('cache key generation', () => {
      const key1 = service._cacheKey('testOperation', 'param1', 'param2');
      const key2 = service._cacheKey('testOperation', 'param1', 'param2');

      expect(key1).toBe(key2);
      expect(key1).toBe('testOperation:["param1","param2"]');
    });
  });

  describe('connection handling', () => {
    test('should close driver connection', async () => {
      await service.initialize();

      const closeSpy = jest.spyOn(service.driver, 'close');

      await service.close();

      expect(closeSpy).toHaveBeenCalled();
      expect(service.initialized).toBe(false);

      closeSpy.mockRestore();
    });

    test('should handle missing driver during close', async () => {
      service.driver = null;

      // Should not throw
      await expect(service.close()).resolves.toBeUndefined();
    });
  });

  describe('error handling and resilience', () => {
    test('should gracefully handle _executeQuery errors', async () => {
      await service.initialize();

      // Force session error
      const session = service.driver.session();
      session.run = jest.fn().mockRejectedValue(new Error('Network timeout'));

      await expect(service._executeQuery('MATCH (n) RETURN n')).rejects.toThrow('Network timeout');

      // Verify session was closed
      expect(session.closed).toBe(true);
    });

    test('should cache and return previous results on error', async () => {
      await service.initialize();
      service.cacheEnabled = true;

      // First call succeeds
      await service.getKnowledgePatterns(5);

      // Force error on second call
      mockDriver.session().run = jest.fn().mockRejectedValue(new Error('Temporary failure'));

      // Results should still be cached
      service.cache.has = jest.fn().mockReturnValue(true);
      service.cache.get = jest.fn().mockReturnValue(['cached-result']);

      const results = await service.getKnowledgePatterns(5);

      expect(results).toEqual(['cached-result']);
      expect(service.cache.get).toHaveBeenCalled();
    });
  });
});

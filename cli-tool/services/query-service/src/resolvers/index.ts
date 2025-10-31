import { NeptuneClient } from '../services/neptune.js';
import { GraphQLError } from 'graphql';

// Define GraphQL context type
export interface GraphQLContext {
  neptune: NeptuneClient;
  userId?: string;
  requestId: string;
}

// Repository Intelligence Resolver
export const repositoryIntelligenceResolver = async (
  _: any,
  { repositoryId }: { repositoryId: string },
  { neptune }: GraphQLContext
) => {
  try {
    console.log(`Querying repository intelligence for: ${repositoryId}`);

    // Get repository basic info
    const repository = await getRepositoryById(neptune, repositoryId);
    if (!repository) {
      throw new GraphQLError(`Repository not found: ${repositoryId}`, {
        extensions: { code: 'NOT_FOUND' }
      });
    }

    // Get dependencies
    const dependencies = await neptune.getRepositoryDependencies(repositoryId);

    // Get patterns
    const patterns = await neptune.getRepositoryPatterns(repositoryId);

    // Calculate basic metrics
    const performance = {
      analysisTime: 0.123, // Placeholder - would be calculated from analysis metadata
      queryEfficiency: 0.95,
      cacheHitRate: 0.78,
      lastUpdated: new Date().toISOString()
    };

    return {
      repository,
      dependencies: dependencies.map(transformDependency),
      patterns: patterns.map(transformPattern),
      technicalDebt: null, // Phase 4A implementation
      performance
    };
  } catch (error) {
    console.error('Repository intelligence query failed:', error);
    throw new GraphQLError('Failed to retrieve repository intelligence', {
      extensions: { code: 'INTERNAL_ERROR' }
    });
  }
};

// Similar Repositories Resolver
export const similarRepositoriesResolver = async (
  _: any,
  { repositoryId, limit }: { repositoryId: string; limit: number },
  { neptune }: GraphQLContext
) => {
  try {
    console.log(`Finding repositories similar to: ${repositoryId}`);

    // This would use the similarity analysis from Neptune
    // For Phase 4A, returning mock similar repositories
    const similarRepos = await neptune.findSimilarRepositories([]);

    return similarRepos.slice(0, limit).map(repo => ({
      repository: transformRepository(repo),
      similarityScore: Math.random() * 0.5 + 0.5, // Mock similarity score
      reasons: ['Similar language usage', 'Common architectural patterns'],
      sharedPatterns: ['microservice', 'repository-pattern'],
      sizeComparison: 'similar'
    }));
  } catch (error) {
    console.error('Similar repositories query failed:', error);
    throw new GraphQLError('Failed to find similar repositories', {
      extensions: { code: 'INTERNAL_ERROR' }
    });
  }
};

// Repositories Resolver
export const repositoriesResolver = async (
  _: any,
  { limit, offset, language, minSize, maxSize }: {
    limit: number;
    offset: number;
    language?: string;
    minSize?: number;
    maxSize?: number;
  },
  { neptune }: GraphQLContext
) => {
  try {
    console.log(`Querying repositories: limit=${limit}, offset=${offset}`);

    // Query all repositories from Neptune
    const query = 'g.V().hasLabel("repository").limit(50)'; // Simplified query
    const repositories = await neptune.executeQuery(query);

    return repositories.slice(offset, offset + limit).map(transformRepository);
  } catch (error) {
    console.error('Repositories query failed:', error);
    throw new GraphQLError('Failed to retrieve repositories', {
      extensions: { code: 'INTERNAL_ERROR' }
    });
  }
};

// Graph Statistics Resolver
export const graphStatisticsResolver = async (
  _: any,
  __: any,
  { neptune }: GraphQLContext
) => {
  try {
    console.log('Querying graph statistics');

    const stats = await neptune.getStatistics();

    // Get additional repository-specific stats
    const repoStats = await neptune.executeQuery(`
      g.V().hasLabel("repository")
        .groupCount()
        .by("language")
        .unfold()
    `);

    const languages = repoStats.map(stat => stat.key).filter(Boolean);

    return {
      repositoryCount: stats.vertexCount, // Approximation
      patternCount: 0, // Would be counted separately
      dependencyCount: stats.edgeCount,
      vertexCount: stats.vertexCount,
      edgeCount: stats.edgeCount,
      analyzedLanguages: languages,
      lastAnalyzedRepository: null,
      totalAnalysisTime: 0.0
    };
  } catch (error) {
    console.error('Graph statistics query failed:', error);
    throw new GraphQLError('Failed to retrieve graph statistics', {
      extensions: { code: 'INTERNAL_ERROR' }
    });
  }
};

// Repository Dependencies Resolver
export const repositoryDependenciesResolver = async (
  _: any,
  { repositoryId }: { repositoryId: string },
  { neptune }: GraphQLContext
) => {
  try {
    console.log(`Querying dependencies for repository: ${repositoryId}`);

    const dependencies = await neptune.getRepositoryDependencies(repositoryId);
    return dependencies.map(transformDependency);
  } catch (error) {
    console.error('Repository dependencies query failed:', error);
    throw new GraphQLError('Failed to retrieve repository dependencies', {
      extensions: { code: 'INTERNAL_ERROR' }
    });
  }
};

// Repository Patterns Resolver
export const repositoryPatternsResolver = async (
  _: any,
  { repositoryId }: { repositoryId: string },
  { neptune }: GraphQLContext
) => {
  try {
    console.log(`Querying patterns for repository: ${repositoryId}`);

    const patterns = await neptune.getRepositoryPatterns(repositoryId);
    return patterns.map(transformPattern);
  } catch (error) {
    console.error('Repository patterns query failed:', error);
    throw new GraphQLError('Failed to retrieve repository patterns', {
      extensions: { code: 'INTERNAL_ERROR' }
    });
  }
};

// Helper functions to transform Neptune data to GraphQL format

function transformRepository(neptuneData: any): any {
  return {
    id: neptuneData.id || neptuneData.properties?.id?.[0]?.value,
    name: neptuneData.properties?.name?.[0]?.value || 'unknown',
    fullName: `${neptuneData.properties?.owner?.[0]?.value || 'unknown'}/${neptuneData.properties?.name?.[0]?.value || 'unknown'}`,
    owner: neptuneData.properties?.owner?.[0]?.value || 'unknown',
    description: neptuneData.properties?.description?.[0]?.value,
    url: neptuneData.properties?.url?.[0]?.value || '',
    language: neptuneData.properties?.language?.[0]?.value,
    languages: [], // Would be populated from separate query
    size: parseInt(neptuneData.properties?.size?.[0]?.value || '0'),
    stars: 0,
    forks: 0,
    watchers: 0,
    isPrivate: neptuneData.properties?.isPrivate?.[0]?.value === 'true',
    isArchived: false,
    createdAt: neptuneData.properties?.createdAt?.[0]?.value || new Date().toISOString(),
    updatedAt: neptuneData.properties?.updatedAt?.[0]?.value || new Date().toISOString(),
    pushedAt: neptuneData.properties?.pushedAt?.[0]?.value || new Date().toISOString(),
    analyzedAt: neptuneData.properties?.analyzedAt?.[0]?.value || new Date().toISOString(),
    lastActivityAt: neptuneData.properties?.lastActivityAt?.[0]?.value || new Date().toISOString()
  };
}

function transformDependency(neptuneData: any): any {
  return {
    id: neptuneData.id,
    sourceId: neptuneData.outV?.id,
    targetId: neptuneData.inV?.id,
    dependencyType: neptuneData.label || 'depends_on',
    currentVersion: neptuneData.properties?.currentVersion?.[0]?.value,
    latestVersion: neptuneData.properties?.latestVersion?.[0]?.value,
    usageFrequency: parseInt(neptuneData.properties?.usageFrequency?.[0]?.value || '1'),
    confidence: parseFloat(neptuneData.properties?.confidence?.[0]?.value || '0.8'),
    securityRiskLevel: 'low', // Placeholder
    lastConfirmed: neptuneData.properties?.lastConfirmed?.[0]?.value || new Date().toISOString()
  };
}

function transformPattern(neptuneData: any): any {
  return {
    id: neptuneData.id,
    name: neptuneData.properties?.name?.[0]?.value || 'unknown',
    type: neptuneData.properties?.type?.[0]?.value || 'architectural',
    category: neptuneData.properties?.category?.[0]?.value || 'general',
    description: neptuneData.properties?.description?.[0]?.value,
    complexity: neptuneData.properties?.complexity?.[0]?.value || 'medium',
    confidence: parseFloat(neptuneData.properties?.confidence?.[0]?.value || '0.8'),
    repositoryId: neptuneData.properties?.repositoryId?.[0]?.value,
    stakeholders: neptuneData.properties?.stakeholders?.map((s: any) => s.value) || [],
    qualityMetrics: null, // Would be populated from separate data
    detectedAt: neptuneData.properties?.detectedAt?.[0]?.value || new Date().toISOString(),
    lastObservedAt: neptuneData.properties?.lastObservedAt?.[0]?.value || new Date().toISOString(),
    observationCount: parseInt(neptuneData.properties?.observationCount?.[0]?.value || '1')
  };
}

async function getRepositoryById(neptune: NeptuneClient, repositoryId: string): Promise<any> {
  try {
    const results = await neptune.executeQuery(
      'g.V().has("repository", "id", repositoryId).limit(1)',
      { repositoryId }
    );
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get repository by ID:', error);
    return null;
  }
}

// Export all resolvers
export const resolvers = {
  Query: {
    repositoryIntelligence: repositoryIntelligenceResolver,
    similarRepositories: similarRepositoriesResolver,
    repositories: repositoriesResolver,
    graphStatistics: graphStatisticsResolver,
    repositoryDependencies: repositoryDependenciesResolver,
    repositoryPatterns: repositoryPatternsResolver,
    // These would need implementation for full functionality:
    searchRepositories: (_: any, args: any) => { throw new GraphQLError('Not implemented', { extensions: { code: 'NOT_IMPLEMENTED' } }); },
    patterns: (_: any, args: any) => { throw new GraphQLError('Not implemented', { extensions: { code: 'NOT_IMPLEMENTED' } }); }
  }
};

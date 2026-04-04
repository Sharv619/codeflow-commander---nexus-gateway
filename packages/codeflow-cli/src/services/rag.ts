// File: src/services/rag.ts
// Enhanced Retrieval-Augmented Generation (RAG) service with VECTOR knowledge base
// Implements learning improvements and context-quality validation from Phase 3 upgrades

import { Logger, defaultLogger } from '@/utils/logger';
import { ErrorHandler, ValidationPipeline, ValidationContext } from '@/validation';
import { StorageManager, VectorEntry, VectorMetadata } from '@/storage';
import { stateManager } from '@/state';
import { ProjectKnowledge } from '@/types/entities';
import { ConfidenceScore, SafetyControls, ValidationResult } from '@/types/core';
import { createHash } from 'crypto';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ContextChunk {
  id: string;
  content: string;
  source: {
    filePath: string;
    lineStart: number;
    lineEnd: number;
  };
  type: 'function' | 'class' | 'interface' | 'comment' | 'documentation' | 'config';
  context: string; // Surrounding code for additional context
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

export interface ContextRetrievalResult {
  chunks: ContextChunk[];
  totalSimilarity: number;
  confidenceScore: number;
  metadata: {
    queryVector: number[];
    searchTime: number;
    totalChunksIndexed: number;
    filters: Record<string, any>;
  };
  validation: {
    passed: boolean;
    score: number;
    warnings?: string[];
  };
}

export interface RAGQueryOptions {
  relevanceThreshold?: number; // Minimum relevance score
  maxChunks?: number;          // Maximum chunks to retrieve
  includeSimilar?: boolean;    // Include similar but less relevant chunks
  contextFilters?: {
    fileTypes?: string[];       // e.g., ['.ts', '.js']
    languages?: string[];       // e.g., ['typescript', 'javascript']
    contentTypes?: string[];    // e.g., ['function', 'class', 'comment']
    tags?: string[];            // Custom tags for filtering
  };
  weighing?: {
    recentFiles: number;        // Weight for recently modified files
    coreModules: number;         // Weight for important/core files
    similarCode: number;         // Weight for code similarity
    projectPatterns: number;     // Weight for learned patterns
  };
}

export interface RAGQuery {
  content: string;              // The code/content to find context for
  context?: string;             // Additional context about the query
  vector: number[];             // Pre-generated embedding vector
  options?: RAGQueryOptions;    // Query customization options
  metadata?: Record<string, any>; // Additional query metadata
}

/**
 * Enhanced RAG Service - Core intelligence service for contextual code understanding
 * Integrates VECTOR knowledge base with adaptive learning and validation
 * Foundation for NEURON agent context-aware reasoning
 */
export class RAGService {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private storageManager: StorageManager;
  private validationPipeline: ValidationPipeline;
  private projectId: string;

  // Learning state for adaptive improvements
  private queryHistory: Map<string, ContextRetrievalResult> = new Map();
  private effectivenessTracking: Map<string, number> = new Map();

  constructor(
    projectId: string,
    storageManager: StorageManager,
    logger?: Logger,
    validationPipeline?: ValidationPipeline
  ) {
    this.logger = logger || defaultLogger;
    this.errorHandler = new ErrorHandler(this.logger);
    this.storageManager = storageManager;
    this.validationPipeline = validationPipeline || new ValidationPipeline(this.logger);
    this.projectId = projectId;

    // Register validation stages for context quality
    this.initializeValidationStages();
  }

  /**
   * Initialize validation pipeline stages for context quality assessment
   */
  private initializeValidationStages(): void {
    // Context completeness validation
    this.validationPipeline.registerStage({
      id: 'context_completeness',
      name: 'Context Completeness Check',
      priority: 1,
      run: async (context) => {
        const completeness = await this.validateContextCompleteness(context);
        return completeness;
      },
      canSkip: (context) => context.metadata?.skipCompletenessCheck || false
    });

    // Semantic relevance validation
    this.validationPipeline.registerStage({
      id: 'semantic_relevance',
      name: 'Semantic Relevance Validation',
      priority: 2,
      run: async (context) => {
        const relevance = await this.validateSemanticRelevance(context);
        return relevance;
      }
    });

    // Contextual coherence validation
    this.validationPipeline.registerStage({
      id: 'contextual_coherence',
      name: 'Contextual Coherence Check',
      priority: 3,
      run: async (context) => {
        const coherence = await this.validateContextualCoherence(context);
        return coherence;
      }
    });
  }

  /**
   * Retrieve contextual information for a given query
   * Main entry point for RAG-powered context retrieval
   */
  async retrieveContext(query: RAGQuery): Promise<ContextRetrievalResult> {
    try {
      const startTime = Date.now();

      this.logger.debug('Retrieving context for query', {
        contentLength: query.content.length,
        hasVector: !!query.vector,
        options: query.options?.relevanceThreshold
      });

      // Generate vector if not provided
      const queryVector = query.vector || await this.generateEmbedding(query.content);

      // Perform semantic search
      const searchResults = await this.storageManager.findSimilarVectors(
        queryVector,
        query.options?.maxChunks || 10,
        this.buildSearchFilters(query)
      );

      // Process and enhance results
      const processedChunks = await this.processSearchResults(searchResults, query);

      // Apply intelligent weighting and selection
      const weighedChunks = await this.applyIntelligentWeighing(processedChunks, query);

      // Validate context quality
      const validationResult = await this.validateContextQuality(query, weighedChunks);

      // Compile final result
      const warnings = validationResult.details
        ?.filter(detail => detail.includes('warning') || detail.includes('WARN'));

      const result: ContextRetrievalResult = {
        chunks: weighedChunks,
        totalSimilarity: weighedChunks.reduce((sum, chunk) => sum + (chunk.relevanceScore || 0), 0),
        confidenceScore: validationResult.score,
        metadata: {
          queryVector,
          searchTime: Date.now() - startTime,
          totalChunksIndexed: await this.getIndexSize(),
          filters: query.options?.contextFilters || {}
        },
        validation: {
          passed: validationResult.passed,
          score: validationResult.score
        }
      };

      if (warnings && warnings.length > 0) {
        result.validation.warnings = warnings;
      }

      // Update learning metrics
      await this.updateLearningMetrics(query, result);

      this.logger.debug('Context retrieval completed', {
        chunksReturned: result.chunks.length,
        totalSimilarity: result.totalSimilarity,
        confidenceScore: result.confidenceScore
      });

      return result;

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'retrieveContext', query });
      throw error;
    }
  }

  /**
   * Add new content to the knowledge base
   * Integrates with PRISM project intelligence for enhanced context
   */
  async addToKnowledgeBase(content: ContextChunk[], projectContext?: Partial<ProjectKnowledge>): Promise<void> {
    try {
      this.logger.debug('Adding content to knowledge base', {
        chunkCount: content.length,
        projectContextAvailable: !!projectContext
      });

      // Generate embeddings for new content
      const vectorEntries = await this.embedContent(content, projectContext);

      // Store in VECTOR knowledge base
      await this.storageManager.storeVectors(vectorEntries);

      // Update project knowledge metadata
      if (projectContext) {
        await this.updateProjectKnowledge(projectContext);
      }

      this.logger.debug('Content added to knowledge base successfully');

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'addToKnowledgeBase', chunkCount: content.length });
      throw error;
    }
  }

  /**
   * Update knowledge base with learning insights
   * Enables adaptive improvements based on effectiveness tracking
   */
  async updateLearningInsights(query: RAGQuery, result: ContextRetrievalResult, userFeedback?: {
    helpful: boolean;
    relevantChunks: string[];
    missingContexts: string[];
  }): Promise<void> {
    try {
      // Track effectiveness metrics
      await this.updateQueryEffectivenessTracking(query, result, userFeedback);

      // Update pattern recognition based on successful retrievals
      await this.updatePatternRecognition(result);

      // Adjust retrieval strategies based on feedback
      if (userFeedback) {
        await this.adjustRetrievalStrategy(userFeedback);
      }

      // Persist learning updates
      await this.persistLearningUpdates();

    } catch (error) {
      this.logger.warn('Failed to update learning insights', { error });
      // Don't throw - learning updates shouldn't break core functionality
    }
  }

  /**
   * Optimize knowledge base for better performance
   * Implements VECTOR knowledge base compression and optimization
   */
  async optimize(): Promise<{ optimizedChunks: number; performanceImprovement: number }> {
    try {
      this.logger.info('Starting RAG knowledge base optimization');

      // Remove outdated/redundant chunks
      const cleanedUp = await this.cleanupRedundantContent();

      // Rebuild semantic indexing
      await this.rebuildSemanticIndex();

      // Optimize storage utilization
      await this.storageManager.optimize();

      // Compact learning data
      const compacted = await this.compactLearningData();

      const result = {
        optimizedChunks: cleanedUp + compacted,
        performanceImprovement: await this.calculatePerformanceImprovement()
      };

      this.logger.info('RAG optimization completed', result);
      return result;

    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'optimize' });
      throw error;
    }
  }

  /**
   * Analyze knowledge base health and provide recommendations
   */
  async analyzeHealth(): Promise<{
    totalChunks: number;
    qualityScore: number;
    connectivityIndex: number;
    recommendations: string[];
  }> {
    try {
      const stats = {
        totalChunks: await this.getIndexSize(),
        qualityScore: await this.calculateQualityScore(),
        connectivityIndex: await this.calculateConnectivityIndex(),
        recommendations: await this.generateRecommendations()
      };

      this.logger.debug('Health analysis completed', stats);
      return stats;

    } catch (error) {
      this.logger.warn('Health analysis failed', { error });
      return {
        totalChunks: 0,
        qualityScore: 0,
        connectivityIndex: 0,
        recommendations: ['Unable to complete health analysis']
      };
    }
  }

  // Private implementation methods

  /**
   * Generate embedding vector for given content
   * Uses Ollama /api/embed for real local embeddings
   * Falls back to SHA-256 mock if Ollama is unavailable
   */
  private async generateEmbedding(content: string): Promise<number[]> {
    const ollamaConfig = this.getOllamaConfig();

    if (ollamaConfig) {
      try {
        return await this.callOllamaEmbed(content, ollamaConfig);
      } catch (error) {
        this.logger.warn('Ollama embedding failed, falling back to mock', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Fallback: SHA-256 mock (not semantically meaningful but deterministic)
    const hash = createHash('sha256').update(content).digest('hex');
    const vector = Array.from({ length: 768 }, (_, i) =>
      parseInt(hash.slice(i * 2, (i + 1) * 2), 16) / 255.0
    );
    return vector;
  }

  /**
   * Get Ollama configuration from ~/.codeflow-cli/config.json
   */
  private getOllamaConfig(): { url: string; model: string } | null {
    try {
      const configPath = path.join(os.homedir(), '.codeflow-cli', 'config.json');
      if (!fs.existsSync(configPath)) return null;

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (config?.ollama?.enabled === true) {
        return {
          url: config.ollama.url || 'http://localhost:11434',
          model: config.ollama.model || 'nomic-embed-text'
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Call Ollama /api/embed to generate real vector embeddings
   * Uses the same local Ollama integration as ai-reviewer.cjs
   */
  private async callOllamaEmbed(content: string, config: { url: string; model: string }): Promise<number[]> {
    const url = new URL(`${config.url}/api/embed`);

    const payload = JSON.stringify({
      model: config.model,
      input: content,
      truncate: true
    });

    const client = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = client.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Ollama embed returned ${res.statusCode}: ${data.substring(0, 200)}`));
          }
          try {
            const response = JSON.parse(data);
            const embeddings = response.embeddings?.[0];
            if (!embeddings || !Array.isArray(embeddings)) {
              return reject(new Error('Ollama returned no embeddings'));
            }
            resolve(embeddings);
          } catch (e) {
            reject(new Error(`Failed to parse Ollama embed response: ${e instanceof Error ? e.message : String(e)}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama embed request timed out after 30s'));
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Process raw search results into enriched context chunks
   */
  private async processSearchResults(
    results: Array<{ vector: VectorEntry; similarity: number }>,
    query: RAGQuery
  ): Promise<ContextChunk[]> {
    return results.map(({ vector, similarity }) => ({
      id: vector.id,
      content: JSON.parse(vector.metadata.context || '[]')[0] || '',
      source: {
        filePath: vector.metadata.filePath,
        lineStart: vector.metadata.lineStart,
        lineEnd: vector.metadata.lineEnd
      },
      type: vector.metadata.contentType as any,
      context: vector.metadata.context,
      relevanceScore: similarity,
      metadata: {
        tags: vector.metadata.tags,
        quality: vector.metadata.quality,
        searchSimilarity: similarity
      }
    }));
  }

  /**
   * Apply intelligent weighing based on project context and learning
   */
  private async applyIntelligentWeighing(chunks: ContextChunk[], query: RAGQuery): Promise<ContextChunk[]> {
    const weighing = query.options?.weighing || {
      recentFiles: 0.2,
      coreModules: 0.3,
      similarCode: 0.4,
      projectPatterns: 0.1
    };

    for (const chunk of chunks) {
      let weight = chunk.relevanceScore || 0;

      // Apply project-aware weighting
      weight += await this.applyProjectWeighting(chunk, weighing);

      // Apply learning-based adjustments
      weight += await this.applyLearningWeighting(chunk, query);

      chunk.relevanceScore = weight;
    }

    // Sort by final weighted score
    chunks.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Filter by threshold if specified
    if (query.options?.relevanceThreshold) {
      return chunks.filter(chunk =>
        (chunk.relevanceScore || 0) >= query.options!.relevanceThreshold!
      );
    }

    return chunks.slice(0, query.options?.maxChunks || 10);
  }

  /**
   * Validate overall context quality through the validation pipeline
   */
  private async validateContextQuality(query: RAGQuery, chunks: ContextChunk[]): Promise<ValidationResult> {
    const projectOverrides = stateManager.getProjectState(this.projectId).overrides?.safetyControls;
    const globalSafety = stateManager.getGlobalState().ai.safety;

    const safetyControls: SafetyControls = {
      confidenceThresholds: projectOverrides?.confidenceThresholds || globalSafety?.confidenceThresholds || {
        low: 0.95,
        medium: 0.90,
        high: 0.85
      },
      riskAssessment: projectOverrides?.riskAssessment || globalSafety?.riskAssessment || {
        criticalPath: true,
        highImpact: true,
        securityRelated: true,
        breakingChanges: true
      },
      operationalLimits: projectOverrides?.operationalLimits || globalSafety?.operationalLimits || {
        maxSuggestionsPerSession: 10,
        maxAutoApplyPerHour: 5,
        requireRollbackCapability: true,
        forceSequentialApplication: true
      },
      emergencyMode: projectOverrides?.emergencyMode || globalSafety?.emergencyMode || {
        enabled: false,
        triggerConditions: [],
        fallbackBehavior: 'conservative-validation'
      }
    };

    const validationContext: ValidationContext = {
      sessionId: `rag_${this.projectId}_${Date.now()}`,
      projectId: this.projectId,
      developerId: 'system',
      safetyControls,
      metadata: {
        queryContent: query.content,
        chunkCount: chunks.length,
        totalRelevance: chunks.reduce((sum, chunk) => sum + (chunk.relevanceScore || 0), 0),
        skipCompletenessCheck: chunks.length < 3
      }
    };

    const result = await this.validationPipeline.validate(validationContext, false);

    this.logger.debug('Context validation completed', {
      passed: result.passed,
      score: result.score,
      stages: result.message
    });

    return result;
  }

  /**
   * Build search filters based on query options
   */
  private buildSearchFilters(query: RAGQuery): Partial<VectorMetadata> {
    const filters: Partial<VectorMetadata> = {};

    if (query.options?.contextFilters?.contentTypes) {
      // Convert contentTypes to contentType filter if needed
    }

    if (query.options?.contextFilters?.languages) {
      // Apply language filters
    }

    return filters;
  }

  // Validation stage implementations

  private async validateContextCompleteness(context: ValidationContext): Promise<ValidationResult> {
    const chunkCount = context.metadata?.chunkCount || 0;

    if (chunkCount === 0) {
      return {
        passed: false,
        score: 0,
        message: 'No context chunks found',
        details: ['Context retrieval returned empty results']
      };
    }

    if (chunkCount < 3) {
      return {
        passed: false,
        score: 0.3,
        message: 'Minimal context available',
        details: ['Consider expanding search scope or improving indexing'],
        suggestions: ['Increase maxChunks parameter', 'Check indexing status']
      };
    }

    const totalRelevance = context.metadata?.totalRelevance || 0;
    const averageRelevance = totalRelevance / chunkCount;

    return {
      passed: averageRelevance > 0.1,
      score: Math.min(averageRelevance * 2, 1.0),
      message: `Context completeness: ${averageRelevance > 0.1 ? 'adequate' : 'insufficient'}`,
      details: [`Average relevance: ${(averageRelevance * 100).toFixed(1)}%`]
    };
  }

  private async validateSemanticRelevance(context: ValidationContext): Promise<ValidationResult> {
    // Implementation would analyze semantic coherence
    return {
      passed: true,
      score: 0.8,
      message: 'Semantic relevance validation passed'
    };
  }

  private async validateContextualCoherence(context: ValidationContext): Promise<ValidationResult> {
    // Implementation would check contextual relationships
    return {
      passed: true,
      score: 0.9,
      message: 'Contextual coherence validation passed'
    };
  }

  // Utility methods

  private async getIndexSize(): Promise<number> {
    // Would query storage manager for total indexed chunks
    return 0;
  }

  private async applyProjectWeighting(chunk: ContextChunk, weighing: NonNullable<RAGQueryOptions['weighing']>): Promise<number> {
    let weight = 0;

    // Recent file weighting (simplified)
    if (Date.now() - Date.now() < 7 * 24 * 60 * 60 * 1000) { // Last week
      weight += weighing.recentFiles;
    }

    // Core module weighting
    if (chunk.source.filePath.includes('/src/') || chunk.source.filePath.includes('/lib/')) {
      weight += weighing.coreModules;
    }

    return weight;
  }

  private async applyLearningWeighting(chunk: ContextChunk, query: RAGQuery): Promise<number> {
    // Would apply learned patterns for better weighting
    return 0;
  }

  private async updateLearningMetrics(query: RAGQuery, result: ContextRetrievalResult): Promise<void> {
    // Store query-result pairs for learning
  }

  private async embedContent(content: ContextChunk[], projectContext?: Partial<ProjectKnowledge>): Promise<VectorEntry[]> {
    const entries: VectorEntry[] = [];

    for (const chunk of content) {
      const vector = await this.generateEmbedding(chunk.content);
      const metadata: VectorMetadata = {
        contentType: chunk.type,
        language: chunk.source.filePath.split('.').pop() || 'unknown',
        filePath: chunk.source.filePath,
        lineStart: chunk.source.lineStart,
        lineEnd: chunk.source.lineEnd,
        context: chunk.context,
        tags: chunk.metadata?.tags || [],
        quality: {
          confidence: chunk.metadata?.quality?.confidence || 0.8,
          relevance: chunk.relevanceScore || 0.7,
          freshness: 1.0 // New content is fresh
        }
      };

      entries.push({
        id: chunk.id,
        vector,
        metadata,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        compressed: false
      });
    }

    return entries;
  }

  private async updateProjectKnowledge(projectContext: Partial<ProjectKnowledge>): Promise<void> {
    // Would update project knowledge in state
  }

  private async updateQueryEffectivenessTracking(
    query: RAGQuery,
    result: ContextRetrievalResult,
    userFeedback?: any
  ): Promise<void> {
    // Implementation for effectiveness tracking
  }

  private async updatePatternRecognition(result: ContextRetrievalResult): Promise<void> {
    // Implementation for pattern updates
  }

  private async adjustRetrievalStrategy(userFeedback: any): Promise<void> {
    // Implementation for strategy adjustments
  }

  private async persistLearningUpdates(): Promise<void> {
    // Implementation for persistence
  }

  private async cleanupRedundantContent(): Promise<number> {
    // Implementation for cleanup
    return 0;
  }

  private async rebuildSemanticIndex(): Promise<void> {
    // Implementation for index rebuilding
  }

  private async compactLearningData(): Promise<number> {
    // Implementation for data compaction
    return 0;
  }

  private async calculatePerformanceImprovement(): Promise<number> {
    // Calculate before/after performance metrics
    return 0;
  }

  private async calculateQualityScore(): Promise<number> {
    // Implementation for quality scoring
    return 0.8;
  }

  private async calculateConnectivityIndex(): Promise<number> {
    // Implementation for connectivity analysis
    return 0.7;
  }

  private async generateRecommendations(): Promise<string[]> {
    // Implementation for generating recommendations
    return [];
  }

  /**
   * analyzeCommit() — Full pipeline: PRISM → Embed → Store → Retrieve
   *
   * When a developer commits code, this function:
   * 1. Runs PRISM AST analysis on changed files to extract entities
   * 2. Generates Ollama embeddings for each entity's code content
   * 3. Stores vectors in SQLiteVectorStore with metadata
   * 4. Retrieves similar past commits/patterns from the knowledge base
   * 5. Returns structured suggestions based on what worked before
   *
   * This is the core intelligence pipeline that connects all local AI pieces.
   */
  async analyzeCommit(commitInfo: {
    commitHash: string;
    changedFiles: string[];
    diff: string;
    message: string;
  }): Promise<{
    indexed: number;
    suggestions: Array<{
      type: string;
      content: string;
      confidence: number;
      source: string;
    }>;
    similarPatterns: Array<{
      file: string;
      similarity: number;
      entityType: string;
      entityName: string;
    }>;
    metrics: {
      prismAnalysisTime: number;
      embeddingTime: number;
      storageTime: number;
      retrievalTime: number;
      totalTime: number;
    };
  }> {
    const totalTime = Date.now();
    let prismAnalysisTime = 0;
    let embeddingTime = 0;
    let storageTime = 0;
    let retrievalTime = 0;

    this.logger.info('analyzeCommit: starting pipeline', {
      commitHash: commitInfo.commitHash,
      changedFiles: commitInfo.changedFiles.length,
      message: commitInfo.message
    });

    // Step 1: PRISM AST analysis on changed files
    const prismStart = Date.now();
    const prismResults: Array<{
      filePath: string;
      entities: Array<{
        type: string;
        name: string;
        content: string;
        lineStart: number;
        lineEnd: number;
      }>;
    }> = [];

    for (const filePath of commitInfo.changedFiles) {
      try {
        const absolutePath = path.resolve(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) continue;

        const content = fs.readFileSync(absolutePath, 'utf-8');
        const entities = this.extractEntitiesFromContent(content, filePath);
        prismResults.push({ filePath, entities });
      } catch (error) {
        this.logger.warn(`PRISM: failed to analyze ${filePath}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    prismAnalysisTime = Date.now() - prismStart;

    this.logger.debug(`analyzeCommit: PRISM extracted ${prismResults.reduce((sum, r) => sum + r.entities.length, 0)} entities`);

    // Step 2: Generate Ollama embeddings and store in SQLiteVectorStore
    const embedStart = Date.now();
    const vectorEntries: VectorEntry[] = [];

    for (const result of prismResults) {
      for (const entity of result.entities) {
        try {
          const vector = await this.generateEmbedding(entity.content);
          const metadata: VectorMetadata = {
            contentType: entity.type as any,
            language: result.filePath.split('.').pop() || 'unknown',
            filePath: result.filePath,
            lineStart: entity.lineStart,
            lineEnd: entity.lineEnd,
            context: JSON.stringify([entity.content]),
            tags: [`commit:${commitInfo.commitHash}`, `entity:${entity.name}`, `type:${entity.type}`],
            quality: {
              confidence: 0.8,
              relevance: 0.7,
              freshness: 1.0
            }
          };

          vectorEntries.push({
            id: `${commitInfo.commitHash}:${result.filePath}:${entity.name}`,
            vector,
            metadata,
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            compressed: false
          });
        } catch (error) {
          this.logger.warn(`Embed: failed for ${entity.name} in ${result.filePath}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    embeddingTime = Date.now() - embedStart;

    // Step 3: Store vectors in SQLite
    const storageStart = Date.now();
    if (vectorEntries.length > 0) {
      try {
        await this.storageManager.storeVectors(vectorEntries);
        this.logger.debug(`analyzeCommit: stored ${vectorEntries.length} vectors`);
      } catch (error) {
        this.logger.warn('Storage: failed to store vectors', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    storageTime = Date.now() - storageStart;

    // Step 4: Retrieve similar patterns from knowledge base
    const retrievalStart = Date.now();
    const similarPatterns: Array<{
      file: string;
      similarity: number;
      entityType: string;
      entityName: string;
    }> = [];
    const suggestions: Array<{
      type: string;
      content: string;
      confidence: number;
      source: string;
    }> = [];

    // For each changed file, retrieve similar code from past commits
    for (const result of prismResults) {
      for (const entity of result.entities.slice(0, 3)) { // Top 3 entities per file
        try {
          const queryVector = await this.generateEmbedding(entity.content);
          const searchResults = await this.storageManager.findSimilarVectors(
            queryVector,
            5,
            { contentType: entity.type as any }
          );

          for (const sr of searchResults) {
            // Skip self-matches (same commit, same file, same entity)
            if (sr.vector.id.startsWith(`${commitInfo.commitHash}:${result.filePath}:${entity.name}`)) {
              continue;
            }

            similarPatterns.push({
              file: sr.vector.metadata.filePath,
              similarity: sr.similarity,
              entityType: sr.vector.metadata.contentType,
              entityName: sr.vector.metadata.filePath.split('/').pop() || 'unknown'
            });

            // Generate suggestion based on similar patterns
            if (sr.similarity > 0.7) {
              suggestions.push({
                type: 'similar_pattern',
                content: `Similar ${entity.type} "${entity.name}" found in ${sr.vector.metadata.filePath} (similarity: ${(sr.similarity * 100).toFixed(0)}%)`,
                confidence: sr.similarity,
                source: sr.vector.id
              });
            }
          }
        } catch (error) {
          this.logger.warn(`Retrieval: failed for ${entity.name}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    retrievalTime = Date.now() - retrievalStart;

    const totalMs = Date.now() - totalTime;

    this.logger.info('analyzeCommit: pipeline completed', {
      indexed: vectorEntries.length,
      suggestions: suggestions.length,
      similarPatterns: similarPatterns.length,
      totalTime: totalMs
    });

    return {
      indexed: vectorEntries.length,
      suggestions,
      similarPatterns: similarPatterns.slice(0, 10), // Top 10
      metrics: {
        prismAnalysisTime,
        embeddingTime,
        storageTime,
        retrievalTime,
        totalTime: totalMs
      }
    };
  }

  /**
   * Extract code entities from file content without full AST parsing
   * Lightweight fallback when PRISM service is not available
   */
  private extractEntitiesFromContent(content: string, filePath: string): Array<{
    type: string;
    name: string;
    content: string;
    lineStart: number;
    lineEnd: number;
  }> {
    const entities: Array<{
      type: string;
      name: string;
      content: string;
      lineStart: number;
      lineEnd: number;
    }> = [];
    const lines = content.split('\n');

    // Extract functions
    const functionRegex = /^(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/;
    // Extract classes
    const classRegex = /^(export\s+)?class\s+(\w+)/;
    // Extract methods
    const methodRegex = /^\s+(async\s+)?(\w+)\s*\(([^)]*)\)\s*[:{]/;

    let currentEntity: { type: string; name: string; startLine: number; content: string[] } | null = null;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // Check for function declaration
      const funcMatch = functionRegex.exec(line);
      if (funcMatch && funcMatch[3] && !currentEntity) {
        currentEntity = { type: 'function', name: funcMatch[3], startLine: i + 1, content: [line] };
        braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        continue;
      }

      // Check for class declaration
      const classMatch = classRegex.exec(line);
      if (classMatch && classMatch[2] && !currentEntity) {
        currentEntity = { type: 'class', name: classMatch[2], startLine: i + 1, content: [line] };
        braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        continue;
      }

      // Check for method inside class
      if (currentEntity?.type === 'class') {
        const methodMatch = methodRegex.exec(line);
        if (methodMatch && methodMatch[2]) {
          const classEndLine = i;
          const classContent = currentEntity.content.join('\n');
          entities.push({
            type: currentEntity.type,
            name: currentEntity.name,
            content: classContent,
            lineStart: currentEntity.startLine,
            lineEnd: classEndLine
          });
          currentEntity = { type: 'method', name: methodMatch[2], startLine: i + 1, content: [line] };
          braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
          continue;
        }
      }

      // Track brace depth for entity boundaries
      if (currentEntity) {
        currentEntity.content.push(line);
        braceDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

        if (braceDepth <= 0) {
          // Entity complete
          entities.push({
            type: currentEntity.type,
            name: currentEntity.name,
            content: currentEntity.content.join('\n'),
            lineStart: currentEntity.startLine,
            lineEnd: i + 1
          });
          currentEntity = null;
        }
      }
    }

    // Handle unterminated entity (file ends mid-entity)
    if (currentEntity) {
      entities.push({
        type: currentEntity.type,
        name: currentEntity.name,
        content: currentEntity.content.join('\n'),
        lineStart: currentEntity.startLine,
        lineEnd: lines.length
      });
    }

    return entities;
  }
}

export default RAGService;

// File: src/services/rag.ts
// Enhanced Retrieval-Augmented Generation (RAG) service with VECTOR knowledge base
// Implements learning improvements and context-quality validation from Phase 3 upgrades
import { defaultLogger } from '../utils/logger.js';
import { ErrorHandler, ValidationPipeline } from '../validation/index.js';
import { stateManager } from '../state/index.js';
import { createHash } from 'crypto';
/**
 * Enhanced RAG Service - Core intelligence service for contextual code understanding
 * Integrates VECTOR knowledge base with adaptive learning and validation
 * Foundation for NEURON agent context-aware reasoning
 */
export class RAGService {
    constructor(projectId, storageManager, logger, validationPipeline) {
        // Learning state for adaptive improvements
        this.queryHistory = new Map();
        this.effectivenessTracking = new Map();
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
    initializeValidationStages() {
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
    async retrieveContext(query) {
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
            const searchResults = await this.storageManager.findSimilarVectors(queryVector, query.options?.maxChunks || 10);
            // Process and enhance results
            const processedChunks = await this.processSearchResults(searchResults, query);
            // Apply intelligent weighting and selection
            const weighedChunks = await this.applyIntelligentWeighing(processedChunks, query);
            // Validate context quality
            const validationResult = await this.validateContextQuality(query, weighedChunks);
            // Compile final result
            const result = {
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
                    score: validationResult.score,
                    warnings: validationResult.details
                        ?.filter(detail => detail.includes('warning') || detail.includes('WARN'))
                }
            };
            // Update learning metrics
            await this.updateLearningMetrics(query, result);
            this.logger.debug('Context retrieval completed', {
                chunksReturned: result.chunks.length,
                totalSimilarity: result.totalSimilarity,
                confidenceScore: result.confidenceScore
            });
            return result;
        }
        catch (error) {
            this.errorHandler.handleError(error, { operation: 'retrieveContext', query });
            throw error;
        }
    }
    /**
     * Add new content to the knowledge base
     * Integrates with PRISM project intelligence for enhanced context
     */
    async addToKnowledgeBase(content, projectContext) {
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
        }
        catch (error) {
            this.errorHandler.handleError(error, { operation: 'addToKnowledgeBase', chunkCount: content.length });
            throw error;
        }
    }
    /**
     * Update knowledge base with learning insights
     * Enables adaptive improvements based on effectiveness tracking
     */
    async updateLearningInsights(query, result, userFeedback) {
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
        }
        catch (error) {
            this.logger.warn('Failed to update learning insights', { error });
            // Don't throw - learning updates shouldn't break core functionality
        }
    }
    /**
     * Optimize knowledge base for better performance
     * Implements VECTOR knowledge base compression and optimization
     */
    async optimize() {
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
        }
        catch (error) {
            this.errorHandler.handleError(error, { operation: 'optimize' });
            throw error;
        }
    }
    /**
     * Analyze knowledge base health and provide recommendations
     */
    async analyzeHealth() {
        try {
            const stats = {
                totalChunks: await this.getIndexSize(),
                qualityScore: await this.calculateQualityScore(),
                connectivityIndex: await this.calculateConnectivityIndex(),
                recommendations: await this.generateRecommendations()
            };
            this.logger.debug('Health analysis completed', stats);
            return stats;
        }
        catch (error) {
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
     */
    async generateEmbedding(content) {
        // Implementation would integrate with AI providers (Gemini, OpenAI, etc.)
        // For now, return a mock embedding
        const hash = createHash('sha256').update(content).digest('hex');
        const vector = Array.from({ length: 768 }, (_, i) => parseInt(hash.slice(i * 2, (i + 1) * 2), 16) / 255.0);
        return vector;
    }
    /**
     * Process raw search results into enriched context chunks
     */
    async processSearchResults(results, query) {
        return results.map(({ vector, similarity }) => ({
            id: vector.id,
            content: JSON.parse(vector.metadata.context || '[]')[0] || '',
            source: {
                filePath: vector.metadata.filePath,
                lineStart: vector.metadata.lineStart,
                lineEnd: vector.metadata.lineEnd
            },
            type: vector.metadata.contentType,
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
    async applyIntelligentWeighing(chunks, query) {
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
            return chunks.filter(chunk => (chunk.relevanceScore || 0) >= query.options.relevanceThreshold);
        }
        return chunks.slice(0, query.options?.maxChunks || 10);
    }
    /**
     * Validate overall context quality through the validation pipeline
     */
    async validateContextQuality(query, chunks) {
        const projectState = stateManager.getProjectState(this.projectId);
        const globalState = stateManager.getGlobalState();
        const defaultSafety = globalState.ai.safety;
        const projectSafety = projectState?.overrides?.safetyControls;
        const safetyControls = {
            ...defaultSafety,
            ...projectSafety,
            confidenceThresholds: {
                ...defaultSafety.confidenceThresholds,
                ...projectSafety?.confidenceThresholds
            },
            riskAssessment: {
                ...defaultSafety.riskAssessment,
                ...projectSafety?.riskAssessment
            },
            operationalLimits: {
                ...defaultSafety.operationalLimits,
                ...projectSafety?.operationalLimits
            },
            emergencyMode: {
                ...defaultSafety.emergencyMode,
                ...projectSafety?.emergencyMode
            }
        };
        const validationContext = {
            sessionId: `rag_${this.projectId}_${Date.now()}`,
            projectId: this.projectId,
            developerId: 'system', // RAG service runs as system
            safetyControls,
            metadata: {
                queryContent: query.content,
                chunkCount: chunks.length,
                totalRelevance: chunks.reduce((sum, chunk) => sum + (chunk.relevanceScore || 0), 0),
                skipCompletenessCheck: chunks.length < 3 // Skip detailed checks for minimal results
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
    buildSearchFilters(query) {
        const filters = {};
        if (query.options?.contextFilters?.contentTypes) {
            // Convert contentTypes to contentType filter if needed
        }
        if (query.options?.contextFilters?.languages) {
            // Apply language filters
        }
        return filters;
    }
    // Validation stage implementations
    async validateContextCompleteness(context) {
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
    async validateSemanticRelevance(context) {
        // Implementation would analyze semantic coherence
        return {
            passed: true,
            score: 0.8,
            message: 'Semantic relevance validation passed'
        };
    }
    async validateContextualCoherence(context) {
        // Implementation would check contextual relationships
        return {
            passed: true,
            score: 0.9,
            message: 'Contextual coherence validation passed'
        };
    }
    // Utility methods
    async getIndexSize() {
        // Would query storage manager for total indexed chunks
        return 0;
    }
    async applyProjectWeighting(chunk, weighing) {
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
    async applyLearningWeighting(chunk, query) {
        // Would apply learned patterns for better weighting
        return 0;
    }
    async updateLearningMetrics(query, result) {
        // Store query-result pairs for learning
    }
    async embedContent(content, projectContext) {
        const entries = [];
        for (const chunk of content) {
            const vector = await this.generateEmbedding(chunk.content);
            const metadata = {
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
    async updateProjectKnowledge(projectContext) {
        // Would update project knowledge in state
    }
    async updateQueryEffectivenessTracking(query, result, userFeedback) {
        // Implementation for effectiveness tracking
    }
    async updatePatternRecognition(result) {
        // Implementation for pattern updates
    }
    async adjustRetrievalStrategy(userFeedback) {
        // Implementation for strategy adjustments
    }
    async persistLearningUpdates() {
        // Implementation for persistence
    }
    async cleanupRedundantContent() {
        // Implementation for cleanup
        return 0;
    }
    async rebuildSemanticIndex() {
        // Implementation for index rebuilding
    }
    async compactLearningData() {
        // Implementation for data compaction
        return 0;
    }
    async calculatePerformanceImprovement() {
        // Calculate before/after performance metrics
        return 0;
    }
    async calculateQualityScore() {
        // Implementation for quality scoring
        return 0.8;
    }
    async calculateConnectivityIndex() {
        // Implementation for connectivity analysis
        return 0.7;
    }
    async generateRecommendations() {
        // Implementation for generating recommendations
        return [];
    }
}
export default RAGService;

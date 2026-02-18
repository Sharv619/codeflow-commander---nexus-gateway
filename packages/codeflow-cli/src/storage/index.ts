// File: src/storage/index.ts
// Storage Abstractions implementing Data Model persistence requirements
// Provides SQLite-based vector store and optimized JSON repositories

import fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import Database from 'sqlite3';
import { Logger, defaultLogger } from '@/utils/logger';
import { ErrorHandler } from '@/validation';
import { CodeChunk } from '@/types/entities';
import * as os from 'os';

/**
 * Storage Configuration - Defines storage backend and optimization settings
 * Configurable based on deployment needs and performance requirements
 */
export interface StorageConfig {
  // Backend selection
  vectorStore: 'sqlite' | 'memory'; // Vector storage
  metadataStore: 'json' | 'sqlite'; // Metadata/configuration storage

  // Performance settings
  cacheEnabled: boolean;
  compressionEnabled: boolean;
  batchSize: number; // For bulk operations

  // Persistence locations
  globalStatePath: string; // ~/.codeflow-cli/global
  projectStateTemplate: string; // .codeflow/state
  vectorStorePathTemplate: string; // .codeflow/vectors.db

  // Optimization settings
  retentionPolicies: RetentionPolicy[];
  cleanupInterval: number; // hours
  maxCacheSize: number; // MB
}

/**
 * Retention Policy - Defines data lifecycle management rules
 * Implements the retention policies from the data model
 */
export interface RetentionPolicy {
  target: 'sessions' | 'suggestions' | 'feedback' | 'vectors' | 'configs';
  maxAge: number; // days
  priorityRules?: Array<{ condition: string; priority: 'keep' | 'compress' | 'delete' }>;
  compressionThreshold: number; // days
}

/**
 * Vector Store Entry - Typed structure for vector storage
 * Optimized for semantic search and similarity operations
 */
export interface VectorEntry {
  id: string;
  vector: number[]; // AI-generated embedding
  metadata: VectorMetadata;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  compressed: boolean;
}

/**
 * Vector Metadata - Contextual information for vectorized content
 * Used for filtering, ranking, and contextual retrieval
 */
export interface VectorMetadata {
  contentType: 'function' | 'class' | 'interface' | 'comment' | 'documentation' | 'config';
  language: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  context: string; // Surrounding code for context
  tags: string[]; // Searchable tags (e.g., ['security', 'validation'])
  quality: {
    confidence: number; // AI confidence in this chunk
    relevance: number; // Manual relevance ratings
    freshness: number; // How recent this content is
  };
}

/**
 * Storage Manager - Main interface for data persistence operations
 * Coordinates between vector store and metadata store
 * Provides unified API for all storage operations
 */
export class StorageManager {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private config: StorageConfig;
  private vectorStore: VectorStorageBackend;
  private metadataStore: MetadataStorageBackend;
  private cache: Map<string, any> = new Map();

  constructor(config?: Partial<StorageConfig>, logger?: Logger) {
    this.logger = logger || defaultLogger;
    this.errorHandler = new ErrorHandler(this.logger);
    this.config = this.createDefaultConfig(config);
    this.initializeBackends();
  }

  /**
   * Create default storage configuration
   */
  private createDefaultConfig(config?: Partial<StorageConfig>): StorageConfig {
    const defaultConfig: StorageConfig = {
      vectorStore: 'sqlite',
      metadataStore: 'json',
      cacheEnabled: true,
      compressionEnabled: true,
      batchSize: 100,
      globalStatePath: path.join(os.homedir(), '.codeflow-cli', 'global'),
      projectStateTemplate: '.codeflow/state',
      vectorStorePathTemplate: '.codeflow/vectors.db',
      retentionPolicies: this.createDefaultRetentionPolicies(),
      cleanupInterval: 24, // hours
      maxCacheSize: 100 // MB
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Create default retention policies based on data model
   */
  private createDefaultRetentionPolicies(): RetentionPolicy[] {
    return [
      {
        target: 'sessions',
        maxAge: 30, // 30 days
        priorityRules: [
          { condition: 'high-confidence', priority: 'compress' },
          { condition: 'security-critical', priority: 'keep' }
        ],
        compressionThreshold: 7
      },
      {
        target: 'suggestions',
        maxAge: 90, // 90 days
        priorityRules: [
          { condition: 'accepted', priority: 'compress' },
          { condition: 'high-feedback', priority: 'keep' }
        ],
        compressionThreshold: 30
      },
      {
        target: 'feedback',
        maxAge: 180, // 6 months
        priorityRules: [
          { condition: 'recent', priority: 'keep' },
          { condition: 'anomalous', priority: 'compress' }
        ],
        compressionThreshold: 60
      },
      {
        target: 'vectors',
        maxAge: 365, // 1 year
        priorityRules: [
          { condition: 'frequently-accessed', priority: 'keep' },
          { condition: 'high-quality', priority: 'compress' }
        ],
        compressionThreshold: 90
      }
    ];
  }

  /**
   * Initialize storage backends based on configuration
   */
  private initializeBackends(): void {
    // Vector store initialization
    if (this.config.vectorStore === 'sqlite') {
      this.vectorStore = new SQLiteVectorStore(this.config, this.logger);
    } else {
      this.vectorStore = new MemoryVectorStore(this.config, this.logger);
    }

    // Metadata store initialization
    if (this.config.metadataStore === 'sqlite') {
      this.metadataStore = new SQLiteMetadataStore(this.config, this.logger);
    } else {
      this.metadataStore = new JSONMetadataStore(this.config, this.logger);
    }

    this.logger.info('Storage backends initialized', { config: this.config });
  }

  // Vector operations

  /**
   * Store vectors and their metadata
   * Supports batch operations for performance
   */
  async storeVectors(vectors: VectorEntry[]): Promise<void> {
    try {
      await this.vectorStore.store(vectors);

      // Update cache with access patterns
      if (this.config.cacheEnabled) {
        vectors.forEach(vector => {
          this.updateCache(`vector:${vector.id}`, vector, 'vectors');
        });
      }

      this.logger.debug(`Stored ${vectors.length} vectors`);
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'storeVectors', count: vectors.length });
      throw error;
    }
  }

  /**
   * Search for similar vectors using cosine similarity
   * Returns top-k most similar results with metadata
   */
  async findSimilarVectors(
    queryVector: number[],
    limit: number = 10,
    filters?: Partial<VectorMetadata>
  ): Promise<Array<{ vector: VectorEntry; similarity: number }>> {
    try {
      return await this.vectorStore.search(queryVector, limit, filters);
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'findSimilarVectors', limit });
      throw error;
    }
  }

  /**
   * Update vector access patterns for performance optimization
   */
  async updateVectorAccess(vectorId: string): Promise<void> {
    try {
      await this.vectorStore.updateAccess(vectorId);

      // Update cache
      if (this.config.cacheEnabled) {
        const cached = this.cache.get(`vector:${vectorId}`);
        if (cached) {
          cached.lastAccessed = new Date();
          cached.accessCount++;
        }
      }
    } catch (error) {
      this.logger.debug('Vector access update failed, continuing...', { vectorId });
    }
  }

  // Metadata operations

  /**
   * Store arbitrary metadata/object with versioning and compression
   */
  async storeMetadata(scope: string, key: string, data: any): Promise<void> {
    try {
      // Compress large data if enabled
      const processedData = this.config.compressionEnabled
        ? this.compressIfNeeded(data)
        : data;

      await this.metadataStore.store(`${scope}:${key}`, {
        data: processedData,
        version: 1,
        createdAt: new Date(),
        compressed: this.config.compressionEnabled && processedData !== data
      });

      // Update cache
      if (this.config.cacheEnabled) {
        this.updateCache(`${scope}:${key}`, processedData, scope);
      }

      this.logger.debug(`Stored metadata: ${scope}:${key}`);
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'storeMetadata', scope, key });
      throw error;
    }
  }

  /**
   * Retrieve stored metadata with automatic decompression
   */
  async getMetadata(scope: string, key: string): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `${scope}:${key}`;
      if (this.config.cacheEnabled) {
        const cached = this.cache.get(cacheKey);
        if (cached && this.isCacheValid(cached, cacheKey)) {
          return cached.data;
        }
      }

      const result = await this.metadataStore.get(`${scope}:${key}`);
      if (!result) return null;

      // Decompress if needed
      const data = result.compressed
        ? this.decompressData(result.data)
        : result.data;

      // Update cache
      if (this.config.cacheEnabled) {
        this.updateCache(cacheKey, data, scope);
      }

      return data;
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'getMetadata', scope, key });
      throw error;
    }
  }

  // Utility methods

  /**
   * Compress data if it exceeds size threshold
   */
  private compressIfNeeded(data: any): any {
    const serialized = JSON.stringify(data);
    if (serialized.length < 1024) return data; // Don't compress small data

    // In real implementation, would use actual compression
    // For now, return as-is with compression flag
    return data;
  }

  /**
   * Decompress data (would be compression-specific)
   */
  private decompressData(data: any): any {
    // In real implementation, would decompress based on algorithm
    return data;
  }

  /**
   * Update memory cache with size management
   */
  private updateCache(key: string, data: any, scope: string): void {
    const entry = {
      data,
      scope,
      timestamp: new Date(),
      size: this.estimateSize(data)
    };

    // Check cache size limit
    const currentSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + (entry.size || 0), 0);

    if (currentSize + entry.size > this.config.maxCacheSize * 1024 * 1024) {
      this.evictCacheEntries(entry.size);
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cached: any, key: string): boolean {
    // Cache invalidation logic based on retention policies
    const policy = this.config.retentionPolicies.find(p => p.target === cached.scope);
    if (policy) {
      const age = Date.now() - cached.timestamp.getTime();
      return age < (policy.compressionThreshold * 24 * 60 * 60 * 1000);
    }
    return true;
  }

  /**
   * Evict cache entries when size limit exceeded
   */
  private evictCacheEntries(requiredSpace: number): void {
    // LRU eviction strategy
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry, age: Date.now() - entry.timestamp.getTime() }))
      .sort((a, b) => b.age - a.age); // Sort by age (oldest first)

    let freedSpace = 0;
    for (const { key } of entries) {
      if (freedSpace >= requiredSpace) break;
      const entry = this.cache.get(key);
      if (entry) {
        freedSpace += entry.size || 0;
        this.cache.delete(key);
      }
    }
  }

  /**
   * Estimate memory size of data (approximate)
   */
  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate
  }

  /**
   * Perform scheduled cleanup operations
   */
  async performCleanup(): Promise<{ cleaned: number; errors: number }> {
    let cleaned = 0;
    let errors = 0;

    try {
      // Cleanup vectors
      cleaned += await this.vectorStore.cleanup(this.config.retentionPolicies);
    } catch (error) {
      errors++;
      this.logger.warn('Vector cleanup failed', { error });
    }

    try {
      // Cleanup metadata
      cleaned += await this.metadataStore.cleanup(this.config.retentionPolicies);
    } catch (error) {
      errors++;
      this.logger.warn('Metadata cleanup failed', { error });
    }

    try {
      // Cleanup cache
      if (this.config.cacheEnabled) {
        const cacheSize = this.cache.size;
        this.cache.clear();
        this.logger.debug('Cache cleared', { previousSize: cacheSize });
      }
    } catch (error) {
      errors++;
      this.logger.warn('Cache cleanup failed', { error });
    }

    return { cleaned, errors };
  }

  /**
   * Optimize storage for performance
   */
  async optimize(): Promise<void> {
    try {
      await this.vectorStore.optimize();
      await this.metadataStore.optimize();

      if (this.config.cacheEnabled) {
        this.rebuildCache();
      }

      this.logger.info('Storage optimization completed');
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'optimize' });
    }
  }

  /**
   * Rebuild cache from persisted data
   */
  private rebuildCache(): void {
    // Implementation would build warm cache from frequently accessed data
    this.logger.debug('Cache rebuild initiated');
  }
}

/**
 * Vector Storage Backend Interface - Abstract vector operations
 * Allows swapping between different storage implementations
 */
export interface VectorStorageBackend {
  store(vectors: VectorEntry[]): Promise<void>;
  search(queryVector: number[], limit: number, filters?: Partial<VectorMetadata>): Promise<Array<{ vector: VectorEntry; similarity: number }>>;
  updateAccess(vectorId: string): Promise<void>;
  cleanup(retentionPolicies: RetentionPolicy[]): Promise<number>;
  optimize(): Promise<void>;
}

/**
 * Metadata Storage Backend Interface - Abstract metadata operations
 */
export interface MetadataStorageBackend {
  store(key: string, data: any): Promise<void>;
  get(key: string): Promise<any>;
  cleanup(retentionPolicies: RetentionPolicy[]): Promise<number>;
  optimize(): Promise<void>;
}

/**
 * SQLite Vector Store Implementation
 * Optimized for large-scale vector operations with indexing
 */
export class SQLiteVectorStore implements VectorStorageBackend {
  private db!: Database.Database;
  private config: StorageConfig;
  private logger: Logger;

  constructor(config: StorageConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async initialize(projectPath?: string): Promise<void> {
    const vectorPath = projectPath
      ? path.resolve(projectPath, this.config.vectorStorePathTemplate)
      : this.config.vectorStorePathTemplate;

    return new Promise((resolve, reject) => {
      this.db = new Database.Database(vectorPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  private async createTables(): Promise<void> {
    const queries = [
      `CREATE TABLE IF NOT EXISTS vectors (
        id TEXT PRIMARY KEY,
        vector TEXT NOT NULL, -- JSON array
        content_type TEXT NOT NULL,
        language TEXT NOT NULL,
        file_path TEXT NOT NULL,
        line_start INTEGER,
        line_end INTEGER,
        context TEXT,
        tags TEXT, -- JSON array
        confidence REAL,
        relevance REAL,
        freshness REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        compressed BOOLEAN DEFAULT FALSE
      )`,
      // Performance indexes
      'CREATE INDEX IF NOT EXISTS idx_content_type ON vectors(content_type)',
      'CREATE INDEX IF NOT EXISTS idx_language ON vectors(language)',
      'CREATE INDEX IF NOT EXISTS idx_file_path ON vectors(file_path)',
      'CREATE INDEX IF NOT EXISTS idx_accessed ON vectors(last_accessed)',
      'CREATE INDEX IF NOT EXISTS idx_confidence ON vectors(confidence DESC)'
    ];

    for (const query of queries) {
      await this.runQuery(query);
    }
  }

  async store(vectors: VectorEntry[]): Promise<void> {
    const values = vectors.map(v => [
      v.id,
      JSON.stringify(v.vector),
      v.metadata.contentType,
      v.metadata.language,
      v.metadata.filePath,
      v.metadata.lineStart,
      v.metadata.lineEnd,
      v.metadata.context,
      JSON.stringify(v.metadata.tags),
      v.metadata.quality.confidence,
      v.metadata.quality.relevance,
      v.metadata.quality.freshness,
      v.createdAt.toISOString(),
      v.lastAccessed.toISOString(),
      v.accessCount,
      v.compressed
    ]);

    const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
    const flattened = values.flat();

    const query = `INSERT OR REPLACE INTO vectors VALUES ${placeholders}`;
    await this.runQuery(query, flattened);
  }

  async search(
    queryVector: number[],
    limit: number,
    filters?: Partial<VectorMetadata>
  ): Promise<Array<{ vector: VectorEntry; similarity: number }>> {
    // Simplified cosine similarity implementation
    // In production, would use vector extensions or optimized algorithms
    let query = 'SELECT * FROM vectors WHERE 1=1';
    const params: any[] = [];

    // Apply filters
    if (filters?.contentType) {
      query += ' AND content_type = ?';
      params.push(filters.contentType);
    }
    if (filters?.language) {
      query += ' AND language = ?';
      params.push(filters.language);
    }

    query += ` ORDER BY confidence DESC LIMIT ${limit * 10}`; // Get more for similarity ranking

    const rows = await this.allQuery(query, params);

    // Calculate similarities and rank
    const results = rows.map((row: any) => {
      const vector = JSON.parse(row.vector);
      const similarity = this.cosineSimilarity(queryVector, vector);

      return {
        vector: {
          id: row.id,
          vector,
          metadata: {
            contentType: row.content_type,
            language: row.language,
            filePath: row.file_path,
            lineStart: row.line_start,
            lineEnd: row.line_end,
            context: row.context,
            tags: JSON.parse(row.tags || '[]'),
            quality: {
              confidence: row.confidence,
              relevance: row.relevance,
              freshness: row.freshness
            }
          },
          createdAt: new Date(row.created_at),
          lastAccessed: new Date(row.last_accessed),
          accessCount: row.access_count,
          compressed: row.compressed
        },
        similarity
      };
    });

    // Sort by similarity and return top results
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async updateAccess(vectorId: string): Promise<void> {
    const query = `
      UPDATE vectors
      SET last_accessed = CURRENT_TIMESTAMP, access_count = access_count + 1
      WHERE id = ?
    `;
    await this.runQuery(query, [vectorId]);
  }

  async cleanup(retentionPolicies: RetentionPolicy[]): Promise<number> {
    // Implement retention policy-based cleanup
    const cleaned = 0;
    // Implementation would iterate through policies and delete/compress old data
    return cleaned;
  }

  async optimize(): Promise<void> {
    await this.runQuery('VACUUM');
    await this.runQuery('REINDEX');
  }

  private runQuery(query: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private allQuery(query: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

/**
 * Memory Vector Store - For testing and small datasets
 */
export class MemoryVectorStore implements VectorStorageBackend {
  private vectors: Map<string, VectorEntry> = new Map();
  private config: StorageConfig;
  private logger: Logger;

  constructor(config: StorageConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async store(vectors: VectorEntry[]): Promise<void> {
    vectors.forEach(vector => this.vectors.set(vector.id, vector));
  }

  async search(
    queryVector: number[],
    limit: number,
    filters?: Partial<VectorMetadata>
  ): Promise<Array<{ vector: VectorEntry; similarity: number }>> {
    const allVectors = Array.from(this.vectors.values());

    const filtered = filters
      ? allVectors.filter(v =>
          (!filters.contentType || v.metadata.contentType === filters.contentType) &&
          (!filters.language || v.metadata.language === filters.language)
        )
      : allVectors;

    const similarities = filtered.map(vector => ({
      vector,
      similarity: this.cosineSimilarity(queryVector, vector.vector)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async updateAccess(vectorId: string): Promise<void> {
    const vector = this.vectors.get(vectorId);
    if (vector) {
      vector.lastAccessed = new Date();
      vector.accessCount++;
    }
  }

  async cleanup(retentionPolicies: RetentionPolicy[]): Promise<number> {
    // Simplified cleanup for memory store
    return 0;
  }

  async optimize(): Promise<void> {
    // No-op for memory store
  }
}

/**
 * JSON Metadata Store - Simple file-based storage for metadata
 */
export class JSONMetadataStore implements MetadataStorageBackend {
  private config: StorageConfig;
  private logger: Logger;
  private basePath: string;

  constructor(config: StorageConfig, logger: Logger, basePath?: string) {
    this.config = config;
    this.logger = logger;
    this.basePath = basePath || config.globalStatePath;
  }

  async store(key: string, data: any): Promise<void> {
    const filePath = path.join(this.basePath, `${key.replace(/:/g, '_')}.json`);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, data, { spaces: 2 });
  }

  async get(key: string): Promise<any> {
    const filePath = path.join(this.basePath, `${key.replace(/:/g, '_')}.json`);
    try {
      return await fs.readJson(filePath);
    } catch {
      return null;
    }
  }

  async cleanup(retentionPolicies: RetentionPolicy[]): Promise<number> {
    // Implementation would check file timestamps and apply retention
    return 0;
  }

  async optimize(): Promise<void> {
    // Could implement periodic defragmentation
  }
}

/**
 * SQLite Metadata Store - Database-backed metadata storage
 */
export class SQLiteMetadataStore implements MetadataStorageBackend {
  constructor(private _config: StorageConfig, private _logger: Logger) {}

  async store(key: string, data: any): Promise<void> {
    // Implementation
  }

  async get(key: string): Promise<any> {
    // Implementation
    return null;
  }

  async cleanup(retentionPolicies: RetentionPolicy[]): Promise<number> {
    return 0;
  }

  async optimize(): Promise<void> {
    // Implementation
  }
}

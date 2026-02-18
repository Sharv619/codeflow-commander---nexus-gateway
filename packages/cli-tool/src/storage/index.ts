// File: src/storage/index.ts
// Simplified Storage Manager for CLI - JSON file-based storage
// Provides core storage capabilities without native dependencies

import fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Logger, defaultLogger } from '../utils/logger.js';
import { ErrorHandler } from '../validation/index.js';
import { CodeChunk } from '../types/entities.js';

/**
 * Storage Configuration
 */
export interface StorageConfig {
  storagePath: string;
  cacheEnabled: boolean;
  maxCacheSize: number;
}

/**
 * Vector Entry for semantic search
 */
export interface VectorEntry {
  id: string;
  vector: number[];
  metadata: VectorMetadata;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  compressed?: boolean;
}

export interface VectorMetadata {
  contentType: 'function' | 'class' | 'interface' | 'comment' | 'documentation' | 'config';
  language: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  context: string;
  tags: string[];
  quality: {
    confidence: number;
    relevance: number;
    freshness: number;
  };
}

/**
 * JSON-based Storage Manager
 * Simple file-based storage for CLI use cases
 */
export class StorageManager {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private config: StorageConfig;
  private storagePath: string;
  private cache: Map<string, any> = new Map();

  constructor(config?: Partial<StorageConfig>, logger?: Logger) {
    this.logger = logger || defaultLogger;
    this.errorHandler = new ErrorHandler(this.logger);
    this.config = this.createDefaultConfig(config);
    this.storagePath = this.config.storagePath || path.join(os.homedir(), '.codeflow-hook', 'storage');
    this.initialize();
  }

  private createDefaultConfig(config?: Partial<StorageConfig>): StorageConfig {
    return {
      storagePath: path.join(os.homedir(), '.codeflow-hook', 'storage'),
      cacheEnabled: true,
      maxCacheSize: 100,
      ...config
    };
  }

  private async initialize(): Promise<void> {
    try {
      await fs.ensureDir(this.storagePath);
      this.logger.info('Storage initialized', { path: this.storagePath });
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'storage-initialize' });
    }
  }

  /**
   * Store vectors with metadata
   */
  async storeVectors(vectors: VectorEntry[]): Promise<void> {
    try {
      const vectorsPath = path.join(this.storagePath, 'vectors.json');
      let existing: VectorEntry[] = [];
      
      if (await fs.pathExists(vectorsPath)) {
        const data = await fs.readJson(vectorsPath);
        existing = data.vectors || [];
      }

      existing.push(...vectors);
      await fs.writeJson(vectorsPath, { vectors: existing }, { spaces: 2 });
      
      if (this.config.cacheEnabled) {
        vectors.forEach(v => this.cache.set(`vector:${v.id}`, v));
      }
      
      this.logger.debug(`Stored ${vectors.length} vectors`);
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'storeVectors', count: vectors.length });
      throw error;
    }
  }

  /**
   * Search vectors by similarity with optional filtering
   */
  async searchVectors(
    queryVector: number[], 
    limit: number = 10,
    filters?: Partial<VectorMetadata>
  ): Promise<Array<{ vector: VectorEntry; similarity: number }>> {
    try {
      const vectorsPath = path.join(this.storagePath, 'vectors.json');
      
      if (!await fs.pathExists(vectorsPath)) {
        return [];
      }

      const data = await fs.readJson(vectorsPath);
      let vectors: VectorEntry[] = data.vectors || [];

      // Apply filters if provided
      if (filters) {
        vectors = vectors.filter(v => this.matchesFilter(v.metadata, filters));
      }

      const results = vectors.map(v => ({
        vector: v,
        similarity: this.cosineSimilarity(queryVector, v.vector)
      }));

      return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'searchVectors' });
      return [];
    }
  }

  /**
   * Check if vector metadata matches filter criteria
   */
  private matchesFilter(metadata: VectorMetadata, filters: Partial<VectorMetadata>): boolean {
    if (filters.contentType && metadata.contentType !== filters.contentType) return false;
    if (filters.language && metadata.language !== filters.language) return false;
    if (filters.filePath && !metadata.filePath.includes(filters.filePath)) return false;
    if (filters.tags && filters.tags.length > 0) {
      const hasTag = filters.tags.some(tag => metadata.tags.includes(tag));
      if (!hasTag) return false;
    }
    return true;
  }

  /**
   * Store project knowledge
   */
  async storeProjectKnowledge(projectId: string, knowledge: any): Promise<void> {
    try {
      const projectPath = path.join(this.storagePath, 'projects', projectId);
      await fs.ensureDir(projectPath);
      await fs.writeJson(path.join(projectPath, 'knowledge.json'), knowledge, { spaces: 2 });
      this.logger.debug('Project knowledge stored', { projectId });
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'storeProjectKnowledge', projectId });
      throw error;
    }
  }

  /**
   * Retrieve project knowledge
   */
  async getProjectKnowledge(projectId: string): Promise<any> {
    try {
      const knowledgePath = path.join(this.storagePath, 'projects', projectId, 'knowledge.json');
      
      if (!await fs.pathExists(knowledgePath)) {
        return null;
      }

      return await fs.readJson(knowledgePath);
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'getProjectKnowledge', projectId });
      return null;
    }
  }

  /**
   * Store code chunks for context
   */
  async storeCodeChunks(chunks: CodeChunk[]): Promise<void> {
    try {
      const chunksPath = path.join(this.storagePath, 'chunks.json');
      let existing: CodeChunk[] = [];
      
      if (await fs.pathExists(chunksPath)) {
        const data = await fs.readJson(chunksPath);
        existing = data.chunks || [];
      }

      existing.push(...chunks);
      await fs.writeJson(chunksPath, { chunks: existing }, { spaces: 2 });
      this.logger.debug(`Stored ${chunks.length} code chunks`);
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'storeCodeChunks' });
      throw error;
    }
  }

  /**
   * Get code chunks
   */
  async getCodeChunks(projectId?: string): Promise<CodeChunk[]> {
    try {
      const chunksPath = path.join(this.storagePath, 'chunks.json');
      
      if (!await fs.pathExists(chunksPath)) {
        return [];
      }

      const data = await fs.readJson(chunksPath);
      return data.chunks || [];
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'getCodeChunks' });
      return [];
    }
  }

  /**
   * Calculate cosine similarity between vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

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

  /**
   * Find similar vectors (alias for searchVectors with filters)
   */
  async findSimilarVectors(
    queryVector: number[], 
    limit: number = 10,
    filters?: Partial<VectorMetadata>
  ): Promise<Array<{ vector: VectorEntry; similarity: number }>> {
    return this.searchVectors(queryVector, limit, filters);
  }

  /**
   * Compress vector data (mark as compressed)
   */
  async compressVectors(ids: string[]): Promise<void> {
    try {
      const vectorsPath = path.join(this.storagePath, 'vectors.json');
      if (!await fs.pathExists(vectorsPath)) return;

      const data = await fs.readJson(vectorsPath);
      const vectors: VectorEntry[] = data.vectors || [];

      vectors.forEach(v => {
        if (ids.includes(v.id)) {
          v.compressed = true;
        }
      });

      await fs.writeJson(vectorsPath, { vectors }, { spaces: 2 });
      this.logger.debug(`Compressed ${ids.length} vectors`);
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'compressVectors' });
    }
  }

  /**
   * Optimize storage (no-op for JSON storage)
   */
  async optimize(): Promise<void> {
    this.logger.debug('Storage optimized (JSON backend - no optimization needed)');
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    try {
      await fs.emptyDir(this.storagePath);
      this.cache.clear();
      this.logger.info('Storage cleared');
    } catch (error) {
      this.errorHandler.handleError(error, { operation: 'storage-clear' });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{ vectors: number; chunks: number; projects: number }> {
    try {
      const vectorsPath = path.join(this.storagePath, 'vectors.json');
      const chunksPath = path.join(this.storagePath, 'chunks.json');
      const projectsPath = path.join(this.storagePath, 'projects');

      let vectors = 0, chunks = 0, projects = 0;

      if (await fs.pathExists(vectorsPath)) {
        const data = await fs.readJson(vectorsPath);
        vectors = data.vectors?.length || 0;
      }

      if (await fs.pathExists(chunksPath)) {
        const data = await fs.readJson(chunksPath);
        chunks = data.chunks?.length || 0;
      }

      if (await fs.pathExists(projectsPath)) {
        const dirs = await fs.readdir(projectsPath);
        projects = dirs.length;
      }

      return { vectors, chunks, projects };
    } catch (error) {
      return { vectors: 0, chunks: 0, projects: 0 };
    }
  }
}

// Export singleton instance
export const storageManager = new StorageManager();

/**
 * In-memory vector store fallback
 * Provides basic vector storage and similarity search without external dependencies
 * Used when FAISS is not available or FEATURE_FAISS is disabled
 */

class VectorStoreFallback {
  constructor(indexPath = null) {
    this.indexPath = indexPath || './.codeflow-hook/vector-fallback-index';
    this.vectors = [];
    this.metadata = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Try to load existing data if indexPath exists
      await this.loadIndex();
    } catch (error) {
      console.log('No existing fallback vector index found, starting fresh');
    }

    this.initialized = true;
    console.log('✅ Fallback vector store initialized');
  }

  /**
   * Add a document to the vector store
   * @param {Array<number>} vector - Vector representation of the document
   * @param {Object} metadata - Associated metadata
   */
  async add(vector, metadata) {
    if (!this.initialized) {
      throw new Error('Vector store not initialized');
    }

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Invalid vector: must be non-empty array of numbers');
    }

    this.vectors.push([...vector]); // Copy vector
    this.metadata.push({ ...metadata }); // Copy metadata

    console.log(`✅ Added vector to fallback store (${this.vectors.length} total)`);
  }

  /**
   * Add multiple vectors at once
   * @param {Array<Array<number>>} vectors - Array of vectors
   * @param {Array<Object>} metadataArray - Array of metadata objects
   */
  async addBatch(vectors, metadataArray) {
    if (!Array.isArray(vectors) || !Array.isArray(metadataArray)) {
      throw new Error('Vectors and metadata must be arrays');
    }

    if (vectors.length !== metadataArray.length) {
      throw new Error('Vectors and metadata arrays must have the same length');
    }

    for (let i = 0; i < vectors.length; i++) {
      await this.add(vectors[i], metadataArray[i]);
    }
  }

  /**
   * Search for similar vectors using cosine similarity
   * @param {Array<number>} queryVector - Query vector
   * @param {number} limit - Maximum number of results to return
   * @returns {Array<Object>} - Array of results with scores and metadata
   */
  async search(queryVector, limit = 5) {
    if (!this.initialized) {
      throw new Error('Vector store not initialized');
    }

    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error('Invalid query vector');
    }

    // Calculate cosine similarity for all vectors
    const results = this.vectors.map((vector, index) => ({
      score: VectorStoreFallback.cosineSimilarity(queryVector, vector),
      vector: [...vector],
      metadata: { ...this.metadata[index] },
      index: index
    }));

    // Sort by similarity score (higher is better)
    results.sort((a, b) => b.score - a.score);

    // Return top results
    return results.slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vecA - First vector
   * @param {Array<number>} vecB - Second vector
   * @returns {number} - Cosine similarity score (between -1 and 1)
   */
  static cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Clear all vectors and metadata
   */
  async clear() {
    this.vectors = [];
    this.metadata = [];
    console.log('🗑️ Fallback vector store cleared');
  }

  /**
   * Get statistics about the vector store
   * @returns {Object} - Statistics object
   */
  stats() {
    return {
      vectorCount: this.vectors.length,
      metadataCount: this.metadata.length,
      initialized: this.initialized,
      indexPath: this.indexPath,
      averageVectorLength: this.vectors.length > 0
        ? this.vectors[0].length
        : 0
    };
  }

  /**
   * Save index to disk (optional persistence)
   */
  async saveIndex() {
    if (!this.indexPath) return;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const indexDir = path.dirname(this.indexPath);
      await fs.mkdir(indexDir, { recursive: true });

      const data = {
        vectors: this.vectors,
        metadata: this.metadata,
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(this.indexPath, JSON.stringify(data, null, 2));
      console.log(`💾 Fallback vector index saved to ${this.indexPath}`);
    } catch (error) {
      console.warn('Failed to save fallback vector index:', error.message);
      // Don't throw - saving is optional for fallback store
    }
  }

  /**
   * Load index from disk (optional persistence)
   */
  async loadIndex() {
    if (!this.indexPath) return;

    try {
      const fs = await import('fs/promises');

      const data = await fs.readFile(this.indexPath, 'utf-8');
      const parsed = JSON.parse(data);

      this.vectors = parsed.vectors || [];
      this.metadata = parsed.metadata || [];

      console.log(`📂 Loaded ${this.vectors.length} vectors from fallback index`);
    } catch (error) {
      // File doesn't exist or invalid - start fresh
      console.log('Fallback vector index not found, starting fresh');
    }
  }
}

export { VectorStoreFallback };

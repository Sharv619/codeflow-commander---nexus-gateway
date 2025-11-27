/**
 * Simple in-memory vector store for CLI operations
 * Compatible with RAGSystem for code analysis and retrieval
 */

class VectorStore {
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
      console.log('No existing vector index found, starting fresh');
    }

    this.initialized = true;
    console.log('✅ Simple vector store initialized');
  }

  /**
   * Generate basic embeddings for text (for testing)
   */
  generateEmbedding(text) {
    // Simple hash-based embedding for CLI testing
    // In production, this would use real embeddings like OpenAI or local models
    const hash = this.simpleHash(text);
    return [hash % 1000, (hash * 31) % 1000, (hash * 127) % 1000];
  }

  /**
   * Simple hash function for basic embeddings
   */
  simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Add multiple vectors at once
   */
  async addVectors(vectors, metadataArray) {
    if (!Array.isArray(vectors) || !Array.isArray(metadataArray)) {
      throw new Error('Vectors and metadata must be arrays');
    }

    if (vectors.length !== metadataArray.length) {
      throw new Error('Vectors and metadata arrays must have the same length');
    }

    if (!this.initialized) {
      await this.initialize();
    }

    for (let i = 0; i < vectors.length; i++) {
      this.vectors.push([...vectors[i]]);
      this.metadata.push({ ...metadataArray[i] });
    }

    console.log(`✅ Added ${vectors.length} vectors to simple store`);

    // Save to disk
    await this.saveIndex();
  }

  /**
   * Search for similar vectors using cosine similarity
   */
  async searchSimilar(queryVector, limit = 5) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error('Invalid query vector');
    }

    // Calculate cosine similarity for all vectors
    const results = this.vectors.map((vector, index) => ({
      score: this.cosineSimilarity(queryVector, vector),
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
   */
  cosineSimilarity(vecA, vecB) {
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
  async clearIndex() {
    this.vectors = [];
    this.metadata = [];
    console.log('🗑️ Simple vector store cleared');

    // Remove saved file if it exists
    try {
      const fs = await import('fs/promises');
      await fs.unlink(this.indexPath).catch(() => {}); // Ignore if file doesn't exist
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Get statistics about the vector store
   */
  getStats() {
    return {
      vectorCount: this.vectors.length,
      metadataCount: this.metadata.length,
      initialized: this.initialized,
      indexPath: this.indexPath,
      vectorDimensions: this.vectors.length > 0 ? this.vectors[0].length : 0
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
      console.log(`💾 Simple vector index saved to ${this.indexPath}`);
    } catch (error) {
      console.warn('Failed to save simple vector index:', error.message);
      // Don't throw - saving is optional for simple store
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

      console.log(`📂 Loaded ${this.vectors.length} vectors from simple index`);
    } catch (error) {
      // File doesn't exist or invalid - start fresh
      console.log('Simple vector index not found, starting fresh');
    }
  }
}

export { VectorStore };

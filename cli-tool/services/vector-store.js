import pkg from 'faiss-node';
const { FaissStore } = pkg;
import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
import os from 'os';

class VectorStore {
  constructor(indexPath = null) {
    this.indexPath = indexPath || path.join(os.homedir(), '.codeflow-hook', 'vector-index');
    this.store = null;
    this.extractor = null;
    this.metadata = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize sentence transformer for embeddings
      console.log('🔄 Initializing sentence transformer...');
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      // Initialize FAISS index
      console.log('🔄 Initializing FAISS vector store...');
      this.store = new FaissStore();

      // Load existing index if available
      await this.loadIndex();

      this.initialized = true;
      console.log('✅ Vector store initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error.message);
      throw error;
    }
  }

  async generateEmbedding(text) {
    if (!this.extractor) {
      throw new Error('Vector store not initialized');
    }

    try {
      // Generate embedding using the transformer
      const output = await this.extractor(text, { pooling: 'mean', normalize: true });

      // Convert to regular array
      return Array.from(output.data);
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error.message);
      throw error;
    }
  }

  async addVectors(vectors, metadata) {
    if (!this.store) {
      throw new Error('Vector store not initialized');
    }

    try {
      // Add vectors to FAISS index
      await this.store.addVectors(vectors);

      // Store metadata
      metadata.forEach((meta, index) => {
        this.metadata.set(vectors.length - metadata.length + index, meta);
      });

      // Save index to disk
      await this.saveIndex();

      console.log(`✅ Added ${vectors.length} vectors to index`);
    } catch (error) {
      console.error('❌ Failed to add vectors:', error.message);
      throw error;
    }
  }

  async searchSimilar(queryVector, limit = 5) {
    if (!this.store) {
      throw new Error('Vector store not initialized');
    }

    try {
      // Search for similar vectors
      const results = await this.store.similaritySearch(queryVector, limit);

      // Attach metadata to results
      return results.map(result => ({
        ...result,
        metadata: this.metadata.get(result.index) || {},
        score: result.score
      }));
    } catch (error) {
      console.error('❌ Failed to search vectors:', error.message);
      throw error;
    }
  }

  async saveIndex() {
    if (!this.store) return;

    try {
      // Ensure directory exists
      if (!fs.existsSync(this.indexPath)) {
        fs.mkdirSync(this.indexPath, { recursive: true });
      }

      // Save FAISS index
      const indexFile = path.join(this.indexPath, 'faiss.index');
      await this.store.save(indexFile);

      // Save metadata
      const metadataFile = path.join(this.indexPath, 'metadata.json');
      const metadataObj = Object.fromEntries(this.metadata);
      fs.writeFileSync(metadataFile, JSON.stringify(metadataObj, null, 2));

      console.log('💾 Vector index saved successfully');
    } catch (error) {
      console.error('❌ Failed to save index:', error.message);
      throw error;
    }
  }

  async loadIndex() {
    try {
      const indexFile = path.join(this.indexPath, 'faiss.index');
      const metadataFile = path.join(this.indexPath, 'metadata.json');

      if (fs.existsSync(indexFile)) {
        console.log('🔄 Loading existing FAISS index...');
        await this.store.load(indexFile);
        console.log('✅ FAISS index loaded');
      }

      if (fs.existsSync(metadataFile)) {
        console.log('🔄 Loading metadata...');
        const metadataObj = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        this.metadata = new Map(Object.entries(metadataObj));
        console.log(`✅ Loaded metadata for ${this.metadata.size} vectors`);
      }
    } catch (error) {
      console.log('ℹ️ No existing index found, starting fresh');
    }
  }

  async clearIndex() {
    try {
      this.store = new FaissStore();
      this.metadata.clear();

      // Remove index files
      const indexFile = path.join(this.indexPath, 'faiss.index');
      const metadataFile = path.join(this.indexPath, 'metadata.json');

      if (fs.existsSync(indexFile)) fs.unlinkSync(indexFile);
      if (fs.existsSync(metadataFile)) fs.unlinkSync(metadataFile);

      console.log('🗑️ Vector index cleared');
    } catch (error) {
      console.error('❌ Failed to clear index:', error.message);
      throw error;
    }
  }

  getStats() {
    return {
      vectorCount: this.store ? this.store.ntotal() : 0,
      metadataCount: this.metadata.size,
      indexPath: this.indexPath,
      initialized: this.initialized
    };
  }
}

export { VectorStore };

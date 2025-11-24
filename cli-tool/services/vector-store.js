import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Dynamically import the appropriate vector store implementation
let VectorStoreImpl = null;
let isUsingFaiss = false;

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

      // Initialize vector store based on FEATURE_FAISS environment variable
      const useFaiss = process.env.FEATURE_FAISS === 'true';

      if (useFaiss) {
        try {
          console.log('🔄 Attempting to initialize FAISS vector store...');
          const pkg = await import('faiss-node');
          const { FaissStore } = pkg;
          this.store = new FaissStore();
          isUsingFaiss = true;
          console.log('✅ FAISS vector store initialized');
        } catch (faissError) {
          console.warn('⚠️ FAISS not available, falling back to in-memory store:', faissError.message);
          await this.initializeFallbackStore();
        }
      } else {
        console.log('🔄 Using fallback in-memory vector store');
        await this.initializeFallbackStore();
      }

      // Load existing index if available
      await this.loadIndex();

      this.initialized = true;
      console.log(`✅ Vector store initialized successfully (${isUsingFaiss ? 'FAISS' : 'Fallback'})`);
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error.message);
      throw error;
    }
  }

  async initializeFallbackStore() {
    const { VectorStoreFallback } = await import('./vector-store-fallback.js');
    this.store = new VectorStoreFallback(this.indexPath);
    // If the fallback store exposes an async initializer, await it so store is ready
    if (typeof this.store.initialize === 'function') {
      await this.store.initialize();
    }
    isUsingFaiss = false;
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
    // Ensure vector store initialized before adding vectors
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.store) {
      throw new Error('Vector store not initialized');
    }

    try {
      if (isUsingFaiss) {
        // FAISS interface: addVectors expects array of vectors and metadata
        await this.store.addVectors(vectors);
        // Store metadata separately for FAISS
        metadata.forEach((meta, index) => {
          this.metadata.set(vectors.length - metadata.length + index, meta);
        });
      } else {
        // Fallback interface: addBatch expects vectors and metadata arrays
        // guard for addBatch presence
        if (typeof this.store.addBatch === 'function') {
          await this.store.addBatch(vectors, metadata);
        } else if (typeof this.store.add === 'function') {
          // some implementations use add per-item
          for (let i = 0; i < vectors.length; i++) {
            await this.store.add(vectors[i], metadata[i]);
          }
        } else {
          throw new Error('Fallback store missing addBatch/add methods');
        }
      }

      // Save index to disk
      if (isUsingFaiss && typeof this.saveIndex === 'function') {
        await this.saveIndex();
      }

      console.log(`✅ Added ${vectors.length} vectors to ${isUsingFaiss ? 'FAISS' : 'fallback'} index`);
    } catch (error) {
      console.error('❌ Failed to add vectors:', error.message);
      throw error;
    }
  }

  async searchSimilar(queryVector, limit = 5) {
    // Ensure vector store initialized before searching
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.store) {
      throw new Error('Vector store not initialized');
    }

    try {
      let results;
      if (isUsingFaiss) {
        // FAISS interface
        const faissResults = await this.store.similaritySearch(queryVector, limit);
        results = faissResults.map(result => ({
          ...result,
          metadata: this.metadata.get(result.index) || {},
          score: result.score
        }));
      } else {
        // Fallback interface already includes metadata
        if (typeof this.store.search === 'function') {
          results = await this.store.search(queryVector, limit);
        } else {
          throw new Error('Fallback store missing search method');
        }
      }

      return results;
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
      if (isUsingFaiss) {
        try {
          const pkg = await import('faiss-node');
          const { FaissStore } = pkg;
          this.store = new FaissStore();
        } catch (faissError) {
          console.warn('⚠️ FAISS not available during clear, using fallback');
          await this.initializeFallbackStore();
        }
        this.metadata.clear();

        // Remove index files
        const indexFile = path.join(this.indexPath, 'faiss.index');
        const metadataFile = path.join(this.indexPath, 'metadata.json');

        if (fs.existsSync(indexFile)) fs.unlinkSync(indexFile);
        if (fs.existsSync(metadataFile)) fs.unlinkSync(metadataFile);
      } else {
        // Clear fallback store
        await this.store.clear();
      }

      console.log('🗑️ Vector index cleared');
    } catch (error) {
      console.error('❌ Failed to clear index:', error.message);
      throw error;
    }
  }

  getStats() {
    if (!this.store) {
      return {
        vectorCount: 0,
        metadataCount: 0,
        indexPath: this.indexPath,
        initialized: this.initialized
      };
    }

    if (isUsingFaiss) {
      return {
        vectorCount: this.store.ntotal(),
        metadataCount: this.metadata.size,
        indexPath: this.indexPath,
        initialized: this.initialized
      };
    } else {
      // Fallback store stats
      return this.store.stats();
    }
  }
}

export { VectorStore };

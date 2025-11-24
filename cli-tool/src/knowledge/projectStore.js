/**
 * cli-tool/src/knowledge/projectStore.js
 * Phase 3 Project Knowledge Store Implementation
 *
 * Local SQLite-based knowledge management with vector embeddings
 * Provides CRUD operations for suggestions, feedback, and similarity search
 */

import { CodeSuggestion, DeveloperFeedback, ProjectKnowledge, AnalysisSession } from '../types/entities.js';
import { constants } from 'fs';
import path from 'path';
import os from 'os';
import { existsSync } from 'fs';
import { mkdirSync } from 'fs';

const CONFIG_DIR = path.join(os.homedir(), '.codeflow-hook');
const DB_PATH = path.join(CONFIG_DIR, 'project.db');

/**
 * ProjectStore - Singleton local knowledge store
 * Manages AI suggestions, developer feedback, and project intelligence
 */
export class ProjectStore {
  constructor(db = null) {
    this.db = db;
    this.initialized = false;
    this.embeddingsService = null;
    this.basePath = CONFIG_DIR;

    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  /**
   * Initialize the project store
   */
  async initialize(forceReinitialize = false) {
    if (this.initialized && !forceReinitialize) {
      return; // Already initialized
    }

    try {
      // Dynamically import sqlite3 if available
      if (!this.db) {
        const sqlite3 = await import('sqlite3').catch(() => null);
        if (!sqlite3) {
          throw new Error('SQLite3 not available. Install with: npm install sqlite3');
        }

        // Use verbose mode for better error handling
        const sqlite = sqlite3.default.verbose();
        this.db = new sqlite.Database(DB_PATH);
      }

      await this._createTables();
      this.initialized = true;

      // Try to initialize embeddings service
      await this._initEmbeddingsService();

    } catch (error) {
      console.warn(`⚠️  Project Store initialization failed: ${error.message}`);
      // Continue without storing locally - features will be limited but won't crash
      this.initialized = false;
    }
  }

  /**
   * Initialize embeddings service if TensorFlow.js is available
   */
  async _initEmbeddingsService() {
    try {
      const tf = await import('@tensorflow/tfjs-node').catch(() => null);
      const use = await import('@tensorflow-models/universal-sentence-encoder').catch(() => null);

      if (tf && use) {
        // Initialize TensorFlow.js for Node.js
        await tf.ready();

        // Load Universal Sentence Encoder model
        this.model = await use.load();
        this.embeddingsService = true;

        console.log('🧠 Embeddings service initialized');
      } else {
        console.log('ℹ️  TensorFlow.js not available - embeddings disabled');
      }
    } catch (error) {
      console.warn(`⚠️  Embeddings service initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for text using TensorFlow.js
   */
  async embed(text) {
    if (!this.embeddingsService || !this.model) {
      throw new Error('Embeddings service not available');
    }

    try {
      const embeddings = await this.model.embed([text]);
      const embeddingArray = await embeddings.array();

      // Convert to Float32Array and return
      return new Float32Array(embeddingArray[0]);
    } catch (error) {
      console.error(`❌ Embedding generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create SQLite tables for knowledge store
   */
  async _createTables() {
    return new Promise((resolve, reject) => {
      const queries = [
        // Suggestions table
        `CREATE TABLE IF NOT EXISTS suggestions (
          id TEXT PRIMARY KEY,
          session_id TEXT,
          type TEXT,
          severity TEXT,
          title TEXT,
          description TEXT,
          patch_json TEXT,
          context_json TEXT,
          generation_json TEXT,
          validation_json TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT,
          updated_at TEXT,
          relationships_json TEXT,
          metadata_json TEXT,
          extensions_json TEXT
        )`,

        // Feedback table
        `CREATE TABLE IF NOT EXISTS feedback (
          id TEXT PRIMARY KEY,
          suggestion_id TEXT,
          session_id TEXT,
          developer_id TEXT,
          action TEXT,
          accepted INTEGER,
          modified INTEGER,
          time_to_review INTEGER,
          reviewed_at TEXT,
          applied_at TEXT,
          context_json TEXT,
          custom_notes TEXT,
          modifications_json TEXT,
          usefulness_rating INTEGER,
          accuracy_rating INTEGER,
          relevance_rating INTEGER,
          confidence_alignment INTEGER,
          tags_json TEXT,
          suggested_category TEXT,
          created_at TEXT,
          updated_at TEXT,
          metadata_json TEXT,
          FOREIGN KEY (suggestion_id) REFERENCES suggestions(id)
        )`,

        // Analysis sessions table
        `CREATE TABLE IF NOT EXISTS analysis_sessions (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          started_at TEXT,
          completed_at TEXT,
          duration INTEGER,
          trigger_json TEXT,
          trigger_data_json TEXT,
          results_json TEXT,
          performance_json TEXT,
          quality_json TEXT,
          learning_json TEXT,
          status TEXT,
          parent_session TEXT,
          child_sessions_json TEXT,
          audit_json TEXT
        )`,

        // Vector embeddings table (FTS5)
        `CREATE VIRTUAL TABLE IF NOT EXISTS suggestion_embeddings
         USING fts5(id, code_snippet, embedding_vector)`,

        // Metadata table for additional indexing
        `CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      let completed = 0;
      const total = queries.length;

      for (const query of queries) {
        this.db.run(query, (err) => {
          if (err) {
            reject(new Error(`Failed to create tables: ${err.message}`));
            return;
          }

          completed++;
          if (completed === total) {
            resolve();
          }
        });
      }
    });
  }

  /**
   * Save a code suggestion to the store
   */
  async saveSuggestion(suggestion) {
    if (!this.initialized) {
      console.warn('⚠️  Project store not initialized - suggestion not saved');
      return;
    }

    try {
      const sql = `
        INSERT OR REPLACE INTO suggestions (
          id, session_id, type, severity, title, description,
          patch_json, context_json, generation_json, validation_json,
          status, created_at, updated_at, relationships_json, metadata_json, extensions_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        suggestion.id,
        suggestion.sessionId,
        suggestion.type,
        suggestion.severity,
        suggestion.title,
        suggestion.description,
        JSON.stringify(suggestion.patch),
        JSON.stringify(suggestion.context),
        JSON.stringify(suggestion.generation),
        JSON.stringify(suggestion.validation),
        suggestion.status,
        suggestion.createdAt.toISOString(),
        suggestion.updatedAt.toISOString(),
        JSON.stringify(suggestion.relationships),
        JSON.stringify(suggestion.metadata),
        JSON.stringify(suggestion.extensions)
      ];

      await this._run(sql, params);

      // Store embedding for similarity search if service is available
      if (this.embeddingsService && suggestion.context?.generationPrompt) {
        try {
          const embedding = await this.embed(suggestion.context.generationPrompt);
          await this._storeEmbedding(suggestion.id, suggestion.context.generationPrompt, embedding);
        } catch (embedError) {
          console.warn(`⚠️  Failed to store embedding for suggestion ${suggestion.id}: ${embedError.message}`);
        }
      }

      console.log(`✅ Suggestion ${suggestion.id} saved to knowledge store`);
    } catch (error) {
      console.error(`❌ Failed to save suggestion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store embedding in FTS5 table
   */
  async _storeEmbedding(suggestionId, codeSnippet, embedding) {
    // Convert embedding Float32Array to space-separated string
    const embeddingStr = Array.from(embedding).join(' ');

    const sql = `
      INSERT OR REPLACE INTO suggestion_embeddings (id, code_snippet, embedding_vector)
      VALUES (?, ?, ?)
    `;

    await this._run(sql, [suggestionId, codeSnippet, embeddingStr]);
  }

  /**
   * Search for similar code suggestions using vector similarity
   */
  async searchSimilar(codeSnippet, topK = 5) {
    if (!this.initialized || !this.embeddingsService) {
      console.warn('⚠️  Similarity search unavailable - embeddings not initialized');
      return [];
    }

    try {
      // Generate embedding for the search query
      const queryEmbedding = await this.embed(codeSnippet);
      const queryEmbeddingStr = Array.from(queryEmbedding).join(' ');

      // FTS5 similarity search (approximate using cosine similarity)
      const sql = `
        SELECT s.*,
               se.embedding_vector,
               se.code_snippet as matched_snippet
        FROM suggestions s
        JOIN suggestion_embeddings se ON s.id = se.id
        WHERE se.embedding_vector MATCH ?
        ORDER BY rank
        LIMIT ?
      `;

      const rows = await this._all(sql, [queryEmbeddingStr, topK]);

      return rows.map(row => {
        // Reconstruct CodeSuggestion from stored data
        const suggestion = new CodeSuggestion({
          id: row.id,
          sessionId: row.session_id,
          type: row.type,
          severity: row.severity,
          title: row.title,
          description: row.description,
          patch: JSON.parse(row.patch_json || '{}'),
          context: JSON.parse(row.context_json || '{}'),
          generation: JSON.parse(row.generation_json || '{}'),
          validation: JSON.parse(row.validation_json || '{}'),
          status: row.status,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          relationships: JSON.parse(row.relationships_json || '{}'),
          metadata: JSON.parse(row.metadata_json || '{}'),
          extensions: JSON.parse(row.extensions_json || '{}')
        });

        return suggestion;
      });

    } catch (error) {
      console.error(`❌ Similarity search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Record developer feedback on a suggestion
   */
  async recordFeedback(feedback) {
    if (!this.initialized) {
      console.warn('⚠️  Project store not initialized - feedback not saved');
      return;
    }

    try {
      const sql = `
        INSERT INTO feedback (
          id, suggestion_id, session_id, developer_id, action, accepted, modified,
          time_to_review, reviewed_at, applied_at, context_json, custom_notes,
          modifications_json, usefulness_rating, accuracy_rating, relevance_rating,
          confidence_alignment, tags_json, suggested_category, created_at, updated_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        feedback.id,
        feedback.suggestionId,
        feedback.sessionId,
        feedback.developerId,
        feedback.action,
        feedback.accepted ? 1 : 0,
        feedback.modified ? 1 : 0,
        feedback.timeToReview,
        feedback.reviewedAt.toISOString(),
        feedback.appliedAt ? feedback.appliedAt.toISOString() : null,
        JSON.stringify(feedback.context),
        feedback.customNotes,
        JSON.stringify(feedback.modifications),
        feedback.usefulnessRating,
        feedback.accuracyRating,
        feedback.relevanceRating,
        feedback.confidenceAlignment,
        JSON.stringify(feedback.tags),
        feedback.suggestedCategory,
        feedback.createdAt.toISOString(),
        feedback.updatedAt.toISOString(),
        JSON.stringify(feedback.metadata)
      ];

      await this._run(sql, params);
      console.log(`✅ Feedback ${feedback.id} recorded`);
    } catch (error) {
      console.error(`❌ Failed to record feedback: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get project statistics
   */
  async getStats() {
    if (!this.initialized) {
      return { initialized: false };
    }

    try {
      const suggestionCount = await this._get(`SELECT COUNT(*) as count FROM suggestions`);
      const feedbackCount = await this._get(`SELECT COUNT(*) as count FROM feedback`);
      const sessionCount = await this._get(`SELECT COUNT(*) as count FROM analysis_sessions`);

      return {
        initialized: true,
        suggestions: suggestionCount.count,
        feedback: feedbackCount.count,
        sessions: sessionCount.count,
        embeddingsEnabled: this.embeddingsService,
        dbPath: DB_PATH
      };
    } catch (error) {
      console.error(`❌ Failed to get stats: ${error.message}`);
      return { initialized: false, error: error.message };
    }
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.initialized = false;
      console.log('🔒 Project store closed');
    }
  }

  /**
   * Reset/clear the knowledge store
   */
  async reset() {
    if (!this.initialized) {
      return;
    }

    try {
      await this._run('DROP TABLE IF EXISTS suggestions');
      await this._run('DROP TABLE IF EXISTS feedback');
      await this._run('DROP TABLE IF EXISTS analysis_sessions');
      await this._run('DROP TABLE IF EXISTS suggestion_embeddings');
      await this._run('DROP TABLE IF EXISTS metadata');

      console.log('🗑️  Knowledge store reset');
      await this._createTables();
    } catch (error) {
      console.error(`❌ Failed to reset store: ${error.message}`);
      throw error;
    }
  }

  // === Database Helper Methods ===

  _run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  _get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  _all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

// Export singleton instance
let storeInstance = null;

/**
 * Get or create the singleton project store instance
 */
export function getProjectStore() {
  if (!storeInstance) {
    storeInstance = new ProjectStore();
  }
  return storeInstance;
}

/**
 * Initialize the project store
 */
export async function initProjectStore(options = {}) {
  const store = getProjectStore();
  await store.initialize(options.forceReinitialize);

  if (options.reset) {
    await store.reset();
  }

  return store;
}

export default ProjectStore;

/**
 * cli-tool/src/knowledge/__tests__/projectStore.test.js
 * Unit tests for ProjectStore - Jest with in-memory SQLite
 */

import { ProjectStore, getProjectStore, initProjectStore } from '../projectStore.js';
import { CodeSuggestion, DeveloperFeedback, SuggestionType, SuggestionSeverity, FeedbackAction } from '../../types/entities.js';

// Mock Database for testing
class MockDatabase {
  constructor() {
    this.data = {
      suggestions: new Map(),
      feedback: new Map(),
      suggestion_embeddings: new Map()
    };
    this.runCalls = [];
    this.getCalls = [];
    this.allCalls = [];
  }

  run(sql, params, callback) {
    this.runCalls.push({ sql, params });

    // Simulate different SQL operations
    if (sql.includes('CREATE TABLE')) {
      callback(null);
    } else if (sql.includes('INSERT') && sql.includes('suggestions')) {
      const id = params[0];
      this.data.suggestions.set(id, { id, ...params.slice(1) });
      callback.call({ lastID: id, changes: 1 });
    } else if (sql.includes('INSERT') && sql.includes('feedback')) {
      const id = params[0];
      this.data.feedback.set(id, { id, ...params.slice(1) });
      callback.call({ lastID: id, changes: 1 });
    } else if (sql.includes('INSERT') && sql.includes('suggestion_embeddings')) {
      const [id, codeSnippet, embedding] = params;
      this.data.suggestion_embeddings.set(id, { id, codeSnippet, embedding, rank: 0.85 });
      callback.call({ lastID: id, changes: 1 });
    } else if (sql.includes('DROP TABLE')) {
      callback(null);
    } else {
      callback(null);
    }
  }

  get(sql, params, callback) {
    this.getCalls.push({ sql, params });

    if (sql.includes('COUNT(*)') && sql.includes('suggestions')) {
      callback(null, { count: this.data.suggestions.size });
    } else if (sql.includes('COUNT(*)') && sql.includes('feedback')) {
      callback(null, { count: this.data.feedback.size });
    } else if (sql.includes('COUNT(*)') && sql.includes('analysis_sessions')) {
      callback(null, { count: 0 });
    } else {
      callback(null, null);
    }
  }

  all(sql, params, callback) {
    this.allCalls.push({ sql, params });

    if (sql.includes('suggestion_embeddings')) {
      // Return mock search results
      const mockResults = Array.from(this.data.suggestions.values())
        .slice(0, params[1] || 5) // topK limit
        .map(([id, data]) => ({
          id,
          session_id: data[0],
          type: data[1],
          severity: data[2],
          title: data[3],
          description: data[4],
          patch_json: data[5],
          context_json: data[6],
          generation_json: data[7],
          validation_json: data[8],
          status: data[9],
          created_at: data[10],
          updated_at: data[11],
          relationships_json: data[12],
          metadata_json: data[13],
          extensions_json: data[14]
        }));

      callback(null, mockResults);
    } else {
      callback(null, []);
    }
  }

  close() {
    this.data = {
      suggestions: new Map(),
      feedback: new Map(),
      suggestion_embeddings: new Map()
    };
  }
}

describe('ProjectStore', () => {
  let mockDb;
  let store;

  beforeEach(() => {
    mockDb = new MockDatabase();
    store = new ProjectStore(mockDb);
  });

  afterEach(async () => {
    if (store.initialized) {
      await store.close();
    }
  });

  describe('initialization', () => {
    test('should initialize successfully with mock database', async () => {
      let createTablesCalled = false;

      mockDb.run = mockDb.run.bind(mockDb);
      const originalRun = mockDb.run;
      mockDb.run = function(sql, params, callback) {
        if (sql.includes('CREATE TABLE')) {
          createTablesCalled = true;
        }
        return originalRun.call(this, sql, params, callback);
      };

      await store.initialize();
      expect(store.initialized).toBe(true);
      expect(createTablesCalled).toBe(true);
    });

    test('should handle initialization failure gracefully', async () => {
      mockDb.run = (sql, params, callback) => {
        callback(new Error('Database connection failed'));
      };

      await store.initialize();
      expect(store.initialized).toBe(false);
    });
  });

  describe('saveSuggestion', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    test('should save valid suggestion', async () => {
      const suggestion = new CodeSuggestion({
        id: 'test-suggestion-1',
        sessionId: 'session-123',
        type: SuggestionType.REFACTOR,
        severity: SuggestionSeverity.MEDIUM,
        title: 'Test Refactor',
        description: 'A test refactoring suggestion',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      });

      await store.saveSuggestion(suggestion);

      expect(mockDb.runCalls).toContainEqual(
        expect.objectContaining({
          sql: expect.stringContaining('INSERT OR REPLACE INTO suggestions'),
          params: expect.arrayContaining(['test-suggestion-1', 'session-123'])
        })
      );
    });

    test('should handle unordered insertion parameters correctly', async () => {
      const suggestion = new CodeSuggestion({
        id: 'test-suggestion-2',
        sessionId: 'session-456',
        type: SuggestionType.SECURITY,
        severity: SuggestionSeverity.HIGH,
        title: 'Test Security Fix',
        description: 'A security vulnerability fix',
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await store.saveSuggestion(suggestion);

      const insertCall = mockDb.runCalls.find(call =>
        call.sql.includes('INSERT OR REPLACE INTO suggestions')
      );

      expect(insertCall).toBeDefined();
      expect(insertCall.params).toEqual([
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
      ]);
    });

    test('should skip saving when store is not initialized', async () => {
      store.initialized = false;
      const suggestion = new CodeSuggestion({ id: 'test-1' });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await store.saveSuggestion(suggestion);

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Project store not initialized - suggestion not saved');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('recordFeedback', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    test('should record valid feedback', async () => {
      const feedback = new DeveloperFeedback({
        id: 'feedback-1',
        suggestionId: 'suggestion-1',
        sessionId: 'session-1',
        developerId: 'dev-123',
        action: FeedbackAction.ACCEPTED,
        accepted: true,
        timeToReview: 300,
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await store.recordFeedback(feedback);

      const insertCall = mockDb.runCalls.find(call =>
        call.sql.includes('INSERT INTO feedback')
      );

      expect(insertCall).toBeDefined();
      expect(insertCall.params).toEqual([
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
      ]);
    });

    test('should handle boolean conversion for feedback fields', async () => {
      const feedback = new DeveloperFeedback({
        id: 'feedback-2',
        accepted: false,
        modified: true,
        usefulnessRating: 5
      });

      await store.recordFeedback(feedback);

      const insertCall = mockDb.runCalls.find(call =>
        call.sql.includes('INSERT INTO feedback')
      );

      expect(insertCall.params[5]).toBe(0); // accepted: false
      expect(insertCall.params[6]).toBe(1); // modified: true
      expect(insertCall.params[13]).toBe(5); // usefulnessRating
    });
  });

  describe('getStats', () => {
    test('should return correct stats when initialized', async () => {
      await store.initialize();
      const stats = await store.getStats();

      expect(stats).toEqual({
        initialized: true,
        suggestions: expect.any(Number),
        feedback: expect.any(Number),
        sessions: expect.any(Number),
        embeddingsEnabled: expect.any(Boolean),
        dbPath: expect.stringContaining('project.db')
      });
    });

    test('should return initialized false when not initialized', async () => {
      const stats = await store.getStats();

      expect(stats).toEqual({ initialized: false });
    });
  });

  describe('searchSimilar', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    test('should warn and return empty array when embeddings not available', async () => {
      store.embeddingsService = false;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const results = await store.searchSimilar('test query');

      expect(results).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Similarity search unavailable - embeddings not initialized');

      consoleWarnSpy.mockRestore();
    });

    test('should handle search with mock embeddings', async () => {
      store.embeddingsService = true;

      // Mock the embed method
      store.embed = jest.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3]));

      // Mock a few suggestions in the database
      mockDb.data.suggestions.set('sugg1', [
        'session1', 'refactor', 'medium', 'Test Title', 'Test Description',
        '{}', '{}', '{}', '{}', 'pending', '2024-01-01T00:00:00.000Z',
        '2024-01-01T00:00:00.000Z', '{}', '{}', '{}'
      ]);
      mockDb.data.suggestions.set('sugg2', [
        'session2', 'security', 'high', 'Security Title', 'Security Description',
        '{}', '{}', '{}', '{}', 'approved', '2024-01-01T00:00:00.000Z',
        '2024-01-01T00:00:00.000Z', '{}', '{}', '{}'
      ]);

      const results = await store.searchSimilar('test query', 2);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(2);
      results.forEach(suggestion => {
        expect(suggestion).toBeInstanceOf(CodeSuggestion);
        expect(suggestion.id).toBeDefined();
      });
    });

    test('should handle search errors gracefully', async () => {
      store.embeddingsService = true;
      store.embed = jest.fn().mockRejectedValue(new Error('Embedding failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const results = await store.searchSimilar('failing query');

      expect(results).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Similarity search failed: Embedding failed');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    test('should reset store and recreate tables', async () => {
      const dropCallsBefore = mockDb.runCalls.filter(call =>
        call.sql.includes('DROP TABLE')
      ).length;

      await store.reset();

      const dropCallsAfter = mockDb.runCalls.filter(call =>
        call.sql.includes('DROP TABLE')
      ).length;

      expect(dropCallsAfter).toBeGreaterThan(dropCallsBefore);
      expect(mockDb.runCalls.some(call => call.sql.includes('CREATE TABLE'))).toBe(true);
    });

    test('should handle reset errors', async () => {
      mockDb.run = (sql, params, callback) => {
        if (sql.includes('DROP TABLE')) {
          callback(new Error('Failed to drop table'));
        } else {
          callback(null);
        }
      };

      await expect(store.reset()).rejects.toThrow('Failed to drop table');
    });
  });

  describe('utility functions', () => {
    test('getProjectStore should return singleton instance', () => {
      const store1 = getProjectStore();
      const store2 = getProjectStore();

      expect(store1).toBe(store2);
      expect(store1).toBeInstanceOf(ProjectStore);
    });

    test('initProjectStore should initialize singleton store', async () => {
      const result = await initProjectStore({ forceReinitialize: false });
      expect(result.initialized).toBe(true);
    });

    test('initProjectStore with reset option', async () => {
      const resetSpy = jest.spyOn(store, 'reset').mockResolvedValue();
      const result = await initProjectStore({ reset: true });

      expect(store.initialized).toBe(true);
      expect(resetSpy).toHaveBeenCalled();

      resetSpy.mockRestore();
    });
  });
});

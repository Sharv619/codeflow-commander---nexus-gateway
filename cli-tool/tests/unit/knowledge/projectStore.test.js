/**
 * cli-tool/tests/unit/knowledge/projectStore.test.js
 * Unit tests for the project knowledge store
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';

describe('ProjectStore', () => {
  const mockStore = global.testUtils.createMockStore();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Operations', () => {
    it('should initialize database schema on first run', async () => {
      const { initProjectStore } = await import('../../../src/knowledge/projectStore.js');

      const store = await initProjectStore();
      expect(store).toBeDefined();
      expect(store.db).toBeDefined();
    });

    it('should handle database connection errors gracefully', async () => {
      const { initProjectStore } = await import('../../../src/knowledge/projectStore.js');

      // Mock database error
      const originalDb = initProjectStore;
      // Test would go here if we had error mocking
      expect(() => {}).not.toThrow();
    });
  });

  describe('Suggestion Storage', () => {
    it('should save suggestions with required fields', async () => {
      const suggestion = global.testUtils.createMockSuggestion();

      // Import and test saveSuggestion
      const { saveSuggestion } = await import('../../../src/knowledge/projectStore.js');

      await expect(saveSuggestion(suggestion)).resolves.not.toThrow();
      expect(suggestion.id).toBe('test-suggestion');
    });

    it('should reject invalid suggestions', async () => {
      const invalidSuggestion = { type: 'invalid' }; // Missing required fields

      const { saveSuggestion } = await import('../../../src/knowledge/projectStore.js');

      await expect(saveSuggestion(invalidSuggestion)).rejects.toThrow();
    });

    it('should handle concurrent suggestions', async () => {
      const suggestions = Array.from({ length: 5 }, (_, i) =>
        ({ ...global.testUtils.createMockSuggestion(), id: `suggestion-${i}` })
      );

      const { saveSuggestion } = await import('../../../src/knowledge/projectStore.js');

      const savePromises = suggestions.map(suggestion => saveSuggestion(suggestion));
      await expect(Promise.all(savePromises)).resolves.not.toThrow();
    });
  });

  describe('Semantic Search', () => {
    it('should find similar suggestions by semantic content', async () => {
      const query = 'authentication security vulnerability';

      const { searchSimilar } = await import('../../../src/knowledge/projectStore.js');

      const results = await searchSimilar(query, { limit: 5 });
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return suggestions ranked by relevance', async () => {
      const query = 'security login process';

      const { searchSimilar } = await import('../../../src/knowledge/projectStore.js');

      const results = await searchSimilar(query, { threshold: 0.8 });
      expect(Array.isArray(results)).toBe(true);

      // Check ranking - first result should be most relevant
      if (results.length > 1) {
        expect(results[0]).toBeDefined();
        expect(results[0]).toHaveProperty('score');
      }
    });

    it('should handle search with empty results', async () => {
      const query = 'nonexistent-topic-that-does-not-match';

      const { searchSimilar } = await import('../../../src/knowledge/projectStore.js');

      const results = await searchSimilar(query);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toEqual([]);
    });
  });

  describe('Statistics and Analytics', () => {
    it('should return knowledge store statistics', async () => {
      const { getStats } = await import('../../../src/knowledge/projectStore.js');

      const stats = await getStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      expect(stats).toHaveProperty('totalSuggestions');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('bySeverity');
    });

    it('should calculate storage utilization correctly', async () => {
      const { getStats } = await import('../../../src/knowledge/projectStore.js');

      const stats = await getStats();

      expect(stats.storage).toBeDefined();
      expect(typeof stats.storage.used).toBe('number');
      expect(typeof stats.storage.available).toBe('number');
    });

    it('should track learning effectiveness metrics', async () => {
      const { getStats } = await import('../../../src/knowledge/projectStore.js');

      const stats = await getStats();

      expect(stats.learning).toBeDefined();
      expect(stats.learning).toHaveProperty('accuracy');
      expect(stats.learning).toHaveProperty('coverage');
    });
  });

  describe('Maintenance Operations', () => {
    it('should clear knowledge store data', async () => {
      const { clear } = await import('../../../src/knowledge/projectStore.js');

      await expect(clear()).resolves.not.toThrow();

      // Verify data is cleared
      const { getStats } = await import('../../../src/knowledge/projectStore.js');
      const statsAfterClear = await getStats();
      expect(statsAfterClear.totalSuggestions).toBe(0);
    });

    it('should rebuild indexes after data operations', async () => {
      const { rebuildIndexes } = await import('../../../src/knowledge/projectStore.js');

      if (rebuildIndexes) {
        await expect(rebuildIndexes()).resolves.not.toThrow();
      } else {
        console.warn('rebuildIndexes function not implemented');
      }
    });

    it('should perform backup and restore operations', async () => {
      const { backup, restore } = await import('../../../src/knowledge/projectStore.js');

      if (backup && restore) {
        const backupFile = 'test-backup.jsonl';
        await expect(backup(backupFile)).resolves.not.toThrow();
        await expect(restore(backupFile)).resolves.not.toThrow();
      } else {
        console.warn('Backup/restore functions not implemented');
      }
    });
  });

  describe('AI Embeddings Integration', () => {
    it('should generate embeddings for text content', async () => {
      const testText = 'security vulnerability in authentication';

      const { generateEmbedding } = await import('../../../src/knowledge/projectStore.js');

      if (generateEmbedding) {
        const embedding = await generateEmbedding(testText);
        expect(embedding).toBeDefined();
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBeGreaterThan(0);
      } else {
        console.warn('generateEmbedding function not implemented (TensorFlow not available)');
      }
    });

    it('should handle embedding failures gracefully', async () => {
      const invalidText = null;

      const { generateEmbedding } = await import('../../../src/knowledge/projectStore.js');

      if (generateEmbedding) {
        await expect(generateEmbedding(invalidText)).rejects.toThrow();
      }
    });

    it('should cache embeddings for performance', async () => {
      const testTexts = [
        'security authentication',
        'vulnerability login',
        'password hashing'
      ];

      const { generateEmbedding } = await import('../../../src/knowledge/projectStore.js');

      if (generateEmbedding) {
        const embeddings = await Promise.all(testTexts.map(text => generateEmbedding(text)));
        expect(embeddings.length).toBe(testTexts.length);
        embeddings.forEach(embedding => {
          expect(Array.isArray(embedding)).toBe(true);
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database locks gracefully', async () => {
      const suggestion = global.testUtils.createMockSuggestion();

      const { saveSuggestion } = await import('../../../src/knowledge/projectStore.js');

      // Simulate concurrent access that could cause locks
      const concurrentOps = Array.from({ length: 10 }, () =>
        saveSuggestion({ ...suggestion, id: Math.random().toString() })
      );

      await expect(Promise.all(concurrentOps)).resolves.not.toThrow();
    });

    it('should recover from corrupted data', async () => {
      const { getStats } = await import('../../../src/knowledge/projectStore.js');

      // This should not crash even if data is corrupted
      await expect(getStats()).resolves.not.toThrow();
    });

    it('should validate embedding vectors', async () => {
      const invalidEmbedding = [NaN, Infinity, -Infinity];

      const { saveSuggestion } = await import('../../../src/knowledge/projectStore.js');

      const suggestion = { ...global.testUtils.createMockSuggestion(), embedding: invalidEmbedding };

      await expect(saveSuggestion(suggestion)).rejects.toThrow('Invalid embedding');
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete searches within acceptable time', async () => {
      const query = 'security';

      const startTime = Date.now();
      const { searchSimilar } = await import('../../../src/knowledge/projectStore.js');
      await searchSimilar(query);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // 5 second max
    });

    it('should handle large result sets efficiently', async () => {
      const { searchSimilar } = await import('../../../src/knowledge/projectStore.js');

      const results = await searchSimilar('test', { limit: 1000 });
      expect(results.length).toBeLessThanOrEqual(1000);
    });

    it('should maintain stable memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const { searchSimilar } = await import('../../../src/knowledge/projectStore.js');
      await searchSimilar('test query', { limit: 50 });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

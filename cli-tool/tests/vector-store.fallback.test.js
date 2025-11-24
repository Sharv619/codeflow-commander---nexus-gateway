/**
 * Unit tests for VectorStoreFallback
 */

import { VectorStoreFallback } from '../services/vector-store-fallback.js';

// Mock file system for testing
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('VectorStoreFallback', () => {
  let fallback;
  let testIndexPath;

  beforeEach(() => {
    // Create unique test path
    testIndexPath = path.join(os.tmpdir(), 'vector-store-test', Date.now().toString());

    // Create a 5-dimensional vector for testing
    const testVector = [0.1, 0.2, 0.3, 0.4, 0.5];
    const queryVector = [0.1, 0.3, 0.2, 0.5, 0.4];
    const anotherVector = [0.9, 0.8, 0.7, 0.6, 0.5];
  });

  afterEach(async () => {
    // Clean up test index if it exists
    if (fallback) {
      fallback = null;
      try {
        await fs.promises.rm(testIndexPath, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('should initialize successfully', async () => {
    fallback = new VectorStoreFallback(testIndexPath);

    await fallback.initialize();

    const stats = fallback.stats();
    expect(stats.initialized).toBe(true);
    expect(stats.vectorCount).toBe(0);
    expect(stats.metadataCount).toBe(0);
  });

  test('should reject operations before initialization', async () => {
    fallback = new VectorStoreFallback(testIndexPath);

    await expect(fallback.add([0.1, 0.2, 0.3], {})).rejects.toThrow('Vector store not initialized');

    await expect(fallback.search([0.1, 0.2, 0.3])).rejects.toThrow('Vector store not initialized');
  });

  test('should reject adding invalid vectors', async () => {
    fallback = new VectorStoreFallback(testIndexPath);
    await fallback.initialize();

    // Empty array
    await expect(fallback.add([], {})).rejects.toThrow('Invalid vector: must be non-empty array');

    // Non-array
    await expect(fallback.add('not-an-array', {})).rejects.toThrow('Invalid vector: must be non-empty array');
  });

  test('should add and search vectors', async () => {
    fallback = new VectorStoreFallback(testIndexPath);
    await fallback.initialize();

    const testVector1 = [0.1, 0.2, 0.3, 0.4, 0.5];
    const testVector2 = [0.5, 0.4, 0.3, 0.2, 0.1];
    const metadata1 = { type: 'code', file: 'test.js' };
    const metadata2 = { type: 'doc', file: 'README.md' };

    // Add vectors
    await fallback.add(testVector1, metadata1);
    await fallback.add(testVector2, metadata2);

    // Check stats
    const stats = fallback.stats();
    expect(stats.vectorCount).toBe(2);
    expect(stats.metadataCount).toBe(2);

    // Search for similar vectors
    const queryVector = [0.1, 0.2, 0.3, 0.4, 0.5]; // Exact match for first vector
    const results = await fallback.search(queryVector, 2);

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('score');
    expect(results[0]).toHaveProperty('vector');
    expect(results[0]).toHaveProperty('metadata');

    // First result should be exact match with score close to 1.0
    expect(results[0].metadata).toEqual(metadata1);
    expect(results[0].score).toBeGreaterThan(0.99); // Cosine similarity
  });

  test('should add batch vectors', async () => {
    fallback = new VectorStoreFallback(testIndexPath);
    await fallback.initialize();

    const vectors = [
      [0.1, 0.2, 0.3, 0.4, 0.5],
      [0.5, 0.4, 0.3, 0.2, 0.1],
      [0.0, 0.1, 0.2, 0.3, 0.4]
    ];

    const metadata = [
      { id: 1, type: 'code' },
      { id: 2, type: 'doc' },
      { id: 3, type: 'config' }
    ];

    await fallback.addBatch(vectors, metadata);

    const stats = fallback.stats();
    expect(stats.vectorCount).toBe(3);
    expect(stats.metadataCount).toBe(3);
  });

  test('should reject batch with mismatched lengths', async () => {
    fallback = new VectorStoreFallback(testIndexPath);
    await fallback.initialize();

    const vectors = [[0.1, 0.2, 0.3]];
    const metadata = [];

    await expect(fallback.addBatch(vectors, metadata)).rejects.toThrow('Vectors and metadata arrays must have the same length');
  });

  test('cosineSimilarity calculation', () => {
    const vecA = [1, 0, 0]; // Unit vector along x-axis
    const vecB = [1, 0, 0]; // Same vector
    const vecC = [0, 1, 0]; // Unit vector along y-axis (perpendicular)
    const vecD = [-1, 0, 0]; // Opposite vector

    expect(VectorStoreFallback.cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0); // Perfect similarity
    expect(VectorStoreFallback.cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0); // Orthogonal
    expect(VectorStoreFallback.cosineSimilarity(vecA, vecD)).toBeCloseTo(-1.0); // Perfect opposition
  });

  test('should clear all vectors and metadata', async () => {
    fallback = new VectorStoreFallback(testIndexPath);
    await fallback.initialize();

    // Add some data
    await fallback.add([0.1, 0.2, 0.3], { test: 'data' });
    await fallback.add([0.4, 0.5, 0.6], { test: 'more' });

    expect(fallback.stats().vectorCount).toBe(2);

    // Clear
    await fallback.clear();

    expect(fallback.stats().vectorCount).toBe(0);
    expect(fallback.stats().metadataCount).toBe(0);
  });

  test('should handle different vector dimensions', async () => {
    fallback = new VectorStoreFallback(testIndexPath);
    await fallback.initialize();

    const vec3d = [1, 2, 3];
    const vec5d = [1, 2, 3, 4, 5];

    await fallback.add(vec3d, { dims: 3 });
    await fallback.add(vec5d, { dims: 5 });

    expect(fallback.stats().vectorCount).toBe(2);

    // Searching with different dimension should work (will compute similarity)
    const query3d = [1, 2, 3];
    const results = await fallback.search(query3d, 2);
    expect(results).toHaveLength(2);
  });

  test('should persist and load index', async () => {
    const persistPath = path.join(testIndexPath, 'persistent-index');

    // Create first instance and add data
    let fallback1 = new VectorStoreFallback(persistPath);
    await fallback1.initialize();
    await fallback1.add([0.1, 0.2, 0.3, 0.4, 0.5], { persistent: true });

    const initialStats = fallback1.stats();
    expect(initialStats.vectorCount).toBe(1);

    // Create second instance and verify data loads
    let fallback2 = new VectorStoreFallback(persistPath);
    await fallback2.initialize();

    const loadedStats = fallback2.stats();
    expect(loadedStats.vectorCount).toBe(1);

    // Search should work
    const results = await fallback2.search([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(results).toHaveLength(1);
    expect(results[0].metadata).toEqual({ persistent: true });
  });
});

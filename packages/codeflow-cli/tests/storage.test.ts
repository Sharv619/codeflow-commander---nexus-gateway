import { StorageManager, VectorEntry } from '../src/storage';

describe('StorageManager', () => {
  let manager: StorageManager;

  beforeEach(() => {
    manager = new StorageManager();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(manager).toBeDefined();
    });

    it('should accept custom config', () => {
      const customManager = new StorageManager({
        cacheEnabled: false,
        compressionEnabled: false,
        batchSize: 50,
        vectorStore: 'memory',
        metadataStore: 'json',
        globalStatePath: '/tmp/test-global',
        projectStateTemplate: '/tmp/test-project',
        vectorStorePathTemplate: '/tmp/test-vectors.db',
        retentionPolicies: [],
        cleanupInterval: 12,
        maxCacheSize: 50
      });
      expect(customManager).toBeDefined();
    });
  });
});

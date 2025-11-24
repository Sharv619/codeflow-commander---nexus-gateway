/**
 * cli-tool/tests/setup.js
 * Global test setup configuration
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TESTING = 'true';

// Suppress console logs during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.DEBUG ? originalConsole.log : () => {},
  info: process.env.DEBUG ? originalConsole.info : () => {},
  debug: process.env.DEBUG ? originalConsole.debug : () => {},
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Polyfill for ES modules in tests
import { jest } from '@jest/globals';

// Mock timers
jest.useFakeTimers();

// Mock external services
jest.mock('axios');
jest.mock('sqlite3', () => ({
  verbose: () => ({
    Database: jest.fn().mockImplementation(() => ({
      run: jest.fn((sql, params, callback) => callback(null, { lastID: 1, changes: 1 })),
      get: jest.fn((sql, params, callback) => callback(null, {})),
      all: jest.fn((sql, params, callback) => callback(null, [])),
      close: jest.fn((callback) => callback(null))
    }))
  })
}), { virtual: true });

// Mock AI/ML libraries conditionally
try {
  jest.mock('@tensorflow/tfjs-node', () => ({
    ready: jest.fn().mockResolvedValue(),
    tensor: jest.fn(),
    dispose: jest.fn()
  }), { virtual: true });

  jest.mock('@tensorflow-models/universal-sentence-encoder', () => ({
    load: jest.fn().mockResolvedValue({
      embed: jest.fn().mockResolvedValue({
        array: jest.fn().mockResolvedValue([[1, 2, 3]]),
        dispose: jest.fn()
      })
    })
  }), { virtual: true });
} catch (e) {
  // TensorFlow may not be available
  console.warn('TensorFlow mocks not available, embeddings disabled in tests');
}

// Global test utilities
global.testUtils = {
  // Create mock project store
  createMockStore: () => ({
    saveSuggestion: jest.fn(),
    searchSimilar: jest.fn(),
    getStats: jest.fn(),
    clear: jest.fn()
  }),

  // Create mock CLI config
  createMockConfig: () => ({
    provider: 'gemini',
    apiKey: 'test-key',
    apiUrl: 'https://test.api.com'
  }),

  // Create mock entities
  createMockSuggestion: () => ({
    id: 'test-suggestion',
    sessionId: 'test-session',
    type: 'security',
    severity: 'MEDIUM',
    title: 'Test Security Issue',
    description: 'Mock security finding',
    status: 'pending'
  }),

  // Clean up test artifacts
  cleanupTestArtifacts: () => {
    const fs = require('fs');
    const path = require('path');

    const artifacts = [
      'test.db',
      'security-report.json',
      'compliance-report.json'
    ];

    artifacts.forEach(artifact => {
      const artifactPath = path.join(process.cwd(), artifact);
      if (fs.existsSync(artifactPath)) {
        try {
          if (fs.statSync(artifactPath).isDirectory()) {
            fs.rmSync(artifactPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(artifactPath);
          }
        } catch (err) {
          console.warn(`Could not clean up ${artifact}: ${err.message}`);
        }
      }
    });
  },

  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock file system operations
  mockFileSystem: () => {
    jest.mock('fs', () => ({
      existsSync: jest.fn(),
      mkdirSync: jest.fn(),
      writeFileSync: jest.fn(),
      readFileSync: jest.fn(),
      readdirSync: jest.fn(),
      statSync: jest.fn().mockReturnValue({ isDirectory: jest.fn().mockReturnValue(false) }),
      unlinkSync: jest.fn(),
      rmSync: jest.fn()
    }));
  }
};

// Setup cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  global.testUtils.cleanupTestArtifacts();
});

// Setup cleanup after all tests
afterAll(async () => {
  await jest.runOnlyPendingTimersAsync();
  await jest.useRealTimers();
});

// Export for use in tests
export { testUtils };

// Increase timeout for async operations
jest.setTimeout(30000);

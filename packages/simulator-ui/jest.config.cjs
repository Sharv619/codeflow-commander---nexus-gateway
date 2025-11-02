module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};

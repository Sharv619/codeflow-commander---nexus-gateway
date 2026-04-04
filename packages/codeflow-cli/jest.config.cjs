/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = async () => {
  return {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    transform: {
      '^.+\\.tsx?$': [
        'ts-jest',
        {
          isolatedModules: true,
          tsconfig: {
            target: 'es2022',
            module: 'commonjs',
            strict: false,
            esModuleInterop: true,
            skipLibCheck: true,
            moduleResolution: 'node',
            baseUrl: './src',
            paths: {
              '@/*': ['*']
            },
            types: ['jest', 'node']
          }
        }
      ]
    },
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1'
    }
  };
};

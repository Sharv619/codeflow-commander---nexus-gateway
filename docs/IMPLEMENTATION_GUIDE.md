# Implementation Guide: Phase 1 - Foundation

## Overview

This guide provides step-by-step instructions for implementing Phase 1 of the migration: Foundation utilities. This phase establishes the shared infrastructure that will support all subsequent features.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Access to both `packages/cli-tool` and `packages/codeflow-cli` directories
- Basic understanding of TypeScript and Node.js

## Phase 1 Implementation Steps

### Step 1: Set Up Development Environment

#### 1.1 Create Feature Branch
```bash
cd /home/lade/GitHub/codeflow-commander---nexus-gateway
git checkout -b feature/migration-phase-1-foundation
```

#### 1.2 Install Required Dependencies
```bash
cd packages/cli-tool
npm install winston sql.js fs-extra
```

### Step 2: Migrate Logger Utility

#### 2.1 Copy Logger from codeflow-cli
Copy the existing logger from codeflow-cli to maintain consistency:

```bash
# Copy logger from codeflow-cli
cp packages/codeflow-cli/src/utils/logger.ts packages/cli-tool/src/utils/logger.ts
```

The logger provides:
- Winston-based structured logging
- Multiple log levels (error, warn, info, debug)
- File and console output
- Environment-aware configuration

#### 2.2 Update Existing Code to Use Logger

Replace console.log statements in `packages/cli-tool/bin/codeflow-hook.js`:

```javascript
// Before
console.log('Starting codeflow-hook...');
console.error('Error occurred:', error);

// After
import { logger } from '../src/utils/logger.js';
logger.info('Starting codeflow-hook...');
logger.error('Error occurred:', { error: error.message, stack: error.stack });
```

### Step 3: Migrate ErrorHandler

#### 3.1 Copy ErrorHandler from codeflow-cli
Copy the existing ErrorHandler from codeflow-cli to maintain consistency:

```bash
# Copy validation module from codeflow-cli
cp -r packages/codeflow-cli/src/validation packages/cli-tool/src/
```

This includes:
- ErrorHandler class with error classification
- ValidationPipeline for multi-stage validation
- SafetyGovernor for confidence threshold controls
- Comprehensive error handling patterns

#### 3.2 Update CLI Tool to Use Error Handler

Modify `packages/cli-tool/bin/codeflow-hook.js` to use the error handler:

```javascript
import { errorHandler } from '../src/validation/ErrorHandler.js';

// Wrap main execution
async function main() {
  try {
    // Existing code...
  } catch (error) {
    errorHandler.handle(error, {
      operation: 'codeflow-hook-main',
      metadata: { command: process.argv[2] }
    });
    process.exit(1);
  }
}
```

### Step 4: Migrate Core Types

#### 4.1 Copy Core Types from codeflow-cli
Copy the existing types from codeflow-cli to maintain consistency:

```bash
# Copy types from codeflow-cli
cp -r packages/codeflow-cli/src/types packages/cli-tool/src/
```

This includes:
- ConfidenceScore for AI operations
- ValidationResult for validation
- SafetyControls for safety thresholds
- ProviderConfig for AI providers
- AgentContext and AgentExecutionResult for agent operations

### Step 5: Implement State Management

#### 5.1 Copy State Manager from codeflow-cli
Copy the existing state manager from codeflow-cli:

```bash
# Copy state module from codeflow-cli
cp -r packages/codeflow-cli/src/state packages/cli-tool/src/
```

This provides:
- Hierarchical state (Global → Project → Session)
- Persistent state storage with JSON files
- Session tracking and cleanup
- State synchronization capabilities

### Step 6: Update Package.json for Enhanced Dependencies

Update `packages/cli-tool/package.json`:

```json
{
  "name": "codeflow-hook",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/bin/codeflow-hook.js"
  },
  "dependencies": {
    "winston": "^3.8.2",
    "sql.js": "^1.8.0",
    "fs-extra": "^11.1.1",
    "commander": "^11.0.0",
    "axios": "^1.4.0",
    "chalk": "^4.1.2",
    "ora": "^8.0.1"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Step 7: Create TypeScript Configuration

#### 7.1 Create tsconfig.json
Create `packages/cli-tool/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Step 8: Update CLI Tool Entry Point

#### 8.1 Create Main Module
Create `packages/cli-tool/src/index.ts`:

```typescript
import { logger } from './utils/logger.js';
import { errorHandler } from './validation/ErrorHandler.js';
import { stateManager } from './state/StateManager.js';

export class CodeflowHook {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize logging
      logger.info('Initializing Codeflow Hook...');
      
      // Initialize state
      const globalState = stateManager.getGlobalState();
      logger.info('Global state loaded', { version: globalState.version });

      this.initialized = true;
      logger.info('Codeflow Hook initialized successfully');
    } catch (error) {
      errorHandler.handle(error as Error, {
        operation: 'initialize',
        metadata: { phase: 'foundation' }
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      logger.info('Shutting down Codeflow Hook...');
      // Cleanup operations here
      this.initialized = false;
      logger.info('Codeflow Hook shutdown complete');
    } catch (error) {
      errorHandler.handle(error as Error, {
        operation: 'shutdown',
        metadata: { phase: 'foundation' }
      });
    }
  }
}

// Export singleton
export const codeflowHook = new CodeflowHook();
```

#### 8.2 Update CLI Entry Point
Modify `packages/cli-tool/bin/codeflow-hook.js`:

```javascript
#!/usr/bin/env node

import { codeflowHook } from '../src/index.js';
import { logger } from '../src/utils/logger.js';
import { errorHandler } from '../src/validation/ErrorHandler.js';

async function main() {
  try {
    // Initialize foundation
    await codeflowHook.initialize();

    // Existing CLI logic here
    logger.info('Codeflow Hook running with foundation features');

    // Example: Add a new command
    const { Command } = await import('commander');
    const program = new Command();

    program
      .name('codeflow-hook')
      .description('Enhanced CLI tool with foundation features')
      .version('1.0.0');

    program
      .command('status')
      .description('Show system status')
      .action(() => {
        const globalState = (await import('../src/state/StateManager.js')).stateManager.getGlobalState();
        console.log('System Status:');
        console.log(`- Version: ${globalState.version}`);
        console.log(`- Initialized: ${new Date().toISOString()}`);
      });

    program.parse();

  } catch (error) {
    errorHandler.handle(error, {
      operation: 'main',
      metadata: { phase: 'foundation' }
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await codeflowHook.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await codeflowHook.shutdown();
  process.exit(0);
});

// Start the application
main();
```

### Step 9: Build and Test

#### 9.1 Build the Project
```bash
cd packages/cli-tool
npm run build
```

#### 9.2 Test the Implementation
```bash
# Test the new CLI
node dist/bin/codeflow-hook.js status

# Test error handling
node dist/bin/codeflow-hook.js invalid-command
```

#### 9.3 Verify Logging
Check the logs directory for structured logging output:
```bash
ls -la logs/
cat logs/codeflow-hook.log
```

### Step 10: Create Tests

#### 10.1 Create Test Directory
Create `packages/cli-tool/src/__tests__/` directory and add test files:

**logger.test.ts:**
```typescript
import { Logger } from '../utils/logger.js';

describe('Logger', () => {
  test('should create logger instance', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  test('should log messages at different levels', () => {
    const logger = new Logger({ console: false }); // Disable console for tests
    
    // These should not throw errors
    expect(() => logger.info('Test info')).not.toThrow();
    expect(() => logger.error('Test error')).not.toThrow();
    expect(() => logger.warn('Test warn')).not.toThrow();
  });
});
```

**error-handler.test.ts:**
```typescript
import { ErrorHandler } from '../validation/ErrorHandler.js';

describe('ErrorHandler', () => {
  test('should handle errors', () => {
    const errorHandler = ErrorHandler.getInstance();
    const error = new Error('Test error');
    
    expect(() => errorHandler.handle(error, {
      operation: 'test',
      metadata: { test: true }
    })).not.toThrow();
  });
});
```

#### 10.2 Run Tests
```bash
cd packages/cli-tool
npm test
```

### Step 11: Documentation and Cleanup

#### 11.1 Update README
Update `packages/cli-tool/README.md` to document the new foundation features:

```markdown
# Codeflow Hook - Foundation Features

## New Features Added

### Structured Logging
- Winston-based logging with multiple levels
- Structured JSON output for production
- Configurable log levels and file rotation

### Error Handling
- Centralized error handling with classification
- Critical vs recoverable error detection
- Automatic error logging and recovery strategies

### State Management
- Hierarchical state (Global → Project → Session)
- Persistent state storage with JSON files
- Session tracking and cleanup

### Type Safety
- Comprehensive TypeScript definitions
- Confidence scoring for AI operations
- Safety controls and validation schemas

## Usage

```bash
# Check system status
codeflow-hook status

# View logs
tail -f logs/codeflow-hook.log
```

## Configuration

Environment variables:
- `LOG_LEVEL`: Set logging level (error, warn, info, debug)
- `NODE_ENV`: Set environment (development, production)
```

#### 11.2 Clean Up
- Remove any temporary files
- Commit changes to git
- Create pull request for review

## Success Criteria Checklist

- [ ] Logger utility migrated and working
- [ ] Error handler implemented and tested
- [ ] Core types defined and exported
- [ ] State manager created and persistent
- [ ] TypeScript configuration working
- [ ] CLI tool builds without errors
- [ ] All tests pass
- [ ] Backward compatibility maintained
- [ ] Documentation updated

## Next Steps

Once Phase 1 is complete and tested:

1. **Review and merge** the foundation branch
2. **Create Phase 2 branch** for Core Intelligence features
3. **Begin implementing** ValidationPipeline and Storage infrastructure
4. **Continue with** RAG and PRISM services

This foundation provides the essential infrastructure needed to support all subsequent AI agent features while maintaining the stability and reliability of the existing codeflow-hook functionality.
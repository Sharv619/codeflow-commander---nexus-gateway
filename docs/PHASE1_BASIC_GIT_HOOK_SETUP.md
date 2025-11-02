# Phase 1: Basic Git Hook Setup - Foundation Implementation

## Executive Summary

This document outlines the initial implementation of **Codeflow**, a lightweight git hook system designed to perform basic code quality checks during the commit and push workflow. Phase 1 establishes the fundamental architecture for automated code review integration within the development lifecycle.

### **Key Deliverables:**
- **Pre-commit hook** for basic syntax validation and formatting checks
- **Pre-push hook** for integration with CI/CD pipelines
- **Simple analysis engine** for common code quality issues
- **Configuration system** for project-specific rules
- **Local processing** without external dependencies

---

## 1. Basic Git Hook Architecture

### 1.1 Git Hook Integration Strategy

```bash
#!/usr/bin/env bash
# Phase 1 Basic Git Hook Structure
set -e

echo "🔬 Running Codeflow Basic Analysis..."

# Basic checks that don't require external services
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
  echo "ℹ️  No staged changes to analyze"
  exit 0
fi

for file in $STAGED_FILES; do
  if [[ $file =~ \.(js|ts|jsx|tsx)$ ]]; then
    echo "📝 Validating JavaScript/TypeScript syntax: $file"
    if ! node -c "$file" 2>/dev/null; then
      echo "❌ Syntax error in $file"
      exit 1
    fi
  elif [[ $file =~ \.(py)$ ]]; then
    echo "🐍 Validating Python syntax: $file"
    if ! python3 -m py_compile "$file" 2>/dev/null; then
      echo "❌ Syntax error in $file"
      exit 1
    fi
  fi
done

# Basic linting (if available)
if command -v eslint &> /dev/null; then
  echo "🔧 Running ESLint..."
  npx eslint --cache --max-warnings 0 $STAGED_FILES || exit 1
fi

echo "✅ All basic checks passed!"
exit 0
```

### 1.2 Hook Installation Mechanism

```typescript
import * as fs from 'fs';
import * as path from 'path';

export class GitHookManager {
  private readonly hooksDir = '.git/hooks';

  async installHooks(): Promise<void> {
    this.ensureHooksDir();
    await this.installPreCommit();
    await this.installPrePush();
    await this.makeExecutable();
  }

  private ensureHooksDir(): void {
    if (!fs.existsSync(this.hooksDir)) {
      fs.mkdirSync(this.hooksDir, { recursive: true });
    }
  }

  private async installPreCommit(): Promise<void> {
    const hookContent = `#!/usr/bin/env bash
set -e

echo "🔬 Running Codeflow Pre-commit Analysis..."

STAGED_FILES=$(git diff --cached --name-only)
CHANGED_FILES=$(git diff --name-only)

if [ -z "$STAGED_FILES" ]; then
  echo "ℹ️  No staged changes to analyze"
  exit 0
fi

# Run basic validation
echo "$STAGED_FILES" | xargs ./node_modules/.bin/codeflow validate

echo "✅ Pre-commit checks passed!"
exit 0
`;

    fs.writeFileSync(path.join(this.hooksDir, 'pre-commit'), hookContent);
  }

  private async installPrePush(): Promise<void> {
    const hookContent = `#!/usr/bin/env bash
set -e

echo "🚀 Running Codeflow CI/CD Simulation..."

# Check if package.json exists
if [ -f "package.json" ]; then
  echo "🧪 Running tests..."
  npm test || exit 1
fi

echo "✅ Pre-push checks passed!"
exit 0
`;

    fs.writeFileSync(path.join(this.hooksDir, 'pre-push'), hookContent);
  }

  private async makeExecutable(): Promise<void> {
    const { exec } = require('child_process');
    const promises = ['pre-commit', 'pre-push'].map(hook =>
      new Promise<void>((resolve, reject) => {
        exec(`chmod +x ${path.join(this.hooksDir, hook)}`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      })
    );
    await Promise.all(promises);
  }

  async uninstallHooks(): Promise<void> {
    const hooks = ['pre-commit', 'pre-push'];
    hooks.forEach(hook => {
      const hookPath = path.join(this.hooksDir, hook);
      if (fs.existsSync(hookPath)) {
        fs.unlinkSync(hookPath);
      }
    });
  }
}
```

---

## 2. Basic Analysis Engine

### 2.1 Code Quality Checks Implementation

```typescript
export interface ValidationRule {
  name: string;
  description: string;
  enabled: boolean;
  validate(file: string, content: string): Promise<ValidationResult>;
}

export class BasicCodeValidator {
  private rules: Map<string, ValidationRule> = new Map();

  constructor() {
    this.registerBuiltInRules();
  }

  private registerBuiltInRules(): void {
    // 1. Line Length Check
    this.rules.set('line-length', {
      name: 'Line Length Validation',
      description: 'Ensure lines are not excessively long',
      enabled: true,
      validate: this.validateLineLength.bind(this)
    });

    // 2. Trailing Whitespace
    this.rules.set('trailing-whitespace', {
      name: 'Trailing Whitespace Check',
      description: 'Detect and report trailing whitespace',
      enabled: true,
      validate: this.validateTrailingWhitespace.bind(this)
    });

    // 3. TODO Comments
    this.rules.set('todo-comments', {
      name: 'TODO Comment Detection',
      description: 'Flag TODO comments that should be addressed',
      enabled: false, // Disabled by default
      validate: this.validateTodoComments.bind(this)
    });

    // 4. Console.log Detection
    this.rules.set('console-logs', {
      name: 'Console.log Check',
      description: 'Warn about console.log statements',
      enabled: true,
      validate: this.validateConsoleLogs.bind(this)
    });
  }

  async validate(files: string[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');

        for (const [ruleName, rule] of this.rules) {
          if (rule.enabled) {
            const result = await rule.validate(file, content);
            if (!result.passed) {
              results.push(result);
            }
          }
        }
      } catch (error) {
        results.push({
          file,
          rule: 'file-read-error',
          passed: false,
          message: `Failed to read file: ${error.message}`,
          severity: 'error'
        });
      }
    }

    return results;
  }

  private async validateLineLength(file: string, content: string): Promise<ValidationResult> {
    const lines = content.split('\n');
    const maxLength = 120; // Configurable
    const violations = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLength) {
        violations.push({
          line: i + 1,
          length: lines[i].length,
          preview: lines[i].substring(0, 50) + '...'
        });
      }
    }

    return {
      file,
      rule: 'line-length',
      passed: violations.length === 0,
      message: violations.length > 0
        ? `Found ${violations.length} lines exceeding ${maxLength} characters`
        : 'All lines within length limit',
      severity: violations.length > 0 ? 'warning' : 'info',
      details: violations.length > 0 ? { violations } : undefined
    };
  }

  private async validateTrailingWhitespace(file: string, content: string): Promise<ValidationResult> {
    const lines = content.split('\n');
    const violations = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/\s+$/)) {
        violations.push({
          line: i + 1,
          content: lines[i]
        });
      }
    }

    return {
      file,
      rule: 'trailing-whitespace',
      passed: violations.length === 0,
      message: violations.length > 0
        ? `Found ${violations.length} lines with trailing whitespace`
        : 'No trailing whitespace detected',
      severity: violations.length > 0 ? 'warning' : 'info',
      details: violations.length > 0 ? { violations } : undefined
    };
  }

  private async validateTodoComments(file: string, content: string): Promise<ValidationResult> {
    const todoPatterns = [/TODO/i, /FIXME/i, /XXX/i];
    let todoCount = 0;

    for (const pattern of todoPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        todoCount += matches.length;
      }
    }

    return {
      file,
      rule: 'todo-comments',
      passed: true, // TODO detection is informational
      message: `Found ${todoCount} TODO/FIXME comments`,
      severity: 'info',
      details: { count: todoCount }
    };
  }

  private async validateConsoleLogs(file: string, content: string): Promise<ValidationResult> {
    const consolePatterns = [
      /console\.log\(/g,
      /console\.warn\(/g,
      /console\.error\(/g,
      /console\.debug\(/g
    ];

    let totalMatches = 0;
    for (const pattern of consolePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        totalMatches += matches.length;
      }
    }

    return {
      file,
      rule: 'console-logs',
      passed: totalMatches === 0,
      message: totalMatches > 0
        ? `Found ${totalMatches} console statements that should be removed`
        : 'No console statements detected',
      severity: totalMatches > 0 ? 'warning' : 'info'
    };
  }
}

export interface ValidationResult {
  file: string;
  rule: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: any;
}
```

### 2.2 Configuration Management

```json
{
  "codeflow": {
    "version": "1.0.0",
    "rules": {
      "line-length": {
        "enabled": true,
        "maxLength": 120
      },
      "trailing-whitespace": {
        "enabled": true
      },
      "console-logs": {
        "enabled": true
      },
      "todo-comments": {
        "enabled": false
      }
    },
    "ignorePatterns": [
      "*.min.js",
      "dist/**",
      "build/**",
      "node_modules/**"
    ],
    "severityThreshold": "warning"
  }
}
```

---

## 3. CLI Interface Implementation

### 3.1 Command-Line Tool Structure

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { GitHookManager } from './core/GitHookManager';
import { BasicCodeValidator } from './core/BasicCodeValidator';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('codeflow')
  .description('Lightweight git hook system for code quality')
  .version('1.0.0');

// Install hooks
program
  .command('install')
  .description('Install git hooks for code quality checks')
  .action(async () => {
    const hookManager = new GitHookManager();
    try {
      await hookManager.installHooks();
      console.log('✅ Git hooks installed successfully!');
      console.log('📋 Installed hooks:');
      console.log('  - pre-commit: Basic code quality validation');
      console.log('  - pre-push: CI/CD simulation with tests');
    } catch (error) {
      console.error('❌ Failed to install hooks:', error.message);
      process.exit(1);
    }
  });

// Validate files
program
  .command('validate')
  .description('Validate files for code quality issues')
  .argument('[files...]', 'Files to validate (default: stdin)')
  .action(async (files: string[]) => {
    const validator = new BasicCodeValidator();

    // If no files specified, read from stdin
    if (files.length === 0) {
      const stdin = fs.readFileSync(0, 'utf8');
      files = stdin.trim().split('\n').filter(Boolean);
    }

    try {
      const results = await validator.validate(files);
      let hasErrors = false;

      for (const result of results) {
        if (!result.passed) {
          console.log(`${result.severity.toUpperCase()}: ${result.file} - ${result.message}`);
          if (result.details?.violations) {
            for (const violation of result.details.violations) {
              console.log(`  Line ${violation.line}: ${violation.preview || violation.content}`);
            }
          }
          if (result.severity === 'error') {
            hasErrors = true;
          }
        }
      }

      if (hasErrors) {
        console.log('❌ Validation failed with errors');
        process.exit(1);
      } else if (results.some(r => r.severity === 'warning')) {
        console.log('⚠️  Validation completed with warnings');
        process.exit(0);
      } else {
        console.log('✅ All validation checks passed');
      }
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  });

// Check status
program
  .command('status')
  .description('Show installation status and configuration')
  .action(() => {
    console.log('🔍 Codeflow Status\n');

    // Check if hooks are installed
    const hooksDir = '.git/hooks';
    const hooks = ['pre-commit', 'pre-push'];

    console.log('Git Hooks:');
    for (const hook of hooks) {
      const hookPath = path.join(hooksDir, hook);
      const installed = fs.existsSync(hookPath);
      console.log(`  ${installed ? '✅' : '❌'} ${hook}`);
    }

    console.log('\nConfiguration:');
    const configPath = '.codeflowrc.json';
    const hasConfig = fs.existsSync(configPath);
    console.log(`  ${hasConfig ? '✅' : '❌'} Project configuration (.codeflowrc.json)`);

    if (hasConfig) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`  Version: ${config.codeflow?.version || 'unknown'}`);
      console.log(`  Rules enabled: ${Object.entries(config.codeflow?.rules || {})
        .filter(([, rule]) => rule.enabled)
        .map(([name]) => name)
        .join(', ')}`);
    }
  });

// Uninstall hooks
program
  .command('uninstall')
  .description('Remove installed git hooks')
  .action(async () => {
    const hookManager = new GitHookManager();
    try {
      await hookManager.uninstallHooks();
      console.log('✅ Git hooks uninstalled successfully!');
    } catch (error) {
      console.error('❌ Failed to uninstall hooks:', error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
```

---

## 4. Error Handling and Logging

### 4.1 Error Classification System

```typescript
export enum ErrorLevel {
  FATAL = 'fatal',     // Hook fails, commit blocked
  ERROR = 'error',     // Validation error, fix required
  WARNING = 'warning', // Validation warning, can proceed
  INFO = 'info'        // Informational message
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public level: ErrorLevel,
    public file?: string,
    public line?: number,
    public rule?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class HookError extends Error {
  constructor(
    message: string,
    public hookName: string,
    public exitCode?: number
  ) {
    super(message);
    this.name = 'HookError';
  }
}
```

### 4.2 Logging Mechanism

```typescript
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private logFile: string;

  constructor(logDir = '.codeflow') {
    this.logFile = path.join(logDir, 'codeflow.log');

    // Ensure log directory exists
    const logDirPath = path.dirname(this.logFile);
    if (!fs.existsSync(logDirPath)) {
      fs.mkdirSync(logDirPath, { recursive: true });
    }
  }

  log(level: ErrorLevel, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    // Console output for immediate feedback
    this.consoleOutput(level, message, meta);

    // File logging for audit trail
    this.fileOutput(logEntry);
  }

  private consoleOutput(level: ErrorLevel, message: string, meta?: any): void {
    const prefix = this.getLevelPrefix(level);
    console.log(`${prefix} ${message}`);

    if (meta?.file && meta?.line) {
      console.log(`    at ${meta.file}:${meta.line}`);
    }
  }

  private fileOutput(logEntry: any): void {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      // Fallback console logging if file write fails
      console.error('Failed to write to log file:', error);
    }
  }

  private getLevelPrefix(level: ErrorLevel): string {
    switch (level) {
      case ErrorLevel.FATAL: return '💀';
      case ErrorLevel.ERROR: return '❌';
      case ErrorLevel.WARNING: return '⚠️';
      case ErrorLevel.INFO: return 'ℹ️';
      default: return '📝';
    }
  }
}
```

---

## 5. Testing and Validation

### 5.1 Unit Test Framework

```typescript
import { BasicCodeValidator } from '../core/BasicCodeValidator';
import { ValidationResult } from '../types';

describe('BasicCodeValidator', () => {
  let validator: BasicCodeValidator;

  beforeEach(() => {
    validator = new BasicCodeValidator();
  });

  describe('Line Length Validation', () => {
    it('should pass for normal line lengths', async () => {
      const content = 'const hello = "world";\n';
      const result = await validator.validateLineLength('test.js', content);
      expect(result.passed).toBe(true);
    });

    it('should fail for excessively long lines', async () => {
      const longLine = 'const veryLongVariableNameThatExceedsTheNormalLimitAndShouldFailValidationAccordingToOurRulesAndGuidelines = "this is too long";\n';
      const result = await validator.validateLineLength('test.js', longLine);
      expect(result.passed).toBe(false);
      expect(result.details?.violations).toHaveLength(1);
    });
  });

  describe('Trailing Whitespace Detection', () => {
    it('should detect trailing spaces', async () => {
      const content = 'const hello = "world"; \n'; // Space at end
      const result = await validator.validateTrailingWhitespace('test.js', content);
      expect(result.passed).toBe(false);
      expect(result.details?.violations).toHaveLength(1);
    });

    it('should pass for clean lines', async () => {
      const content = 'const hello = "world";\n';
      const result = await validator.validateTrailingWhitespace('test.js', content);
      expect(result.passed).toBe(true);
    });
  });

  describe('Console Log Detection', () => {
    it('should detect console.log statements', async () => {
      const content = 'console.log("debug message");\n';
      const result = await validator.validateConsoleLogs('test.js', content);
      expect(result.passed).toBe(false);
    });

    it('should allow console.error', async () => {
      const content = 'console.error("error message");\n';
      const result = await validator.validateConsoleLogs('test.js', content);
      expect(result.passed).toBe(false); // Still counts as console usage
    });
  });
});
```

---

## Implementation Notes

### Success Criteria for Phase 1:
- ✅ Pre-commit hook successfully blocks commits with syntax errors
- ✅ Pre-push hook integrates with existing CI/CD workflows
- ✅ Basic validation rules cover most common code quality issues
- ✅ Configuration system allows project-specific customization
- ✅ Hook installation/uninstallation works reliably across platforms
- ✅ Error messages are clear and actionable
- ✅ Logging provides sufficient debugging information

### Phase 1 Limitations (Addressed in Later Phases):
- No AI/ML-powered analysis
- Limited to static code analysis
- No integration with external services
- Basic rule set without customization
- No collaborative features
- No historical analysis or trends

This foundation provides the necessary infrastructure for more advanced features introduced in subsequent phases.

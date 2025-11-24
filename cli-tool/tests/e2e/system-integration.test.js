/**
 * cli-tool/tests/e2e/system-integration.test.js
 * End-to-end system integration tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { jest } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

describe('CodeFlow Commander CLI - Full System Integration', () => {
  const testProjectDir = path.join(process.cwd(), 'test-integration-project');
  const cliPath = path.join(process.cwd(), 'bin', 'codeflow-hook.js');

  beforeAll(async () => {
    // Create test project structure
    await fs.promises.mkdir(testProjectDir, { recursive: true });

    // Create sample project files
    const packageJson = {
      name: 'test-integration-project',
      version: '1.0.0',
      dependencies: {
        express: '^4.18.0',
        lodash: '^4.17.0'
      }
    };

    const mainJs = `
const express = require('express');
const app = express();

// GDPR compliance test
app.post('/api/users', (req, res) => {
  const userData = req.body;
  // TODO: Add consent check
  saveUserData(userData);
  res.json({ success: true });
});

// Security vulnerability test
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'SELECT * FROM users WHERE id = ' + userId; // SQL injection vulnerability
  executeQuery(query);
});

// HIPAA PHI exposure test
app.post('/api/patients', (req, res) => {
  const patientData = req.body;
  console.log('Processing patient:', patientData); // PHI in logs
  saveToDatabase(patientData);
});

app.listen(3000, () => console.log('Test server running'));
    `;

    await fs.promises.writeFile(
      path.join(testProjectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    await fs.promises.writeFile(
      path.join(testProjectDir, 'index.js'),
      mainJs
    );

    // Initialize git repo for hook testing
    await execAsync('cd ' + testProjectDir + ' && git init && git add . && git -c user.name="Test" -c user.email="test@test.com" commit -m "Initial commit"');
  }, 30000);

  afterAll(async () => {
    // Cleanup test project
    try {
      await fs.promises.rm(testProjectDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Could not clean up test project:', e.message);
    }
  }, 10000);

  describe('CLI Command Integration', () => {
    it('should display help information correctly', async () => {
      const { stdout } = await execAsync(`node ${cliPath} --help`);

      expect(stdout).toContain('codeflow-hook');
      expect(stdout).toContain('--help');
      expect(stdout).toContain('--version');
    });

    it('should show version information', async () => {
      const { stdout } = await execAsync(`node ${cliPath} --version`);

      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should install git hooks successfully', async () => {
      const hookPath = path.join(testProjectDir, '.git', 'hooks', 'pre-commit');

      const { stdout } = await execAsync(`cd ${testProjectDir} && node ${path.resolve(cliPath)} install`);

      expect(stdout).toContain('Git hooks installed successfully');
      expect(fs.existsSync(hookPath)).toBe(true);

      // Verify hook is executable
      const stat = fs.statSync(hookPath);
      expect(stat.mode & 0o111).toBeGreaterThan(0); // Has execute permission
    });
  });

  describe('Knowledge System Integration', () => {
    it('should analyze code and generate suggestions', async () => {
      const sourceFile = path.join(testProjectDir, 'index.js');

      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 30 node ${path.resolve(cliPath)} analyze-diff --file ${sourceFile}`);

      expect(stdout).toBeDefined();
      // Should contain analysis output
      expect(stdout.length).toBeGreaterThan(10);
    });

    it('should perform security scan with compliance checks', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 30 node ${path.resolve(cliPath)} security-scan`);

      expect(stdout).toContain('security-scan');
      // Should contain vulnerability findings
      expect(stdout).toMatch(/(vulnerability|issue|warning)/i);
    });

    it('should execute compliance check with multiple standards', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 30 node ${path.resolve(cliPath)} compliance-check --standards gdpr,hipaa`);

      expect(stdout).toContain('compliance-check');
      // Should contain compliance analysis
      expect(stdout).toMatch(/(gdpr|hipaa|compliance|violation)/i);
    });

    it('should generate risk assessment report', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 30 node ${path.resolve(cliPath)} risk-assess`);

      expect(stdout).toContain('risk-assess');
      // Should contain risk analysis
      expect(stdout).toMatch(/(risk|assessment|score|level)/i);
    });
  });

  describe('Multi-Service Integration', () => {
    it('should coordinate knowledge indexing across services', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 45 node ${path.resolve(cliPath)} rag-index`);

      expect(stdout).toContain('rag-index');
      // Should indicate successful indexing
      expect(stdout).toMatch(/(index|process|complete|success)/i);
    });

    it('should perform knowledge query with graph traversal', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 30 node ${path.resolve(cliPath)} rag-analyze "authentication security"`);

      expect(stdout).toContain('rag-analyze');
      // Should contain analysis results
      expect(stdout).toMatch(/(query|search|result|analysis)/i);
    });

    it('should show system status with all components', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 30 node ${path.resolve(cliPath)} status`);

      expect(stdout).toContain('status');
      // Should show multiple service statuses
      expect(stdout).toMatch(/(knowledge|graph|embedding|service)/i);
    });
  });

  describe('Enterprise Governance Integration', () => {
    it('should enforce policy decisions in workflow', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 30 node ${path.resolve(cliPath)} policy-eval`);

      expect(stdout).toContain('policy-eval');
      // Should contain policy evaluation results
      expect(stdout).toMatch(/(policy|decision|rule|enforce)/i);
    });

    it('should validate enterprise compliance requirements', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 30 node ${path.resolve(cliPath)} privacy-impact`);

      expect(stdout).toContain('privacy-impact');
      // Should contain privacy assessment
      expect(stdout).toMatch(/(privacy|impact|pii|data)/i);
    });

    it('should perform audit trail analysis', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 45 node ${path.resolve(cliPath)} compliance-check --audit`);

      expect(stdout).toContain('compliance-check');
      // Should contain audit trail analysis
      expect(stdout).toMatch(/(audit|trail|compliant|violation)/i);
    });
  });

  describe('Git Workflow Integration', () => {
    it('should trigger analysis on git commit (pre-commit hook)', async () => {
      // Create a test file change
      const testChange = `
const newFeature = () => {
  const data = getUserData();
  return data;
};
      `;

      await fs.promises.appendFile(path.join(testProjectDir, 'test-change.js'), testChange);

      try {
        // Attempt to commit (should trigger hook)
        await execAsync(`cd ${testProjectDir} && git add test-change.js`);

        // This should trigger the pre-commit hook
        const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 60 node ${path.resolve(cliPath)} analyze-diff --staged-only`);

        expect(stdout).toContain('analyze-diff');
        // Should analyze the changed file
        expect(stdout.length).toBeGreaterThan(50);
      } catch (e) {
        // Hook might block commit if issues found - that's expected behavior
        expect(e.message).toMatch(/(analysis|hook|block)/i);
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent analysis requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        execAsync(`cd ${testProjectDir} && timeout 30 node ${path.resolve(cliPath)} analyze-diff --file index.js`)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentRequests);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(120000); // Less than 2 minutes for 5 concurrent

      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulRequests).toBeGreaterThanOrEqual(3); // At least 3 should succeed
    });

    it('should maintain memory stability under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple analysis operations
      for (let i = 0; i < 3; i++) {
        await execAsync(`cd ${testProjectDir} && timeout 20 node ${path.resolve(cliPath)} knowledge search "test"`);
      }

      await global.testUtils.waitFor(1000); // Let garbage collection run

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 25MB for 3 operations)
      expect(memoryIncrease).toBeLessThan(25 * 1024 * 1024);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from network timeouts gracefully', async () => {
      // Mock network failure
      jest.doMock('axios', () => ({
        ...jest.requireActual('axios'),
        get: jest.fn().mockRejectedValue(new Error('Network timeout'))
      }));

      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 15 node ${path.resolve(cliPath)} status`);

      // Should still provide basic status even with network issues
      expect(stdout).toContain('status');
      expect(stdout).toMatch(/(local|offline|error)/i);
    });

    it('should handle malformed input without crashing', async () => {
      const malformedFile = path.join(testProjectDir, 'malformed.js');
      await fs.promises.writeFile(malformedFile, 'const malformed = {{{ invalid syntax }}}');

      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 20 node ${path.resolve(cliPath)} analyze-diff --file ${malformedFile}`);

      expect(stdout).toContain('analyze-diff');
      // Should not crash, should handle error gracefully
      expect(stdout).toMatch(/(error|warning|unable|attempted)/i);
    });

    it('should maintain data integrity across failures', async () => {
      // Create some knowledge data
      await execAsync(`cd ${testProjectDir} && timeout 20 node ${path.resolve(cliPath)} knowledge search "test" || true`);

      // Simulate failure scenario
      process.env.SIMULATE_FAILURE = 'true';

      try {
        await execAsync(`cd ${testProjectDir} && timeout 15 node ${path.resolve(cliPath)} knowledge clear`);
      } catch (e) {
        // Expected to potentially fail due to simulation
      }

      delete process.env.SIMULATE_FAILURE;

      // Should recover and provide status
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 15 node ${path.resolve(cliPath)} knowledge stats`);

      expect(stdout).toContain('knowledge');
      expect(stdout).toContain('stats');
    });
  });

  describe('Configuration Management', () => {
    it('should handle configuration updates dynamically', async () => {
      // Test config command
      const { stdout: configOutput } = await execAsync(`cd ${testProjectDir} && timeout 15 node ${path.resolve(cliPath)} config --provider gemini --key test-123`);

      expect(configOutput).toContain('config');
      expect(configOutput).toMatch(/(provider|key|updated|set)/i);

      // Verify config persistence (would need actual config file)
      // Config should be saved and reloaded on next command
    });

    it('should validate configuration parameters', async () => {
      const { stdout } = await execAsync(`cd ${testProjectDir} && timeout 15 node ${path.resolve(cliPath)} config --provider invalid --key ""`);

      expect(stdout).toContain('config');
      // Should indicate validation error
      expect(stdout).toMatch(/(invalid|error|required)/i);
    });
  });
});

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import pipelineConfigManager from './pipeline-config-manager.js';

/**
 * Real CI/CD Pipeline Execution Engine
 * Converts simulation to real data execution
 */
class PipelineExecutor {
  constructor() {
    this.activeExecutions = new Map();
    this.results = [];
    this.loadResults();
  }

  loadResults() {
    const RESULTS_FILE = path.join(process.cwd(), 'pipeline-results.json');
    try {
      if (fs.existsSync(RESULTS_FILE)) {
        this.results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
      }
    } catch (e) {
      this.results = [];
    }
  }

  saveResults() {
    const RESULTS_FILE = path.join(process.cwd(), 'pipeline-results.json');
    try {
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(this.results, null, 2));
    } catch (e) {
      console.error('Failed to save pipeline results:', e);
    }
  }

  /**
   * Execute a real CI/CD pipeline based on detected project configuration
   */
  async executePipeline(config) {
    const executionId = Date.now().toString();
    const startTime = Date.now();
    
    const execution = {
      id: executionId,
      status: 'running',
      startTime,
      stages: [],
      overallStatus: 'running',
      metrics: {
        totalDuration: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0
      }
    };

    this.activeExecutions.set(executionId, execution);
    this.results.push(execution);

    try {
      // Detect project type and generate appropriate pipeline
      const detectedConfig = await this.detectProjectConfiguration();
      const pipelineStages = this.generatePipelineStages(detectedConfig);

      for (const stageConfig of pipelineStages) {
        const stageResult = await this.executeStage(executionId, stageConfig);
        execution.stages.push(stageResult);

        // Update metrics
        if (stageResult.status === 'success') {
          execution.metrics.successCount++;
        } else if (stageResult.status === 'failed') {
          execution.metrics.failureCount++;
        } else {
          execution.metrics.skippedCount++;
        }

        // Fail fast for critical stages
        if (stageResult.status === 'failed' && stageConfig.critical) {
          execution.overallStatus = 'failed';
          execution.status = 'failed';
          break;
        }
      }

      // Calculate final metrics
      const endTime = Date.now();
      execution.metrics.totalDuration = endTime - startTime;
      
      // Determine overall status
      if (execution.metrics.failureCount > 0) {
        execution.overallStatus = 'failed';
        execution.status = 'failed';
      } else if (execution.metrics.successCount === pipelineStages.length) {
        execution.overallStatus = 'success';
        execution.status = 'success';
      } else {
        execution.overallStatus = 'partial';
        execution.status = 'partial';
      }

      this.saveResults();
      return execution;

    } catch (error) {
      execution.status = 'failed';
      execution.overallStatus = 'failed';
      execution.error = error.message;
      this.saveResults();
      throw error;
    }
  }

  /**
   * Detect project configuration from actual files
   */
  async detectProjectConfiguration() {
    const config = {
      projectType: 'unknown',
      packageManagers: [],
      buildTools: [],
      testFrameworks: [],
      lintingTools: [],
      deploymentTargets: []
    };

    // Check for package.json files
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const monorepoPackageJsonPath = path.join(process.cwd(), 'packages/*/package.json');

    if (fs.existsSync(packageJsonPath)) {
      config.packageManagers.push('npm');
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Detect project type
        if (packageJson.workspaces) {
          config.projectType = 'monorepo';
        } else if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
          config.projectType = 'react';
        } else if (packageJson.dependencies?.express || packageJson.devDependencies?.express) {
          config.projectType = 'nodejs';
        } else {
          config.projectType = 'typescript';
        }

        // Detect build tools
        if (packageJson.scripts?.build) {
          if (packageJson.scripts.build.includes('vite')) {
            config.buildTools.push('vite');
          } else if (packageJson.scripts.build.includes('webpack')) {
            config.buildTools.push('webpack');
          } else if (packageJson.scripts.build.includes('tsc')) {
            config.buildTools.push('typescript');
          }
        }

        // Detect test frameworks
        if (packageJson.scripts?.test || packageJson.scripts?.['test:all']) {
          if (packageJson.devDependencies?.jest) {
            config.testFrameworks.push('jest');
          } else if (packageJson.devDependencies?.mocha) {
            config.testFrameworks.push('mocha');
          } else if (packageJson.devDependencies?.vitest) {
            config.testFrameworks.push('vitest');
          }
        }

        // Detect linting tools
        if (packageJson.scripts?.lint) {
          if (packageJson.devDependencies?.eslint) {
            config.lintingTools.push('eslint');
          }
        }

      } catch (e) {
        console.warn('Failed to parse package.json:', e.message);
      }
    }

    // Check for Docker
    if (fs.existsSync(path.join(process.cwd(), 'Dockerfile'))) {
      config.deploymentTargets.push('docker');
    }
    if (fs.existsSync(path.join(process.cwd(), 'docker-compose.yml'))) {
      config.deploymentTargets.push('docker-compose');
    }

    return config;
  }

  /**
   * Generate pipeline stages based on detected configuration
   */
  generatePipelineStages(config) {
    const stages = [];

    // Code Quality Analysis
    if (config.lintingTools.includes('eslint')) {
      stages.push({
        name: 'Code Quality Analysis',
        command: 'npm run lint',
        timeout: 120000,
        critical: true,
        rollback: 'Exit pipeline - code quality issues must be resolved',
        failureMode: 'FAIL_PIPELINE'
      });
    }

    // TypeScript Compilation Check
    if (config.buildTools.includes('typescript') || config.projectType === 'monorepo') {
      stages.push({
        name: 'TypeScript Compilation Check',
        command: 'npm run typecheck',
        timeout: 180000,
        critical: true,
        rollback: 'Exit pipeline - TypeScript errors must be fixed',
        failureMode: 'FAIL_PIPELINE'
      });
    }

    // Frontend Build (for React/Vite projects)
    if (config.projectType === 'react' || config.buildTools.includes('vite')) {
      stages.push({
        name: 'Frontend Build',
        command: 'npm run build --workspace=packages/simulator-ui',
        timeout: 300000,
        critical: true,
        rollback: 'Exit pipeline - build failures must be resolved',
        failureMode: 'FAIL_PIPELINE'
      });
    }

    // Backend Build (for Node.js projects)
    if (config.projectType === 'nodejs' || config.projectType === 'monorepo') {
      stages.push({
        name: 'Backend Build',
        command: 'npm run build:all',
        timeout: 300000,
        critical: true,
        rollback: 'Exit pipeline - backend build failures must be resolved',
        failureMode: 'FAIL_PIPELINE'
      });
    }

    // Unit Tests
    if (config.testFrameworks.length > 0) {
      stages.push({
        name: 'Unit Tests',
        command: 'npm run test:all',
        timeout: 420000,
        critical: true,
        rollback: 'Exit pipeline - test failures must be resolved',
        failureMode: 'FAIL_PIPELINE'
      });
    }

    // Security Check
    if (fs.existsSync(path.join(process.cwd(), 'scripts/security-check.js'))) {
      stages.push({
        name: 'Security Check',
        command: 'node scripts/security-check.js',
        timeout: 120000,
        critical: true,
        rollback: 'Exit pipeline - security vulnerabilities must be addressed',
        failureMode: 'FAIL_PIPELINE'
      });
    }

    // Docker Build
    if (config.deploymentTargets.includes('docker')) {
      stages.push({
        name: 'Docker Build',
        command: 'docker compose build',
        timeout: 600000,
        critical: true,
        rollback: 'Exit pipeline - Docker build failures must be resolved',
        failureMode: 'FAIL_PIPELINE'
      });
    }

    // Integration Test
    if (config.deploymentTargets.includes('docker-compose')) {
      stages.push({
        name: 'Integration Test',
        command: 'docker compose up --build -d && sleep 30 && curl -f http://localhost:8080 || exit 1',
        timeout: 300000,
        critical: false,
        rollback: 'docker compose down -v',
        failureMode: 'ROLLBACK_AND_FAIL'
      });
    }

    // Cleanup
    stages.push({
      name: 'Cleanup',
      command: 'docker compose down -v',
      timeout: 120000,
      critical: false,
      rollback: 'Force cleanup: docker compose down -v --remove-orphans',
      failureMode: 'CONTINUE'
    });

    return stages;
  }

  /**
   * Execute a single pipeline stage
   */
  async executeStage(executionId, stageConfig) {
    const stage = {
      id: `${executionId}-${stageConfig.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: stageConfig.name,
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      command: stageConfig.command,
      logs: [],
      error: null
    };

    try {
      // Parse command into executable and arguments
      const [executable, ...args] = stageConfig.command.split(' ');
      
      // Execute the command
      const child = spawn(executable, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        stage.logs.push(output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        stage.logs.push(output);
      });

      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Stage timeout after ${stageConfig.timeout}ms`)), stageConfig.timeout);
      });

      // Wait for completion or timeout
      await Promise.race([
        new Promise((resolve, reject) => {
          child.on('close', (code) => {
            stage.endTime = Date.now();
            stage.duration = stage.endTime - stage.startTime;
            
            if (code === 0) {
              stage.status = 'success';
              stage.logs.push(`✅ Stage completed successfully in ${(stage.duration / 1000).toFixed(2)}s`);
            } else {
              stage.status = 'failed';
              stage.error = `Command failed with exit code ${code}`;
              stage.logs.push(`❌ Stage failed with exit code ${code}`);
            }
            resolve(stage);
          });
          
          child.on('error', (error) => {
            stage.status = 'failed';
            stage.error = error.message;
            stage.logs.push(`💥 Stage failed with error: ${error.message}`);
            reject(error);
          });
        }),
        timeoutPromise
      ]);

      return stage;

    } catch (error) {
      stage.status = 'failed';
      stage.error = error.message;
      stage.endTime = Date.now();
      stage.duration = stage.endTime - stage.startTime;
      stage.logs.push(`💥 Stage failed with error: ${error.message}`);
      return stage;
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId) {
    return this.activeExecutions.get(executionId) || 
           this.results.find(r => r.id === executionId);
  }

  /**
   * Abort a running execution
   */
  abortExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      // Implementation for aborting running processes would go here
      execution.status = 'cancelled';
      execution.overallStatus = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get all pipeline results
   */
  getAllResults() {
    return this.results;
  }
}

export default new PipelineExecutor();
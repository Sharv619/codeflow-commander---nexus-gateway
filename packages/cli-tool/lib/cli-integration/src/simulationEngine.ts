import {
  PipelineConfig,
  StageConfig,
  SimulationResult,
  SimulationContext,
  StageExecution,
  StageStatus,
  StageMetrics,
  PipelineMetrics,
  ErrorInfo,
  SimulationMode
} from './types.js';

/**
 * Advanced Simulation Engine for configurable CI/CD pipelines
 * Provides realistic simulation behaviors with probabilistic outcomes,
 * resource usage simulation, and comprehensive error handling.
 */
export class SimulationEngine {
  private context: SimulationContext | null = null;

  /**
   * Execute a pipeline configuration with realistic simulation
   */
  async executePipeline(config: PipelineConfig): Promise<SimulationResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    // Validate configuration before execution
    this.validatePipelineConfig(config);
    this.validateEnvironmentVariables();

    this.context = {
      pipelineId: config.id,
      executionId,
      startTime,
      config,
      variables: { ...config.environment },
      artifacts: new Map()
    };

    const logs: string[] = [];
    const stageExecutions: StageExecution[] = [];

    try {
      logs.push(`[${new Date().toISOString()}] 🚀 Starting pipeline: ${config.name} (v${config.version})`);
      logs.push(`[${new Date().toISOString()}] 📋 Execution ID: ${executionId}`);
      logs.push(`[${new Date().toISOString()}] 🎯 Mode: ${config.settings.mode}`);

      // Build dependency graph
      const stages: StageConfig[] = config.stages || [];
      const dependencyGraph = this.buildDependencyGraph(stages);
      const executionOrder = this.resolveExecutionOrder(dependencyGraph, stages);

      // Execute stages respecting dependencies and concurrency limits
      const results = await this.executeStagesWithDependencies(
        executionOrder,
        config,
        logs
      );

      stageExecutions.push(...results);

      // Calculate pipeline metrics
      const metrics = this.calculatePipelineMetrics(stageExecutions, config);

      // Determine overall status
      const failedStages = stageExecutions.filter(s => s.status === StageStatus.Failed);

      let status: SimulationResult['status'] = 'success';
      if (failedStages.length > 0) {
        status = config.settings.failFast ? 'failed' : 'partial';
      }

      const endTime = Date.now();
      logs.push(`[${new Date().toISOString()}] ✅ Pipeline completed in ${(endTime - startTime) / 1000}s`);

      return {
        id: this.generateResultId(),
        pipelineId: config.id,
        executionId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status,
        stages: stageExecutions,
        metrics,
        artifacts: Array.from(this.context.artifacts.values()),
        config,
        logs
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logs.push(`[${new Date().toISOString()}] ❌ Pipeline failed: ${errorMessage}`);

      return {
        id: this.generateResultId(),
        pipelineId: config.id,
        executionId,
        startTime: new Date(startTime),
        endTime: new Date(),
        status: 'failed',
        stages: stageExecutions,
        metrics: this.calculatePipelineMetrics(stageExecutions, config),
        artifacts: Array.from(this.context.artifacts.values()),
        config,
        logs
      };
    }
  }

  /**
   * Validate environment variables for security
   */
  private validateEnvironmentVariables(): void {
    // Validate environment variables that might affect simulation
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      SIMULATION_TIMEOUT: process.env.SIMULATION_TIMEOUT || '300000', // 5 minutes default
      MAX_CONCURRENCY: process.env.MAX_CONCURRENCY || '5'
    };

    // Validate NODE_ENV
    const validNodeEnvs = ['development', 'test', 'production'];
    if (!validNodeEnvs.includes(envVars.NODE_ENV)) {
      throw new Error(`Invalid NODE_ENV: ${envVars.NODE_ENV}. Must be one of: ${validNodeEnvs.join(', ')}`);
    }

    // Validate LOG_LEVEL
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(envVars.LOG_LEVEL)) {
      throw new Error(`Invalid LOG_LEVEL: ${envVars.LOG_LEVEL}. Must be one of: ${validLogLevels.join(', ')}`);
    }

    // Validate simulation timeout
    const timeout = parseInt(envVars.SIMULATION_TIMEOUT, 10);
    if (isNaN(timeout) || timeout <= 0 || timeout > 3600000) { // Max 1 hour
      throw new Error(`Invalid SIMULATION_TIMEOUT: ${envVars.SIMULATION_TIMEOUT}. Must be between 1 and 3600000 milliseconds`);
    }

    // Validate max concurrency
    const concurrency = parseInt(envVars.MAX_CONCURRENCY, 10);
    if (isNaN(concurrency) || concurrency <= 0 || concurrency > 20) {
      throw new Error(`Invalid MAX_CONCURRENCY: ${envVars.MAX_CONCURRENCY}. Must be between 1 and 20`);
    }
  }

  /**
   * Validate pipeline configuration for security and correctness
   */
  private validatePipelineConfig(config: PipelineConfig): void {
    // Validate pipeline ID format
    if (!config.id || !/^[a-z0-9-]+$/.test(config.id)) {
      throw new Error('Invalid pipeline ID format - must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate stage configurations
    if (!config.stages || config.stages.length === 0) {
      throw new Error('Pipeline must contain at least one stage');
    }

    // Validate each stage
    const stageIds = new Set<string>();
    for (const stage of config.stages) {
      // Check for duplicate stage IDs
      if (stageIds.has(stage.id)) {
        throw new Error(`Duplicate stage ID found: ${stage.id}`);
      }
      stageIds.add(stage.id);

      // Validate stage ID format
      if (!/^[a-z0-9-]+$/.test(stage.id)) {
        throw new Error(`Invalid stage ID format: ${stage.id}`);
      }

      // Validate dependencies don't create cycles (basic check)
      if (stage.dependencies.includes(stage.id)) {
        throw new Error(`Stage ${stage.id} cannot depend on itself`);
      }

      // Validate timeout values
      if (stage.timeout <= 0 || stage.timeout > 7200000) { // Max 2 hours
        throw new Error(`Invalid timeout for stage ${stage.id}: must be between 1ms and 2 hours`);
      }

      // Validate success rate
      if (stage.successRate < 0 || stage.successRate > 1) {
        throw new Error(`Invalid success rate for stage ${stage.id}: must be between 0 and 1`);
      }

      // Validate duration range
      if (stage.durationRange.min <= 0 || stage.durationRange.max <= 0 || 
          stage.durationRange.min > stage.durationRange.max) {
        throw new Error(`Invalid duration range for stage ${stage.id}`);
      }
    }

    // Validate pipeline settings
    if (config.settings.maxConcurrency <= 0 || config.settings.maxConcurrency > 10) {
      throw new Error('Invalid maxConcurrency setting: must be between 1 and 10');
    }

    if (config.settings.timeout <= 0 || config.settings.timeout > 86400000) { // Max 24 hours
      throw new Error('Invalid pipeline timeout: must be between 1ms and 24 hours');
    }
  }

  /**
   * Execute stages respecting dependencies and concurrency limits
   */
  private async executeStagesWithDependencies(
    executionOrder: StageConfig[][],
    config: PipelineConfig,
    logs: string[]
  ): Promise<StageExecution[]> {
    const results: StageExecution[] = [];
    const completedStages = new Set<string>();
    const runningStages = new Set<string>();

    for (const level of executionOrder) {
      // Execute stages in this level concurrently, respecting maxConcurrency
      const levelPromises = level
        .filter(stage => this.canExecuteStage(stage, completedStages))
        .slice(0, config.settings.maxConcurrency)
        .map(stage => this.executeStage(stage, config, logs));

      const levelResults = await Promise.all(levelPromises);
      results.push(...levelResults);

      // Update completed stages
      levelResults.forEach(result => {
        if (result.status === StageStatus.Success || result.status === StageStatus.Failed) {
          completedStages.add(result.id);
        }
        runningStages.delete(result.id);
      });

      // Handle fail-fast behavior
      if (config.settings.failFast) {
        const failedInLevel = levelResults.filter((r: StageExecution) => r.status === StageStatus.Failed);
        if (failedInLevel.length > 0) {
          // Mark remaining stages as skipped
          const remainingStages = executionOrder
            .slice(executionOrder.indexOf(level) + 1)
            .flat()
            .filter(stage => !completedStages.has(stage.id));

          for (const stage of remainingStages) {
            results.push({
              id: stage.id,
              status: StageStatus.Skipped,
              logs: [`[${new Date().toISOString()}] ⏭️ Skipped due to previous failure`],
              duration: 0
            });
          }
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute a single stage with realistic simulation
   */
  private async executeStage(
    stageConfig: StageConfig,
    pipelineConfig: PipelineConfig,
    logs: string[]
  ): Promise<StageExecution> {
    const startTime = Date.now();
    const stageLogs: string[] = [];
    const errors: ErrorInfo[] = [];

    stageLogs.push(`[${new Date().toISOString()}] 🎬 Starting stage: ${stageConfig.name}`);

    try {
      // Simulate stage execution based on configuration
      const result = await this.simulateStageExecution(stageConfig, pipelineConfig);

      // Update logs and metrics
      stageLogs.push(...result.logs);

      if (result.errors) {
        errors.push(...result.errors);
      }

      const duration = Date.now() - startTime;
      const status = result.success ? StageStatus.Success : StageStatus.Failed;

      stageLogs.push(`[${new Date().toISOString()}] ${result.success ? '✅' : '❌'} Stage ${stageConfig.name} completed in ${duration}ms`);

      const executionResult: StageExecution = {
        id: stageConfig.id,
        status,
        logs: stageLogs,
        duration,
        metrics: result.metrics
      };

      if (errors.length > 0) {
        executionResult.errors = errors;
      }

      return executionResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      stageLogs.push(`[${new Date().toISOString()}] 💥 Stage ${stageConfig.name} failed: ${errorMessage}`);

      errors.push({
        type: 'execution_error',
        message: errorMessage,
        timestamp: Date.now(),
        recoverable: false,
        context: { stageId: stageConfig.id }
      });

      return {
        id: stageConfig.id,
        status: StageStatus.Failed,
        logs: stageLogs,
        duration,
        errors
      };
    }
  }

  /**
   * Simulate realistic stage execution with probabilistic outcomes
   */
  private async simulateStageExecution(
    stageConfig: StageConfig,
    pipelineConfig: PipelineConfig
  ): Promise<{
    success: boolean;
    logs: string[];
    metrics: StageMetrics;
    errors?: ErrorInfo[];
  }> {
    // Calculate realistic duration based on simulation mode
    const duration = this.calculateStageDuration(stageConfig, pipelineConfig);

    // Simulate resource usage
    const metrics = this.simulateResourceUsage(stageConfig, duration);

    // Determine if stage should succeed based on success rate
    const successRoll = Math.random();
    const shouldSucceed = successRoll <= stageConfig.successRate;

    // Simulate the stage behavior
    switch (stageConfig.type) {
      case 'trigger':
        return this.simulateTriggerStage(stageConfig, shouldSucceed, duration, metrics);

      case 'ai-review':
        return this.simulateAiReviewStage(stageConfig, shouldSucceed, duration, metrics);

      case 'docker-build':
        return this.simulateDockerBuildStage(stageConfig, shouldSucceed, duration, metrics);

      case 'unit-tests':
        return this.simulateUnitTestStage(stageConfig, shouldSucceed, duration, metrics);

      case 'deploy':
        return this.simulateDeployStage(stageConfig, shouldSucceed, duration, metrics);

      default:
        return this.simulateGenericStage(stageConfig, shouldSucceed, duration, metrics);
    }
  }

  /**
   * Calculate realistic stage duration based on configuration and mode
   */
  private calculateStageDuration(stageConfig: StageConfig, pipelineConfig: PipelineConfig): number {
    const { min, max, baseMultiplier } = stageConfig.durationRange;

    // Base duration calculation
    let baseDuration = (min + max) / 2;

    // Apply simulation mode multipliers
    switch (pipelineConfig.settings.mode) {
      case SimulationMode.Fast:
        baseDuration *= 0.3;
        break;
      case SimulationMode.Realistic:
        // Add some randomness
        baseDuration *= (0.8 + Math.random() * 0.4);
        break;
      case SimulationMode.Chaotic:
        // High variability
        baseDuration *= (0.2 + Math.random() * 2.0);
        break;
      case SimulationMode.Deterministic:
        // Consistent timing
        break;
    }

    // Apply base multiplier (could be based on codebase size)
    baseDuration *= baseMultiplier;

    // Ensure within bounds
    return Math.max(min, Math.min(max, baseDuration));
  }

  /**
   * Simulate resource usage for a stage
   */
  private simulateResourceUsage(stageConfig: StageConfig, _duration: number): StageMetrics {
    // Simulate realistic resource usage patterns
    const baseCpu = 20 + Math.random() * 60; // 20-80% CPU
    const baseMemory = 100 + Math.random() * 400; // 100-500MB

    return {
      cpuUsage: Math.round(baseCpu),
      memoryUsage: Math.round(baseMemory),
      networkIO: Math.round(_duration * (0.1 + Math.random() * 0.9)), // KB/s
      diskIO: Math.round(_duration * (0.05 + Math.random() * 0.15)), // KB/s
      duration: Math.round(_duration),
      success: true // Will be overridden
    };
  }

  /**
   * Simulate trigger stage (git push detection)
   */
  private simulateTriggerStage(
    stageConfig: StageConfig,
    success: boolean,
    duration: number,
    metrics: StageMetrics
  ): { success: boolean; logs: string[]; metrics: StageMetrics; errors?: ErrorInfo[] } {
    const logs: string[] = [];

    if (success) {
      logs.push(`[${new Date().toISOString()}] 📡 Git push detected on branch \`${stageConfig.config.branch || 'main'}\``);
      logs.push(`[${new Date().toISOString()}] 👤 Commit \`${stageConfig.config.commitMessage || 'feat: update codebase'}\` by \`${stageConfig.config.author || 'developer@example.com'}\``);
      logs.push(`[${new Date().toISOString()}] ✅ Workflow triggered successfully`);
    } else {
      logs.push(`[${new Date().toISOString()}] ❌ Failed to detect git push - invalid webhook payload`);
    }

    return { success, logs, metrics };
  }

  /**
   * Simulate AI review stage
   */
  private simulateAiReviewStage(
    _stageConfig: StageConfig,
    success: boolean,
    _duration: number,
    metrics: StageMetrics
  ): { success: boolean; logs: string[]; metrics: StageMetrics; errors?: ErrorInfo[] } {
    const logs: string[] = [];

    logs.push(`[${new Date().toISOString()}] 🧠 Analyzing code changes...`);
    logs.push(`[${new Date().toISOString()}] 📊 Processing ${_stageConfig.config.fileCount || 5} files`);

    if (success) {
      logs.push(`[${new Date().toISOString()}] ✅ Analysis complete - ${_stageConfig.config.issueCount || 0} issues found`);
      logs.push(`[${new Date().toISOString()}] 📈 Code quality score: ${85 + Math.random() * 10}/100`);
    } else {
      logs.push(`[${new Date().toISOString()}] ❌ Analysis failed - API timeout`);
    }

    return { success, logs, metrics };
  }

  /**
   * Simulate Docker build stage
   */
  private simulateDockerBuildStage(
    stageConfig: StageConfig,
    success: boolean,
    _duration: number,
    metrics: StageMetrics
  ): { success: boolean; logs: string[]; metrics: StageMetrics; errors?: ErrorInfo[] } {
    const logs: string[] = [];

    // Sanitize input to prevent command injection
    const imageName = this.sanitizeInput(stageConfig.config.imageName || 'app:latest');
    const baseImage = this.sanitizeInput(stageConfig.config.baseImage || 'node:18-alpine');

    logs.push(`[${new Date().toISOString()}] 🐳 Building Docker image \`${imageName}\``);
    logs.push(`[${new Date().toISOString()}] 📦 Step 1/8 : FROM ${baseImage}`);

    if (success) {
      logs.push(`[${new Date().toISOString()}] 📦 Step 8/8 : CMD ["npm", "start"]`);
      logs.push(`[${new Date().toISOString()}] ✅ Successfully built ${stageConfig.config.imageId || 'a1b2c3d4e5f6'}`);
      logs.push(`[${new Date().toISOString()}] 🔍 Image size: ${50 + Math.random() * 200}MB`);

      // Create artifact with sanitized data
      if (this.context) {
        const sanitizedImageName = this.sanitizeInput(stageConfig.config.imageName || 'app');
        this.context.artifacts.set(`${stageConfig.id}-image`, {
          name: `${sanitizedImageName}.tar.gz`,
          type: 'docker-image',
          size: Math.round(50 + Math.random() * 200) * 1024 * 1024,
          path: `/artifacts/${stageConfig.id}`,
          metadata: { imageId: stageConfig.config.imageId || 'a1b2c3d4e5f6' }
        });
      }
    } else {
      logs.push(`[${new Date().toISOString()}] ❌ Build failed at step ${Math.floor(Math.random() * 8) + 1}`);
    }

    return { success, logs, metrics };
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  private sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input.replace(/[^\w\-\.\/:]/g, '');
  }

  /**
   * Simulate unit test stage
   */
  private simulateUnitTestStage(
    stageConfig: StageConfig,
    success: boolean,
    _duration: number,
    metrics: StageMetrics
  ): { success: boolean; logs: string[]; metrics: StageMetrics; errors?: ErrorInfo[] } {
    const logs: string[] = [];

    const testCount = stageConfig.config.testCount || 50;
    logs.push(`[${new Date().toISOString()}] 🧪 Running ${testCount} unit tests`);

    if (success) {
      logs.push(`[${new Date().toISOString()}] ✅ Tests passed: ${testCount}/${testCount}`);
      logs.push(`[${new Date().toISOString()}] 📊 Coverage: ${85 + Math.random() * 10}%`);
    } else {
      const failed = Math.floor(Math.random() * 5) + 1;
      logs.push(`[${new Date().toISOString()}] ❌ Tests failed: ${failed}/${testCount}`);
      logs.push(`[${new Date().toISOString()}] 🔍 Failed tests: ${Array.from({length: failed}, (_, i) => `test_${i + 1}`).join(', ')}`);
    }

    return { success, logs, metrics };
  }

  /**
   * Simulate deploy stage
   */
  private simulateDeployStage(
    stageConfig: StageConfig,
    success: boolean,
    _duration: number,
    metrics: StageMetrics
  ): { success: boolean; logs: string[]; metrics: StageMetrics; errors?: ErrorInfo[] } {
    const logs: string[] = [];

    logs.push(`[${new Date().toISOString()}] 🚀 Deploying to ${stageConfig.config.environment || 'staging'}`);
    logs.push(`[${new Date().toISOString()}] ☸️ Applying Kubernetes deployment`);

    if (success) {
      logs.push(`[${new Date().toISOString()}] ✅ Deployment successful`);
      logs.push(`[${new Date().toISOString()}] 🌐 Service available at ${stageConfig.config.url || 'https://staging.example.com'}`);
    } else {
      logs.push(`[${new Date().toISOString()}] ❌ Deployment failed - pod readiness timeout`);
    }

    return { success, logs, metrics };
  }

  /**
   * Simulate generic stage
   */
  private simulateGenericStage(
    stageConfig: StageConfig,
    success: boolean,
    _duration: number,
    metrics: StageMetrics
  ): { success: boolean; logs: string[]; metrics: StageMetrics; errors?: ErrorInfo[] } {
    const logs: string[] = [];

    logs.push(`[${new Date().toISOString()}] 🔧 Executing ${stageConfig.type} stage`);

    if (success) {
      logs.push(`[${new Date().toISOString()}] ✅ Stage completed successfully`);
    } else {
      logs.push(`[${new Date().toISOString()}] ❌ Stage failed`);
    }

    return { success, logs, metrics };
  }

  /**
   * Build dependency graph from stage configurations
   */
  private buildDependencyGraph(stages: StageConfig[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const stage of stages) {
      graph.set(stage.id, stage.dependencies || []);
    }

    return graph;
  }

  /**
   * Resolve execution order respecting dependencies
   */
  private resolveExecutionOrder(dependencyGraph: Map<string, string[]>, stages: StageConfig[]): StageConfig[][] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const stageMap = new Map<string, StageConfig>();

    // Build stage map for quick lookup
    for (const stage of stages) {
      stageMap.set(stage.id, stage);
    }

    // This is a simplified topological sort - in production you'd want a more robust implementation
    const sorted: string[] = [];
    const processStage = (stageId: string) => {
      if (visited.has(stageId)) return;
      if (visiting.has(stageId)) throw new Error(`Circular dependency detected: ${stageId}`);

      visiting.add(stageId);

      const dependencies = dependencyGraph.get(stageId) || [];
      for (const dep of dependencies) {
        processStage(dep);
      }

      visiting.delete(stageId);
      visited.add(stageId);
      sorted.push(stageId);
    };

    // Process all stages
    for (const stageId of Array.from(dependencyGraph.keys())) {
      if (!visited.has(stageId)) {
        processStage(stageId);
      }
    }

    // Group into levels (simplified - no parallel execution consideration)
    const result: StageConfig[][] = [];
    for (const stageId of sorted) {
      const stage = stageMap.get(stageId);
      if (stage) {
        if (result.length === 0 || this.hasDependencyInPreviousLevel(stage, result[result.length - 1]!)) {
          result.push([stage]);
        } else {
          result[result.length - 1]!.push(stage);
        }
      }
    }

    return result;
  }

  /**
   * Check if stage can be executed (all dependencies completed)
   */
  private canExecuteStage(stage: StageConfig, completedStages: Set<string>): boolean {
    return stage.dependencies.every(dep => completedStages.has(dep));
  }

  /**
   * Check if stage has dependencies in the previous level
   */
  private hasDependencyInPreviousLevel(stage: StageConfig, previousLevel: StageConfig[]): boolean {
    return stage.dependencies.some(dep => previousLevel.some(s => s.id === dep));
  }

  /**
   * Calculate comprehensive pipeline metrics
   */
  private calculatePipelineMetrics(stages: StageExecution[], _config: PipelineConfig): PipelineMetrics {
    const successful = stages.filter(s => s.status === StageStatus.Success);
    const failed = stages.filter(s => s.status === StageStatus.Failed);
    const skipped = stages.filter(s => s.status === StageStatus.Skipped);

    const totalDuration = stages.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgStageDuration = stages.length > 0 ? totalDuration / stages.length : 0;

    // Find bottleneck (longest running stage)
    const bottleneck = stages.reduce((max, s) =>
      (s.duration || 0) > (max?.duration || 0) ? s : max
    );

    // Calculate resource utilization
    const metricsWithData = stages.filter(s => s.metrics);
    const avgCpu = metricsWithData.length > 0
      ? metricsWithData.reduce((sum, s) => sum + s.metrics!.cpuUsage, 0) / metricsWithData.length
      : 0;
    const avgMemory = metricsWithData.length > 0
      ? metricsWithData.reduce((sum, s) => sum + s.metrics!.memoryUsage, 0) / metricsWithData.length
      : 0;
    const peakCpu = Math.max(...metricsWithData.map(s => s.metrics!.cpuUsage), 0);
    const peakMemory = Math.max(...metricsWithData.map(s => s.metrics!.memoryUsage), 0);

    return {
      totalDuration,
      stageCount: stages.length,
      successCount: successful.length,
      failureCount: failed.length,
      skippedCount: skipped.length,
      averageStageDuration: avgStageDuration,
      bottleneckStage: bottleneck?.id,
      resourceUtilization: {
        avgCpu: Math.round(avgCpu),
        avgMemory: Math.round(avgMemory),
        peakCpu,
        peakMemory
      }
    };
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique result ID
   */
  private generateResultId(): string {
    return `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const simulationEngine = new SimulationEngine();

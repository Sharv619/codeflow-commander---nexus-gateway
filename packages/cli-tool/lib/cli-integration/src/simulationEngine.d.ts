import { PipelineConfig, SimulationResult } from './types.js';
/**
 * Advanced Simulation Engine for configurable CI/CD pipelines
 * Provides realistic simulation behaviors with probabilistic outcomes,
 * resource usage simulation, and comprehensive error handling.
 */
export declare class SimulationEngine {
    private context;
    /**
     * Execute a pipeline configuration with realistic simulation
     */
    executePipeline(config: PipelineConfig): Promise<SimulationResult>;
    /**
     * Validate environment variables for security
     */
    private validateEnvironmentVariables;
    /**
     * Validate pipeline configuration for security and correctness
     */
    private validatePipelineConfig;
    /**
     * Execute stages respecting dependencies and concurrency limits
     */
    private executeStagesWithDependencies;
    /**
     * Execute a single stage with realistic simulation
     */
    private executeStage;
    /**
     * Simulate realistic stage execution with probabilistic outcomes
     */
    private simulateStageExecution;
    /**
     * Calculate realistic stage duration based on configuration and mode
     */
    private calculateStageDuration;
    /**
     * Simulate resource usage for a stage
     */
    private simulateResourceUsage;
    /**
     * Simulate trigger stage (git push detection)
     */
    private simulateTriggerStage;
    /**
     * Simulate AI review stage
     */
    private simulateAiReviewStage;
    /**
     * Simulate Docker build stage
     */
    private simulateDockerBuildStage;
    /**
     * Sanitize input to prevent injection attacks
     */
    private sanitizeInput;
    /**
     * Simulate unit test stage
     */
    private simulateUnitTestStage;
    /**
     * Simulate deploy stage
     */
    private simulateDeployStage;
    /**
     * Simulate generic stage
     */
    private simulateGenericStage;
    /**
     * Build dependency graph from stage configurations
     */
    private buildDependencyGraph;
    /**
     * Resolve execution order respecting dependencies
     */
    private resolveExecutionOrder;
    /**
     * Check if stage can be executed (all dependencies completed)
     */
    private canExecuteStage;
    /**
     * Check if stage has dependencies in the previous level
     */
    private hasDependencyInPreviousLevel;
    /**
     * Calculate comprehensive pipeline metrics
     */
    private calculatePipelineMetrics;
    /**
     * Generate unique execution ID
     */
    private generateExecutionId;
    /**
     * Generate unique result ID
     */
    private generateResultId;
}
export declare const simulationEngine: SimulationEngine;

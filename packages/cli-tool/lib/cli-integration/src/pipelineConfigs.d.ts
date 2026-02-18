import { PipelineConfig } from './types.js';
/**
 * Pre-built pipeline configurations for common CI/CD scenarios
 * These can be used as templates or loaded directly for simulation
 */
export declare class PipelineConfigManager {
    /**
     * Get a basic Node.js CI/CD pipeline configuration
     */
    static getNodeJSPipeline(): PipelineConfig;
    /**
     * Get a comprehensive enterprise pipeline with advanced features
     */
    static getEnterprisePipeline(): PipelineConfig;
    /**
     * Get a fast pipeline for development/testing scenarios
     */
    static getFastPipeline(): PipelineConfig;
    /**
     * Get a chaotic pipeline for testing error handling
     */
    static getChaoticPipeline(): PipelineConfig;
    /**
     * Get a microservices pipeline with parallel execution
     */
    static getMicroservicesPipeline(): PipelineConfig;
    private static createTriggerStage;
    private static createAiReviewStage;
    private static createUnitTestStage;
    private static createDockerBuildStage;
    private static createDeployStage;
    private static createSecurityScanStage;
    private static createIntegrationTestStage;
    private static createPerformanceTestStage;
    private static createSecurityAuditStage;
    private static createDeployStagingStage;
    private static createE2eTestStage;
    private static createDeployProductionStage;
    /**
     * Load a pipeline configuration from JSON file
     */
    static loadFromFile(filePath: string): Promise<PipelineConfig>;
    /**
     * Save a pipeline configuration to JSON file
     */
    static saveToFile(config: PipelineConfig, filePath: string): Promise<void>;
    /**
     * Get all available pipeline templates
     */
    static getAvailableTemplates(): Array<{
        id: string;
        name: string;
        description: string;
        category: string;
    }>;
    /**
     * Get a pipeline configuration by ID
     */
    static getPipelineById(id: string): PipelineConfig | null;
}

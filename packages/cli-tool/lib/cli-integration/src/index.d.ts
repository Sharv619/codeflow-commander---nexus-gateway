#!/usr/bin/env node
/**
 * CLI Integration Service - Phase 4
 *
 * Bridges the local CLI commands with EKG backend services.
 * Transforms CLI operations from local processing to backend-driven workflows.
 *
 * Key transformations:
 * - `codeflow index` → EKG Ingestion Service webhook simulation
 * - `codeflow analyze-diff` → EKG Query Service context-enhanced analysis
 */
/**
 * CLI Integration Service
 * Provides methods that CLI commands can call to interact with EKG backend
 */
export declare class CLIIntegrationService {
    private config;
    private git;
    constructor();
    /**
     * Index repository for EKG - equivalent to `codeflow index`
     *
     * Sends repository URL to EKG Ingestion Service for analysis and graph population
     */
    indexRepository(options?: {
        repositoryUrl?: string;
        dryRun?: boolean;
    }): Promise<{
        success: boolean;
        repositoryId?: string;
        message: string;
        stats?: {
            indexedFiles: number;
            analysisTime: number;
            webhookAccepted: boolean;
        };
    }>;
    /**
     * Analyze code diff with EKG context enhancement
     *
     * Sends diff to Query Service for EKG-enhanced analysis instead of local RAG
     */
    analyzeDiff(diffContent: string, options?: {
        legacy?: boolean;
        outputFormat?: 'console' | 'json';
    }): Promise<{
        success: boolean;
        analysis: any;
        message: string;
        stats?: {
            ekg_queries: number;
            similar_repos_found: number;
            analysis_time: number;
        };
    }>;
    /**
     * Analyze diff content and extract structured information
     */
    private analyzeDiffContent;
    /**
     * Query EKG for context on affected files
     */
    private getEKGContext;
    /**
     * Generate enhanced analysis using EKG context
     */
    private generateEKGEnhancedAnalysis;
    /**
     * Get current repository information
     */
    private getRepositoryInfo;
    /**
     * Get list of files that would be indexed
     */
    private getIndexableFiles;
    /**
     * Make HTTP request to backend service with retry logic and security validation
     */
    private makeBackendRequest;
    /**
     * Validate URL to prevent SSRF attacks
     */
    private isValidUrl;
    /**
     * Sanitize headers to prevent header injection
     */
    private sanitizeHeaders;
    /**
     * Sanitize URL for logging to prevent log injection
     */
    private sanitizeUrlForLogging;
    /**
     * Make GraphQL request to Query Service
     */
    private makeGraphQLRequest;
    /**
     * Generate repository ID (similar to ingestion service)
     */
    private generateRepositoryId;
    /**
     * Get current user information
     */
    private getCurrentUser;
    /**
     * Detect language from file extension
     */
    private detectLanguage;
    /**
     * Format error for logging and display
     */
    private formatError;
}
export declare const cliIntegrationService: CLIIntegrationService;
export declare const indexProject: (options?: {
    repositoryUrl?: string;
    dryRun?: boolean;
}) => Promise<{
    success: boolean;
    repositoryId?: string;
    message: string;
    stats?: {
        indexedFiles: number;
        analysisTime: number;
        webhookAccepted: boolean;
    };
}>;
export declare const analyzeDiff: (diffContent: string, options?: {
    legacy?: boolean;
    outputFormat?: 'console' | 'json';
}) => Promise<{
    success: boolean;
    analysis: any;
    message: string;
    stats?: {
        ekg_queries: number;
        similar_repos_found: number;
        analysis_time: number;
    };
}>;
export default cliIntegrationService;

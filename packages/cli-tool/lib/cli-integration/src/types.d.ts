export declare enum StageStatus {
    Pending = "PENDING",
    Running = "RUNNING",
    Success = "SUCCESS",
    Failed = "FAILED",
    Skipped = "SKIPPED"
}
export declare enum SimulationMode {
    Realistic = "REALISTIC",
    Fast = "FAST",
    Deterministic = "DETERMINISTIC",
    Chaotic = "CHAOTIC"
}
export interface PipelineStageInfo {
    id: string;
    name: string;
    description: string;
}
export interface StageExecution {
    id: string;
    status: StageStatus;
    logs: string[];
    duration?: number;
    metrics?: StageMetrics;
    errors?: ErrorInfo[];
}
export interface CodeReviewIssue {
    line: number;
    type: string;
    description: string;
    link?: string;
}
export interface CodeReviewFileResult {
    fileName: string;
    status: 'PASS' | 'FAIL';
    score: number;
    issues: CodeReviewIssue[];
    suggestions: string[];
}
export interface CodeReviewResult {
    overallStatus: 'PASS' | 'FAIL';
    summary: string;
    files: CodeReviewFileResult[];
}
export interface RetryPolicy {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
}
export interface StageConfig {
    id: string;
    name: string;
    type: string;
    description: string;
    config: Record<string, any>;
    dependencies: string[];
    timeout: number;
    retryPolicy: RetryPolicy;
    successRate: number;
    durationRange: {
        min: number;
        max: number;
        baseMultiplier: number;
    };
    failureModes: FailureMode[];
}
export interface FailureMode {
    type: string;
    probability: number;
    message: string;
    recoverable: boolean;
    recoveryTime?: number;
}
export interface PipelineConfig {
    id: string;
    name: string;
    description: string;
    version: string;
    stages: StageConfig[];
    environment: Record<string, any>;
    settings: PipelineSettings;
    metadata: PipelineMetadata;
}
export interface PipelineSettings {
    mode: SimulationMode;
    maxConcurrency: number;
    failFast: boolean;
    enableMetrics: boolean;
    enableArtifacts: boolean;
    timeout: number;
}
export interface PipelineMetadata {
    author: string;
    created: string;
    updated: string;
    tags: string[];
    category: string;
}
export interface StageMetrics {
    cpuUsage: number;
    memoryUsage: number;
    networkIO: number;
    diskIO: number;
    duration: number;
    success: boolean;
}
export interface PipelineMetrics {
    totalDuration: number;
    stageCount: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    averageStageDuration: number;
    bottleneckStage?: string;
    resourceUtilization: {
        avgCpu: number;
        avgMemory: number;
        peakCpu: number;
        peakMemory: number;
    };
}
export interface ErrorInfo {
    type: string;
    message: string;
    timestamp: number;
    recoverable: boolean;
    context: Record<string, any>;
}
export interface SimulationResult {
    id: string;
    pipelineId: string;
    executionId: string;
    startTime: Date;
    endTime: Date;
    status: 'success' | 'failed' | 'partial' | 'cancelled';
    stages: StageExecution[];
    metrics: PipelineMetrics;
    artifacts: ArtifactInfo[];
    config: PipelineConfig;
    logs: string[];
}
export interface ArtifactInfo {
    name: string;
    type: string;
    size: number;
    path: string;
    metadata: Record<string, any>;
}
export interface SimulationContext {
    pipelineId: string;
    executionId: string;
    startTime: number;
    config: PipelineConfig;
    variables: Record<string, any>;
    artifacts: Map<string, ArtifactInfo>;
}

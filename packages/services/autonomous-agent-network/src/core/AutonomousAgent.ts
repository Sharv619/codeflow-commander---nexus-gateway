import { ChangeEvent, AnalysisContext, AgentResult, AgentConfig, ExecutionMetrics } from '../types/agent-types';

/**
 * Autonomous Agent Base Class
 * 
 * This abstract base class defines the common interface and lifecycle for all autonomous agents
 * in the Codeflow Commander system. Each agent type (Security, Quality, Architecture, Performance)
 * must extend this class and implement the required abstract methods.
 * 
 * Based on the specification in docs/AGENT_ORCHESTRATION.md
 */
export abstract class AutonomousAgent {
  // Core Properties
  protected readonly id: string;
  protected readonly type: AgentType;
  protected readonly version: string;
  protected readonly capabilities: AgentCapability[];
  protected readonly confidenceThreshold: number;
  
  // State Management
  protected isActive: boolean;
  protected lastExecutionTime: Date;
  protected executionCount: number;
  protected successRate: number;
  
  // Configuration
  protected readonly config: AgentConfig;
  protected readonly policies: AgentPolicy[];
  protected readonly dependencies: string[];

  /**
   * Constructor for AutonomousAgent
   * @param config Agent configuration object
   */
  constructor(config: AgentConfig) {
    this.id = config.id;
    this.type = config.type;
    this.version = config.version;
    this.capabilities = config.capabilities || [];
    this.confidenceThreshold = config.confidenceThreshold || 0.7;
    
    this.isActive = true;
    this.lastExecutionTime = new Date(0);
    this.executionCount = 0;
    this.successRate = 1.0;
    
    this.config = config;
    this.policies = config.policies || [];
    this.dependencies = config.dependencies || [];
  }

  /**
   * Abstract method: Analyze a change event and context
   * 
   * Each agent type must implement this method to provide specialized analysis
   * based on their domain expertise (security, quality, architecture, etc.)
   * 
   * @param change The change event to analyze
   * @param context The analysis context including file metadata and EKG relationships
   * @returns Promise resolving to AgentResult
   */
  abstract analyze(change: ChangeEvent, context: AnalysisContext): Promise<AgentResult>;

  /**
   * Abstract method: Get agent specialization
   * @returns The agent's specialization type
   */
  abstract getSpecialization(): AgentSpecialization;

  /**
   * Abstract method: Get agent priority
   * @returns The agent's execution priority
   */
  abstract getPriority(): AgentPriority;

  /**
   * Get the agent's unique identifier
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Get the agent's type
   */
  public getType(): AgentType {
    return this.type;
  }

  /**
   * Get the agent's current status
   */
  public isActiveAgent(): boolean {
    return this.isActive;
  }

  /**
   * Get the agent's last execution time
   */
  public getLastExecutionTime(): Date {
    return this.lastExecutionTime;
  }

  /**
   * Get the agent's execution count
   */
  public getExecutionCount(): number {
    return this.executionCount;
  }

  /**
   * Get the agent's success rate
   */
  public getSuccessRate(): number {
    return this.successRate;
  }

  /**
   * Get the agent's configuration
   */
  public getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Validate input change event
   * 
   * Performs basic validation on the change event before analysis
   * 
   * @param change The change event to validate
   * @returns Promise resolving to validation result
   */
  protected async validateInput(change: ChangeEvent): Promise<boolean> {
    try {
      // Basic validation checks
      if (!change.id || !change.file || !change.repository) {
        console.warn(`Agent ${this.id}: Invalid change event - missing required fields`);
        return false;
      }

      // Check if agent is active
      if (!this.isActive) {
        console.warn(`Agent ${this.id}: Attempted analysis on inactive agent`);
        return false;
      }

      // Check file type compatibility
      if (this.config.fileTypes && !this.config.fileTypes.includes(change.file.split('.').pop() || '')) {
        console.debug(`Agent ${this.id}: Skipping unsupported file type: ${change.file}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Agent ${this.id}: Error validating input:`, error);
      return false;
    }
  }

  /**
   * Apply agent policies to the analysis result
   * 
   * This method applies any configured policies to filter or modify the agent's suggestions
   * 
   * @param result The analysis result to apply policies to
   * @returns Promise resolving to policy-applied result
   */
  protected async applyPolicies(result: AgentResult): Promise<AgentResult> {
    try {
      let processedResult = { ...result };
      
      // Apply each configured policy
      for (const policy of this.policies) {
        processedResult = await this.applyPolicy(processedResult, policy);
      }
      
      return processedResult;
    } catch (error) {
      console.error(`Agent ${this.id}: Error applying policies:`, error);
      return result; // Return original result if policy application fails
    }
  }

  /**
   * Apply a single policy to the analysis result
   * 
   * @param result The current analysis result
   * @param policy The policy to apply
   * @returns Promise resolving to policy-applied result
   */
  private async applyPolicy(result: AgentResult, policy: AgentPolicy): Promise<AgentResult> {
    // Implementation depends on policy type
    switch (policy.type) {
      case 'confidence_threshold':
        return this.applyConfidenceThreshold(result, policy);
      case 'severity_filter':
        return this.applySeverityFilter(result, policy);
      case 'file_pattern_filter':
        return this.applyFilePatternFilter(result, policy);
      default:
        console.warn(`Agent ${this.id}: Unknown policy type: ${policy.type}`);
        return result;
    }
  }

  /**
   * Apply confidence threshold policy
   */
  private applyConfidenceThreshold(result: AgentResult, policy: AgentPolicy): AgentResult {
    const threshold = policy.config.threshold || this.confidenceThreshold;
    const filteredSuggestions = result.suggestions.filter(s => s.confidence >= threshold);
    
    return {
      ...result,
      suggestions: filteredSuggestions,
      metadata: {
        ...result.metadata,
        policiesApplied: [...(result.metadata.policiesApplied || []), policy.id]
      }
    };
  }

  /**
   * Apply severity filter policy
   */
  private applySeverityFilter(result: AgentResult, policy: AgentPolicy): AgentResult {
    const allowedSeverities = policy.config.severities || ['high', 'critical'];
    const filteredSuggestions = result.suggestions.filter(s => allowedSeverities.includes(s.severity));
    
    return {
      ...result,
      suggestions: filteredSuggestions,
      metadata: {
        ...result.metadata,
        policiesApplied: [...(result.metadata.policiesApplied || []), policy.id]
      }
    };
  }

  /**
   * Apply file pattern filter policy
   */
  private applyFilePatternFilter(result: AgentResult, policy: AgentPolicy): AgentResult {
    const patterns = policy.config.patterns || [];
    if (patterns.length === 0) return result;
    
    // This would typically be applied during input validation,
    // but kept here for policy framework completeness
    return result;
  }

  /**
   * Log execution metrics for monitoring and learning
   * 
   * @param metrics Execution metrics to log
   */
  protected async logExecution(metrics: ExecutionMetrics): Promise<void> {
    try {
      // Update internal state
      this.executionCount++;
      this.lastExecutionTime = new Date();
      
      // Calculate success rate (simplified logic)
      if (metrics.success) {
        this.successRate = Math.min(1.0, this.successRate + 0.01);
      } else {
        this.successRate = Math.max(0.0, this.successRate - 0.05);
      }
      
      // Log to monitoring system (implementation depends on monitoring setup)
      console.debug(`Agent ${this.id} execution:`, {
        executionTime: metrics.executionTime,
        suggestionsCount: metrics.suggestionsCount,
        success: metrics.success,
        successRate: this.successRate
      });
      
      // Could also send to metrics collection system here
      // await this.metricsCollector.recordAgentExecution(this.id, metrics);
    } catch (error) {
      console.error(`Agent ${this.id}: Error logging execution:`, error);
    }
  }

  /**
   * Get agent capabilities
   */
  public getCapabilities(): AgentCapability[] {
    return [...this.capabilities];
  }

  /**
   * Check if agent has a specific capability
   */
  public hasCapability(capability: AgentCapability): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Get agent dependencies
   */
  public getDependencies(): string[] {
    return [...this.dependencies];
  }

  /**
   * Check if agent depends on another agent
   */
  public dependsOn(agentId: string): boolean {
    return this.dependencies.includes(agentId);
  }

  /**
   * Activate the agent
   */
  public activate(): void {
    this.isActive = true;
    console.log(`Agent ${this.id} activated`);
  }

  /**
   * Deactivate the agent
   */
  public deactivate(): void {
    this.isActive = false;
    console.log(`Agent ${this.id} deactivated`);
  }

  /**
   * Get agent health status
   */
  public getHealthStatus(): AgentHealth {
    return {
      agentId: this.id,
      isActive: this.isActive,
      lastExecutionTime: this.lastExecutionTime,
      executionCount: this.executionCount,
      successRate: this.successRate,
      status: this.isActive ? 'healthy' : 'inactive'
    };
  }
}

// Type definitions (could be moved to a separate types file)
export type AgentType = 'security' | 'quality' | 'architecture' | 'performance';
export type AgentSpecialization = 'security_analysis' | 'code_quality' | 'architecture_analysis' | 'performance_analysis';
export type AgentCapability = 'static_analysis' | 'dependency_scanning' | 'pattern_detection' | 'performance_optimization';

export enum AgentPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4
}

export interface AgentPolicy {
  id: string;
  type: 'confidence_threshold' | 'severity_filter' | 'file_pattern_filter';
  config: any;
}

export interface AgentHealth {
  agentId: string;
  isActive: boolean;
  lastExecutionTime: Date;
  executionCount: number;
  successRate: number;
  status: 'healthy' | 'unhealthy' | 'inactive';
}
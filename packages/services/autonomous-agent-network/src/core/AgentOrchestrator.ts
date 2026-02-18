/**
 * Agent Orchestrator Implementation
 * 
 * Coordinates the execution of multiple autonomous agents for change analysis.
 * Implements the agent coordination logic as specified in docs/LOGIC_MAP_SECURITY_AGENT.md
 * 
 * Based on the specifications in docs/AGENT_ORCHESTRATION.md
 */

import { ChangeEvent, AnalysisContext, AgentResult, AgentPriority } from '../types/agent-types';
import { AutonomousAgent } from './AutonomousAgent';
import { ConsensusEngine } from './ConsensusEngine';
import { AgentRegistry } from '../types/agent-types';

/**
 * Agent Execution Plan
 */
interface AgentExecutionPlan {
  agents: AutonomousAgent[];
  executionOrder: AgentPriority[];
  dependencies: Map<string, string[]>;
  parallelGroups: string[][];
}

/**
 * Agent Orchestrator
 */
export class AgentOrchestrator {
  private registry: AgentRegistry;
  private consensusEngine: ConsensusEngine;
  private maxConcurrency: number;
  private timeout: number;

  constructor(registry: AgentRegistry, maxConcurrency: number = 4, timeout: number = 30000) {
    this.registry = registry;
    this.consensusEngine = new ConsensusEngine();
    this.maxConcurrency = maxConcurrency;
    this.timeout = timeout;
  }

  /**
   * Coordinate agents for change analysis
   */
  async coordinateAgents(change: ChangeEvent, context: AnalysisContext): Promise<AgentResult[]> {
    try {
      console.log(`AgentOrchestrator: Coordinating analysis for change ${change.id}`);

      // 1. Determine which agents to run based on file type and change characteristics
      const executionPlan = this.createExecutionPlan(change, context);
      
      // 2. Execute agents according to the plan
      const results = await this.executeAgents(executionPlan, change, context);
      
      // 3. Apply consensus protocol to resolve conflicts
      const consensusResults = await this.consensusEngine.applyConsensus(results, context);
      
      // 4. Log execution metrics
      await this.logExecutionMetrics(change, results, consensusResults);
      
      return consensusResults;
    } catch (error) {
      console.error(`AgentOrchestrator coordination failed:`, error);
      throw error;
    }
  }

  /**
   * Create execution plan based on change characteristics
   */
  private createExecutionPlan(change: ChangeEvent, context: AnalysisContext): AgentExecutionPlan {
    // Determine which agents are relevant for this change
    const relevantAgents = this.selectRelevantAgents(change, context);
    
    // Sort agents by priority
    const sortedAgents = this.sortAgentsByPriority(relevantAgents);
    
    // Create dependency graph
    const dependencies = this.createDependencyGraph(sortedAgents);
    
    // Group agents for parallel execution
    const parallelGroups = this.createParallelGroups(sortedAgents, dependencies);

    return {
      agents: sortedAgents,
      executionOrder: [AgentPriority.CRITICAL, AgentPriority.HIGH, AgentPriority.MEDIUM, AgentPriority.LOW],
      dependencies,
      parallelGroups
    };
  }

  /**
   * Select relevant agents based on file type and change characteristics
   */
  private selectRelevantAgents(change: ChangeEvent, context: AnalysisContext): AutonomousAgent[] {
    const relevantAgents: AutonomousAgent[] = [];
    
    // Get all registered agents
    const allAgents = this.registry.getAllAgents();
    
    for (const agent of allAgents) {
      // Check if agent is enabled and supports the file type
      if (!agent.isEnabled() || !this.supportsFileType(agent, change.file)) {
        continue;
      }

      // Check if agent should run based on change characteristics
      if (this.shouldAgentRun(agent, change, context)) {
        relevantAgents.push(agent);
      }
    }

    console.log(`AgentOrchestrator: Selected ${relevantAgents.length} agents for analysis`);
    return relevantAgents;
  }

  /**
   * Check if agent supports the given file type
   */
  private supportsFileType(agent: AutonomousAgent, filePath: string): boolean {
    const fileExtension = filePath.split('.').pop() || '';
    const supportedTypes = agent.getConfig().fileTypes;
    return supportedTypes.includes(fileExtension);
  }

  /**
   * Determine if agent should run based on change characteristics
   */
  private shouldAgentRun(agent: AutonomousAgent, change: ChangeEvent, context: AnalysisContext): boolean {
    // Security agent should run for all code changes
    if (agent.getType() === 'security') {
      return true;
    }

    // Quality agent should run for source code changes
    if (agent.getType() === 'quality' && this.isSourceCodeChange(change)) {
      return true;
    }

    // Architecture agent should run for structural changes
    if (agent.getType() === 'architecture' && this.isStructuralChange(change, context)) {
      return true;
    }

    // Performance agent should run for performance-critical files
    if (agent.getType() === 'performance' && this.isPerformanceCriticalChange(change, context)) {
      return true;
    }

    return false;
  }

  /**
   * Check if change is a source code change
   */
  private isSourceCodeChange(change: ChangeEvent): boolean {
    const sourceExtensions = ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'csharp', 'go', 'rust'];
    const fileExtension = change.file.split('.').pop() || '';
    return sourceExtensions.includes(fileExtension);
  }

  /**
   * Check if change is a structural change
   */
  private isStructuralChange(change: ChangeEvent, context: AnalysisContext): boolean {
    // Check if change affects dependencies or interfaces
    const isInterfaceChange = change.file.includes('interface') || 
                             change.file.includes('contract') ||
                             change.file.includes('api');
    
    const hasDependencies = context.ekdContext.dependencies.length > 0;
    
    return isInterfaceChange || hasDependencies;
  }

  /**
   * Check if change is performance-critical
   */
  private isPerformanceCriticalChange(change: ChangeEvent, context: AnalysisContext): boolean {
    // Check if change affects performance-critical files
    const isPerformanceFile = change.file.includes('performance') ||
                             change.file.includes('benchmark') ||
                             change.file.includes('optimization');
    
    // Check if file has high complexity
    const hasHighComplexity = context.fileMetadata.complexity === 'high' || 
                             context.fileMetadata.complexity === 'critical';
    
    return isPerformanceFile || hasHighComplexity;
  }

  /**
   * Sort agents by priority
   */
  private sortAgentsByPriority(agents: AutonomousAgent[]): AutonomousAgent[] {
    return agents.sort((a, b) => {
      const priorityA = a.getPriority();
      const priorityB = b.getPriority();
      
      // Higher priority (lower number) comes first
      if (priorityA < priorityB) return -1;
      if (priorityA > priorityB) return 1;
      
      // If priorities are equal, sort by agent ID for consistency
      return a.getId().localeCompare(b.getId());
    });
  }

  /**
   * Create dependency graph between agents
   */
  private createDependencyGraph(agents: AutonomousAgent[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    // Security agent has no dependencies and should run first
    const securityAgent = agents.find(a => a.getType() === 'security');
    if (securityAgent) {
      dependencies.set(securityAgent.getId(), []);
    }
    
    // Quality agent may depend on security analysis
    const qualityAgent = agents.find(a => a.getType() === 'quality');
    if (qualityAgent) {
      dependencies.set(qualityAgent.getId(), securityAgent ? [securityAgent.getId()] : []);
    }
    
    // Architecture agent may depend on quality analysis
    const architectureAgent = agents.find(a => a.getType() === 'architecture');
    if (architectureAgent) {
      const deps: string[] = [];
      if (qualityAgent) deps.push(qualityAgent.getId());
      if (securityAgent) deps.push(securityAgent.getId());
      dependencies.set(architectureAgent.getId(), deps);
    }
    
    // Performance agent may depend on architecture analysis
    const performanceAgent = agents.find(a => a.getType() === 'performance');
    if (performanceAgent) {
      const deps: string[] = [];
      if (architectureAgent) deps.push(architectureAgent.getId());
      if (qualityAgent) deps.push(qualityAgent.getId());
      dependencies.set(performanceAgent.getId(), deps);
    }
    
    return dependencies;
  }

  /**
   * Create parallel execution groups
   */
  private createParallelGroups(agents: AutonomousAgent[], dependencies: Map<string, string[]>): string[][] {
    const groups: string[][] = [];
    const agentIds = agents.map(a => a.getId());
    const processed = new Set<string>();
    
    while (processed.size < agentIds.length) {
      const currentGroup: string[] = [];
      
      for (const agentId of agentIds) {
        if (processed.has(agentId)) continue;
        
        const deps = dependencies.get(agentId) || [];
        const canExecute = deps.every(dep => processed.has(dep));
        
        if (canExecute) {
          currentGroup.push(agentId);
          processed.add(agentId);
        }
      }
      
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      } else {
        // Circular dependency detected
        throw new Error('Circular dependency detected in agent execution plan');
      }
    }
    
    return groups;
  }

  /**
   * Execute agents according to the execution plan
   */
  private async executeAgents(
    executionPlan: AgentExecutionPlan, 
    change: ChangeEvent, 
    context: AnalysisContext
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const agentMap = new Map(executionPlan.agents.map(agent => [agent.getId(), agent]));
    
    // Execute agents in parallel groups
    for (const group of executionPlan.parallelGroups) {
      console.log(`AgentOrchestrator: Executing group: ${group.join(', ')}`);
      
      const groupPromises = group.map(async (agentId) => {
        const agent = agentMap.get(agentId);
        if (!agent) {
          throw new Error(`Agent ${agentId} not found in registry`);
        }
        
        try {
          const result = await this.executeAgentWithTimeout(agent, change, context);
          console.log(`AgentOrchestrator: ${agentId} completed successfully`);
          return result;
        } catch (error) {
          console.error(`AgentOrchestrator: ${agentId} failed:`, error);
          throw error;
        }
      });
      
      const groupResults = await Promise.all(groupPromises);
      results.push(...groupResults);
    }
    
    return results;
  }

  /**
   * Execute a single agent with timeout
   */
  private async executeAgentWithTimeout(
    agent: AutonomousAgent, 
    change: ChangeEvent, 
    context: AnalysisContext
  ): Promise<AgentResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Agent ${agent.getId()} timed out after ${this.timeout}ms`));
      }, this.timeout);

      agent.analyze(change, context)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Log execution metrics
   */
  private async logExecutionMetrics(
    change: ChangeEvent, 
    results: AgentResult[], 
    consensusResults: AgentResult[]
  ): Promise<void> {
    const totalExecutionTime = results.reduce((sum, result) => sum + result.executionTime, 0);
    const totalSuggestions = results.reduce((sum, result) => sum + result.suggestions.length, 0);
    const consensusSuggestions = consensusResults.reduce((sum, result) => sum + result.suggestions.length, 0);
    
    console.log(`AgentOrchestrator: Execution completed`);
    console.log(`  Change ID: ${change.id}`);
    console.log(`  Total execution time: ${totalExecutionTime}ms`);
    console.log(`  Total suggestions: ${totalSuggestions}`);
    console.log(`  Consensus suggestions: ${consensusSuggestions}`);
    console.log(`  Agent results: ${results.length}`);
    console.log(`  Consensus results: ${consensusResults.length}`);
  }

  /**
   * Get agent execution statistics
   */
  async getExecutionStats(): Promise<{
    totalExecutions: number;
    averageExecutionTime: number;
    successRate: number;
    agentStats: Map<string, { executions: number; averageTime: number; successRate: number }>;
  }> {
    return this.consensusEngine.getExecutionStats();
  }

  /**
   * Health check for the orchestrator
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    activeAgents: number;
    pendingExecutions: number;
    lastExecutionTime: Date | null;
  }> {
    const allAgents = this.registry.getAllAgents();
    const activeAgents = allAgents.filter(a => a.isEnabled()).length;
    
    return {
      status: activeAgents > 0 ? 'healthy' : 'unhealthy',
      activeAgents,
      pendingExecutions: 0, // Would track from a queue if implemented
      lastExecutionTime: new Date() // Would track actual last execution
    };
  }
}
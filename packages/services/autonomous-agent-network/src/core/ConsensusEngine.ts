/**
 * Consensus Engine Implementation
 * 
 * Implements conflict resolution and consensus protocol for autonomous agents.
 * Resolves conflicting opinions between agents using authority-based, evidence-based,
 * and consensus-based resolution strategies.
 * 
 * Based on the specifications in docs/LOGIC_MAP_SECURITY_AGENT.md
 */

import { AgentResult, AgentSuggestion, AgentType, ConflictSeverity, ResolutionStrategy, AnalysisDepth } from '../types/agent-types';
import { AnalysisContext } from '../types/agent-types';

/**
 * Conflict Resolution Result
 */
interface ConflictResolution {
  resolvedSuggestion: AgentSuggestion;
  resolutionStrategy: ResolutionStrategy;
  justification: string;
  confidence: number;
}

/**
 * Consensus Engine
 */
export class ConsensusEngine {
  private executionStats: {
    totalExecutions: number;
    totalConflicts: number;
    resolvedConflicts: number;
    unresolvedConflicts: number;
    averageResolutionTime: number;
  };

  constructor() {
    this.executionStats = {
      totalExecutions: 0,
      totalConflicts: 0,
      resolvedConflicts: 0,
      unresolvedConflicts: 0,
      averageResolutionTime: 0
    };
  }

  /**
   * Apply consensus protocol to resolve conflicts
   */
  async applyConsensus(results: AgentResult[], context: AnalysisContext): Promise<AgentResult[]> {
    const startTime = Date.now();
    
    try {
      console.log(`ConsensusEngine: Applying consensus to ${results.length} agent results`);
      
      // 1. Group suggestions by similarity
      const groupedSuggestions = this.groupSimilarSuggestions(results);
      
      // 2. Resolve conflicts within each group
      const resolvedResults: AgentResult[] = [];
      
      for (const group of groupedSuggestions) {
        if (group.length === 1) {
          // No conflict, accept suggestion as-is
          resolvedResults.push(group[0]);
        } else {
          // Conflict detected, resolve it
          const resolvedResult = await this.resolveConflict(group, context);
          resolvedResults.push(resolvedResult);
        }
      }
      
      // 3. Calculate consensus metrics
      const consensusLevel = this.calculateConsensusLevel(results, resolvedResults);
      
      // 4. Log execution metrics
      const executionTime = Date.now() - startTime;
      this.updateExecutionStats(executionTime, results.length, resolvedResults.length);
      
      console.log(`ConsensusEngine: Consensus applied successfully`);
      console.log(`  Original suggestions: ${results.length}`);
      console.log(`  Resolved suggestions: ${resolvedResults.length}`);
      console.log(`  Consensus level: ${consensusLevel.toFixed(2)}`);
      console.log(`  Execution time: ${executionTime}ms`);
      
      return resolvedResults;
    } catch (error) {
      console.error(`ConsensusEngine: Consensus application failed:`, error);
      throw error;
    }
  }

  /**
   * Group similar suggestions together
   */
  private groupSimilarSuggestions(results: AgentResult[]): AgentResult[][] {
    const groups: AgentResult[][] = [];
    const processed = new Set<string>();
    
    for (const result of results) {
      if (processed.has(result.agentId)) continue;
      
      const similarGroup: AgentResult[] = [result];
      processed.add(result.agentId);
      
      // Find similar suggestions from other agents
      for (const otherResult of results) {
        if (processed.has(otherResult.agentId)) continue;
        
        if (this.areSuggestionsSimilar(result, otherResult)) {
          similarGroup.push(otherResult);
          processed.add(otherResult.agentId);
        }
      }
      
      if (similarGroup.length > 0) {
        groups.push(similarGroup);
      }
    }
    
    return groups;
  }

  /**
   * Check if two agent results contain similar suggestions
   */
  private areSuggestionsSimilar(result1: AgentResult, result2: AgentResult): boolean {
    // Check if both results have suggestions
    if (result1.suggestions.length === 0 || result2.suggestions.length === 0) {
      return false;
    }
    
    // Compare the first suggestion from each result
    const suggestion1 = result1.suggestions[0];
    const suggestion2 = result2.suggestions[0];
    
    if (!suggestion1 || !suggestion2) {
      return false;
    }
    
    // Check similarity based on title and description
    const titleSimilarity = this.calculateStringSimilarity(suggestion1.title, suggestion2.title);
    const descriptionSimilarity = this.calculateStringSimilarity(suggestion1.description, suggestion2.description);
    
    // Consider suggestions similar if both title and description have high similarity
    return titleSimilarity > 0.7 && descriptionSimilarity > 0.7;
  }

  /**
   * Calculate string similarity using Jaccard similarity coefficient
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Resolve conflict between agent suggestions
   */
  private async resolveConflict(group: AgentResult[], context: AnalysisContext): Promise<AgentResult> {
    this.executionStats.totalConflicts++;
    
    console.log(`ConsensusEngine: Resolving conflict between ${group.length} agents`);
    
    // 1. Determine conflict type and severity
    const conflictType = this.determineConflictType(group);
    const conflictSeverity = this.determineConflictSeverity(group);
    
    // 2. Apply resolution strategy based on conflict characteristics
    let resolution: ConflictResolution;
    
    if (conflictSeverity === 'critical' || this.hasSecurityAgent(group)) {
      // Authority-based resolution for critical conflicts or security issues
      resolution = this.resolveAuthorityBased(group, conflictType);
    } else if (conflictType === 'semantic') {
      // Evidence-based resolution for semantic conflicts
      resolution = await this.resolveEvidenceBased(group, context);
    } else {
      // Consensus-based resolution for implementation conflicts
      resolution = this.resolveConsensusBased(group);
    }
    
    // 3. Create resolved result
    const resolvedResult: AgentResult = {
      agentId: 'consensus-engine',
      agentType: 'consensus' as AgentType,
      timestamp: new Date(),
      suggestions: [resolution.resolvedSuggestion],
      metadata: {
        analysisDepth: AnalysisDepth.DEEP,
        contextUsed: ['dependencies', 'owners', 'risk_factors'],
        dependenciesAnalyzed: context.ekdContext.dependencies.map(d => d.target.path),
        policiesApplied: ['consensus_protocol'],
        executionMetrics: {
          executionTime: 0,
          suggestionsCount: 1,
          success: true
        }
      },
      executionTime: 0,
      confidence: resolution.confidence
    };
    
    this.executionStats.resolvedConflicts++;
    
    console.log(`ConsensusEngine: Conflict resolved using ${resolution.resolutionStrategy.type} strategy`);
    console.log(`  Justification: ${resolution.justification}`);
    console.log(`  Confidence: ${resolution.confidence}`);
    
    return resolvedResult;
  }

  /**
   * Determine conflict type
   */
  private determineConflictType(group: AgentResult[]): 'semantic' | 'implementation' {
    // Check if suggestions have different reasoning but similar intent
    const suggestions = group.flatMap(r => r.suggestions);
    
    if (suggestions.length < 2) {
      return 'implementation';
    }
    
    const firstSuggestion = suggestions[0];
    if (!firstSuggestion) {
      return 'implementation';
    }
    
    const hasDifferentReasoning = suggestions.some(s => s.reasoning !== firstSuggestion.reasoning);
    const hasSimilarIntent = suggestions.every(s => 
      s && this.calculateStringSimilarity(s.title, firstSuggestion.title) > 0.5
    );
    
    return hasDifferentReasoning && hasSimilarIntent ? 'semantic' : 'implementation';
  }

  /**
   * Determine conflict severity
   */
  private determineConflictSeverity(group: AgentResult[]): ConflictSeverity {
    const severityOrder: { [key: string]: number } = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    
    const maxSeverity = group.reduce((max, result) => {
      const suggestionSeverity = result.suggestions[0]?.severity || 'low';
      return severityOrder[suggestionSeverity] > severityOrder[max] ? suggestionSeverity : max;
    }, 'low');
    
    return maxSeverity as ConflictSeverity;
  }

  /**
   * Check if security agent is in the conflict group
   */
  private hasSecurityAgent(group: AgentResult[]): boolean {
    return group.some(result => result.agentType === 'security');
  }

  /**
   * Resolve conflict using authority-based strategy
   */
  private resolveAuthorityBased(group: AgentResult[], conflictType: 'semantic' | 'implementation'): ConflictResolution {
    // Security agent has highest authority for security issues
    const securityAgent = group.find(r => r.agentType === 'security');
    if (securityAgent) {
      return {
        resolvedSuggestion: securityAgent.suggestions[0],
        resolutionStrategy: {
          type: 'authority_based',
          details: { authorityAgent: 'security-agent' }
        },
        justification: 'Security agent has highest authority for security-related conflicts',
        confidence: securityAgent.confidence
      };
    }
    
    // Architecture agent has authority for structural conflicts
    const architectureAgent = group.find(r => r.agentType === 'architecture');
    if (architectureAgent && conflictType === 'semantic') {
      return {
        resolvedSuggestion: architectureAgent.suggestions[0],
        resolutionStrategy: {
          type: 'authority_based',
          details: { authorityAgent: 'architecture-agent' }
        },
        justification: 'Architecture agent has authority for structural and semantic conflicts',
        confidence: architectureAgent.confidence
      };
    }
    
    // Default to highest confidence agent
    const highestPriorityAgent = group.reduce((prev, current) => 
      prev.confidence > current.confidence ? prev : current
    );
    
    return {
      resolvedSuggestion: highestPriorityAgent.suggestions[0],
      resolutionStrategy: {
        type: 'authority_based',
        details: { authorityAgent: highestPriorityAgent.agentId }
      },
      justification: `Agent ${highestPriorityAgent.agentId} has highest confidence`,
      confidence: highestPriorityAgent.confidence
    };
  }

  /**
   * Resolve conflict using evidence-based strategy
   */
  private async resolveEvidenceBased(group: AgentResult[], context: AnalysisContext): Promise<ConflictResolution> {
    // Analyze evidence from context and agent reasoning
    const evidenceScores = new Map<string, number>();
    
    for (const result of group) {
      let evidenceScore = 0;
      
      // Score based on reasoning quality
      const reasoning = result.suggestions[0]?.reasoning || '';
      if (reasoning.length > 50) evidenceScore += 0.2;
      if (reasoning.includes('context') || reasoning.includes('dependencies')) evidenceScore += 0.3;
      
      // Score based on context alignment
      const contextAlignment = this.calculateContextAlignment(result, context);
      evidenceScore += contextAlignment * 0.5;
      
      // Score based on agent confidence
      evidenceScore += result.confidence * 0.3;
      
      evidenceScores.set(result.agentId, evidenceScore);
    }
    
    // Select agent with highest evidence score
    const bestAgentId = Array.from(evidenceScores.entries())
      .reduce((prev, current) => prev[1] > current[1] ? prev : current)[0];
    
    const bestAgent = group.find(r => r.agentId === bestAgentId);
    if (!bestAgent) {
      throw new Error('Best agent not found');
    }
    
    return {
      resolvedSuggestion: bestAgent.suggestions[0],
      resolutionStrategy: {
        type: 'evidence_based',
        details: { evidenceScores: Object.fromEntries(evidenceScores) }
      },
      justification: `Agent ${bestAgentId} provided strongest evidence-based reasoning`,
      confidence: bestAgent.confidence
    };
  }

  /**
   * Calculate how well an agent's suggestion aligns with the context
   */
  private calculateContextAlignment(result: AgentResult, context: AnalysisContext): number {
    const suggestion = result.suggestions[0];
    let alignmentScore = 0;
    
    // Check if suggestion addresses context dependencies
    const hasDependencyContext = suggestion.reasoning.includes('dependency') ||
                                suggestion.reasoning.includes('import') ||
                                suggestion.reasoning.includes('module');
    
    if (hasDependencyContext && context.ekdContext.dependencies.length > 0) {
      alignmentScore += 0.3;
    }
    
    // Check if suggestion considers file metadata
    const hasMetadataContext = suggestion.reasoning.includes('complexity') ||
                              suggestion.reasoning.includes('test') ||
                              suggestion.reasoning.includes('coverage');
    
    if (hasMetadataContext) {
      alignmentScore += 0.2;
    }
    
    // Check if suggestion aligns with repository policies
    const hasPolicyAlignment = suggestion.reasoning.includes('policy') ||
                              suggestion.reasoning.includes('standard') ||
                              suggestion.reasoning.includes('best practice');
    
    if (hasPolicyAlignment) {
      alignmentScore += 0.2;
    }
    
    return Math.min(alignmentScore, 1.0);
  }

  /**
   * Resolve conflict using consensus-based strategy
   */
  private resolveConsensusBased(group: AgentResult[]): ConflictResolution {
    // Count votes for each suggestion type
    const suggestionCounts = new Map<string, { count: number; result: AgentResult }>();
    
    for (const result of group) {
      const suggestion = result.suggestions[0];
      const key = `${suggestion.title}-${suggestion.severity}`;
      
      if (suggestionCounts.has(key)) {
        suggestionCounts.get(key)!.count++;
      } else {
        suggestionCounts.set(key, { count: 1, result });
      }
    }
    
    // Find suggestion with most votes
    let maxVotes = 0;
    let winningResult: AgentResult | undefined = undefined;
    
    for (const [, data] of suggestionCounts.entries()) {
      if (data.count > maxVotes) {
        maxVotes = data.count;
        winningResult = data.result;
      }
    }
    
    if (!winningResult) {
      // Fallback to first result if no consensus
      winningResult = group[0];
    }
    
    const consensusRatio = maxVotes / group.length;
    const confidence = winningResult.confidence * consensusRatio;
    
    return {
      resolvedSuggestion: winningResult.suggestions[0]!,
      resolutionStrategy: {
        type: 'consensus_based',
        details: { votes: maxVotes, totalAgents: group.length, consensusRatio }
      },
      justification: `Consensus reached with ${maxVotes}/${group.length} agents agreeing`,
      confidence
    };
  }

  /**
   * Calculate consensus level across all results
   */
  private calculateConsensusLevel(originalResults: AgentResult[], resolvedResults: AgentResult[]): number {
    if (originalResults.length === 0) return 1.0;
    
    const originalSuggestions = originalResults.flatMap(r => r.suggestions);
    const resolvedSuggestions = resolvedResults.flatMap(r => r.suggestions);
    
    // Calculate agreement ratio
    const agreementRatio = resolvedSuggestions.length / originalSuggestions.length;
    
    // Calculate confidence-weighted consensus
    const totalConfidence = originalResults.reduce((sum, result) => sum + result.confidence, 0);
    const averageConfidence = totalConfidence / originalResults.length;
    
    return agreementRatio * averageConfidence;
  }

  /**
   * Update execution statistics
   */
  private updateExecutionStats(executionTime: number, originalCount: number, resolvedCount: number): void {
    this.executionStats.totalExecutions++;
    
    const conflicts = originalCount - resolvedCount;
    if (conflicts > 0) {
      this.executionStats.totalConflicts += conflicts;
    }
    
    // Update average execution time
    const totalTime = this.executionStats.averageResolutionTime * (this.executionStats.totalExecutions - 1);
    this.executionStats.averageResolutionTime = (totalTime + executionTime) / this.executionStats.totalExecutions;
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    averageExecutionTime: number;
    successRate: number;
    agentStats: Map<string, { executions: number; averageTime: number; successRate: number }>;
  } {
    const successRate = this.executionStats.totalExecutions > 0 
      ? (this.executionStats.resolvedConflicts / this.executionStats.totalConflicts) 
      : 1.0;
    
    return {
      totalExecutions: this.executionStats.totalExecutions,
      averageExecutionTime: this.executionStats.averageResolutionTime,
      successRate,
      agentStats: new Map() // Would track individual agent stats if needed
    };
  }

  /**
   * Health check for the consensus engine
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    totalConflicts: number;
    resolvedConflicts: number;
    unresolvedConflicts: number;
    averageResolutionTime: number;
  }> {
    const unresolvedConflicts = this.executionStats.totalConflicts - this.executionStats.resolvedConflicts;
    const status = unresolvedConflicts === 0 ? 'healthy' : 'unhealthy';
    
    return {
      status,
      totalConflicts: this.executionStats.totalConflicts,
      resolvedConflicts: this.executionStats.resolvedConflicts,
      unresolvedConflicts,
      averageResolutionTime: this.executionStats.averageResolutionTime
    };
  }
}
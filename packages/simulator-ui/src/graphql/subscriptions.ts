import { gql } from '@apollo/client';

// Agent Status Update Subscription
export const AGENT_STATUS_UPDATE_SUBSCRIPTION = gql`
  subscription AgentStatusUpdate {
    agentStatusUpdate {
      id
      name
      type
      status
      lastActive
      currentTask
      successRate
      suggestionsCount
      configuration {
        enabled
        confidenceThreshold
        rateLimit
      }
    }
  }
`;

// Repository Health Update Subscription
export const REPOSITORY_HEALTH_UPDATE_SUBSCRIPTION = gql`
  subscription RepositoryHealthUpdate($repositoryId: ID!) {
    repositoryHealthUpdate(repositoryId: $repositoryId) {
      repositoryId
      health {
        techDebtScore
        testCoverage
        securityPosture
        vulnerabilityCount
        codeComplexity
      }
      lastUpdated
    }
  }
`;

// Graph Statistics Update Subscription
export const GRAPH_STATISTICS_UPDATE_SUBSCRIPTION = gql`
  subscription GraphStatisticsUpdate {
    graphStatisticsUpdate {
      nodeCount
      edgeCount
      coverage
      lastUpdated
      repositories {
        id
        name
        health {
          techDebtScore
          testCoverage
          securityPosture
          vulnerabilityCount
        }
      }
    }
  }
`;

// Agent Recommendation Subscription
export const AGENT_RECOMMENDATION_SUBSCRIPTION = gql`
  subscription AgentRecommendation {
    agentRecommendation {
      id
      repositoryId
      agentType
      title
      description
      severity
      confidence
      status
      createdAt
      reasoning
      codePatch {
        file
        originalCode
        suggestedCode
        lineNumber
      }
    }
  }
`;

// Pipeline Simulation Update Subscription
export const PIPELINE_SIMULATION_UPDATE_SUBSCRIPTION = gql`
  subscription PipelineSimulationUpdate($executionId: ID!) {
    pipelineSimulationUpdate(executionId: $executionId) {
      executionId
      stageId
      status
      progress
      logs
      error
      duration
    }
  }
`;

// System Health Subscription
export const SYSTEM_HEALTH_SUBSCRIPTION = gql`
  subscription SystemHealth {
    systemHealth {
      backendStatus
      frontendStatus
      databaseStatus
      lastCheck
      issues
    }
  }
`;
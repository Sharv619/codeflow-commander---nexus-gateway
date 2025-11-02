import { gql } from '@apollo/client';

// Agent Recommendation Subscription
export const AGENT_RECOMMENDATION_SUBSCRIPTION = gql`
  subscription OnAgentRecommendation {
    agentRecommendation {
      id
      title
      description
      agentType
      severity
      confidence
      status
      createdAt
      repository {
        id
        name
      }
      codePatch {
        file
        originalCode
        suggestedCode
        lineNumber
      }
      reasoning
      validationResults {
        testsPass
        securityScanPass
        performanceImpact
      }
      metadata {
        analysisTime
        filesAffected
        complexity
      }
    }
  }
`;

// Agent Status Update Subscription
export const AGENT_STATUS_UPDATE_SUBSCRIPTION = gql`
  subscription OnAgentStatusUpdate {
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
        scope
      }
    }
  }
`;

// Repository Health Update Subscription
export const REPOSITORY_HEALTH_UPDATE_SUBSCRIPTION = gql`
  subscription OnRepositoryHealthUpdate($repositoryId: ID!) {
    repositoryHealthUpdate(repositoryId: $repositoryId) {
      id
      name
      health {
        techDebtScore
        testCoverage
        securityPosture
        vulnerabilityCount
      }
      agentActivity {
        suggestionsCount
        acceptedSuggestions
        pendingReviews
      }
      dependencies {
        name
        version
        vulnerabilities
        outdated
      }
      metadata {
        lastAnalyzed
        totalCommits
        activeBranches
        contributors
      }
    }
  }
`;

// Graph Statistics Update Subscription
export const GRAPH_STATISTICS_UPDATE_SUBSCRIPTION = gql`
  subscription OnGraphStatisticsUpdate {
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
        agentActivity {
          suggestionsCount
          acceptedSuggestions
          pendingReviews
        }
        dependencies {
          name
          version
          vulnerabilities
          outdated
        }
        metadata {
          lastAnalyzed
          totalCommits
          activeBranches
          contributors
        }
      }
      nodes {
        id
        label
        type
        data {
          team
          language
          version
          health
          vulnerabilities
        }
      }
      edges {
        id
        source
        target
        type
        weight
      }
    }
  }
`;

// Pipeline Simulation Update Subscription
export const PIPELINE_SIMULATION_UPDATE_SUBSCRIPTION = gql`
  subscription OnPipelineSimulationUpdate($simulationId: ID!) {
    pipelineSimulationUpdate(simulationId: $simulationId) {
      id
      status
      pipelineConfig
      results {
        stage
        status
        duration
        output
        errors
      }
      metrics {
        totalDuration
        successRate
        resourceUsage
        costEstimate
      }
      createdAt
      completedAt
      updatedAt
    }
  }
`;

// System Health Subscription
export const SYSTEM_HEALTH_SUBSCRIPTION = gql`
  subscription OnSystemHealthUpdate {
    systemHealthUpdate {
      timestamp
      status
      services {
        name
        status
        responseTime
        lastChecked
        errorMessage
      }
      metrics {
        activeUsers
        totalRepositories
        activeAgents
        pendingAnalyses
        systemLoad
      }
      alerts {
        id
        level
        message
        timestamp
        resolved
      }
    }
  }
`;

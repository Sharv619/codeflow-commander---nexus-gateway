import { gql } from '@apollo/client';

// Repository Intelligence Query
export const GET_REPOSITORY_INTELLIGENCE = gql`
  query GetRepositoryIntelligence($repositoryId: ID!) {
    repositoryIntelligence(repositoryId: $repositoryId) {
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

// Agent Analyses Query
export const GET_AGENT_ANALYSES = gql`
  query GetAgentAnalyses($repositoryId: ID, $status: AnalysisStatus, $limit: Int, $offset: Int) {
    agentAnalyses(repositoryId: $repositoryId, status: $status, limit: $limit, offset: $offset) {
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

// Graph Statistics Query
export const GET_GRAPH_STATISTICS = gql`
  query GetGraphStatistics {
    graphStatistics {
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

// Agent Status Query
export const GET_AGENT_STATUS = gql`
  query GetAgentStatus {
    agentStatus {
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

// User Profile Query
export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: ID!) {
    userProfile(userId: $userId) {
      id
      name
      role
      email
      avatar
      preferences {
        theme
        notifications
        language
      }
      repositories {
        id
        name
        role
        lastActivity
      }
      statistics {
        totalSuggestions
        acceptedSuggestions
        pendingReviews
        codeQualityScore
      }
    }
  }
`;

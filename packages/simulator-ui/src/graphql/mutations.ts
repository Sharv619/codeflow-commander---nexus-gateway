import { gql } from '@apollo/client';

// Submit Agent Feedback Mutation
export const SUBMIT_AGENT_FEEDBACK = gql`
  mutation SubmitAgentFeedback($input: AgentFeedbackInput!) {
    submitAgentFeedback(input: $input) {
      success
      message
      analysis {
        id
        status
        feedback {
          action
          reason
          submittedAt
          submittedBy
        }
      }
    }
  }
`;

// Update Agent Configuration Mutation
export const UPDATE_AGENT_CONFIGURATION = gql`
  mutation UpdateAgentConfiguration($input: AgentConfigurationInput!) {
    updateAgentConfiguration(input: $input) {
      success
      message
      configuration {
        id
        agentType
        enabled
        confidenceThreshold
        autoApplyThreshold
        rateLimit {
          suggestionsPerHour
          suggestionsPerDay
        }
        scope {
          includePatterns
          excludePatterns
        }
        updatedAt
        updatedBy
      }
    }
  }
`;

// Trigger Agent Analysis Mutation
export const TRIGGER_AGENT_ANALYSIS = gql`
  mutation TriggerAgentAnalysis($input: AgentAnalysisTriggerInput!) {
    triggerAgentAnalysis(input: $input) {
      success
      message
      analysis {
        id
        agentType
        status
        repository {
          id
          name
        }
        createdAt
        estimatedCompletion
      }
    }
  }
`;

// Update User Preferences Mutation
export const UPDATE_USER_PREFERENCES = gql`
  mutation UpdateUserPreferences($input: UserPreferencesInput!) {
    updateUserPreferences(input: $input) {
      success
      message
      preferences {
        theme
        notifications
        language
        dashboardLayout
        defaultView
      }
    }
  }
`;

// Create Repository Bookmark Mutation
export const CREATE_REPOSITORY_BOOKMARK = gql`
  mutation CreateRepositoryBookmark($input: RepositoryBookmarkInput!) {
    createRepositoryBookmark(input: $input) {
      success
      message
      bookmark {
        id
        repositoryId
        userId
        name
        createdAt
      }
    }
  }
`;

// Run Pipeline Simulation Mutation
export const RUN_PIPELINE_SIMULATION = gql`
  mutation RunPipelineSimulation($input: PipelineSimulationInput!) {
    runPipelineSimulation(input: $input) {
      success
      message
      simulation {
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
      }
    }
  }
`;

import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client';
import { Observable } from '@apollo/client/utilities';

// Mock data for when GraphQL server is not available
const mockResolvers = {
  Query: {
    repositoryIntelligence: () => ({
      repository: { id: 'repo-1', name: 'codeflow-commander', language: 'TypeScript' },
      healthMetrics: { techDebt: 23, testCoverage: 87, securityScore: 85 }
    }),
    graphStatistics: () => ({
      repositoryCount: 42,
      teamCount: 8,
      patternCount: 156
    }),
    agentAnalyses: () => ([
      { id: 'analysis-1', agentId: 'security-agent', status: 'COMPLETED', findings: [{ message: 'No security issues found' }] }
    ])
  },
  Mutation: {
    submitAgentFeedback: () => ({ success: true }),
    updateAgentConfiguration: () => ({ success: true })
  }
};

// Use mock link when GraphQL server is not available
const mockLink = new ApolloLink((operation, forward) => {
  return new Observable(observer => {
    console.log(`[MOCK] GraphQL operation: ${operation.operationName}`);

    // Simulate network delay
    setTimeout(() => {
      try {
        // Simple mock responses based on operation name
        let mockData;
        switch (operation.operationName) {
          case 'GetRepositoryIntelligence':
            mockData = {
              repositoryIntelligence: {
                repository: { id: 'repo-1', name: 'codeflow-commander', language: 'TypeScript' },
                healthMetrics: { techDebt: 23, testCoverage: 87, securityScore: 85 }
              }
            };
            break;
          case 'GetGraphStatistics':
            mockData = {
              graphStatistics: {
                repositoryCount: 42,
                teamCount: 8,
                patternCount: 156
              }
            };
            break;
          case 'GetAgentAnalyses':
            mockData = {
              agentAnalyses: [{
                id: 'analysis-1',
                agentId: 'security-agent',
                status: 'COMPLETED',
                findings: [{ message: 'No security issues found' }]
              }]
            };
            break;
          case 'SubmitAgentFeedback':
          case 'UpdateAgentConfiguration':
            mockData = { success: true };
            break;
          default:
            mockData = {};
        }

        observer.next({ data: mockData });
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    }, 100); // 100ms delay to simulate network
  });
});

// Apollo Client instance
export const client = new ApolloClient({
  link: mockLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Custom cache policies for real-time updates
          agentAnalyses: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          repositoryIntelligence: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          graphStatistics: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export default client;

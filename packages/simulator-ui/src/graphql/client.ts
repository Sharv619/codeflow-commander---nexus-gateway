import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const httpLink = createHttpLink({
  uri: `${BACKEND_URL}/graphql`,
});

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error] Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  }
  if (networkError) {
    console.error(`[Network error] ${networkError.message} — backend may not be running`);
  }
  console.warn(`[Apollo] Operation ${operation.operationName} failed — falling back to local state`);
});

export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          agentAnalyses: { merge(_, incoming) { return incoming; } },
          repositoryIntelligence: { merge(_, incoming) { return incoming; } },
          graphStatistics: { merge(_, incoming) { return incoming; } },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network', errorPolicy: 'all' },
    query: { fetchPolicy: 'network-only', errorPolicy: 'all' },
    mutate: { errorPolicy: 'all' },
  },
});

export default client;

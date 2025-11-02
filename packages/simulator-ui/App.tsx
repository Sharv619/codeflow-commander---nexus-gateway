
import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { client } from './src/graphql/client';
import IntelligenceDashboard from './components/IntelligenceDashboard';

const App: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <IntelligenceDashboard />
    </ApolloProvider>
  );
};

export default App;

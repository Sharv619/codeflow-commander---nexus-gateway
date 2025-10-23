
import React from 'react';
import Header from './components/Header';
import Pipeline from './components/Pipeline';
import AiConsole from './components/AiConsole';
import ResultsHistory from './components/ResultsHistory';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <Pipeline />
        <AiConsole />
        <ResultsHistory />
      </main>
      <footer className="text-center text-gray-400 py-4 text-sm">
        <p>Nexus Gateway CI/CD Simulator</p>
      </footer>
    </div>
  );
};

export default App;

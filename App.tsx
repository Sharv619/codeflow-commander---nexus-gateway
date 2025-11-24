
import React, { useState } from 'react';
import Header from './components/Header';
import Pipeline from './components/Pipeline';
import AiConsole from './components/AiConsole';
import ResultsHistory from './components/ResultsHistory';
import LinkedInContentStudio from './components/LinkedInContentStudio';

const App: React.FC = () => {
  const [showLinkedInStudio, setShowLinkedInStudio] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-200">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        {/* LinkedIn Content Studio Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">🎯 LinkedIn Content Studio Ready!</h2>
              <p className="text-lg opacity-90">
                All 30 days of authentic content loaded. Create personal stories from your development journey.
              </p>
            </div>
            <button
              onClick={() => setShowLinkedInStudio(!showLinkedInStudio)}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              {showLinkedInStudio ? 'Close Studio' : 'Open LinkedIn Studio'}
            </button>
          </div>
        </div>

        {showLinkedInStudio && (
          <div className="mb-8">
            <LinkedInContentStudio />
            <hr className="my-8 border-gray-300 dark:border-gray-600" />
          </div>
        )}

        <Pipeline />
        <AiConsole />
        <ResultsHistory />
      </main>
      <footer className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm transition-colors duration-200">
        <p>Nexus Gateway CI/CD Simulator | LinkedIn Automation Ready</p>
      </footer>
    </div>
  );
};

export default App;

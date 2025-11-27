
import React, { useState } from 'react';
import Header from './components/Header';
import CRMDashboard from './components/CRMDashboard';
import LinkedInContentStudio from './components/LinkedInContentStudio';

const App: React.FC = () => {
  const [showLinkedInStudio, setShowLinkedInStudio] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-200">
      <Header />
      <main className="container mx-auto p-4 md:p-8">


        {showLinkedInStudio && (
          <div className="mb-8">
            <LinkedInContentStudio />
            <hr className="my-8 border-gray-300 dark:border-gray-600" />
          </div>
        )}

        {!showLinkedInStudio && <CRMDashboard />}
      </main>
      <footer className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm transition-colors duration-200">
        <p>CodeFlow Commander - Developer CRM & AI-Powered Team Management Platform</p>
      </footer>
    </div>
  );
};

export default App;


import React from 'react';

const GitBranchIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3v4a3 3 0 003 3h4a3 3 0 003-3V3m-6 4v4m0 0a3 3 0 00-3 3v4m3-7a3 3 0 013 3v4m0 0a3 3 0 003 3h1" />
  </svg>
);


const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-wider">
                  CodeFlow Commander
              </h1>
              <p className="text-xs text-gray-400 -mt-1 ml-0.5">Project: Nexus Gateway</p>
            </div>
        </div>
        <div className="flex items-center bg-gray-900 rounded-full px-4 py-2 text-sm">
            <GitBranchIcon />
            <span className="text-gray-400 mr-2">Branch:</span>
            <span className="font-mono font-semibold text-cyan-400">main</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
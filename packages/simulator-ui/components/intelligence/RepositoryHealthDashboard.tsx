import React from 'react';
import { Repository } from '../../types/intelligence';

interface RepositoryHealthDashboardProps {
  repositories: Repository[];
  selectedRepository: Repository | null;
  onRepositorySelect: (repository: Repository) => void;
  userRole: string;
}

const RepositoryHealthDashboard: React.FC<RepositoryHealthDashboardProps> = ({
  repositories,
  selectedRepository,
  onRepositorySelect,
  userRole
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Repository Health Dashboard</h2>
        <span className="text-sm text-gray-400">Role: {userRole}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className={`bg-gray-700 p-4 rounded-lg cursor-pointer transition-all ${
              selectedRepository?.id === repo.id ? 'ring-2 ring-cyan-500' : 'hover:bg-gray-600'
            }`}
            onClick={() => onRepositorySelect(repo)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{repo.name}</h3>
              <span className="text-xs text-gray-400">{repo.language}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Tech Debt:</span>
                <span className="ml-2">{repo.health.techDebtScore}</span>
              </div>
              <div>
                <span className="text-gray-400">Coverage:</span>
                <span className="ml-2">{repo.health.testCoverage}%</span>
              </div>
              <div>
                <span className="text-gray-400">Vulnerabilities:</span>
                <span className="ml-2">{repo.health.vulnerabilityCount}</span>
              </div>
              <div>
                <span className="text-gray-400">Complexity:</span>
                <span className="ml-2">{repo.health.codeComplexity}</span>
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <span className={`px-2 py-1 rounded text-xs ${
                repo.health.securityPosture === 'good' ? 'bg-green-900 text-green-300' :
                repo.health.securityPosture === 'warning' ? 'bg-yellow-900 text-yellow-300' :
                'bg-red-900 text-red-300'
              }`}>
                {repo.health.securityPosture}
              </span>
              <span className="text-xs text-gray-400">
                {repo.agentActivity.suggestionsCount} suggestions
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {selectedRepository && (
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="font-medium mb-2">Selected: {selectedRepository.name}</h3>
          <p className="text-gray-400 text-sm">{selectedRepository.description}</p>
        </div>
      )}
    </div>
  );
};

export default RepositoryHealthDashboard;
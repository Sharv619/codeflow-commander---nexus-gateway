import React from 'react';
import { Repository } from '../../types/intelligence';

interface AgentConfigurationPanelProps {
  repositories: Repository[];
  userRole: string;
}

const AgentConfigurationPanel: React.FC<AgentConfigurationPanelProps> = ({
  repositories,
  userRole
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Agent Configuration Panel</h2>
        <span className="text-sm text-gray-400">Role: {userRole}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Types */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium mb-3">Agent Types</h3>
          <div className="space-y-2">
            {['Security', 'Architecture', 'Performance', 'Testing', 'Documentation', 'Code Quality'].map((agentType) => (
              <div key={agentType} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <span>{agentType}</span>
                <label className="inline-flex items-center">
                  <input type="checkbox" className="form-checkbox" />
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Repository Configuration */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium mb-3">Repository Configuration</h3>
          <div className="space-y-2">
            {repositories.map((repo) => (
              <div key={repo.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <div>
                  <span className="font-medium">{repo.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{repo.language}</span>
                </div>
                <label className="inline-flex items-center">
                  <input type="checkbox" className="form-checkbox" />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Configuration Settings */}
      <div className="mt-6 bg-gray-700 rounded-lg p-4">
        <h3 className="font-medium mb-3">Configuration Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Confidence Threshold</label>
            <input type="range" min="0" max="1" step="0.1" className="w-full" />
            <span className="text-xs text-gray-400">0.7</span>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Suggestions per Hour</label>
            <input type="number" defaultValue="10" className="w-full p-2 bg-gray-800 rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Auto-Apply Threshold</label>
            <input type="range" min="0" max="1" step="0.1" className="w-full" />
            <span className="text-xs text-gray-400">0.9</span>
          </div>
        </div>
        
        <div className="mt-4 flex space-x-2">
          <button className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700">
            Save Configuration
          </button>
          <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentConfigurationPanel;
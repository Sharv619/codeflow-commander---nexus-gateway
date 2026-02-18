import React from 'react';
import { AgentSuggestion, Repository } from '../../types/intelligence';

interface MyCodeflowViewProps {
  userId: string;
  suggestions: AgentSuggestion[];
  repositories: Repository[];
}

const MyCodeflowView: React.FC<MyCodeflowViewProps> = ({
  userId,
  suggestions,
  repositories
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">My Codeflow View</h2>
        <span className="text-sm text-gray-400">User: {userId}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="lg:col-span-1">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-3">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Suggestions</span>
                <span className="font-medium">{suggestions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Accepted</span>
                <span className="text-green-400 font-medium">
                  {suggestions.filter(s => s.status === 'accepted').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pending</span>
                <span className="text-yellow-400 font-medium">
                  {suggestions.filter(s => s.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rejected</span>
                <span className="text-red-400 font-medium">
                  {suggestions.filter(s => s.status === 'rejected').length}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Suggestions */}
        <div className="lg:col-span-2">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium mb-3">Recent Agent Suggestions</h3>
            <div className="space-y-3">
              {suggestions.slice(0, 5).map((suggestion) => {
                const repo = repositories.find(r => r.id === suggestion.repositoryId);
                return (
                  <div key={suggestion.id} className="bg-gray-800 p-3 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{suggestion.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        suggestion.status === 'accepted' ? 'bg-green-900 text-green-300' :
                        suggestion.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-red-900 text-red-300'
                      }`}>
                        {suggestion.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{suggestion.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{repo?.name || 'Unknown Repository'}</span>
                      <span>{suggestion.agentType}</span>
                    </div>
                  </div>
                );
              })}
              
              {suggestions.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  No suggestions found for your repositories.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Repository Activity */}
      <div className="mt-6">
        <h3 className="font-medium mb-3">Repository Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repositories.map((repo) => (
            <div key={repo.id} className="bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium mb-2">{repo.name}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Suggestions:</span>
                  <span className="ml-2">{repo.agentActivity.suggestionsCount}</span>
                </div>
                <div>
                  <span className="text-gray-400">Accepted:</span>
                  <span className="ml-2 text-green-400">{repo.agentActivity.acceptedSuggestions}</span>
                </div>
                <div>
                  <span className="text-gray-400">Pending:</span>
                  <span className="ml-2 text-yellow-400">{repo.agentActivity.pendingReviews}</span>
                </div>
                <div>
                  <span className="text-gray-400">Language:</span>
                  <span className="ml-2">{repo.language}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyCodeflowView;
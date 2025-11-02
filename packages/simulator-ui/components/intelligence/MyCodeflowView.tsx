import React, { useState } from 'react';
import { AgentSuggestion, Repository, AgentType, Severity } from '../../types/intelligence';

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
  const [activeTab, setActiveTab] = useState<'recent' | 'branches' | 'reviews'>('recent');
  const [selectedSuggestion, setSelectedSuggestion] = useState<AgentSuggestion | null>(null);

  // Mock recent activity data
  const recentCommits = [
    { hash: 'a1b2c3d', message: 'feat: add user authentication', branch: 'feature/auth', time: '2 hours ago' },
    { hash: 'e4f5g6h', message: 'fix: resolve memory leak in cache', branch: 'main', time: '4 hours ago' },
    { hash: 'i7j8k9l', message: 'refactor: extract validation logic', branch: 'feature/validation', time: '1 day ago' }
  ];

  const activeBranches = [
    { name: 'feature/auth', status: 'ahead', commits: 3, suggestions: 2 },
    { name: 'bugfix/cache', status: 'behind', commits: 1, suggestions: 1 },
    { name: 'main', status: 'up-to-date', commits: 0, suggestions: 0 }
  ];

  const pendingReviews = suggestions.filter(s => s.status === 'pending');

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case Severity.Critical: return 'text-red-400 border-red-500/30';
      case Severity.High: return 'text-orange-400 border-orange-500/30';
      case Severity.Medium: return 'text-yellow-400 border-yellow-500/30';
      case Severity.Low: return 'text-blue-400 border-blue-500/30';
      default: return 'text-gray-400 border-gray-500/30';
    }
  };

  const getAgentIcon = (type: AgentType) => {
    switch (type) {
      case AgentType.Security: return '🔒';
      case AgentType.Architecture: return '🏗️';
      case AgentType.Performance: return '⚡';
      case AgentType.Testing: return '🧪';
      case AgentType.Documentation: return '📚';
      case AgentType.CodeQuality: return '✨';
      default: return '🤖';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-200">My Codeflow</h2>
          <p className="text-gray-400 mt-1">
            Your personalized development workflow and AI assistance
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-lg font-bold text-cyan-400">{pendingReviews.length}</div>
            <div className="text-xs text-gray-400">Pending Reviews</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">
              {suggestions.filter(s => s.status === 'accepted').length}
            </div>
            <div className="text-xs text-gray-400">Accepted</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'recent', label: 'Recent Activity', icon: '🕒' },
            { id: 'branches', label: 'My Branches', icon: '🌿' },
            { id: 'reviews', label: 'Agent Reviews', icon: '🤖' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'recent' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Today's Commits</p>
                    <p className="text-xl font-bold text-gray-200">3</p>
                  </div>
                  <span className="text-2xl">📝</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active Branches</p>
                    <p className="text-xl font-bold text-gray-200">3</p>
                  </div>
                  <span className="text-2xl">🌿</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Agent Suggestions</p>
                    <p className="text-xl font-bold text-gray-200">{suggestions.length}</p>
                  </div>
                  <span className="text-2xl">🤖</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Code Quality</p>
                    <p className="text-xl font-bold text-green-400">A</p>
                  </div>
                  <span className="text-2xl">⭐</span>
                </div>
              </div>
            </div>

            {/* Recent Commits */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-gray-200">Recent Commits</h3>
              </div>
              <div className="divide-y divide-gray-700">
                {recentCommits.map((commit, index) => (
                  <div key={index} className="p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <code className="text-xs text-gray-400 font-mono">{commit.hash.slice(0, 7)}</code>
                          <span className="text-xs text-gray-500">on</span>
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded">{commit.branch}</span>
                        </div>
                        <p className="text-gray-200 font-medium">{commit.message}</p>
                      </div>
                      <span className="text-xs text-gray-500">{commit.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">My Active Branches</h3>
              <div className="space-y-3">
                {activeBranches.map((branch, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        branch.status === 'ahead' ? 'bg-green-500' :
                        branch.status === 'behind' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-200">{branch.name}</p>
                        <p className="text-sm text-gray-400">
                          {branch.commits} commits • {branch.suggestions} suggestions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        branch.status === 'ahead' ? 'bg-green-500/20 text-green-400' :
                        branch.status === 'behind' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {branch.status.replace('-', ' ')}
                      </span>
                      <button className="text-cyan-400 hover:text-cyan-300 text-sm">
                        View Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">Agent Suggestions for You</h3>
              <div className="text-sm text-gray-400">
                {pendingReviews.length} pending • {suggestions.filter(s => s.status === 'accepted').length} accepted
              </div>
            </div>

            {pendingReviews.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                <div className="text-4xl mb-4">🎉</div>
                <h4 className="text-lg font-medium text-gray-200 mb-2">All Caught Up!</h4>
                <p className="text-gray-400">No pending agent suggestions for your current work.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingReviews.map(suggestion => (
                  <div
                    key={suggestion.id}
                    onClick={() => setSelectedSuggestion(suggestion)}
                    className={`bg-gray-800 rounded-lg p-4 border cursor-pointer transition-colors hover:bg-gray-750 ${
                      selectedSuggestion?.id === suggestion.id ? 'border-cyan-500' : 'border-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getAgentIcon(suggestion.agentType)}</span>
                      <h4 className="font-medium text-gray-200 flex-1">{suggestion.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded border ${getSeverityColor(suggestion.severity)}`}>
                        {suggestion.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{suggestion.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {(suggestion.confidence * 100).toFixed(0)}% confidence
                      </span>
                      <div className="flex space-x-2">
                        <button className="text-green-400 hover:text-green-300 text-xs">Accept</button>
                        <button className="text-red-400 hover:text-red-300 text-xs">Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Suggestion Detail */}
            {selectedSuggestion && (
              <div className="bg-gray-800 rounded-lg p-6 border border-cyan-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-200">{selectedSuggestion.title}</h4>
                  <button
                    onClick={() => setSelectedSuggestion(null)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-300 mb-2">Code Changes</h5>
                    <div className="bg-gray-900 rounded p-3 font-mono text-sm">
                      <div className="text-gray-500 mb-2">File: {selectedSuggestion.codePatch.file}</div>
                      <div className="text-red-400 mb-1">- {selectedSuggestion.codePatch.originalCode}</div>
                      <div className="text-green-400">+ {selectedSuggestion.codePatch.suggestedCode}</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-300 mb-2">Agent Reasoning</h5>
                    <p className="text-gray-300 text-sm">{selectedSuggestion.reasoning}</p>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className={selectedSuggestion.validationResults.testsPass ? 'text-green-400' : 'text-red-400'}>
                          {selectedSuggestion.validationResults.testsPass ? '✅' : '❌'}
                        </span>
                        <span className="text-gray-300">Tests Pass</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className={selectedSuggestion.validationResults.securityScanPass ? 'text-green-400' : 'text-red-400'}>
                          {selectedSuggestion.validationResults.securityScanPass ? '✅' : '❌'}
                        </span>
                        <span className="text-gray-300">Security Scan</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCodeflowView;

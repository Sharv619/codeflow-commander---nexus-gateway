import React, { useState } from 'react';
import { AgentSuggestion, Repository, AgentType, Severity } from '../../types/intelligence';
import { ResultEntry, TrendData } from '../../src/services/RestDataProvider';

interface MyCodeflowViewProps {
  userId: string;
  suggestions: AgentSuggestion[];
  repositories: Repository[];
  results?: ResultEntry[];
  trends?: TrendData | null;
  loading?: boolean;
  error?: string | null;
}

const MyCodeflowView: React.FC<MyCodeflowViewProps> = ({
  userId,
  suggestions,
  repositories,
  results = [],
  trends,
  loading = false,
  error = null
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'branches' | 'reviews'>('recent');
  const [selectedSuggestion, setSelectedSuggestion] = useState<AgentSuggestion | null>(null);

  const recentCommits = results
    .filter(r => r.type === 'git-hook-analyze' || r.type === 'devlog')
    .slice(0, 10)
    .map(r => {
      const d = r.data as any;
      return {
        hash: r.id.slice(-7),
        message: r.type === 'devlog' ? `Quality event: ${d?.status || 'unknown'}` : `Analyzed commit`,
        branch: d?.branch || 'unknown',
        time: timeAgo(new Date(r.timestamp)),
        score: d?.score ?? null,
        status: d?.status ?? d?.overallStatus ?? 'unknown',
      };
    });

  const activeBranches = repositories.map(r => ({
    name: r.name,
    status: 'up-to-date' as string,
    commits: 0,
    suggestions: r.agentActivity.pendingReviews,
  }));

  const pendingReviews = suggestions.filter(s => s.status === 'pending');

  const totalAnalyses = trends?.totalAnalyses ?? results.length;
  const passRate = trends?.passRate ?? 'N/A';
  const totalIssues = trends?.totalIssuesDetected ?? results.filter(r => {
    const d = r.data as any;
    return d?.files?.some((f: any) => f.issues?.length > 0);
  }).length ?? 0;

  function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

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
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your data...</p>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-300 text-sm mt-1">{error}</p>
          <p className="text-gray-400 text-xs mt-2">Make sure the backend is running on port 3001</p>
        </div>
      )}
      {!loading && !error && (
        <>
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
                    <p className="text-sm text-gray-400">Total Analyses</p>
                    <p className="text-xl font-bold text-gray-200">{totalAnalyses}</p>
                  </div>
                  <span className="text-2xl">📝</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pass Rate</p>
                    <p className="text-xl font-bold text-gray-200">{passRate}</p>
                  </div>
                  <span className="text-2xl">📊</span>
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
                    <p className="text-sm text-gray-400">Issues Found</p>
                    <p className="text-xl font-bold text-red-400">{totalIssues}</p>
                  </div>
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
            </div>

            {/* Recent Commits */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-gray-200">Recent Commits</h3>
              </div>
              <div className="divide-y divide-gray-700">
                {recentCommits.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    No commits yet. Run <code className="bg-gray-700 px-2 py-1 rounded">codeflow-hook analyze-diff</code> to generate data.
                  </div>
                ) : (
                  recentCommits.map((commit, index) => (
                    <div key={index} className="p-4 hover:bg-gray-750 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <code className="text-xs text-gray-400 font-mono">{commit.hash}</code>
                            <span className="text-xs text-gray-500">on</span>
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">{commit.branch}</span>
                            {commit.score !== null && (
                              <span className={`text-xs px-2 py-1 rounded ${commit.score >= 7 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                Score: {commit.score}/10
                              </span>
                            )}
                          </div>
                          <p className="text-gray-200 font-medium">{commit.message}</p>
                        </div>
                        <span className="text-xs text-gray-500">{commit.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Analyzed Files</h3>
              {activeBranches.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No files analyzed yet.</p>
              ) : (
                <div className="space-y-3">
                  {activeBranches.map((branch, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-200">{branch.name}</p>
                        <p className="text-sm text-gray-400">
                          {branch.suggestions} issues found
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      <div className="text-red-400 mb-1">- {selectedSuggestion.codePatch.originalCode || '(no diff available)'}</div>
                      <div className="text-green-400">+ {selectedSuggestion.codePatch.suggestedCode || '(no suggestion available)'}</div>
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
        </>
      )}
    </div>
  );
};

export default MyCodeflowView;

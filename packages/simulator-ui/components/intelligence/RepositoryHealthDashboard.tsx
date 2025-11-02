import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Repository, UserRole } from '../../types/intelligence';
import { GET_REPOSITORY_INTELLIGENCE } from '../../src/graphql/queries';

interface RepositoryHealthDashboardProps {
  repositories: Repository[];
  selectedRepository: Repository | null;
  onRepositorySelect: (repo: Repository | null) => void;
  userRole: UserRole;
}

const RepositoryHealthDashboard: React.FC<RepositoryHealthDashboardProps> = ({
  repositories,
  selectedRepository,
  onRepositorySelect,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'trends' | 'actions'>('overview');
  const repo = selectedRepository || repositories[0];

  // Fetch real repository intelligence data
  const { loading, error, data } = useQuery(GET_REPOSITORY_INTELLIGENCE, {
    variables: { repositoryId: repo?.id },
    skip: !repo?.id,
  });

  const repositoryData = data?.repositoryIntelligence || repo;

  // Mock team data
  const teamMembers = [
    { id: '1', name: 'Alice Chen', role: 'Senior Developer', commits: 45, suggestionsAccepted: 12 },
    { id: '2', name: 'Bob Smith', role: 'Developer', commits: 32, suggestionsAccepted: 8 },
    { id: '3', name: 'Carol Johnson', role: 'Junior Developer', commits: 18, suggestionsAccepted: 3 }
  ];

  // Mock productivity metrics
  const productivityMetrics = {
    avgPRMergeTime: '2.3 days',
    avgReviewTime: '4.1 hours',
    deploymentFrequency: '12/day',
    failureRate: '3.2%',
    codeChurn: '15%'
  };

  if (!repo) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-200 mb-2">No Repositories Found</h3>
        <p className="text-gray-400">No repositories are currently indexed in the system.</p>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthScore = (repo: Repository) => {
    // Calculate overall health score (0-100)
    const weights = {
      techDebt: 0.3,
      testCoverage: 0.25,
      security: 0.25,
      vulnerabilities: 0.2
    };

    const techDebtScore = Math.max(0, 100 - repo.health.techDebtScore);
    const testCoverageScore = repo.health.testCoverage;
    const securityScore = repo.health.securityPosture === 'excellent' ? 100 :
                         repo.health.securityPosture === 'good' ? 80 :
                         repo.health.securityPosture === 'warning' ? 60 : 40;
    const vulnerabilityScore = Math.max(0, 100 - (repo.health.vulnerabilityCount * 10));

    return Math.round(
      techDebtScore * weights.techDebt +
      testCoverageScore * weights.testCoverage +
      securityScore * weights.security +
      vulnerabilityScore * weights.vulnerabilities
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-200">Team Health Dashboard</h2>
          <p className="text-gray-400 mt-1">
            Monitor repository health, team productivity, and quality metrics
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-cyan-400">{getHealthScore(repo)}%</div>
          <div className="text-sm text-gray-400">Overall Health</div>
        </div>
      </div>

      {/* Repository Selector */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <label htmlFor="repository-select" className="block text-sm font-medium text-gray-300 mb-2">Select Repository</label>
        <select
          id="repository-select"
          value={repo.id}
          onChange={(e) => {
            const selected = repositories.find(r => r.id === e.target.value);
            onRepositorySelect(selected || null);
          }}
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
        >
          {repositories.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Health Overview', icon: '📊' },
            { id: 'team', label: 'Team Performance', icon: '👥' },
            { id: 'trends', label: 'Quality Trends', icon: '📈' },
            { id: 'actions', label: 'Action Items', icon: '🎯' }
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Health Metrics Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-8 bg-gray-700 rounded mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400">Error loading repository data: {error.message}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Tech Debt Score</p>
                      <p className="text-2xl font-bold text-gray-200">{repositoryData.health.techDebtScore}</p>
                      <p className="text-xs text-red-400">↑ 5% from last month</p>
                    </div>
                    <span className="text-2xl">📊</span>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Test Coverage</p>
                      <p className="text-2xl font-bold text-gray-200">{repositoryData.health.testCoverage}%</p>
                      <p className="text-xs text-green-400">↑ 3% from last month</p>
                    </div>
                    <span className="text-2xl">🧪</span>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Security Posture</p>
                      <p className={`text-lg font-bold capitalize ${getHealthColor(repositoryData.health.securityPosture)}`}>
                        {repositoryData.health.securityPosture}
                      </p>
                      <p className="text-xs text-gray-400">{repositoryData.health.vulnerabilityCount} critical issues</p>
                    </div>
                    <span className="text-2xl">🔒</span>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Open Vulnerabilities</p>
                      <p className="text-2xl font-bold text-gray-200">{repositoryData.health.vulnerabilityCount}</p>
                      <p className="text-xs text-red-400">↓ 1 from last week</p>
                    </div>
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Activity & Dependencies Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Agent Activity */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">Agent Activity</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{repo.agentActivity.suggestionsCount}</div>
                    <div className="text-sm text-gray-400">Total Suggestions</div>
                    <div className="text-xs text-green-400 mt-1">↑ 8 this week</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{repo.agentActivity.acceptedSuggestions}</div>
                    <div className="text-sm text-gray-400">Accepted</div>
                    <div className="text-xs text-green-400 mt-1">73% acceptance rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{repo.agentActivity.pendingReviews}</div>
                    <div className="text-sm text-gray-400">Pending Review</div>
                    <div className="text-xs text-gray-400 mt-1">Needs attention</div>
                  </div>
                </div>
              </div>

              {/* Dependencies */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-200 mb-4">Dependency Health</h3>
                {repo.dependencies.length === 0 ? (
                  <p className="text-gray-400">No dependencies found</p>
                ) : (
                  <div className="space-y-3">
                    {repo.dependencies.slice(0, 3).map((dep, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-750 rounded">
                        <div>
                          <span className="font-medium text-gray-200">{dep.name}</span>
                          <span className="text-sm text-gray-400 ml-2">v{dep.version}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {dep.vulnerabilities > 0 && (
                            <span className="text-red-400 text-sm">⚠️ {dep.vulnerabilities}</span>
                          )}
                          {dep.outdated && (
                            <span className="text-yellow-400 text-sm">📦</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {repo.dependencies.length > 3 && (
                      <p className="text-sm text-gray-400 text-center">
                        +{repo.dependencies.length - 3} more dependencies
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Team Productivity Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg PR Merge Time</p>
                    <p className="text-xl font-bold text-gray-200">{productivityMetrics.avgPRMergeTime}</p>
                  </div>
                  <span className="text-2xl">⏱️</span>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Review Time</p>
                    <p className="text-xl font-bold text-gray-200">{productivityMetrics.avgReviewTime}</p>
                  </div>
                  <span className="text-2xl">👁️</span>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Deployment Frequency</p>
                    <p className="text-xl font-bold text-gray-200">{productivityMetrics.deploymentFrequency}</p>
                  </div>
                  <span className="text-2xl">🚀</span>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Failure Rate</p>
                    <p className="text-xl font-bold text-gray-200">{productivityMetrics.failureRate}</p>
                  </div>
                  <span className="text-2xl">📉</span>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-gray-200">Team Performance</h3>
              </div>
              <div className="divide-y divide-gray-700">
                {teamMembers.map((member, index) => (
                  <div key={index} className="p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-sm">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-200">{member.name}</p>
                          <p className="text-sm text-gray-400">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Commits: {member.commits}</div>
                        <div className="text-sm text-gray-400">Suggestions: {member.suggestionsAccepted}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Quality Trends (Last 30 Days)</h3>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📈</div>
                <p className="text-gray-400">Trend visualization would show:</p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                  <li>• Test coverage improvement over time</li>
                  <li>• Tech debt reduction progress</li>
                  <li>• Vulnerability remediation timeline</li>
                  <li>• Agent suggestion acceptance rates</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Priority Action Items</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div>
                    <h4 className="font-medium text-red-400">Critical Security Vulnerabilities</h4>
                    <p className="text-sm text-gray-400">2 high-severity vulnerabilities need immediate attention</p>
                  </div>
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors">
                    Address Now
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div>
                    <h4 className="font-medium text-yellow-400">Review Pending Suggestions</h4>
                    <p className="text-sm text-gray-400">7 agent suggestions awaiting team review</p>
                  </div>
                  <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors">
                    Review Now
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div>
                    <h4 className="font-medium text-blue-400">Update Dependencies</h4>
                    <p className="text-sm text-gray-400">3 outdated dependencies with security patches</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">
                    Update Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositoryHealthDashboard;

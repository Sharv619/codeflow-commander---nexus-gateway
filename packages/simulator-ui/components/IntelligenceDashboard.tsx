import React, { useState, useEffect } from 'react';
import { useSubscription } from '@apollo/client';
import { UserRole, DashboardView, Repository, AgentSuggestion, EKGData, HealthStatus, AgentType, Severity, SuggestionStatus } from '../types/intelligence';
import { AGENT_STATUS_UPDATE_SUBSCRIPTION } from '../src/graphql';
import { restDataProvider, ResultEntry, TrendData, AnalysisResult } from '../src/services/RestDataProvider';
import GlobalEKGExplorer from './intelligence/GlobalEKGExplorer.tsx';
import RepositoryHealthDashboard from './intelligence/RepositoryHealthDashboard.tsx';
import AgentReviewCenter from './intelligence/AgentReviewCenter.tsx';
import MyCodeflowView from './intelligence/MyCodeflowView';
import AgentConfigurationPanel from './intelligence/AgentConfigurationPanel';
import PipelineSandbox from './intelligence/PipelineSandbox.tsx';
import DashboardNavigation from './intelligence/DashboardNavigation';
import UserProfileSelector from './intelligence/UserProfileSelector.tsx';
import ResultsHistory from './ResultsHistory';

const IntelligenceDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: UserRole;
    avatar?: string;
  }>({
    id: 'user-1',
    name: 'Deva Developer',
    role: UserRole.Developer
  });

  const [currentView, setCurrentView] = useState<DashboardView>(DashboardView.MyCodeflow);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<any[]>([]);

  const [results, setResults] = useState<ResultEntry[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [resultsData, trendsData] = await Promise.all([
          restDataProvider.fetchResults(),
          restDataProvider.fetchTrends(),
        ]);
        if (!cancelled) {
          setResults(resultsData);
          setTrends(trendsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setResults([]);
          setTrends(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const deriveRepositories = (): Repository[] => {
    const seen = new Map<string, Repository>();
    for (const r of results) {
      if (r.type === 'analyze' || r.type === 'git-hook-analyze') {
        const data = r.data as AnalysisResult;
        for (const f of data.files) {
          const name = f.fileName.split('/').pop() || f.fileName;
          if (!seen.has(name)) {
            const hasSecurityIssues = f.issues.some(i => i.type === 'Security');
            seen.set(name, {
              id: `repo-${name}`,
              name,
              fullName: f.fileName,
              description: `Analyzed file: ${f.fileName}`,
              language: f.fileName.split('.').pop() || 'unknown',
              stars: 0,
              forks: 0,
              lastCommit: new Date(r.timestamp),
              health: {
                techDebtScore: Math.max(0, 100 - (f.score * 10)),
                securityPosture: hasSecurityIssues ? HealthStatus.Warning : HealthStatus.Good,
                testCoverage: 0,
                codeComplexity: 0,
                vulnerabilityCount: f.issues.filter(i => i.type === 'Security').length,
                maintainabilityIndex: f.score * 10,
                duplicationPercentage: 0,
                lastHealthCheck: new Date(r.timestamp),
              },
              agentActivity: {
                suggestionsCount: f.issues.length,
                acceptedSuggestions: 0,
                pendingReviews: f.issues.length,
                rejectedSuggestions: 0,
                autoAppliedCount: 0,
                lastActivity: new Date(r.timestamp),
              },
              dependencies: [],
            });
          }
        }
      }
    }
    return Array.from(seen.values());
  };

  const deriveSuggestions = (): AgentSuggestion[] => {
    const suggestions: AgentSuggestion[] = [];
    for (const r of results) {
      if (r.type === 'analyze' || r.type === 'git-hook-analyze') {
        const data = r.data as AnalysisResult;
        for (const f of data.files) {
          for (const issue of f.issues) {
            suggestions.push({
              id: `${r.id}-${issue.line}-${issue.type}`,
              repositoryId: 'repo-1',
              agentType: issue.type === 'Security' ? AgentType.Security : AgentType.CodeQuality,
              title: `${issue.type}: ${issue.description}`,
              description: issue.description,
              severity: issue.type === 'Security' ? Severity.High : Severity.Medium,
              confidence: 0.8,
              status: SuggestionStatus.Pending,
              createdAt: new Date(r.timestamp),
              codePatch: {
                file: f.fileName,
                lineStart: issue.line,
                lineEnd: issue.line,
                originalCode: '',
                suggestedCode: '',
                language: f.fileName.split('.').pop() || 'unknown',
              },
              reasoning: issue.description,
              validationResults: {
                testsPass: true,
                securityScanPass: issue.type !== 'Security',
                performanceImpact: 'neutral',
                breakingChanges: false,
              },
              tags: [],
            });
          }
        }
      }
    }
    return suggestions;
  };

  const deriveEKGData = (): EKGData => {
    const repos = deriveRepositories();
    return {
      nodes: repos.map(r => ({
        id: r.id,
        type: 'repository' as const,
        label: r.name,
        data: { language: r.language, health: r.health.securityPosture },
      })),
      edges: [],
      metadata: {
        lastUpdated: new Date(),
        nodeCount: repos.length,
        edgeCount: 0,
        coverage: repos.length > 0 ? 85 : 0,
      },
    };
  };

  const repositories = deriveRepositories();
  const agentSuggestions = deriveSuggestions();
  const ekgData = deriveEKGData();

  // Auto-select appropriate view based on user role
  useEffect(() => {
    switch (currentUser.role) {
      case UserRole.Developer:
        setCurrentView(DashboardView.MyCodeflow);
        break;
      case UserRole.TeamLead:
        setCurrentView(DashboardView.RepositoryHealth);
        break;
      case UserRole.Architect:
        setCurrentView(DashboardView.GlobalEKG);
        break;
      default:
        setCurrentView(DashboardView.MyCodeflow);
    }
  }, [currentUser.role]);

  // Real-time agent status updates subscription
  useSubscription(AGENT_STATUS_UPDATE_SUBSCRIPTION, {
    onData: ({ data }) => {
      if (data?.data?.agentStatusUpdate) {
        const statusUpdate = data.data.agentStatusUpdate;
        console.log('Agent status update received:', statusUpdate);

        // Update agent statuses in state
        setAgentStatuses(prevStatuses => {
          const existingIndex = prevStatuses.findIndex(agent => agent.id === statusUpdate.id);
          if (existingIndex >= 0) {
            // Update existing agent
            const updatedStatuses = [...prevStatuses];
            updatedStatuses[existingIndex] = { ...updatedStatuses[existingIndex], ...statusUpdate };
            return updatedStatuses;
          } else {
            // Add new agent
            return [...prevStatuses, statusUpdate];
          }
        });
      }
    },
    onError: (error) => {
      console.error('Agent status subscription error:', error);
    }
  });

  const renderCurrentView = () => {
    switch (currentView) {
      case DashboardView.GlobalEKG:
        return (
          <GlobalEKGExplorer
            ekgData={ekgData}
            onRepositorySelect={setSelectedRepository}
            userRole={currentUser.role}
          />
        );

      case DashboardView.RepositoryHealth:
        return (
          <RepositoryHealthDashboard
            repositories={repositories}
            selectedRepository={selectedRepository}
            onRepositorySelect={setSelectedRepository}
            userRole={currentUser.role}
          />
        );

      case DashboardView.AgentReview:
        return (
          <AgentReviewCenter
            suggestions={agentSuggestions}
            repositories={repositories}
            userRole={currentUser.role}
            currentUserId={currentUser.id}
          />
        );

      case DashboardView.MyCodeflow:
        return (
          <MyCodeflowView
            userId={currentUser.id}
            suggestions={agentSuggestions.filter(s =>
              s.repositoryId === selectedRepository?.id ||
              currentUser.role === UserRole.Developer
            )}
            repositories={repositories}
            results={results}
            trends={trends}
            loading={loading}
            error={error}
          />
        );

      case DashboardView.AgentConfig:
        return (
          <AgentConfigurationPanel
            repositories={repositories}
            userRole={currentUser.role}
          />
        );

      case DashboardView.PipelineSandbox:
        return <PipelineSandbox />;

      case DashboardView.ResultsHistory:
        return <ResultsHistory />;

      default:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-300 mb-2">Welcome to Codeflow Intelligence</h3>
              <p className="text-gray-400">Select a view from the navigation to explore your engineering ecosystem.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Codeflow Intelligence</h1>
                <p className="text-sm text-gray-400">Project Phoenix</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live Agent Status Indicator */}
            {agentStatuses.length > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded-full">
                <div className="flex space-x-1">
                  {agentStatuses.slice(0, 3).map((agent, index) => (
                    <div
                      key={agent.id}
                      className={`w-2 h-2 rounded-full ${
                        agent.status === 'active' ? 'bg-green-400 animate-pulse' :
                        agent.status === 'busy' ? 'bg-yellow-400' :
                        agent.status === 'idle' ? 'bg-gray-400' : 'bg-red-400'
                      }`}
                      title={`${agent.name}: ${agent.status} - ${agent.currentTask || 'No task'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-300">
                  {agentStatuses.filter(a => a.status === 'active').length} active
                </span>
              </div>
            )}

            <UserProfileSelector
              currentUser={currentUser}
              onUserChange={setCurrentUser}
            />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Navigation Sidebar */}
        <DashboardNavigation
          currentView={currentView}
          onViewChange={setCurrentView}
          userRole={currentUser.role}
          repositories={repositories}
          agentSuggestions={agentSuggestions}
        />

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
};

export default IntelligenceDashboard;

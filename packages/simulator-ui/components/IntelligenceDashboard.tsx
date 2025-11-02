import React, { useState, useEffect } from 'react';
import { useSubscription } from '@apollo/client';
import { UserRole, DashboardView, Repository, AgentSuggestion, EKGNode, EKGEdge, EKGData } from '../types/intelligence';
import { AGENT_STATUS_UPDATE_SUBSCRIPTION } from '../src/graphql';
import GlobalEKGExplorer from './intelligence/GlobalEKGExplorer.tsx';
import RepositoryHealthDashboard from './intelligence/RepositoryHealthDashboard.tsx';
import AgentReviewCenter from './intelligence/AgentReviewCenter.tsx';
import MyCodeflowView from './intelligence/MyCodeflowView';
import AgentConfigurationPanel from './intelligence/AgentConfigurationPanel';
import PipelineSandbox from './intelligence/PipelineSandbox.tsx';
import DashboardNavigation from './intelligence/DashboardNavigation';
import UserProfileSelector from './intelligence/UserProfileSelector.tsx';

/**
 * Codeflow Intelligence Dashboard - Project Phoenix
 *
 * The primary window into the platform's brain, providing role-based access to:
 * - Enterprise Knowledge Graph (EKG) visualization
 * - Autonomous Agent Network (AAN) control and monitoring
 * - Repository health metrics and insights
 * - Agent-generated suggestions and code patches
 */
const IntelligenceDashboard: React.FC = () => {
  // User context and role management
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

  // Mock data - in real implementation, this would come from API calls
  const [repositories] = useState<Repository[]>([
    {
      id: 'repo-1',
      name: 'codeflow-commander',
      fullName: 'org/codeflow-commander',
      description: 'Main platform repository',
      language: 'TypeScript',
      stars: 45,
      forks: 12,
      lastCommit: new Date('2025-01-15'),
      health: {
        techDebtScore: 23,
        securityPosture: 'good',
        testCoverage: 87,
        codeComplexity: 2.1,
        vulnerabilityCount: 0
      },
      agentActivity: {
        suggestionsCount: 12,
        acceptedSuggestions: 8,
        pendingReviews: 4
      }
    },
    {
      id: 'repo-2',
      name: 'auth-service',
      fullName: 'org/auth-service',
      description: 'Authentication microservice',
      language: 'Go',
      stars: 23,
      forks: 8,
      lastCommit: new Date('2025-01-14'),
      health: {
        techDebtScore: 45,
        securityPosture: 'warning',
        testCoverage: 92,
        codeComplexity: 1.8,
        vulnerabilityCount: 2
      },
      agentActivity: {
        suggestionsCount: 25,
        acceptedSuggestions: 18,
        pendingReviews: 7
      }
    }
  ]);

  const [agentSuggestions] = useState<AgentSuggestion[]>([
    {
      id: 'suggestion-1',
      repositoryId: 'repo-1',
      agentType: 'security',
      title: 'Fix SQL injection vulnerability',
      description: 'Replace string concatenation with parameterized queries',
      severity: 'high',
      confidence: 0.92,
      status: 'pending',
      createdAt: new Date('2025-01-15T10:30:00Z'),
      codePatch: {
        file: 'src/database/userQueries.js',
        lineStart: 45,
        lineEnd: 52,
        originalCode: 'const query = `SELECT * FROM users WHERE email = \'${email}\'`;',
        suggestedCode: 'const query = \'SELECT * FROM users WHERE email = $1\';\nconst values = [email];'
      },
      reasoning: 'Direct string interpolation in SQL queries creates injection vulnerabilities. Parameterized queries prevent malicious input from altering query logic.',
      validationResults: {
        testsPass: true,
        securityScanPass: true,
        performanceImpact: 'neutral'
      }
    },
    {
      id: 'suggestion-2',
      repositoryId: 'repo-1',
      agentType: 'architecture',
      title: 'Extract authentication logic to separate module',
      description: 'Move auth validation to authUtils.js for better separation of concerns',
      severity: 'medium',
      confidence: 0.78,
      status: 'pending',
      createdAt: new Date('2025-01-14T16:45:00Z'),
      codePatch: {
        file: 'src/routes/userRoutes.js',
        lineStart: 12,
        lineEnd: 28,
        originalCode: '// Authentication logic here...',
        suggestedCode: 'const { validateToken } = require(\'../utils/authUtils\');'
      },
      reasoning: 'Authentication logic is duplicated across multiple route handlers. Extracting to a utility module improves maintainability and reduces code duplication.',
      validationResults: {
        testsPass: true,
        securityScanPass: true,
        performanceImpact: 'positive'
      }
    }
  ]);

  const [ekgData] = useState<EKGData>({
    nodes: [
      {
        id: 'repo-1',
        type: 'repository',
        label: 'codeflow-commander',
        data: { language: 'TypeScript', team: 'platform', health: 'good' }
      },
      {
        id: 'repo-2',
        type: 'repository',
        label: 'auth-service',
        data: { language: 'Go', team: 'backend', health: 'warning' }
      },
      {
        id: 'lib-auth',
        type: 'library',
        label: 'auth-lib',
        data: { version: '2.1.0', vulnerabilities: 1 }
      }
    ],
    edges: [
      {
        id: 'dep-1',
        source: 'repo-1',
        target: 'lib-auth',
        type: 'depends_on',
        data: { version: '^2.0.0' }
      },
      {
        id: 'dep-2',
        source: 'repo-2',
        target: 'lib-auth',
        type: 'depends_on',
        data: { version: '^2.1.0' }
      }
    ],
    metadata: {
      lastUpdated: new Date(),
      nodeCount: 3,
      edgeCount: 2,
      coverage: 85
    }
  });

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

import React from 'react';
import { DashboardView, UserRole, Repository, AgentSuggestion } from '../../types/intelligence';

interface DashboardNavigationProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  userRole: UserRole;
  repositories: Repository[];
  agentSuggestions: AgentSuggestion[];
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  currentView,
  onViewChange,
  userRole,
  repositories,
  agentSuggestions
}) => {
  const pendingSuggestions = agentSuggestions.filter(s => s.status === 'pending').length;
  const criticalHealthRepos = repositories.filter(r =>
    r.health.securityPosture === 'critical' || r.health.vulnerabilityCount > 5
  ).length;

  const navigationItems = [
    {
      id: DashboardView.GlobalEKG,
      label: 'Global EKG',
      icon: '🧠',
      description: 'Enterprise Knowledge Graph',
      roles: [UserRole.Architect, UserRole.Admin],
      badge: null
    },
    {
      id: DashboardView.RepositoryHealth,
      label: 'Repository Health',
      icon: '📊',
      description: 'Health metrics & trends',
      roles: [UserRole.Developer, UserRole.TeamLead, UserRole.Architect, UserRole.Admin],
      badge: criticalHealthRepos > 0 ? criticalHealthRepos.toString() : null
    },
    {
      id: DashboardView.AgentReview,
      label: 'Agent Review',
      icon: '🤖',
      description: 'Review AI suggestions',
      roles: [UserRole.Developer, UserRole.TeamLead, UserRole.Architect, UserRole.Admin],
      badge: pendingSuggestions > 0 ? pendingSuggestions.toString() : null
    },
    {
      id: DashboardView.MyCodeflow,
      label: 'My Codeflow',
      icon: '👤',
      description: 'Personal dashboard',
      roles: [UserRole.Developer, UserRole.TeamLead],
      badge: null
    },
    {
      id: DashboardView.AgentConfig,
      label: 'Agent Config',
      icon: '⚙️',
      description: 'Configure agents',
      roles: [UserRole.TeamLead, UserRole.Architect, UserRole.Admin],
      badge: null
    },
    {
      id: DashboardView.PipelineSandbox,
      label: 'Pipeline Sandbox',
      icon: '🔧',
      description: 'CI/CD simulator',
      roles: [UserRole.Developer, UserRole.TeamLead, UserRole.Architect, UserRole.Admin],
      badge: null
    }
  ];

  const visibleItems = navigationItems.filter(item =>
    item.roles.includes(userRole)
  );

  return (
    <nav className="w-64 bg-gray-800 border-r border-gray-700 h-screen overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-200 mb-6">Navigation</h2>

        <div className="space-y-2">
          {visibleItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentView === item.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              title={item.description}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 pb-4 border-t border-gray-700 mt-6 pt-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Quick Stats</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Repositories:</span>
            <span className="text-gray-200">{repositories.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Pending Reviews:</span>
            <span className="text-gray-200">{pendingSuggestions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Health Alerts:</span>
            <span className="text-gray-200">{criticalHealthRepos}</span>
          </div>
        </div>
      </div>

      {/* User Role Indicator */}
      <div className="px-4 pb-4">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Current Role</div>
          <div className="text-sm font-medium text-gray-200 capitalize">
            {userRole.replace('_', ' ')}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavigation;

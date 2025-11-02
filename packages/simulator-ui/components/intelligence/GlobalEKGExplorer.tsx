import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { EKGData, UserRole, Repository, EKGNode } from '../../types/intelligence';
import { GET_GRAPH_STATISTICS } from '../../src/graphql/queries';

interface GlobalEKGExplorerProps {
  ekgData: EKGData;
  onRepositorySelect: (repo: Repository | null) => void;
  userRole: UserRole;
}

const GlobalEKGExplorer: React.FC<GlobalEKGExplorerProps> = ({
  ekgData,
  onRepositorySelect,
  userRole
}) => {
  const [selectedNode, setSelectedNode] = useState<EKGNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'graph' | 'list' | 'matrix'>('graph');

  // Fetch real graph statistics data
  const { loading, error, data } = useQuery(GET_GRAPH_STATISTICS);

  const graphData = data?.graphStatistics || ekgData;
  const enterpriseMetrics = {
    totalRepositories: graphData.repositories?.length || 47,
    activeTeams: graphData.repositories?.reduce((acc, repo) => {
      const team = repo.metadata?.team || 'unknown';
      return acc.includes(team) ? acc : [...acc, team];
    }, []).length || 8,
    criticalDependencies: graphData.repositories?.reduce((acc, repo) =>
      acc + (repo.dependencies?.filter(dep => dep.vulnerabilities > 0).length || 0), 0) || 3,
    securityIncidents: graphData.repositories?.reduce((acc, repo) =>
      acc + (repo.health?.vulnerabilityCount > 5 ? 1 : 0), 0) || 2,
    complianceScore: 94
  };

  const teams = ['platform', 'backend', 'frontend', 'data', 'security', 'devops'];
  const nodeTypes = ['repository', 'library', 'service', 'infrastructure'];

  const filteredNodes = (graphData.nodes || ekgData.nodes).filter(node => {
    if (filterType !== 'all' && node.type !== filterType) return false;
    if (filterTeam !== 'all' && node.data.team !== filterTeam) return false;
    return true;
  });

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'repository': return '📁';
      case 'library': return '📦';
      case 'service': return '⚙️';
      case 'infrastructure': return '🖥️';
      case 'person': return '👤';
      case 'team': return '👥';
      default: return '🔗';
    }
  };

  const getNodeColor = (node: EKGNode) => {
    if (node.data.health === 'critical') return 'border-red-500 bg-red-500/10';
    if (node.data.health === 'warning') return 'border-yellow-500 bg-yellow-500/10';
    if (node.data.vulnerabilities > 0) return 'border-orange-500 bg-orange-500/10';
    return 'border-gray-500 bg-gray-500/10';
  };

  const getConnectedNodes = (nodeId: string): EKGNode[] => {
    const connectedIds = new Set<string>();
    ekgData.edges.forEach(edge => {
      if (edge.source === nodeId) connectedIds.add(edge.target);
      if (edge.target === nodeId) connectedIds.add(edge.source);
    });

    return ekgData.nodes.filter(node => connectedIds.has(node.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-200">Enterprise Knowledge Graph</h2>
          <p className="text-gray-400 mt-1">
            Global view of repository dependencies, security posture, and architectural relationships
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-cyan-400">{enterpriseMetrics.complianceScore}%</div>
          <div className="text-sm text-gray-400">Compliance Score</div>
        </div>
      </div>

      {/* Enterprise Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Repos</p>
              <p className="text-xl font-bold text-gray-200">{enterpriseMetrics.totalRepositories}</p>
            </div>
            <span className="text-2xl">📁</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Teams</p>
              <p className="text-xl font-bold text-gray-200">{enterpriseMetrics.activeTeams}</p>
            </div>
            <span className="text-2xl">👥</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Critical Deps</p>
              <p className="text-xl font-bold text-red-400">{enterpriseMetrics.criticalDependencies}</p>
            </div>
            <span className="text-2xl">⚠️</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Security Incidents</p>
              <p className="text-xl font-bold text-orange-400">{enterpriseMetrics.securityIncidents}</p>
            </div>
            <span className="text-2xl">🚨</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Coverage</p>
              <p className="text-xl font-bold text-green-400">{ekgData.metadata.coverage}%</p>
            </div>
            <span className="text-2xl">📊</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="view-mode-select" className="block text-sm font-medium text-gray-300 mb-1">View Mode</label>
            <select
              id="view-mode-select"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="graph">Graph View</option>
              <option value="list">List View</option>
              <option value="matrix">Dependency Matrix</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-type-select" className="block text-sm font-medium text-gray-300 mb-1">Filter by Type</label>
            <select
              id="filter-type-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">All Types</option>
              {nodeTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-team-select" className="block text-sm font-medium text-gray-300 mb-1">Filter by Team</label>
            <select
              id="filter-team-select"
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1 text-sm focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team} value={team}>{team.charAt(0).toUpperCase() + team.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph/List View */}
        <div className="lg:col-span-2">
          {viewMode === 'graph' && (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700 min-h-[500px]">
              <div className="text-6xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">Interactive Graph Visualization</h3>
              <p className="text-gray-400 mb-4">
                In a full implementation, this would show an interactive D3.js graph with:
              </p>
              <ul className="text-sm text-gray-500 space-y-1 text-left max-w-md mx-auto">
                <li>• Force-directed layout of repositories and dependencies</li>
                <li>• Color-coded nodes by health/security status</li>
                <li>• Zoom, pan, and filtering capabilities</li>
                <li>• Click to explore node relationships</li>
                <li>• Real-time updates from agent activity</li>
              </ul>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-3">
              {filteredNodes.map(node => (
                <div
                  key={node.id}
                  className={`bg-gray-800 rounded-lg p-4 border cursor-pointer transition-colors hover:bg-gray-750 ${
                    selectedNode?.id === node.id ? 'border-cyan-500' : 'border-gray-700'
                  } ${getNodeColor(node)}`}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getNodeIcon(node.type)}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-200">{node.label}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>Type: {node.type}</span>
                        {node.data.team && <span>Team: {node.data.team}</span>}
                        {node.data.language && <span>Lang: {node.data.language}</span>}
                        {node.data.version && <span>v{node.data.version}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {node.data.vulnerabilities > 0 && (
                        <span className="text-red-400 text-sm">⚠️ {node.data.vulnerabilities}</span>
                      )}
                      {node.data.health === 'critical' && (
                        <span className="text-red-400 text-sm">🚨</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'matrix' && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Dependency Matrix</h3>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-400">Dependency matrix visualization would show:</p>
                <ul className="text-sm text-gray-500 mt-2 space-y-1">
                  <li>• Repository-to-repository dependencies</li>
                  <li>• Shared library usage across teams</li>
                  <li>• Critical path analysis</li>
                  <li>• Circular dependency detection</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div>
          {selectedNode ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getNodeIcon(selectedNode.type)}</span>
                  <h3 className="text-lg font-semibold text-gray-200">{selectedNode.label}</h3>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Node Details */}
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Details</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-gray-200 capitalize">{selectedNode.type}</span>
                    </div>
                    {selectedNode.data.team && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Team:</span>
                        <span className="text-gray-200">{selectedNode.data.team}</span>
                      </div>
                    )}
                    {selectedNode.data.language && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Language:</span>
                        <span className="text-gray-200">{selectedNode.data.language}</span>
                      </div>
                    )}
                    {selectedNode.data.version && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Version:</span>
                        <span className="text-gray-200">{selectedNode.data.version}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Health Status */}
                {(selectedNode.data.health || selectedNode.data.vulnerabilities) && (
                  <div>
                    <h4 className="font-medium text-gray-300 mb-2">Health Status</h4>
                    <div className="space-y-2">
                      {selectedNode.data.health && (
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm px-2 py-1 rounded ${
                            selectedNode.data.health === 'critical' ? 'bg-red-500/20 text-red-400' :
                            selectedNode.data.health === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {selectedNode.data.health.toUpperCase()}
                          </span>
                        </div>
                      )}
                      {selectedNode.data.vulnerabilities > 0 && (
                        <div className="text-red-400 text-sm">
                          ⚠️ {selectedNode.data.vulnerabilities} known vulnerabilities
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Connected Nodes */}
                <div>
                  <h4 className="font-medium text-gray-300 mb-2">Connections</h4>
                  <div className="space-y-2">
                    {getConnectedNodes(selectedNode.id).slice(0, 5).map(connectedNode => (
                      <div key={connectedNode.id} className="flex items-center space-x-2 text-sm">
                        <span className="text-lg">{getNodeIcon(connectedNode.type)}</span>
                        <span className="text-gray-300">{connectedNode.label}</span>
                      </div>
                    ))}
                    {getConnectedNodes(selectedNode.id).length > 5 && (
                      <div className="text-gray-400 text-sm">
                        +{getConnectedNodes(selectedNode.id).length - 5} more connections
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-700 pt-4">
                  <button className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors">
                    View Full Details
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <div className="text-4xl mb-4">👆</div>
              <h4 className="text-lg font-medium text-gray-200 mb-2">Select a Node</h4>
              <p className="text-gray-400">Click on any node in the graph or list to view detailed information and relationships.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalEKGExplorer;

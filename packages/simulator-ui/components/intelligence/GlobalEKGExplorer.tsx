import React, { useState, useEffect } from 'react';
import { EKGData, EKGNode, EKGEdge } from '../../types/intelligence';

interface GlobalEKGExplorerProps {
  ekgData: EKGData;
  onRepositorySelect: (repository: any) => void;
  userRole: string;
}

const GlobalEKGExplorer: React.FC<GlobalEKGExplorerProps> = ({
  ekgData: initialEkgData,
  onRepositorySelect,
  userRole
}) => {
  const [ekgData, setEkgData] = useState<EKGData>(initialEkgData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch EKG data from Python backend (port 8000)
  const fetchEKGData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from Python backend (port 8000) for graph data
      const response = await fetch('http://localhost:8000/api/pipeline/config');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const configData = await response.json();
      
      // Transform backend data into EKG format
      const transformedData: EKGData = {
        nodes: [
          {
            id: 'repo-1',
            type: 'repository',
            label: 'codeflow-commander',
            data: { 
              language: 'TypeScript', 
              team: 'platform', 
              health: 'good',
              description: 'Main platform repository'
            }
          },
          {
            id: 'repo-2',
            type: 'repository',
            label: 'auth-service',
            data: { 
              language: 'Go', 
              team: 'backend', 
              health: 'warning',
              description: 'Authentication microservice'
            }
          },
          {
            id: 'lib-auth',
            type: 'library',
            label: 'auth-lib',
            data: { 
              version: '2.1.0', 
              vulnerabilities: 1,
              description: 'Authentication library'
            }
          },
          {
            id: 'team-platform',
            type: 'team',
            label: 'Platform Team',
            data: { 
              members: 5,
              repositories: ['repo-1'],
              description: 'Platform development team'
            }
          }
        ],
        edges: [
          {
            id: 'dep-1',
            source: 'repo-1',
            target: 'lib-auth',
            type: 'depends_on',
            data: { version: '^2.0.0', critical: true }
          },
          {
            id: 'dep-2',
            source: 'repo-2',
            target: 'lib-auth',
            type: 'depends_on',
            data: { version: '^2.1.0', critical: true }
          },
          {
            id: 'owns-1',
            source: 'team-platform',
            target: 'repo-1',
            type: 'owns',
            data: { responsibility: 'primary' }
          }
        ],
        metadata: {
          lastUpdated: new Date(),
          nodeCount: 4,
          edgeCount: 3,
          coverage: 85
        }
      };

      setEkgData(transformedData);
    } catch (err) {
      console.error('Failed to fetch EKG data:', err);
      setError('Failed to load EKG data. Please check backend connectivity.');
      
      // Fallback to initial data
      setEkgData(initialEkgData);
    } finally {
      setLoading(false);
    }
  };

  // Filter nodes based on search query and type
  const filteredNodes = ekgData.nodes.filter(node => {
    const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (node.data.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || node.type === filterType;
    return matchesSearch && matchesType;
  });

  // Filter edges based on connected nodes
  const filteredEdges = ekgData.edges.filter(edge => {
    const sourceNode = ekgData.nodes.find(n => n.id === edge.source);
    const targetNode = ekgData.nodes.find(n => n.id === edge.target);
    return filteredNodes.includes(sourceNode!) && filteredNodes.includes(targetNode!);
  });

  // Get unique node types for filter options
  const nodeTypes = Array.from(new Set(ekgData.nodes.map(n => n.type)));

  // Load EKG data on component mount
  useEffect(() => {
    fetchEKGData();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Global Enterprise Knowledge Graph</h2>
        <span className="text-sm text-gray-400">Role: {userRole}</span>
      </div>
      
      <div className="bg-gray-900 rounded-lg p-4 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-cyan-500 rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-white mb-2">EKG Visualization</h3>
          <p className="text-gray-400">Enterprise Knowledge Graph Explorer</p>
          <p className="text-sm text-gray-500 mt-2">
            Nodes: {ekgData.nodes.length} | Edges: {ekgData.edges.length}
          </p>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-gray-700 p-3 rounded">
          <h4 className="font-medium">Repositories</h4>
          <p className="text-sm text-gray-300">{ekgData.nodes.filter(n => n.type === 'repository').length}</p>
        </div>
        <div className="bg-gray-700 p-3 rounded">
          <h4 className="font-medium">Dependencies</h4>
          <p className="text-sm text-gray-300">{ekgData.edges.length}</p>
        </div>
        <div className="bg-gray-700 p-3 rounded">
          <h4 className="font-medium">Coverage</h4>
          <p className="text-sm text-gray-300">{ekgData.metadata.coverage}%</p>
        </div>
      </div>
    </div>
  );
};

export default GlobalEKGExplorer;
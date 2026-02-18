import React, { useState, useEffect } from 'react';
import { AgentSuggestion, Repository } from '../../types/intelligence';

interface AgentReviewCenterProps {
  suggestions: AgentSuggestion[];
  repositories: Repository[];
  userRole: string;
  currentUserId: string;
}

const AgentReviewCenter: React.FC<AgentReviewCenterProps> = ({
  suggestions: initialSuggestions,
  repositories,
  userRole,
  currentUserId
}) => {
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>(initialSuggestions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewQueue, setReviewQueue] = useState<AgentSuggestion[]>([]);

  // Fetch suggestions from backend API
  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch from Node.js backend (port 3001)
      const response = await fetch('http://localhost:3001/results');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const suggestionsFromAPI = data.filter((item: any) => 
        item.type === 'analyze' && item.data && item.data.files
      ).flatMap((item: any) => 
        item.data.files.map((file: any) => ({
          id: `${item.id}-${file.file_name}`,
          repositoryId: 'repo-1', // Default for now
          agentType: 'security' as const,
          title: 'Security Issue Found',
          description: file.issues[0]?.description || 'Security vulnerability detected',
          severity: 'high' as const,
          confidence: 0.85,
          status: 'pending' as const,
          createdAt: new Date(item.timestamp),
          codePatch: {
            file: file.file_name,
            lineStart: file.issues[0]?.line || 1,
            lineEnd: file.issues[0]?.line || 1,
            originalCode: '// Original vulnerable code',
            suggestedCode: '// Secure code patch',
            language: 'javascript'
          },
          reasoning: 'AI analysis detected potential security vulnerability',
          validationResults: {
            testsPass: true,
            securityScanPass: true,
            performanceImpact: 'neutral' as const
          },
          tags: ['security', 'vulnerability'],
          assignedTo: currentUserId
        }))
      );

      setSuggestions(prev => [...suggestionsFromAPI, ...prev]);
      setReviewQueue(suggestionsFromAPI);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setError('Failed to load agent suggestions. Please check backend connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion acceptance
  const handleAcceptSuggestion = async (suggestion: AgentSuggestion) => {
    try {
      setLoading(true);
      
      // Call backend to accept suggestion
      const response = await fetch('/api/suggestions/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          userId: currentUserId,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update suggestion status
      const updatedSuggestions = suggestions.map(s => 
        s.id === suggestion.id 
          ? { ...s, status: 'accepted' as const, reviewedBy: currentUserId }
          : s
      );
      setSuggestions(updatedSuggestions);
      
      // Remove from review queue
      setReviewQueue(prev => prev.filter(s => s.id !== suggestion.id));
      
      // Send feedback to learning engine
      await sendFeedback(suggestion, 'accepted');
    } catch (err) {
      console.error('Failed to accept suggestion:', err);
      setError('Failed to accept suggestion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion rejection
  const handleRejectSuggestion = async (suggestion: AgentSuggestion, reason: string = 'Not applicable') => {
    try {
      setLoading(true);
      
      // Update suggestion status
      const updatedSuggestions = suggestions.map(s => 
        s.id === suggestion.id 
          ? { ...s, status: 'rejected' as const, reviewedBy: currentUserId }
          : s
      );
      setSuggestions(updatedSuggestions);
      
      // Remove from review queue
      setReviewQueue(prev => prev.filter(s => s.id !== suggestion.id));
      
      // Send feedback to learning engine to prevent similar suggestions
      await sendFeedback(suggestion, 'rejected', reason);
    } catch (err) {
      console.error('Failed to reject suggestion:', err);
      setError('Failed to reject suggestion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send feedback to learning engine
  const sendFeedback = async (suggestion: AgentSuggestion, action: 'accepted' | 'rejected', reason?: string) => {
    try {
      await fetch('http://localhost:3001/api/agent-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          action,
          reason,
          userId: currentUserId,
          agentType: suggestion.agentType,
          confidence: suggestion.confidence,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.error('Failed to send feedback:', err);
    }
  };

  // Load suggestions on component mount
  useEffect(() => {
    fetchSuggestions();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Agent Review Center</h2>
        <span className="text-sm text-gray-400">Role: {userRole}</span>
      </div>
      
      <div className="space-y-4">
        {suggestions.map((suggestion) => {
          const repo = repositories.find(r => r.id === suggestion.repositoryId);
          return (
            <div key={suggestion.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium">{suggestion.title}</h3>
                  <p className="text-sm text-gray-400">{suggestion.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    suggestion.severity === 'critical' ? 'bg-red-900 text-red-300' :
                    suggestion.severity === 'high' ? 'bg-orange-900 text-orange-300' :
                    suggestion.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-blue-900 text-blue-300'
                  }`}>
                    {suggestion.severity}
                  </span>
                  <span className="text-xs text-gray-400">Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Repository:</span>
                  <span className="ml-2">{repo?.name || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Agent Type:</span>
                  <span className="ml-2">{suggestion.agentType}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    suggestion.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                    suggestion.status === 'accepted' ? 'bg-green-900 text-green-300' :
                    suggestion.status === 'rejected' ? 'bg-red-900 text-red-300' :
                    'bg-gray-600 text-gray-300'
                  }`}>
                    {suggestion.status}
                  </span>
                </div>
              </div>
              
              <div className="mt-3">
                <p className="text-sm text-gray-400">Reasoning: {suggestion.reasoning}</p>
              </div>
              
              <div className="mt-3 flex space-x-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                  Accept
                </button>
                <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                  Reject
                </button>
                <button className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {suggestions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No agent suggestions to review at this time.
        </div>
      )}
    </div>
  );
};

export default AgentReviewCenter;
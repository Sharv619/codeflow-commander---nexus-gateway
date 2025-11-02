import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { AgentSuggestion, Repository, UserRole, AgentType, Severity, SuggestionStatus } from '../../types/intelligence';
import { GET_AGENT_ANALYSES, SUBMIT_AGENT_FEEDBACK, AGENT_RECOMMENDATION_SUBSCRIPTION } from '../../src/graphql';
import Toast from '../../src/components/Toast';

interface AgentReviewCenterProps {
  suggestions: AgentSuggestion[];
  repositories: Repository[];
  userRole: UserRole;
  currentUserId: string;
}

const AgentReviewCenter: React.FC<AgentReviewCenterProps> = ({
  suggestions: initialSuggestions,
  repositories,
  userRole,
  currentUserId
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<AgentSuggestion | null>(null);
  const [filterStatus, setFilterStatus] = useState<SuggestionStatus | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [filterAgentType, setFilterAgentType] = useState<AgentType | 'all'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch real agent analyses data
  const { loading, error, data, refetch } = useQuery(GET_AGENT_ANALYSES, {
    variables: {
      status: filterStatus !== 'all' ? filterStatus : undefined,
      limit: 50,
      offset: 0
    },
  });

  const agentAnalyses = data?.agentAnalyses || initialSuggestions;

  // Submit agent feedback mutation
  const [submitFeedback, { loading: feedbackLoading }] = useMutation(SUBMIT_AGENT_FEEDBACK, {
    onCompleted: (result) => {
      if (result.submitAgentFeedback.success) {
        // Refetch data to update the UI
        refetch();
        // Show success message (could be enhanced with a toast notification)
        console.log('Feedback submitted successfully');
      }
    },
    onError: (error) => {
      console.error('Error submitting feedback:', error);
      // Could show error toast here
    }
  });

  // Real-time agent recommendations subscription
  useSubscription(AGENT_RECOMMENDATION_SUBSCRIPTION, {
    onData: ({ data }) => {
      if (data?.data?.agentRecommendation) {
        const recommendation = data.data.agentRecommendation;
        console.log('New agent recommendation received:', recommendation);
        // Refetch data to include the new recommendation
        refetch();
        // Show toast notification
        setToast({
          message: `New ${recommendation.agentType} suggestion: ${recommendation.title}`,
          type: 'info'
        });
      }
    },
    onError: (error) => {
      console.error('Subscription error:', error);
      setToast({
        message: 'Failed to receive real-time updates',
        type: 'error'
      });
    }
  });

  // Filter suggestions based on current filters
  const filteredSuggestions = agentAnalyses.filter(suggestion => {
    if (filterSeverity !== 'all' && suggestion.severity !== filterSeverity) return false;
    if (filterAgentType !== 'all' && suggestion.agentType !== filterAgentType) return false;
    return true;
  });

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case Severity.Critical:
        return 'bg-red-500';
      case Severity.High:
        return 'bg-orange-500';
      case Severity.Medium:
        return 'bg-yellow-500';
      case Severity.Low:
        return 'bg-blue-500';
      case Severity.Info:
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case Severity.Critical:
        return '🚨';
      case Severity.High:
        return '⚠️';
      case Severity.Medium:
        return '🔔';
      case Severity.Low:
        return 'ℹ️';
      case Severity.Info:
        return '💡';
      default:
        return '❓';
    }
  };

  const getAgentTypeIcon = (type: AgentType) => {
    switch (type) {
      case AgentType.Security:
        return '🔒';
      case AgentType.Architecture:
        return '🏗️';
      case AgentType.Performance:
        return '⚡';
      case AgentType.Testing:
        return '🧪';
      case AgentType.Documentation:
        return '📚';
      case AgentType.CodeQuality:
        return '✨';
      default:
        return '🤖';
    }
  };

  const getStatusColor = (status: SuggestionStatus) => {
    switch (status) {
      case SuggestionStatus.Accepted:
        return 'text-green-400';
      case SuggestionStatus.Rejected:
        return 'text-red-400';
      case SuggestionStatus.Pending:
        return 'text-yellow-400';
      case SuggestionStatus.Implemented:
        return 'text-blue-400';
      case SuggestionStatus.Expired:
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleAcceptSuggestion = async (suggestion: AgentSuggestion) => {
    try {
      await submitFeedback({
        variables: {
          input: {
            analysisId: suggestion.id,
            action: 'ACCEPTED',
            reason: 'Accepted by user via Agent Review Center'
          }
        }
      });
      // Show success toast
      setToast({
        message: `Suggestion "${suggestion.title}" accepted successfully`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      setToast({
        message: 'Failed to accept suggestion',
        type: 'error'
      });
    }
  };

  const handleRejectSuggestion = async (suggestion: AgentSuggestion) => {
    try {
      await submitFeedback({
        variables: {
          input: {
            analysisId: suggestion.id,
            action: 'REJECTED',
            reason: 'Rejected by user via Agent Review Center'
          }
        }
      });
      // Show success toast
      setToast({
        message: `Suggestion "${suggestion.title}" rejected`,
        type: 'info'
      });
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      setToast({
        message: 'Failed to reject suggestion',
        type: 'error'
      });
    }
  };

  const getRepositoryName = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    return repo ? repo.name : 'Unknown Repository';
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-200">Agent Review Center</h2>
          <p className="text-gray-400 mt-1">
            Review and manage AI-generated code suggestions and patches
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-cyan-400">{filteredSuggestions.length}</div>
          <div className="text-sm text-gray-400">Active Suggestions</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as SuggestionStatus | 'all')}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="implemented">Implemented</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div>
            <label htmlFor="severity-filter" className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
            <select
              id="severity-filter"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as Severity | 'all')}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div>
            <label htmlFor="agent-type-filter" className="block text-sm font-medium text-gray-300 mb-2">Agent Type</label>
            <select
              id="agent-type-filter"
              value={filterAgentType}
              onChange={(e) => setFilterAgentType(e.target.value as AgentType | 'all')}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">All Types</option>
              <option value="security">Security</option>
              <option value="architecture">Architecture</option>
              <option value="performance">Performance</option>
              <option value="testing">Testing</option>
              <option value="documentation">Documentation</option>
              <option value="code_quality">Code Quality</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suggestions List and Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Suggestions List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-200">Suggestions</h3>

          {filteredSuggestions.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <div className="text-4xl mb-4">🎉</div>
              <h4 className="text-lg font-medium text-gray-200 mb-2">All Caught Up!</h4>
              <p className="text-gray-400">No suggestions match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredSuggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  onClick={() => setSelectedSuggestion(suggestion)}
                  className={`bg-gray-800 rounded-lg p-4 border cursor-pointer transition-colors hover:bg-gray-750 ${
                    selectedSuggestion?.id === suggestion.id
                      ? 'border-cyan-500 bg-cyan-500/5'
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getAgentTypeIcon(suggestion.agentType)}</span>
                      <span className="text-lg">{getSeverityIcon(suggestion.severity)}</span>
                      <h4 className="font-medium text-gray-200">{suggestion.title}</h4>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(suggestion.severity)}`}>
                      {suggestion.severity.toUpperCase()}
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-2">{suggestion.description}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{getRepositoryName(suggestion.repositoryId)}</span>
                    <span>{suggestion.createdAt.toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(suggestion.status)} bg-opacity-20`}>
                        {suggestion.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(suggestion.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>

                    {suggestion.status === SuggestionStatus.Pending && (
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptSuggestion(suggestion);
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectSuggestion(suggestion);
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail View */}
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Suggestion Details</h3>

          {selectedSuggestion ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getAgentTypeIcon(selectedSuggestion.agentType)}</span>
                    <h4 className="text-lg font-semibold text-gray-200">{selectedSuggestion.title}</h4>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${getSeverityColor(selectedSuggestion.severity)}`}>
                    {selectedSuggestion.severity.toUpperCase()}
                  </div>
                </div>
                <p className="text-gray-400">{selectedSuggestion.description}</p>
              </div>

              {/* Code Patch */}
              <div className="p-4 border-b border-gray-700">
                <h5 className="text-sm font-medium text-gray-300 mb-2">Code Changes</h5>
                <div className="bg-gray-900 rounded p-3 font-mono text-sm overflow-x-auto">
                  <div className="text-gray-500 mb-2">File: {selectedSuggestion.codePatch.file}</div>
                  <div className="text-red-400 mb-1">- {selectedSuggestion.codePatch.originalCode}</div>
                  <div className="text-green-400">+ {selectedSuggestion.codePatch.suggestedCode}</div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="p-4 border-b border-gray-700">
                <h5 className="text-sm font-medium text-gray-300 mb-2">Agent Reasoning</h5>
                <p className="text-gray-300 text-sm">{selectedSuggestion.reasoning}</p>
              </div>

              {/* Validation Results */}
              <div className="p-4 border-b border-gray-700">
                <h5 className="text-sm font-medium text-gray-300 mb-2">Validation Results</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className={selectedSuggestion.validationResults.testsPass ? 'text-green-400' : 'text-red-400'}>
                      {selectedSuggestion.validationResults.testsPass ? '✅' : '❌'}
                    </span>
                    <span className="text-gray-300">Tests Pass</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={selectedSuggestion.validationResults.securityScanPass ? 'text-green-400' : 'text-red-400'}>
                      {selectedSuggestion.validationResults.securityScanPass ? '✅' : '❌'}
                    </span>
                    <span className="text-gray-300">Security Scan</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={
                      selectedSuggestion.validationResults.performanceImpact === 'positive' ? 'text-green-400' :
                      selectedSuggestion.validationResults.performanceImpact === 'negative' ? 'text-red-400' :
                      'text-yellow-400'
                    }>
                      {selectedSuggestion.validationResults.performanceImpact === 'positive' ? '📈' :
                       selectedSuggestion.validationResults.performanceImpact === 'negative' ? '📉' : '➡️'}
                    </span>
                    <span className="text-gray-300">Performance Impact</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={selectedSuggestion.validationResults.breakingChanges ? 'text-red-400' : 'text-green-400'}>
                      {selectedSuggestion.validationResults.breakingChanges ? '⚠️' : '✅'}
                    </span>
                    <span className="text-gray-300">Breaking Changes</span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Repository:</span>
                    <div className="text-gray-300">{getRepositoryName(selectedSuggestion.repositoryId)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Confidence:</span>
                    <div className="text-gray-300">{(selectedSuggestion.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <div className="text-gray-300">{selectedSuggestion.createdAt.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <div className={`capitalize ${getStatusColor(selectedSuggestion.status)}`}>
                      {selectedSuggestion.status}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <div className="text-4xl mb-4">👆</div>
              <h4 className="text-lg font-medium text-gray-200 mb-2">Select a Suggestion</h4>
              <p className="text-gray-400">Click on any suggestion from the list to view detailed information and take action.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentReviewCenter;

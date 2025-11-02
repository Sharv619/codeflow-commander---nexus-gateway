import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Repository, UserRole, AgentType } from '../../types/intelligence';
import { UPDATE_AGENT_CONFIGURATION } from '../../src/graphql';

interface AgentConfigurationPanelProps {
  repositories: Repository[];
  userRole: UserRole;
}

const AgentConfigurationPanel: React.FC<AgentConfigurationPanelProps> = ({
  repositories,
  userRole
}) => {
  const [selectedRepository, setSelectedRepository] = useState<string>('all');
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>(AgentType.Security);
  const [config, setConfig] = useState({
    enabled: true,
    confidenceThreshold: 0.7,
    autoApplyEnabled: true,
    autoApplyThreshold: 0.9,
    suggestionsPerHour: 10,
    suggestionsPerDay: 50,
    includePatterns: 'src/**/*.js\nsrc/**/*.ts\nlib/**/*.js',
    excludePatterns: 'node_modules/**\ndist/**\n*.test.js'
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Update agent configuration mutation
  const [updateConfiguration, { loading: configLoading }] = useMutation(UPDATE_AGENT_CONFIGURATION, {
    onCompleted: (result) => {
      if (result.updateAgentConfiguration.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    },
    onError: (error) => {
      console.error('Error updating configuration:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  });

  const handleSaveConfiguration = async () => {
    setSaveStatus('saving');
    try {
      await updateConfiguration({
        variables: {
          input: {
            agentType: selectedAgentType,
            repositoryId: selectedRepository !== 'all' ? selectedRepository : undefined,
            enabled: config.enabled,
            confidenceThreshold: config.confidenceThreshold,
            autoApplyThreshold: config.autoApplyEnabled ? config.autoApplyThreshold : null,
            rateLimit: {
              suggestionsPerHour: config.suggestionsPerHour,
              suggestionsPerDay: config.suggestionsPerDay
            },
            scope: {
              includePatterns: config.includePatterns.split('\n').filter(p => p.trim()),
              excludePatterns: config.excludePatterns.split('\n').filter(p => p.trim())
            }
          }
        }
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const agentTypes = [
    { type: AgentType.Security, name: 'Security Agent', icon: '🔒', description: 'Identifies security vulnerabilities and suggests fixes' },
    { type: AgentType.Architecture, name: 'Architecture Agent', icon: '🏗️', description: 'Reviews code architecture and design patterns' },
    { type: AgentType.Performance, name: 'Performance Agent', icon: '⚡', description: 'Optimizes code performance and identifies bottlenecks' },
    { type: AgentType.Testing, name: 'Testing Agent', icon: '🧪', description: 'Improves test coverage and quality' },
    { type: AgentType.Documentation, name: 'Documentation Agent', icon: '📚', description: 'Ensures code is well-documented' },
    { type: AgentType.CodeQuality, name: 'Code Quality Agent', icon: '✨', description: 'Maintains coding standards and best practices' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-200">Agent Configuration Panel</h2>
        <p className="text-gray-400 mt-1">
          Configure autonomous agent behavior and permissions across repositories
        </p>
      </div>

      {/* Repository Selector */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <label htmlFor="repository-selector" className="block text-sm font-medium text-gray-300 mb-2">Target Repository</label>
        <select
          id="repository-selector"
          value={selectedRepository}
          onChange={(e) => setSelectedRepository(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="all">All Repositories (Global Settings)</option>
          {repositories.map(repo => (
            <option key={repo.id} value={repo.id}>{repo.name}</option>
          ))}
        </select>
      </div>

      {/* Agent Type Selector */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-4">Agent Type</label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agentTypes.map(agent => (
            <button
              key={agent.type}
              onClick={() => setSelectedAgentType(agent.type)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedAgentType === agent.type
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{agent.icon}</span>
                <span className="font-medium text-gray-200">{agent.name}</span>
              </div>
              <p className="text-xs text-gray-400">{agent.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-200 mb-6">
          {agentTypes.find(a => a.type === selectedAgentType)?.name} Configuration
        </h3>

        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    id="status-enabled"
                    name="status"
                    value="enabled"
                    checked={config.enabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.value === 'enabled' }))}
                    className="mr-2"
                  />
                  <span className="text-green-400">Enabled</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    id="status-disabled"
                    name="status"
                    value="disabled"
                    checked={!config.enabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.value === 'enabled' }))}
                    className="mr-2"
                  />
                  <span className="text-red-400">Disabled</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="confidence-threshold" className="block text-sm font-medium text-gray-300 mb-2">Confidence Threshold</label>
              <input
                type="range"
                id="confidence-threshold"
                min="0"
                max="1"
                step="0.1"
                value={config.confidenceThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                className="w-full"
                aria-label={`Confidence threshold: ${(config.confidenceThreshold * 100).toFixed(0)}%`}
              />
              <div className="text-xs text-gray-400 mt-1">Minimum confidence: {(config.confidenceThreshold * 100).toFixed(0)}%</div>
            </div>
          </div>

          {/* Auto-apply Settings */}
          <div className="border-t border-gray-700 pt-6">
            <h4 className="text-md font-medium text-gray-200 mb-4">Auto-apply Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="auto-apply-enabled"
                    checked={config.autoApplyEnabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoApplyEnabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-300">Enable Auto-apply</span>
                </label>
                <p className="text-xs text-gray-400">Automatically apply high-confidence suggestions</p>
              </div>

              <div>
                <label htmlFor="auto-apply-threshold" className="block text-sm font-medium text-gray-300 mb-2">Auto-apply Threshold</label>
                <input
                  type="range"
                  id="auto-apply-threshold"
                  min="0.8"
                  max="1"
                  step="0.05"
                  value={config.autoApplyThreshold}
                  onChange={(e) => setConfig(prev => ({ ...prev, autoApplyThreshold: parseFloat(e.target.value) }))}
                  disabled={!config.autoApplyEnabled}
                  className="w-full disabled:opacity-50"
                  aria-label={`Auto-apply threshold: ${(config.autoApplyThreshold * 100).toFixed(0)}%`}
                />
                <div className="text-xs text-gray-400 mt-1">Auto-apply confidence: {(config.autoApplyThreshold * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* Rate Limiting */}
          <div className="border-t border-gray-700 pt-6">
            <h4 className="text-md font-medium text-gray-200 mb-4">Rate Limiting</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="suggestions-per-hour" className="block text-sm font-medium text-gray-300 mb-2">Suggestions per Hour</label>
                <input
                  type="number"
                  id="suggestions-per-hour"
                  value={config.suggestionsPerHour}
                  onChange={(e) => setConfig(prev => ({ ...prev, suggestionsPerHour: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label htmlFor="suggestions-per-day" className="block text-sm font-medium text-gray-300 mb-2">Suggestions per Day</label>
                <input
                  type="number"
                  id="suggestions-per-day"
                  value={config.suggestionsPerDay}
                  onChange={(e) => setConfig(prev => ({ ...prev, suggestionsPerDay: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Scope Configuration */}
          <div className="border-t border-gray-700 pt-6">
            <h4 className="text-md font-medium text-gray-200 mb-4">Scope Configuration</h4>
            <div className="space-y-4">
              <div>
                <label htmlFor="include-patterns" className="block text-sm font-medium text-gray-300 mb-2">File Patterns (Include)</label>
                <textarea
                  id="include-patterns"
                  value={config.includePatterns}
                  onChange={(e) => setConfig(prev => ({ ...prev, includePatterns: e.target.value }))}
                  placeholder="src/**/*.js&#10;src/**/*.ts&#10;lib/**/*.js"
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm"
                />
              </div>

              <div>
                <label htmlFor="exclude-patterns" className="block text-sm font-medium text-gray-300 mb-2">Exclude Patterns</label>
                <textarea
                  id="exclude-patterns"
                  value={config.excludePatterns}
                  onChange={(e) => setConfig(prev => ({ ...prev, excludePatterns: e.target.value }))}
                  placeholder="node_modules/**&#10;dist/**&#10;*.test.js"
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex items-center justify-between">
              <div>
                {saveStatus === 'success' && (
                  <span className="text-green-400 text-sm flex items-center">
                    ✅ Configuration saved successfully
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-red-400 text-sm flex items-center">
                    ❌ Error saving configuration
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveConfiguration}
                disabled={configLoading || saveStatus === 'saving'}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors flex items-center space-x-2"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentConfigurationPanel;

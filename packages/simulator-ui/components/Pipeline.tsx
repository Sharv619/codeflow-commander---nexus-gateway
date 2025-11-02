import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { PipelineStageInfo, StageExecution, CodeReviewResult, PipelineConfig, SimulationResult, StageConfig } from '../../../types';
import { StageStatus, SimulationMode } from '../../../types';
import { MOCK_SUCCESS_REVIEW, MOCK_FAILURE_REVIEW } from '../../../constants';
import PipelineStage from './PipelineStage';
import CodeReviewDetails from './CodeReviewDetails';
import LogOutput from './LogOutput';
import TestResultsDetails from './TestResultsDetails';
import { simulationEngine } from '../../../simulationEngine';
import { PipelineConfigManager } from '../../../pipelineConfigs';

const SIMULATION_DELAY_MS = 1500;

const sleep = <T,>(ms: number, value: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(value), ms));

const SpinnerIcon: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const SuccessIcon: React.FC = () => (
    <div className="p-2 bg-green-500/20 rounded-full">
        <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    </div>
);

const FailureIcon: React.FC = () => (
    <div className="p-2 bg-red-500/20 rounded-full">
        <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    </div>
);


const Pipeline: React.FC = () => {
  // Enhanced state for configurable pipelines
  const [currentConfig, setCurrentConfig] = useState<PipelineConfig | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [executions, setExecutions] = useState<Record<string, StageExecution>>({});
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'running' | 'success' | 'failed' | 'partial' | 'cancelled'>('idle');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
  const [testResult, setTestResult] = useState<string[] | null>(null);
  const [commitMessage, setCommitMessage] = useState('feat(auth): Improve JWT caching layer');
  const [availableTemplates] = useState(() => PipelineConfigManager.getAvailableTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState('nodejs-basic');

  // Load initial pipeline configuration
  useEffect(() => {
    const config = PipelineConfigManager.getPipelineById(selectedTemplate);
    if (config) {
      setCurrentConfig(config);
    }
  }, [selectedTemplate]);

  const resetState = useCallback(() => {
    setSimulationResult(null);
    setExecutions({});
    setPipelineStatus('idle');
    setSelectedStageId(null);
    setReviewResult(null);
    setTestResult(null);
  }, []);

  const handleRunPipeline = useCallback(async () => {
    if (!currentConfig) return;

    resetState();
    setPipelineStatus('running');

    try {
      // Update config with current commit message
      const updatedConfig = {
        ...currentConfig,
        environment: {
          ...currentConfig.environment,
          COMMIT_MESSAGE: commitMessage
        }
      };

      // Execute pipeline using the simulation engine
      const result = await simulationEngine.executePipeline(updatedConfig);
      setSimulationResult(result);

      // Convert simulation result to component state
      const executionMap: Record<string, StageExecution> = {};
      result.stages.forEach((stage: StageExecution) => {
        executionMap[stage.id] = stage;
      });
      setExecutions(executionMap);

      // Set overall pipeline status
      setPipelineStatus(result.status);

      // Extract review and test results for display
      const aiReviewStage = result.stages.find((s: StageExecution) => s.id === 'ai-review');
      if (aiReviewStage) {
        if (aiReviewStage.status === StageStatus.Success) {
          setReviewResult(MOCK_SUCCESS_REVIEW);
        } else if (aiReviewStage.status === StageStatus.Failed) {
          setReviewResult(MOCK_FAILURE_REVIEW);
        }
      }

      const testStage = result.stages.find((s: StageExecution) => s.id === 'unit-tests');
      if (testStage) {
        setTestResult(testStage.logs);
      }

    } catch (error) {
      console.error('Pipeline execution failed:', error);
      setPipelineStatus('failed');
    }
  }, [currentConfig, commitMessage, resetState]);

  const handleTemplateChange = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    resetState();
  }, [resetState]);

  const selectedExecution = selectedStageId ? executions[selectedStageId] : null;

  return (
    <div className="space-y-8">
      <div className="p-6 bg-gray-800 rounded-lg shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold">CI/CD Automation</h2>
              <p className="text-gray-400">Simulating an automated build, test, and deploy pipeline.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
                onClick={handleRunPipeline}
                disabled={pipelineStatus === 'running'}
                className="px-6 py-2 flex items-center justify-center bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors duration-200 shadow-md"
            >
                {pipelineStatus === 'running' ? <><SpinnerIcon /> Running...</> : 'Run Pipeline'}
            </button>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-4">
          <label htmlFor="commit-message" className="block text-sm font-medium text-gray-300 mb-2">Commit Message</label>
          <input
            type="text"
            id="commit-message"
            className="w-full bg-gray-700/50 border border-gray-600 text-white text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500 p-2 font-mono"
            value={commitMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCommitMessage(e.target.value)}
            disabled={pipelineStatus === 'running'}
            placeholder="feat(auth): Improve JWT caching layer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
        {currentConfig?.stages.map((stage: StageConfig, index: number) => (
          <PipelineStage
            key={stage.id}
            stageInfo={stage}
            execution={executions[stage.id]}
            isSelected={selectedStageId === stage.id}
            onClick={() => setSelectedStageId(stage.id)}
            isLast={index === (currentConfig?.stages.length ?? 0) - 1}
          />
        ))}
      </div>

      {pipelineStatus === 'success' && simulationResult && (
        <div className="p-4 rounded-lg bg-green-500/20 text-green-300 flex items-center space-x-4 shadow-lg">
          <SuccessIcon />
          <div>
            <h4 className="font-bold text-lg text-green-200">Pipeline Succeeded</h4>
            <p>Total duration: {(simulationResult.metrics.totalDuration / 1000).toFixed(2)}s</p>
            <p>Stages: {simulationResult.metrics.successCount}/{simulationResult.metrics.stageCount} passed</p>
          </div>
        </div>
      )}
      {(pipelineStatus === 'failed' || pipelineStatus === 'partial') && simulationResult && (
         <div className="p-4 rounded-lg bg-red-500/20 text-red-300 flex items-center space-x-4 shadow-lg">
            <FailureIcon />
            <div>
              <h4 className="font-bold text-lg text-red-200">
                {pipelineStatus === 'failed' ? 'Pipeline Failed' : 'Pipeline Partially Failed'}
              </h4>
              <p>Failed stages: {simulationResult.metrics.failureCount}</p>
              <p>Skipped stages: {simulationResult.metrics.skippedCount}</p>
            </div>
        </div>
      )}


      <div className="p-6 bg-gray-800 rounded-lg shadow-lg min-h-[300px]">
        <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">
          {selectedStageId === 'ai-review' && reviewResult ? "AI Code Review Details" :
           selectedStageId === 'unit-tests' && testResult ? "Test Results" : "Logs"}
        </h3>
        {selectedStageId === 'ai-review' && reviewResult ? (
          <CodeReviewDetails result={reviewResult} />
        ) : selectedStageId === 'unit-tests' && testResult ? (
          <TestResultsDetails logs={testResult} />
        ) : (
          <LogOutput logs={selectedExecution?.logs ?? ['Select a stage to view its logs.']} />
        )}
      </div>
    </div>
  );
};

export default Pipeline;

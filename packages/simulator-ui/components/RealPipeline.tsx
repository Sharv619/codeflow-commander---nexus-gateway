import React, { useState, useCallback, useEffect } from 'react';
import PipelineStage from './PipelineStage';
import CodeReviewDetails from './CodeReviewDetails';
import LogOutput from './LogOutput';
import TestResultsDetails from './TestResultsDetails';

// Types for real pipeline execution
type PipelineStatus = 'idle' | 'running' | 'success' | 'failed' | 'partial' | 'cancelled';
type StageStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

interface RealStage {
  id: string;
  name: string;
  status: StageStatus;
  startTime: number;
  endTime: number | null;
  duration: number;
  command: string;
  logs: string[];
  error: string | null;
}

interface RealExecution {
  id: string;
  status: PipelineStatus;
  startTime: number;
  stages: RealStage[];
  overallStatus: PipelineStatus;
  metrics: {
    totalDuration: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
  };
  error?: string;
}

interface ProjectConfig {
  projectType: string;
  packageManagers: string[];
  buildTools: string[];
  testFrameworks: string[];
  lintingTools: string[];
  deploymentTargets: string[];
}

interface PipelineStageConfig {
  name: string;
  command: string;
  timeout: number;
  critical: boolean;
  rollback: string;
  failureMode: string;
}

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

const RealPipeline: React.FC = () => {
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStageConfig[]>([]);
  const [execution, setExecution] = useState<RealExecution | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'running' | 'success' | 'failed' | 'partial' | 'cancelled'>('idle');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('feat(auth): Improve JWT caching layer');
  const [isDetecting, setIsDetecting] = useState(false);

  // Load project configuration on mount
  useEffect(() => {
    detectProjectConfig();
  }, []);

  // Poll for execution status if running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (execution && execution.status === 'running') {
      interval = setInterval(() => {
        fetchExecutionStatus(execution.id);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [execution]);

  const detectProjectConfig = async () => {
    setIsDetecting(true);
    try {
      const response = await fetch('/api/pipeline/config');
      const data = await response.json();
      
      if (data.success) {
        setProjectConfig(data.config);
        setPipelineStages(data.stages);
      }
    } catch (error) {
      console.error('Failed to detect project config:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const fetchExecutionStatus = async (executionId: string) => {
    try {
      const response = await fetch(`/api/pipeline/status/${executionId}`);
      const data = await response.json();
      
      if (data.success) {
        setExecution(data.execution);
        setPipelineStatus(data.execution.status);
      }
    } catch (error) {
      console.error('Failed to fetch execution status:', error);
    }
  };

  const fetchStageLogs = async (executionId: string, stageId: string) => {
    try {
      const response = await fetch(`/api/pipeline/logs/${executionId}/${stageId}`);
      const data = await response.json();
      
      if (data.success) {
        return data.stage.logs;
      }
    } catch (error) {
      console.error('Failed to fetch stage logs:', error);
    }
    return [];
  };

  const handleRunPipeline = async () => {
    if (!pipelineStages.length) return;

    setPipelineStatus('running');

    try {
      const response = await fetch('/api/pipeline/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commitMessage,
          stages: pipelineStages
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const newExecution: RealExecution = {
          id: data.executionId,
          status: 'running',
          startTime: Date.now(),
          stages: [],
          overallStatus: 'running',
          metrics: {
            totalDuration: 0,
            successCount: 0,
            failureCount: 0,
            skippedCount: 0
          }
        };
        setExecution(newExecution);
      }
    } catch (error) {
      console.error('Failed to start pipeline:', error);
      setPipelineStatus('failed');
    }
  };

  const handleAbortPipeline = async () => {
    if (!execution) return;

    try {
      const response = await fetch(`/api/pipeline/abort/${execution.id}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPipelineStatus('cancelled');
        if (execution) {
          execution.status = 'cancelled';
          execution.overallStatus = 'cancelled';
        }
      }
    } catch (error) {
      console.error('Failed to abort pipeline:', error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    // For real execution, we use detected configuration
    // This would integrate with template system if needed
  };

  const selectedStage = selectedStageId && execution 
    ? execution.stages.find(s => s.id === selectedStageId) 
    : null;

  const getStageStatus = (stageName: string): 'pending' | 'running' | 'success' | 'failed' | 'cancelled' => {
    if (!execution) return 'pending';
    
    const stage = execution.stages.find(s => s.name === stageName);
    if (!stage) return 'pending';
    
    return stage.status;
  };

  return (
    <div className="space-y-8">
      <div className="p-6 bg-gray-800 rounded-lg shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold">Real CI/CD Pipeline Execution</h2>
              <p className="text-gray-400">Execute real commands and see actual CI/CD pipeline results.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
                onClick={detectProjectConfig}
                disabled={isDetecting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors duration-200"
            >
                {isDetecting ? 'Detecting...' : 'Detect Project'}
            </button>
            <button
                onClick={handleRunPipeline}
                disabled={pipelineStatus === 'running' || !pipelineStages.length}
                className="px-6 py-2 flex items-center justify-center bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-semibold transition-colors duration-200 shadow-md"
            >
                {pipelineStatus === 'running' ? <><SpinnerIcon /> Running...</> : 'Execute Real Pipeline'}
            </button>
            {execution && execution.status === 'running' && (
              <button
                  onClick={handleAbortPipeline}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold transition-colors duration-200"
              >
                  Abort Pipeline
              </button>
            )}
          </div>
        </div>
        
        {projectConfig && (
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold mb-2">Detected Project Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Project Type:</span> {projectConfig.projectType}
              </div>
              <div>
                <span className="text-gray-400">Package Managers:</span> {projectConfig.packageManagers.join(', ')}
              </div>
              <div>
                <span className="text-gray-400">Build Tools:</span> {projectConfig.buildTools.join(', ')}
              </div>
              <div>
                <span className="text-gray-400">Test Frameworks:</span> {projectConfig.testFrameworks.join(', ')}
              </div>
            </div>
          </div>
        )}
        
        <div className="border-t border-gray-700 pt-4">
          <label htmlFor="commit-message" className="block text-sm font-medium text-gray-300 mb-2">Commit Message</label>
          <input
            type="text"
            id="commit-message"
            className="w-full bg-gray-700/50 border border-gray-600 text-white text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500 p-2 font-mono"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            disabled={pipelineStatus === 'running'}
            placeholder="feat(auth): Improve JWT caching layer"
          />
        </div>
      </div>

      {pipelineStages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
          {pipelineStages.map((stage, index) => (
            <PipelineStage
              key={stage.name}
              stageInfo={{
                id: stage.name.toLowerCase().replace(/\s+/g, '-'),
                name: stage.name,
                status: getStageStatus(stage.name),
                duration: 0,
                mode: 'real'
              }}
              execution={execution?.stages.find(s => s.name === stage.name)}
              isSelected={selectedStageId === stage.name}
              onClick={() => setSelectedStageId(stage.name)}
              isLast={index === pipelineStages.length - 1}
            />
          ))}
        </div>
      )}

      {execution && (
        <>
          {execution.status === 'success' && (
            <div className="p-4 rounded-lg bg-green-500/20 text-green-300 flex items-center space-x-4 shadow-lg">
              <SuccessIcon />
              <div>
                <h4 className="font-bold text-lg text-green-200">Pipeline Succeeded</h4>
                <p>Total duration: {(execution.metrics.totalDuration / 1000).toFixed(2)}s</p>
                <p>Stages: {execution.metrics.successCount}/{execution.metrics.successCount + execution.metrics.failureCount + execution.metrics.skippedCount} passed</p>
              </div>
            </div>
          )}
          
          {(execution.status === 'failed' || execution.status === 'partial') && (
            <div className="p-4 rounded-lg bg-red-500/20 text-red-300 flex items-center space-x-4 shadow-lg">
              <FailureIcon />
              <div>
                <h4 className="font-bold text-lg text-red-200">
                  {execution.status === 'failed' ? 'Pipeline Failed' : 'Pipeline Partially Failed'}
                </h4>
                <p>Failed stages: {execution.metrics.failureCount}</p>
                <p>Skipped stages: {execution.metrics.skippedCount}</p>
                {execution.error && <p>Error: {execution.error}</p>}
              </div>
            </div>
          )}
        </>
      )}

      <div className="p-6 bg-gray-800 rounded-lg shadow-lg min-h-[300px]">
        <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">
          {selectedStage ? `${selectedStage.name} - Logs` : "Stage Logs"}
        </h3>
        {selectedStage ? (
          <LogOutput logs={selectedStage.logs} />
        ) : (
          <div className="text-gray-400">
            Select a stage to view its real-time execution logs.
            {execution && execution.status === 'running' && (
              <p className="mt-2 text-yellow-400">Pipeline is running - logs will update in real-time.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealPipeline;
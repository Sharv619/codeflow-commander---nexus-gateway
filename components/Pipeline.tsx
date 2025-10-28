import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { PipelineStageInfo, StageExecution, CodeReviewResult } from '../types';
import { StageStatus } from '../types';
import { PIPELINE_STAGES, MOCK_SUCCESS_REVIEW, MOCK_FAILURE_REVIEW } from '../constants';
import PipelineStage from './PipelineStage';
import CodeReviewDetails from './CodeReviewDetails';
import LogOutput from './LogOutput';
import TestResultsDetails from './TestResultsDetails'; // Import new component

const SIMULATION_DELAY_MS = 1500;

const sleep = <T,>(ms: number, value: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(value), ms));

const getTimestamp = (pipelineStartTime: number): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `[${hours}:${minutes}:${seconds}]`;
};

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
  const [executions, setExecutions] = useState<Record<string, StageExecution>>({});
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null); // Re-added selectedStageId
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null); // New state for Jest results
  const [commitMessage, setCommitMessage] = useState('feat(auth): Improve JWT caching layer');
  const [pipelineStartTime, setPipelineStartTime] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [failedStageName, setFailedStageName] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setExecutions({});
    setPipelineStatus('idle');
    setSelectedStageId(null);
    setReviewResult(null);
    setTestResult(null); // Reset new state
    setPipelineStartTime(null);
    setTotalDuration(0);
    setFailedStageName(null);
  }, []);
  
  const runStage = useCallback(async (stageInfo: PipelineStageInfo, startTime: number): Promise<{success: boolean; duration: number}> => {
    const stageStartTime = Date.now();
    const ts = () => getTimestamp(startTime);

    setExecutions(prev => ({
      ...prev,
      [stageInfo.id]: { id: stageInfo.id, status: StageStatus.Running, logs: [`${ts()} 🚀 Starting stage: ${stageInfo.name}...`] }
    }));
    setSelectedStageId(stageInfo.id);

    let logs: string[] = [];
    let success = true;

    // Simulate work
    switch (stageInfo.id) {
      case 'trigger':
        logs = [
          `${ts()} [INFO] Git push detected on branch \`main\`.`,
          `${ts()} [INFO] Commit \`${commitMessage || 'feat(auth): Improve JWT caching layer'}\` by \`a.engineer@example.com\`.`,
          `${ts()} [SUCCESS] Workflow for Project: Nexus Gateway triggered.`
        ];
        break;
      case 'ai-review':
        try {
          const response = await fetch('http://localhost:3001/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ diff: '/* Git diff would go here */' }),
          });
          const result = await response.json();
          setReviewResult(result);
          logs = [
            `${ts()} [INFO] Analyzing code changes for Project: Nexus Gateway...`,
            `${ts()} [API] Sent diff to analysis service.`,
            `${ts()} [RESULT] Analysis complete. Status: ${result.overallStatus}`,
            `${ts()} [SUMMARY] ${result.summary}`
          ];
          success = result.overallStatus === 'PASS';
        } catch (error) {
          logs = [`${ts()} [ERROR] Failed to connect to the analysis server.`];
          success = false;
        }
        break;
      case 'docker-build':
        await sleep(SIMULATION_DELAY_MS, null);
        logs = [
          `${ts()} [DOCKER] Building Docker image \`nexus-gateway-service:latest\`...`,
          `${ts()} [DOCKER] Step 1/9 : FROM golang:1.21-alpine`,
          `${ts()} [DOCKER] Step 2/9 : WORKDIR /app`,
          `${ts()} [DOCKER] Step 9/9 : CMD ["./nexus-gateway"]`,
          `${ts()} [DOCKER] Successfully built a9f4b2c1d8e7`,
          `${ts()} [TRIVY] Scanning image \`nexus-gateway-service:latest\` for vulnerabilities...`,
          `${ts()} [TRIVY] Found 0 critical, 1 high, 2 low vulnerabilities.`,
          `${ts()} [INFO] Vulnerability scan passed policy (ignore high: CVE-2023-45288).`
        ];
        break;
      case 'unit-tests':
        try {
          const response = await fetch('http://localhost:3001/test', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const result = await response.json();
          setTestResult(result); // Store the full test result
          logs = [
            `${ts()} [JEST] Running Jest tests...`,
            `${ts()} [API] Sent request to test service.`,
            `${ts()} [RESULT] Tests complete. Success: ${result.success}`,
            `${ts()} [SUMMARY] ${result.success ? 'All tests passed.' : 'Some tests failed.'}`
          ];
          success = result.success;
        } catch (error) {
          logs = [`${ts()} [ERROR] Failed to run tests.`];
          success = false;
        }
        break;
      case 'deploy':
        await sleep(SIMULATION_DELAY_MS, null);
        logs = [
          `${ts()} [DEPLOY] Preparing to deploy API gateway service to staging...`,
          `${ts()} [K8S] Applying Kubernetes deployment \`nexus-gateway-staging\`...`,
          `${ts()} [K8S] Waiting for 3 pods to become ready...`,
          `${ts()} [K8S] Deployment successful. Service is available at \`staging.api.example.com\`.`,
          `${ts()} [SUCCESS] Project: Nexus Gateway new version is live in the staging environment.`
        ];
        break;
    }
    
    const endTime = Date.now();
    const duration = endTime - stageStartTime;
    const finalStatus = success ? StageStatus.Success : StageStatus.Failed;
    
    setExecutions(prev => ({
      ...prev,
      [stageInfo.id]: {
        ...prev[stageInfo.id],
        status: finalStatus,
        logs: [...prev[stageInfo.id].logs, ...logs, `${ts()} ✅ Stage finished in ${(duration) / 1000}s.`],
        duration: duration,
      }
    }));

    return { success, duration };
  }, [commitMessage]);
  
  const handleRunPipeline = useCallback(async () => {
    resetState();
    const startTime = Date.now();
    setPipelineStartTime(startTime);
    setPipelineStatus('running');

    let allStagesSuccess = true;
    let cumulativeDuration = 0;

    for (const stage of PIPELINE_STAGES) {
      const result = await runStage(stage, startTime);
      cumulativeDuration += result.duration;

      if (!result.success) {
        allStagesSuccess = false;
        setFailedStageName(stage.name);
        
        const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
        const subsequentStages = PIPELINE_STAGES.slice(currentIndex + 1);
        setExecutions(prev => {
          const newExecutions = { ...prev };
          subsequentStages.forEach(skippedStage => {
            newExecutions[skippedStage.id] = { id: skippedStage.id, status: StageStatus.Skipped, logs: [`${getTimestamp(startTime)} [WARN] Stage skipped due to previous failure.`] };
          });
          return newExecutions;
        });
        break;
      }
    }
    
    setTotalDuration(cumulativeDuration);
    setPipelineStatus(allStagesSuccess ? 'success' : 'failed');
  }, [resetState, runStage]);

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
            onChange={(e) => setCommitMessage(e.target.value)}
            disabled={pipelineStatus === 'running'}
            placeholder="feat(auth): Improve JWT caching layer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
        {PIPELINE_STAGES.map((stage, index) => (
          <PipelineStage
            key={stage.id}
            stageInfo={stage}
            execution={executions[stage.id]}
            isSelected={selectedStageId === stage.id}
            onClick={() => setSelectedStageId(stage.id)}
            isLast={index === PIPELINE_STAGES.length - 1}
          />
        ))}
      </div>
      
      {pipelineStatus === 'success' && (
        <div className="p-4 rounded-lg bg-green-500/20 text-green-300 flex items-center space-x-4 shadow-lg">
          <SuccessIcon />
          <div>
            <h4 className="font-bold text-lg text-green-200">Deployment Succeeded</h4>
            <p>Total pipeline duration: {(totalDuration / 1000).toFixed(2)}s.</p>
          </div>
        </div>
      )}
      {pipelineStatus === 'failed' && (
         <div className="p-4 rounded-lg bg-red-500/20 text-red-300 flex items-center space-x-4 shadow-lg">
            <FailureIcon />
            <div>
              <h4 className="font-bold text-lg text-red-200">Deployment Blocked</h4>
              <p>Failed at stage: {failedStageName}.</p>
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
          <TestResultsDetails result={testResult} />
        ) : (
          <LogOutput logs={selectedExecution?.logs ?? ['Select a stage to view its logs.']} />
        )}
      </div>
    </div>
  );
};

export default Pipeline;


import React from 'react';
import type { PipelineStageInfo, StageExecution } from '../../../types';
import { StageStatus } from '../../../types';

interface PipelineStageProps {
  stageInfo: PipelineStageInfo;
  execution?: StageExecution;
  isSelected: boolean;
  onClick: () => void;
  isLast: boolean;
}

const StatusIcon: React.FC<{ status: StageStatus }> = ({ status }) => {
  switch (status) {
    case StageStatus.Running:
      return (
        <svg className="h-6 w-6 text-cyan-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    case StageStatus.Success:
      return (
        <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case StageStatus.Failed:
      return (
        <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case StageStatus.Skipped:
       return (
        <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
         <div className="h-6 w-6 border-2 border-gray-600 rounded-full"></div>
      );
  }
};


const getStatusClasses = (status?: StageStatus, isSelected?: boolean) => {
    let baseClasses = "relative p-4 rounded-lg cursor-pointer transition-all duration-200 h-full flex flex-col justify-center";
    let borderClasses = isSelected ? 'ring-2 ring-cyan-500' : 'border border-gray-700';
    let bgClasses = 'bg-gray-800 hover:bg-gray-700/50';
    let animationClasses = '';

    switch (status) {
        case StageStatus.Running:
            bgClasses = "bg-cyan-500/10";
            borderClasses = isSelected ? 'ring-2 ring-cyan-500' : 'border border-cyan-500/30';
            animationClasses = 'shadow-lg shadow-cyan-500/30 animate-pulse-fast';
            break;
        case StageStatus.Success:
            bgClasses = "bg-green-500/10";
            borderClasses = isSelected ? 'ring-2 ring-cyan-500' : 'border border-green-500/30';
            break;
        case StageStatus.Failed:
            bgClasses = "bg-red-500/10";
            borderClasses = isSelected ? 'ring-2 ring-cyan-500' : 'border border-red-500/30';
            break;
        case StageStatus.Skipped:
            bgClasses = "bg-gray-700/50 opacity-60";
            borderClasses = isSelected ? 'ring-2 ring-cyan-500' : 'border border-gray-700';
            break;
    }
    return `${baseClasses} ${bgClasses} ${borderClasses} ${animationClasses}`;
};


const PipelineStage: React.FC<PipelineStageProps> = ({ stageInfo, execution, isSelected, onClick, isLast }) => {
  const status = execution?.status || StageStatus.Pending;

  return (
    <div className="relative md:pr-8">
      <div className={getStatusClasses(status, isSelected)} onClick={onClick}>
          <div className="flex items-center space-x-3">
              <StatusIcon status={status}/>
              <div>
                  <h4 className="font-semibold text-white">{stageInfo.name}</h4>
                  <p className="text-sm text-gray-400">
                    {execution?.duration ? `${(execution.duration / 1000).toFixed(2)}s` : '...'}
                  </p>
              </div>
          </div>
      </div>
      {!isLast && (
          <div className="hidden md:block absolute top-1/2 -right-1.5 -translate-y-1/2 transform w-8 h-px bg-gray-600" />
      )}
    </div>
  );
};

export default PipelineStage;

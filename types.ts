
export enum StageStatus {
  Pending = 'PENDING',
  Running = 'RUNNING',
  Success = 'SUCCESS',
  Failed = 'FAILED',
  Skipped = 'SKIPPED',
}

export interface PipelineStageInfo {
  id: string;
  name: string;
  description: string;
}

export interface StageExecution {
  id: string;
  status: StageStatus;
  logs: string[];
  duration?: number;
}

export interface CodeReviewIssue {
  line: number;
  type: 'Security' | 'Performance' | 'Quality' | 'Bug' | 'Best Practice';
  description: string;
  link?: string;
}

export interface CodeReviewFileResult {
  fileName: string;
  status: 'PASS' | 'FAIL';
  score: number;
  issues: CodeReviewIssue[];
  suggestions: string[];
}

export interface CodeReviewResult {
  overallStatus: 'PASS' | 'FAIL';
  summary: string;
  files: CodeReviewFileResult[];
}
export type ThemeMode = 'light' | 'dark';
export type ThemeContextType = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

export interface PipelineStageInfo {
  id: string;
  name: string;
  description: string;
}

export interface PipelineIssue {
  line: number;
  type: string;
  description: string;
  link?: string;
}

export interface CodeReviewFile {
  fileName: string;
  status: 'PASS' | 'FAIL';
  score: number;
  issues: PipelineIssue[];
  suggestions: string[];
}

export interface CodeReviewResult {
  overallStatus: 'PASS' | 'FAIL';
  summary: string;
  files: CodeReviewFile[];
}

export type ThemeMode = 'light' | 'dark';
export type ThemeContextType = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

// Developer Profile Types
export interface Developer {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  level: 'Junior' | 'Mid' | 'Senior' | 'Principal' | 'Staff';
  skills: Skill[];
  experience: number; // years
  location: string;
  timezone: string;
  availability: 'Available' | 'Busy' | 'On Leave';
  projects: string[];
  rating: number;
  languages: string[];
  frameworks: string[];
  tools: string[];
  preferredTechStack: string[];
  github?: string;
  linkedin?: string;
  portfolio?: string;
  bio?: string;
  hireDate: string;
  department: string;
}

export interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5; // 1=Beginner, 5=Expert
  category: string;
  years: number;
  certifications?: string[];
}

// Project Management Types
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  startDate: string;
  endDate?: string;
  budget?: number;
  manager: string; // developer id
  team: string[]; // developer ids
  skills: string[]; // required skills
  tasks: Task[];
  progress: number; // 0-100
  repository?: string;
  techStack: string[];
  client?: string;
}

export enum ProjectStatus {
  Planning = 'planning',
  Active = 'active',
  OnHold = 'on_hold',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignee?: string; // developer id
  reviewer?: string; // developer id
  prUrl?: string;
  type: 'Feature' | 'Bug' | 'Refactor' | 'Documentation' | 'Design';
  estimatedHours?: number;
  actualHours?: number;
  createdDate: string;
  dueDate?: string;
  tags: string[];
}

export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  InReview = 'in_review',
  Blocked = 'blocked',
  Done = 'done'
}

// Team Management Types
export interface Team {
  id: string;
  name: string;
  description: string;
  color: string;
  lead: string; // developer id
  members: string[]; // developer ids
  department: string;
  skills: string[]; // collective skills
  projects: string[]; // project ids
  performance: TeamPerformance;
}

export interface TeamPerformance {
  velocity: number;
  quality: number;
  delivery: number;
  collaboration: number;
  lastUpdated: string;
}

// Communication Types
export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  content: string;
  timestamp: string;
  type: 'direct' | 'team' | 'system';
  read: boolean;
  priority: 'low' | 'normal' | 'high';
  attachments?: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task_assigned' | 'task_completed' | 'project_update' | 'meeting' | 'deadline';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionable: boolean;
  data?: any;
}

// Analytics & Insights Types
export interface AnalyticsData {
  developers: DeveloperAnalytics;
  teams: TeamAnalytics;
  projects: ProjectAnalytics;
  skills: SkillAnalytics;
  timeRange: string;
}

export interface DeveloperAnalytics {
  totalActive: number;
  utilizationRate: number;
  averageRating: number;
  skillsGap: number;
  productivityScore: number;
}

export interface TeamAnalytics {
  teamPerformance: TeamPerformance[];
  collaborationIndex: number;
  projectSuccessRate: number;
  skillDiversity: number;
}

export interface ProjectAnalytics {
  onTimeDelivery: number;
  budgetVariance: number;
  qualityScore: number;
  teamSatisfaction: number;
}

export interface SkillAnalytics {
  popularSkills: { name: string; count: number; demand: number }[];
  skillGaps: { skill: string; gap: number; recommended: string[] }[];
  marketTrends: { skill: string; growth: number; demand: string }[];
}

// AI Matching Types
export interface MatchResult {
  developerId: string;
  projectId: string;
  score: number; // 0-100
  matchedSkills: { skill: string; level: number; required: number }[];
  missingSkills: string[];
  reasoning: string;
  confidence: number; // 0-100
  recommendations: string[];
}

export interface AIMatchRequest {
  projectId: string;
  requiredSkills: string[];
  teamSize: number;
  priority: 'Low' | 'Medium' | 'High';
  timeAvailable?: number;
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form Types for UI
export interface DeveloperFormData {
  name: string;
  email: string;
  role: string;
  level: string;
  skills: SkillForm[];
  department: string;
  location: string;
  timezone: string;
}

export interface SkillForm {
  name: string;
  level: number;
  category: string;
  years: number;
}

export interface ProjectFormData {
  name: string;
  description: string;
  priority: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  manager: string;
  skills: string[];
  techStack: string[];
}

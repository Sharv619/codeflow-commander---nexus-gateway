import React, { useState, useMemo } from 'react';
import DeveloperProfiles from './DeveloperProfiles';
import {
  Developer, Project, Team, AnalyticsData, Task, Message, Notification,
  ProjectStatus, TaskStatus, AIMatchRequest, MatchResult
} from '../types';

// Mock data for comprehensive CRM demonstration
const mockProjects: Project[] = [
  {
    id: 'web-platform',
    name: 'Modern Web Platform',
    description: 'Complete rewrite of the legacy web platform using Next.js, TypeScript, and modern cloud architecture',
    status: ProjectStatus.Active,
    priority: 'High',
    startDate: '2024-09-01',
    budget: 150000,
    manager: '1',
    team: ['1', '3'],
    skills: ['React', 'Next.js', 'TypeScript', 'Node.js'],
    tasks: [
      {
        id: 'frontend-migrate',
        title: 'Migrate frontend to Next.js 14',
        description: 'Convert the existing React app to Next.js with app router',
        status: TaskStatus.InProgress,
        priority: 'High',
        assignee: '3',
        type: 'Feature',
        estimatedHours: 40,
        createdDate: '2024-09-01',
        tags: ['frontend', 'migration']
      },
      {
        id: 'api-backend',
        title: 'Design and implement REST API',
        description: 'Create comprehensive REST API with proper authentication',
        status: TaskStatus.Done,
        priority: 'High',
        assignee: '1',
        reviewer: '1',
        type: 'Feature',
        estimatedHours: 60,
        actualHours: 55,
        createdDate: '2024-09-01',
        tags: ['backend', 'api']
      }
    ],
    progress: 75,
    techStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'AWS'],
    client: 'Acme Corp'
  },
  {
    id: 'mobile-app',
    name: 'React Native Mobile App',
    description: 'Cross-platform mobile application for iOS and Android with offline capabilities',
    status: ProjectStatus.Planning,
    priority: 'Medium',
    startDate: '2024-11-01',
    budget: 95000,
    manager: '1',
    team: ['1', '3'],
    skills: ['React Native', 'JavaScript', 'Mobile Development'],
    tasks: [],
    progress: 20,
    techStack: ['React Native', 'Expo', 'Firebase'],
    repository: 'https://github.com/company/mobile-app'
  }
];

const mockTeams: Team[] = [
  {
    id: 'frontend-team',
    name: 'Frontend Team',
    description: 'Specialized team focusing on modern web development and user experience',
    color: '#3B82F6',
    lead: '1',
    members: ['1', '3'],
    department: 'Engineering',
    skills: ['React', 'TypeScript', 'Next.js', 'CSS', 'Figma'],
    projects: ['web-platform', 'mobile-app'],
    performance: {
      velocity: 85,
      quality: 92,
      delivery: 78,
      collaboration: 88,
      lastUpdated: new Date().toISOString()
    }
  }
];

const mockNotifications: Notification[] = [
  {
    id: '1',
    userId: '1',
    type: 'task_assigned',
    title: 'New task assigned',
    message: 'You have been assigned "Frontend UI Refactor" on the web platform project',
    timestamp: '2024-11-26T10:30:00Z',
    read: false,
    actionable: true
  }
];

const CRMDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'developers' | 'projects' | 'teams' | 'analytics' | 'communications'>('overview');
  const [notifications] = useState(mockNotifications);
  const [isAICopilotVisible, setIsAICopilotVisible] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your Nexus AI Assistant. I can help you with project insights, team recommendations, and workflow optimization. What would you like to know?",
      isAI: true,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRunningAiMatching, setIsRunningAiMatching] = useState(false);
  const [isRunningPredictiveAnalytics, setIsRunningPredictiveAnalytics] = useState(false);
  const [aiResult, setAiResult] = useState<'smart-matching' | 'predictive-analytics' | null>(null);
  const [aiMatchResults, setAiMatchResults] = useState<string[]>([]);
  const [predictiveResults, setPredictiveResults] = useState<string[]>([]);
  const [isAICopilotMinimized, setIsAICopilotMinimized] = useState(true);

  // Computed dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const totalProgress = mockProjects.reduce((sum, project) => sum + project.progress, 0);
    const averageProgress = mockProjects.length > 0 ? totalProgress / mockProjects.length : 0;
    const allTasks = mockProjects.flatMap(p => p.tasks);
    const completedTasks = allTasks.filter(t => t.status === TaskStatus.Done).length;
    const totalTasks = allTasks.length;

    return {
      projectProgress: Math.round(averageProgress),
      totalTasks,
      completedTasks
    };
  }, []);

  // AI Features Handlers
  const handleAIRunMatching = () => {
    setIsRunningAiMatching(true);
    setAiResult(null);

    // Simulate AI processing with loading spinner
    setTimeout(() => {
      setAiMatchResults([
        "✅ Frontend Developer #3 → Import/export migration task (95% skill match)",
        "✅ React Specialist #2 → UI component development (87% match)",
        "⚠️ TypeScript Engineer #1 → API integration needs mentoring (68% match)"
      ]);
      setAiResult('smart-matching');
      setIsRunningAiMatching(false);
    }, 2000);
  };

  const handleAIRunPredictiveAnalytics = () => {
    setIsRunningPredictiveAnalytics(true);
    setAiResult(null);

    // Simulate AI processing with loading spinner
    setTimeout(() => {
      setPredictiveResults([
        "📊 Frontend migration: 14.2 days remaining (-2 days from baseline)",
        "🚨 API completion delay: Risk 72% - add 1 developer",
        "💡 Database task completion: 85% confidence within 3 days"
      ]);
      setAiResult('predictive-analytics');
      setIsRunningPredictiveAnalytics(false);
    }, 2000);
  };

  // Enhanced AI chat with project context
  const generateAIResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    // Project-specific questions
    if (lowerQuery.includes('project') || lowerQuery.includes('projects')) {
      if (lowerQuery.includes('web platform') || lowerQuery.includes('modern web platform')) {
        return `The "Modern Web Platform" project is making excellent progress at 75% completion. Key details:\n\n🎯 Mission: Complete rewrite using Next.js, TypeScript, and modern architecture\n\n📦 Core Requirements: Cloud-native deployment with AWS infrastructure\n\n👥 Team: 3 developers led by John Doe\n\n🔄 Current Focus: Frontend migration task (in progress) and REST API completion (done)\n\n💡 Recommendation: With your 92% quality score, I'd suggest completing the migration within 2 weeks before prioritizing new features.`;
      }

      if (lowerQuery.includes('mobile app') || lowerQuery.includes('react native')) {
        return `The "React Native Mobile App" project is in planning phase at 20% completion. It's designed for iOS/Android with offline capabilities. Current stack: React Native, Expo, Firebase. The team could benefit from adding a mobile development expert to accelerate the timeline. Estimated budget: $95K.`;
      }

      return `You have 2 active projects: "Modern Web Platform" (75% complete, High priority) and "React Native Mobile App" (20% complete, Medium priority). Average project progress: ${dashboardMetrics.projectProgress}%. The frontend migration task in the web platform project would benefit from immediate focus for optimal delivery.`;
    }

    // Developer/team questions
    if (lowerQuery.includes('developer') || lowerQuery.includes('team') || lowerQuery.includes('skills')) {
      if (lowerQuery.includes('frontend team') || lowerQuery.includes('team performance')) {
        return `The Frontend Team excels with 85% velocity and 92% quality scores. Skills include React, TypeScript, Next.js, CSS, and Figma. Recent performance analysis shows strong delivery capabilities. Currently working on the web platform and mobile app projects. Collaboration score: 88% - indicating excellent team dynamics.`;
      }

      if (lowerQuery.includes('velocity') || lowerQuery.includes('performance')) {
        return `Team metrics analysis:\n\n🚀 Velocity: 85% (good momentum)\n🧪 Quality: 92% (excellent code standards)\n🚚 Delivery: 78% (could optimize workflows)\n🤝 Collaboration: 88% (strong team dynamics)\n\nKey insights: Focus on improving delivery processes to reach 90%+ across all metrics. The team shows excellent adaptability for complex technical challenges.`;
      }

      return `Your development team consists of 3 specialized developers. The Frontend Team shows excellent performance metrics with high collaboration scores. Skill distribution covers React, TypeScript, Node.js, and cloud development. Recent tasks show good velocity - you might consider adding a DevOps specialist for deployment optimization.`;
    }

    // AI/ML and recommendations
    if (lowerQuery.includes('ai') || lowerQuery.includes('ml') || lowerQuery.includes('recommendation') || lowerQuery.includes('suggest')) {
      return `Based on AI analysis of your CodeFlow ecosystem:\n\n🤖 Smart Matching: The frontend migration task (in progress) has a 95% skill match with Developer #3. I'd recommend continuing with the current assignment.\n\n📊 Risk Assessment: Project deadline risk is Medium (72% confidence in completion). Adding one developer could reduce this to Low.\n\n💡 Optimization Suggestions:\n• Focus on completing the REST API implementation (currently blocked)\n• Consider upgrading your CI/CD pipeline for better deployment frequency\n• Team could benefit from enhanced monitoring capabilities\n\nCodeFlow Sentinel is actively monitoring 71+ data points for anomaly detection.`;
    }

    // General project insights
    if (lowerQuery.includes('progress') || lowerQuery.includes('status') || lowerQuery.includes('how') || lowerQuery.includes('what')) {
      return `Project Overview from AI Analysis:\n\n📈 Overall Progress: ${dashboardMetrics.projectProgress}% average across all projects\n\n🎯 Key Achievements:\n• 75% completion on Modern Web Platform\n• REST API implementation successfully completed\n• Team showing excellent collaboration (88% score)\n\n🚧 Current Challenges:\n• Frontend migration in progress (Next.js 14 upgrade)\n• Planning phase complete for mobile app project\n\n🎪 Intelligence Insights:\n• Your team's technical velocity indicates strong momentum\n• Quality metrics are excellent (92%+)\n• Delivery optimization could benefit from process improvements\n\nWould you like me to dive deeper into any specific area?`;
    }

    // Default intelligent responses based on common questions
    if (lowerQuery.includes('codeflow') || lowerQuery.includes('commander')) {
      return `CodeFlow Commander is your comprehensive AI-powered Developer CRM platform. It integrates:\n\n🔧 Multiple AI Agents: Generative agents, security remediators, autonomous networks\n\n📊 Real-time Monitoring: CodeFlow Sentinel provides ML-powered anomaly detection\n\n👥 Team Management: Intelligent developer matching and skill analysis\n\n📈 Predictive Analytics: AI-driven project insights and timeline predictions\n\n🚀 Next.js Applications: Modern frontend with advanced AI capabilities\n\nCurrently tracking ${dashboardMetrics.totalTasks} tasks with ${dashboardMetrics.completedTasks} completed. System health: Optimal.`;
    }

    // Fallback intelligent response
    return `Thanks for your question! I'm integrating insights from CodeFlow Sentinel (your ML security service) and the autonomous agent network.\n\nBased on real-time analysis:\n• Project velocity is trending positively (${dashboardMetrics.completedTasks}/${dashboardMetrics.totalTasks} tasks completed)\n• Team performance metrics are strong (85% velocity, 92% quality)\n• Current recommendations focus on completing high-priority migration tasks\n\nI can provide detailed insights about specific projects, developers, team performance, or AI-powered recommendations. What would you like to explore deeper?`;
  };

  // Handle AI chat messages with enhanced intelligence
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      isAI: false,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const userQuery = inputMessage;

    setInputMessage('');

    // Simulate AI thinking time (1-2 seconds)
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        text: generateAIResponse(userQuery),
        isAI: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Recent Activity */}
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {notifications.slice(0, 5).map(notification => (
            <div key={notification.id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${notification.read ? 'bg-gray-500' : 'bg-cyan-400'}`}></div>
                <div>
                  <p className="text-white font-medium">{notification.title}</p>
                  <p className="text-gray-400 text-sm">{notification.message}</p>
                </div>
              </div>
              <span className="text-gray-500 text-sm">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Project Status Overview */}
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6">Project Status</h2>
        <div className="space-y-4">
          {mockProjects.map(project => (
            <div key={project.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                  <p className="text-gray-400 text-sm">{project.description.substring(0, 80)}...</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium
                    ${project.priority === 'High' ? 'bg-red-600/20 text-red-400' :
                      project.priority === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-green-600/20 text-green-400'}`}>
                    {project.priority}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium
                    ${project.status === ProjectStatus.Active ? 'bg-green-600/20 text-green-400' :
                      project.status === ProjectStatus.Planning ? 'bg-blue-600/20 text-blue-400' :
                      'bg-gray-600/20 text-gray-400'}`}>
                    {project.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">Progress: {project.progress}%</span>
                <span className="text-gray-400">
                  Tasks: {project.tasks.filter(t => t.status === TaskStatus.Done).length}/{project.tasks.length}
                </span>
                <span className="text-gray-400">Team: {project.team.length} members</span>
              </div>
              <div className="mt-3 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render methods for other tabs
  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Burn-down Chart Interactive Chart Placeholder */}
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6">Task Completion Trend - Burn-down Chart</h2>
        <div className="mb-4">
          <p className="text-gray-400 mb-4">7-day task completion visualization</p>
          <div className="text-sm text-gray-400 mb-4"></div>
        </div>
        <div className="flex items-end justify-between h-64 mb-6">
          {/* Simple bar chart visualization */}
          {[45, 42, 38, 35, 30, 25, 22].map((height, index) => (
            <div key={index} className="flex-1 flex items-end justify-center max-h-full">
              <div
                className="w-full max-w-8 mx-1 bg-cyan-600 rounded-t animate-pulse"
                style={{ height: `${(height / 45) * 100}%` }}
              ></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span className="text-green-400 font-medium">Total Tasks: 45</span>
          <span className="text-cyan-400 font-medium">Completed: 32</span>
          <span className="text-yellow-400 font-medium">Remaining: 13</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6">Team Performance Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockTeams.map(team => (
            <div key={team.id} className="bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-3">{team.name}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Velocity</span>
                  <span className="text-cyan-400 font-bold">{team.performance.velocity}%</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div className="bg-cyan-400 h-2 rounded-full" style={{ width: `${team.performance.velocity}%` }}></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Quality</span>
                  <span className="text-green-400 font-bold">{team.performance.quality}%</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: `${team.performance.quality}%` }}></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Delivery</span>
                  <span className="text-yellow-400 font-bold">{team.performance.delivery}%</span>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${team.performance.delivery}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6">AI-Powered Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">Skill Recommendations</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• Team could benefit from DevOps skills for faster deployments</li>
              <li>• Consider adding UX/UI designer for better user experience</li>
              <li>• Mobile development expertise would enhance cross-platform capabilities</li>
            </ul>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">Risk Assessment</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Project Deadline Risk</span>
                <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-sm">Medium</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Skill Gap Impact</span>
                <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-sm">Low</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Team Capacity</span>
                <span className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-sm">High</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-6">
      {/* Sprint Overview Kanban Board */}
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6">Sprint Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📝 To Do
              <span className="text-xs bg-gray-700 px-2 py-1 rounded">3</span>
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-900 p-3 rounded-md border border-gray-700">
                <h4 className="text-white font-medium text-sm">Design User Authentication Flow</h4>
                <p className="text-gray-400 text-xs mb-2">Create wireframes and user journey</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-yellow-400">High Priority</span>
                  <span className="text-cyan-400">Feature</span>
                </div>
              </div>
            </div>
          </div>

          {/* In Progress Column */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              🚧 In Progress
              <span className="text-xs bg-blue-600 px-2 py-1 rounded">2</span>
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-900 p-3 rounded-md border border-blue-500">
                <h4 className="text-white font-medium text-sm">Implement User Login</h4>
                <p className="text-gray-400 text-xs mb-2">Frontend component development</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400">Medium Priority</span>
                  <span className="text-cyan-400">Feature</span>
                </div>
              </div>
            </div>
          </div>

          {/* Done Column */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              ✅ Done
              <span className="text-xs bg-green-600 px-2 py-1 rounded">5</span>
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-900 p-3 rounded-md border border-green-500">
                <h4 className="text-white font-medium text-sm">Setup Development Environment</h4>
                <p className="text-gray-400 text-xs mb-2">All team members configured</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400">Medium Priority</span>
                  <span className="text-cyan-400">Task</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mockProjects.map(project => (
        <div key={project.id} className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{project.name}</h2>
              <p className="text-gray-400">{project.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-medium
                ${project.status === ProjectStatus.Active ? 'bg-green-600/20 text-green-400' :
                  project.status === ProjectStatus.Planning ? 'bg-blue-600/20 text-blue-400' :
                  'bg-gray-600/20 text-gray-400'}`}>
                {project.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-medium
                ${project.priority === 'High' ? 'bg-red-600/20 text-red-400' :
                  project.priority === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                  'bg-green-600/20 text-green-400'}`}>
                {project.priority}
              </span>
            </div>
          </div>

          {/* Project content continues... */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-gray-400 text-sm">Progress</p>
              <p className="text-2xl font-bold text-cyan-400">{project.progress}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Tasks Completed</p>
              <p className="text-2xl font-bold text-green-400">
                {project.tasks.filter(t => t.status === TaskStatus.Done).length}/{project.tasks.length}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Budget</p>
              <p className="text-2xl font-bold text-yellow-400">
                ${project.budget?.toLocaleString() || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTeams = () => (
    <div className="space-y-6">
      {mockTeams.map(team => (
        <div key={team.id} className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: team.color }}></div>
            <div>
              <h2 className="text-2xl font-bold text-white">{team.name}</h2>
              <p className="text-gray-400">{team.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-gray-400 text-sm">Team Members</p>
              <p className="text-2xl font-bold text-cyan-400">{team.members.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active Projects</p>
              <p className="text-2xl font-bold text-green-400">{team.projects.length}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Team Velocity</p>
              <p className="text-2xl font-bold text-yellow-400">{team.performance.velocity}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Team Skills</h4>
              <div className="flex flex-wrap gap-2">
                {team.skills.slice(0, 6).map(skill => (
                  <span key={skill} className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Performance Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Quality:</span>
                  <span className="text-green-400 font-bold">{team.performance.quality}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Delivery:</span>
                  <span className="text-yellow-400 font-bold">{team.performance.delivery}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Collaboration:</span>
                  <span className="text-purple-400 font-bold">{team.performance.collaboration}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCommunications = () => (
    <div className="space-y-6">
      {/* Notifications */}
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6">Team Communications</h2>
        <p className="text-gray-400 mb-6">
          Real-time messaging and notifications for team collaboration
        </p>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">Recent Notifications</h3>
          {notifications.map(notification => (
            <div key={notification.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1 ${notification.read ? 'bg-gray-500' : 'bg-cyan-400'}`}></div>
                  <div>
                    <p className="text-white font-medium">{notification.title}</p>
                    <p className="text-gray-400 text-sm mb-2">{notification.message}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!notification.read && (
                  <button className="text-cyan-400 hover:text-cyan-300 text-sm px-2 py-1 rounded">
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Features */}
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6">AI-Powered Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">🤖 Smart Matching</h3>
            <p className="text-gray-300 mb-3">
              AI analyzes developer skills and project requirements to recommend optimal team assignments
            </p>
            <button
              onClick={handleAIRunMatching}
              disabled={isRunningAiMatching}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                isRunningAiMatching
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
              }`}
            >
              {isRunningAiMatching ? '🔄 Processing...' : 'Run AI Matching'}
            </button>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">📊 Predictive Analytics</h3>
            <p className="text-gray-300 mb-3">
              Machine learning models predict project timelines and identify potential bottlenecks
            </p>
            <button
              onClick={handleAIRunPredictiveAnalytics}
              disabled={isRunningPredictiveAnalytics}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                isRunningPredictiveAnalytics
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRunningPredictiveAnalytics ? '🔄 Analyzing...' : 'Generate Insights'}
            </button>
          </div>
        </div>

        {/* Results Display - Only show when aiResult is set */}
        {aiResult && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            {aiResult === 'smart-matching' && aiMatchResults.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">🎯 Smart Matching Results</h3>
                <ul className="space-y-2 text-gray-300">
                  {aiMatchResults.map((result, index) => (
                    <li key={index} className="text-sm">{result}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiResult === 'predictive-analytics' && predictiveResults.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-4">📊 Timeline Forecast</h3>
                <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 p-4 rounded-lg border border-green-500/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">14.2d</div>
                      <div className="text-sm text-gray-400">Frontend Migration</div>
                      <div className="text-xs text-green-400">-2 days ahead</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">72%</div>
                      <div className="text-sm text-gray-400">Risk Level</div>
                      <div className="text-xs text-red-400">Add 1 developer</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">85%</div>
                      <div className="text-sm text-gray-400">Completion</div>
                      <div className="text-xs text-yellow-400">Within 3 days</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <div className="text-sm text-gray-300">
                      <strong className="text-cyan-400">AI Recommendations:</strong> Increase team capacity by adding a senior full-stack developer to reduce project completion risk from 72% to 35%.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setAiResult(null)}
                className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded transition-colors"
              >
                Clear Results
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'developers', label: 'Developers', icon: '👥' },
    { id: 'projects', label: 'Projects', icon: '📋' },
    { id: 'teams', label: 'Teams', icon: '🧑‍🤝‍🧑' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'communications', label: 'Communications', icon: '💬' }
  ];

  return (
    <div className="relative">
      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-2">Developer CRM Dashboard</h1>
          <p className="text-gray-400 mb-6">
            Comprehensive platform for managing developers, projects, teams, and leveraging AI for optimal resource allocation
          </p>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'developers' && <DeveloperProfiles />}
        {activeTab === 'projects' && renderProjects()}
        {activeTab === 'teams' && renderTeams()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'communications' && renderCommunications()}
      </div>

      {/* Floating AI Assistant Chat Widget */}
      <div className="fixed bottom-4 right-4 z-50">
        {/* Expanded Chat Widget */}
        {isAICopilotVisible && (
          <div className="bg-gray-900 border border-gray-700 shadow-xl rounded-lg mb-4 w-96 h-96 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                🤖 Nexus AI Assistant
              </h3>
              <button
                onClick={() => setIsAICopilotVisible(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Minimize Chat"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.isAI
                      ? 'bg-gray-800 text-gray-100'
                      : 'bg-cyan-600 text-white'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Ask about project velocity, team performance, or recommendations...</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your question..."
                  className="flex-1 bg-gray-800 border border-gray-600 text-white rounded-md px-4 py-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <button
          onClick={() => setIsAICopilotVisible(!isAICopilotVisible)}
          className={`bg-cyan-600 hover:bg-cyan-700 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
            isAICopilotVisible ? 'scale-90' : 'scale-100'
          }`}
          title={isAICopilotVisible ? "Minimize AI Assistant" : "Open AI Assistant"}
        >
          {isAICopilotVisible ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <span className="text-xl">🤖</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default CRMDashboard;

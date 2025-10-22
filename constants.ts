
import type { PipelineStageInfo, CodeReviewResult } from './types';

export const PIPELINE_STAGES: PipelineStageInfo[] = [
  { id: 'trigger', name: 'Push to Main', description: 'Workflow triggered by a push to the main branch.' },
  { id: 'ai-review', name: 'AI Code Review', description: 'Gemini analyzes code changes for issues.' },
  { id: 'docker-build', name: 'Docker Build & Scan', description: 'Build Docker image and scan with Trivy.' },
  { id: 'unit-tests', name: 'Containerized Tests', description: 'Run unit and integration tests inside the container.' },
  { id: 'deploy', name: 'Deploy to Staging', description: 'Deploy gateway service to the staging environment.' },
];

export const MOCK_SUCCESS_REVIEW: CodeReviewResult = {
  overallStatus: 'PASS',
  summary: "Project: Nexus Gateway - Excellent update. The refactoring of the JWT authentication middleware improves both security and performance by introducing a new caching layer for public keys. Approved for deployment.",
  files: [
    {
      fileName: 'core/auth_middleware.go',
      status: 'PASS',
      score: 9,
      issues: [
        { 
          line: 88, 
          type: 'Best Practice', 
          description: 'The function `verifyToken` could benefit from accepting a `context.Context` to handle request cancellations.',
          link: 'https://stackoverflow.com/questions/43969261/what-is-the-point-of-context-context-in-go'
        }
      ],
      suggestions: [
        'Great use of `sync.Once` to prevent race conditions during the initial key fetch.',
      ]
    },
    {
      fileName: 'api/v1/routes.ts',
      status: 'PASS',
      score: 9,
      issues: [],
      suggestions: ['Consider adding rate limiting to the new `/status` endpoint to prevent abuse.']
    }
  ]
};

export const MOCK_FAILURE_REVIEW: CodeReviewResult = {
  overallStatus: 'FAIL',
  summary: "Project: Nexus Gateway - DEPLOYMENT BLOCKED. Found critical performance bottlenecks and a security flaw. The load balancer's algorithm choice is fundamentally flawed and will cause service outages. A related misconfiguration in the staging environment will accelerate this failure.",
  files: [
    {
      fileName: 'services/load_balancer.js',
      status: 'FAIL',
      score: 4,
      issues: [
        { 
          line: 52, 
          type: 'Performance', 
          description: 'CRITICAL: Inefficient "random selection" load balancing algorithm detected. This will cause severe request piling and cascading failures under moderate-to-high traffic.', 
          link: 'https://stackoverflow.com/questions/31206086/load-balancing-round-robin-vs-random' 
        }
      ],
      suggestions: [
        'URGENT: This must be refactored to use a Round-Robin or Least Connections scheduling algorithm for predictable and even traffic distribution.',
      ]
    },
    {
      fileName: 'core/auth_middleware.go',
      status: 'FAIL',
      score: 5,
      issues: [
        { 
          line: 121, 
          type: 'Security', 
          description: 'User ID from JWT payload is logged without sanitization, which exposes Personally Identifiable Information (PII) in application logs.', 
          link: 'https://stackoverflow.com/questions/60309943/how-to-log-safely-and-prevent-log-injection' 
        },
      ],
      suggestions: [
        'Immediately remove or mask the user ID from logs to prevent data leaks and comply with privacy standards.'
        ]
    },
    {
      fileName: 'config/staging.yaml',
      status: 'FAIL',
      score: 6,
      issues: [
        {
          line: 15,
          type: 'Bug',
          description: 'The `healthCheckTimeout` is set to 2s, which is too aggressive. The inefficient load balancer can easily exceed this, causing healthy services to be marked as down.',
          link: 'https://stackoverflow.com/questions/56931428/how-to-properly-configure-kubernetes-liveness-and-readiness-probes'
        }
      ],
      suggestions: [
        'Increase timeout to 5s as a temporary fix, but the real solution is fixing the load balancer performance issue.'
      ]
    }
  ]
};

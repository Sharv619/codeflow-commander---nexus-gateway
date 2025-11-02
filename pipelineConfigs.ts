import {
  PipelineConfig,
  StageConfig,
  SimulationMode,
  RetryPolicy
} from './types';

/**
 * Pre-built pipeline configurations for common CI/CD scenarios
 * These can be used as templates or loaded directly for simulation
 */
export class PipelineConfigManager {

  /**
   * Get a basic Node.js CI/CD pipeline configuration
   */
  static getNodeJSPipeline(): PipelineConfig {
    return {
      id: 'nodejs-basic',
      name: 'Node.js CI/CD Pipeline',
      description: 'Basic CI/CD pipeline for Node.js applications with testing and deployment',
      version: '1.0.0',
      stages: [
        this.createTriggerStage(),
        this.createAiReviewStage(),
        this.createUnitTestStage(),
        this.createDockerBuildStage(),
        this.createDeployStage()
      ],
      environment: {
        NODE_ENV: 'production',
        CI: 'true'
      },
      settings: {
        mode: SimulationMode.Realistic,
        maxConcurrency: 1,
        failFast: true,
        enableMetrics: true,
        enableArtifacts: true,
        timeout: 1800000 // 30 minutes
      },
      metadata: {
        author: 'Codeflow Commander',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: ['nodejs', 'ci-cd', 'testing', 'docker'],
        category: 'web-application'
      }
    };
  }

  /**
   * Get a comprehensive enterprise pipeline with advanced features
   */
  static getEnterprisePipeline(): PipelineConfig {
    return {
      id: 'enterprise-advanced',
      name: 'Enterprise Multi-Stage Pipeline',
      description: 'Advanced pipeline with security scanning, performance testing, and multi-environment deployment',
      version: '2.0.0',
      stages: [
        this.createTriggerStage(),
        this.createSecurityScanStage(),
        this.createAiReviewStage(),
        this.createUnitTestStage(),
        this.createIntegrationTestStage(),
        this.createPerformanceTestStage(),
        this.createDockerBuildStage(),
        this.createSecurityAuditStage(),
        this.createDeployStagingStage(),
        this.createE2eTestStage(),
        this.createDeployProductionStage()
      ],
      environment: {
        NODE_ENV: 'production',
        CI: 'true',
        ENTERPRISE_MODE: 'true'
      },
      settings: {
        mode: SimulationMode.Realistic,
        maxConcurrency: 2,
        failFast: false,
        enableMetrics: true,
        enableArtifacts: true,
        timeout: 3600000 // 1 hour
      },
      metadata: {
        author: 'Codeflow Commander',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: ['enterprise', 'security', 'performance', 'multi-stage'],
        category: 'enterprise'
      }
    };
  }

  /**
   * Get a fast pipeline for development/testing scenarios
   */
  static getFastPipeline(): PipelineConfig {
    const config = this.getNodeJSPipeline();
    config.id = 'fast-dev';
    config.name = 'Fast Development Pipeline';
    config.settings.mode = SimulationMode.Fast;
    config.settings.maxConcurrency = 3;
    config.metadata.tags = ['fast', 'development', 'testing'];
    return config;
  }

  /**
   * Get a chaotic pipeline for testing error handling
   */
  static getChaoticPipeline(): PipelineConfig {
    const config = this.getNodeJSPipeline();
    config.id = 'chaotic-test';
    config.name = 'Chaotic Error Testing Pipeline';
    config.settings.mode = SimulationMode.Chaotic;
    config.settings.failFast = false;

    // Make stages more likely to fail
    config.stages.forEach(stage => {
      stage.successRate = Math.max(0.3, stage.successRate - 0.3);
    });

    config.metadata.tags = ['chaos', 'error-testing', 'resilience'];
    return config;
  }

  /**
   * Get a microservices pipeline with parallel execution
   */
  static getMicroservicesPipeline(): PipelineConfig {
    return {
      id: 'microservices-parallel',
      name: 'Microservices Parallel Pipeline',
      description: 'Pipeline for microservices with parallel testing and deployment',
      version: '1.0.0',
      stages: [
        this.createTriggerStage(),
        // Parallel testing stages
        {
          ...this.createUnitTestStage(),
          id: 'unit-tests-auth',
          name: 'Unit Tests - Auth Service',
          dependencies: ['trigger']
        },
        {
          ...this.createUnitTestStage(),
          id: 'unit-tests-api',
          name: 'Unit Tests - API Gateway',
          dependencies: ['trigger']
        },
        {
          ...this.createUnitTestStage(),
          id: 'unit-tests-worker',
          name: 'Unit Tests - Worker Service',
          dependencies: ['trigger']
        },
        // Parallel Docker builds
        {
          ...this.createDockerBuildStage(),
          id: 'docker-build-auth',
          name: 'Docker Build - Auth Service',
          dependencies: ['unit-tests-auth'],
          config: { ...this.createDockerBuildStage().config, serviceName: 'auth-service' }
        },
        {
          ...this.createDockerBuildStage(),
          id: 'docker-build-api',
          name: 'Docker Build - API Gateway',
          dependencies: ['unit-tests-api'],
          config: { ...this.createDockerBuildStage().config, serviceName: 'api-gateway' }
        },
        {
          ...this.createDockerBuildStage(),
          id: 'docker-build-worker',
          name: 'Docker Build - Worker Service',
          dependencies: ['unit-tests-worker'],
          config: { ...this.createDockerBuildStage().config, serviceName: 'worker-service' }
        },
        // AI Review after all builds complete
        {
          ...this.createAiReviewStage(),
          dependencies: ['docker-build-auth', 'docker-build-api', 'docker-build-worker']
        },
        // Parallel deployments
        {
          ...this.createDeployStage(),
          id: 'deploy-auth',
          name: 'Deploy Auth Service',
          dependencies: ['ai-review'],
          config: { ...this.createDeployStage().config, serviceName: 'auth-service' }
        },
        {
          ...this.createDeployStage(),
          id: 'deploy-api',
          name: 'Deploy API Gateway',
          dependencies: ['ai-review'],
          config: { ...this.createDeployStage().config, serviceName: 'api-gateway' }
        },
        {
          ...this.createDeployStage(),
          id: 'deploy-worker',
          name: 'Deploy Worker Service',
          dependencies: ['ai-review'],
          config: { ...this.createDeployStage().config, serviceName: 'worker-service' }
        }
      ],
      environment: {
        MICROSERVICES_MODE: 'true',
        CI: 'true'
      },
      settings: {
        mode: SimulationMode.Realistic,
        maxConcurrency: 3,
        failFast: false,
        enableMetrics: true,
        enableArtifacts: true,
        timeout: 2400000 // 40 minutes
      },
      metadata: {
        author: 'Codeflow Commander',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: ['microservices', 'parallel', 'scalability'],
        category: 'microservices'
      }
    };
  }

  // Stage creation helper methods

  private static createTriggerStage(): StageConfig {
    return {
      id: 'trigger',
      name: 'Git Push Trigger',
      type: 'trigger',
      description: 'Detects git push and triggers pipeline execution',
      config: {
        branch: 'main',
        commitMessage: 'feat: update application features',
        author: 'developer@example.com'
      },
      dependencies: [],
      timeout: 5000,
      retryPolicy: { maxAttempts: 1, backoffMultiplier: 1, initialDelay: 0 },
      successRate: 0.98,
      durationRange: { min: 100, max: 1000, baseMultiplier: 1 },
      failureModes: [
        { type: 'webhook_error', probability: 0.02, message: 'Invalid webhook payload', recoverable: false }
      ]
    };
  }

  private static createAiReviewStage(): StageConfig {
    return {
      id: 'ai-review',
      name: 'AI Code Review',
      type: 'ai-review',
      description: 'Automated code analysis and quality assessment',
      config: {
        fileCount: 15,
        issueCount: 2,
        languages: ['typescript', 'javascript']
      },
      dependencies: ['trigger'],
      timeout: 120000,
      retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelay: 5000 },
      successRate: 0.95,
      durationRange: { min: 30000, max: 90000, baseMultiplier: 1.2 },
      failureModes: [
        { type: 'api_timeout', probability: 0.03, message: 'AI service timeout', recoverable: true, recoveryTime: 10000 },
        { type: 'api_error', probability: 0.02, message: 'AI service unavailable', recoverable: false }
      ]
    };
  }

  private static createUnitTestStage(): StageConfig {
    return {
      id: 'unit-tests',
      name: 'Unit Tests',
      type: 'unit-tests',
      description: 'Runs unit test suite with coverage reporting',
      config: {
        testCount: 150,
        coverage: 85,
        frameworks: ['jest', 'mocha']
      },
      dependencies: ['trigger'],
      timeout: 300000,
      retryPolicy: { maxAttempts: 3, backoffMultiplier: 1.5, initialDelay: 10000 },
      successRate: 0.88,
      durationRange: { min: 60000, max: 240000, baseMultiplier: 1.5 },
      failureModes: [
        { type: 'test_failure', probability: 0.1, message: 'Test assertions failed', recoverable: false },
        { type: 'timeout', probability: 0.02, message: 'Test execution timeout', recoverable: true, recoveryTime: 30000 }
      ]
    };
  }

  private static createDockerBuildStage(): StageConfig {
    return {
      id: 'docker-build',
      name: 'Docker Build',
      type: 'docker-build',
      description: 'Builds Docker image with multi-stage optimization',
      config: {
        imageName: 'app:latest',
        baseImage: 'node:18-alpine',
        imageId: 'a1b2c3d4e5f6',
        buildSteps: 8
      },
      dependencies: ['unit-tests'],
      timeout: 600000,
      retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelay: 15000 },
      successRate: 0.92,
      durationRange: { min: 120000, max: 480000, baseMultiplier: 2 },
      failureModes: [
        { type: 'build_failure', probability: 0.06, message: 'Docker build failed', recoverable: false },
        { type: 'registry_error', probability: 0.02, message: 'Cannot push to registry', recoverable: true, recoveryTime: 20000 }
      ]
    };
  }

  private static createDeployStage(): StageConfig {
    return {
      id: 'deploy',
      name: 'Deploy to Production',
      type: 'deploy',
      description: 'Deploys application to production environment',
      config: {
        environment: 'production',
        url: 'https://api.example.com',
        replicas: 3
      },
      dependencies: ['docker-build'],
      timeout: 300000,
      retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelay: 30000 },
      successRate: 0.94,
      durationRange: { min: 45000, max: 180000, baseMultiplier: 1.8 },
      failureModes: [
        { type: 'k8s_error', probability: 0.04, message: 'Kubernetes deployment failed', recoverable: true, recoveryTime: 45000 },
        { type: 'health_check_fail', probability: 0.02, message: 'Health checks failed', recoverable: false }
      ]
    };
  }

  private static createSecurityScanStage(): StageConfig {
    return {
      id: 'security-scan',
      name: 'Security Vulnerability Scan',
      type: 'security-scan',
      description: 'Scans for security vulnerabilities in dependencies',
      config: {
        scanner: 'snyk',
        severityThreshold: 'high'
      },
      dependencies: ['trigger'],
      timeout: 180000,
      retryPolicy: { maxAttempts: 2, backoffMultiplier: 1.5, initialDelay: 10000 },
      successRate: 0.85,
      durationRange: { min: 30000, max: 120000, baseMultiplier: 1.3 },
      failureModes: [
        { type: 'vulnerability_found', probability: 0.15, message: 'High-severity vulnerabilities detected', recoverable: false }
      ]
    };
  }

  private static createIntegrationTestStage(): StageConfig {
    return {
      id: 'integration-tests',
      name: 'Integration Tests',
      type: 'integration-tests',
      description: 'Runs integration tests against staging environment',
      config: {
        testCount: 25,
        environment: 'staging'
      },
      dependencies: ['unit-tests'],
      timeout: 600000,
      retryPolicy: { maxAttempts: 3, backoffMultiplier: 1.5, initialDelay: 20000 },
      successRate: 0.78,
      durationRange: { min: 120000, max: 480000, baseMultiplier: 2.5 },
      failureModes: [
        { type: 'integration_failure', probability: 0.2, message: 'Integration tests failed', recoverable: false },
        { type: 'environment_unavailable', probability: 0.02, message: 'Staging environment unavailable', recoverable: true, recoveryTime: 60000 }
      ]
    };
  }

  private static createPerformanceTestStage(): StageConfig {
    return {
      id: 'performance-tests',
      name: 'Performance Tests',
      type: 'performance-tests',
      description: 'Load testing and performance benchmarking',
      config: {
        loadTest: true,
        duration: 300,
        concurrentUsers: 100
      },
      dependencies: ['integration-tests'],
      timeout: 900000,
      retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelay: 30000 },
      successRate: 0.82,
      durationRange: { min: 300000, max: 720000, baseMultiplier: 3 },
      failureModes: [
        { type: 'performance_regression', probability: 0.15, message: 'Performance regression detected', recoverable: false },
        { type: 'load_test_failure', probability: 0.03, message: 'Load test infrastructure failure', recoverable: true, recoveryTime: 90000 }
      ]
    };
  }

  private static createSecurityAuditStage(): StageConfig {
    return {
      id: 'security-audit',
      name: 'Container Security Audit',
      type: 'security-audit',
      description: 'Audits Docker image for security vulnerabilities',
      config: {
        scanner: 'trivy',
        failOnCritical: true
      },
      dependencies: ['docker-build'],
      timeout: 240000,
      retryPolicy: { maxAttempts: 2, backoffMultiplier: 1.5, initialDelay: 15000 },
      successRate: 0.88,
      durationRange: { min: 60000, max: 180000, baseMultiplier: 1.6 },
      failureModes: [
        { type: 'critical_vulnerability', probability: 0.1, message: 'Critical vulnerabilities found in image', recoverable: false },
        { type: 'scan_failure', probability: 0.02, message: 'Security scanner unavailable', recoverable: true, recoveryTime: 30000 }
      ]
    };
  }

  private static createDeployStagingStage(): StageConfig {
    return {
      id: 'deploy-staging',
      name: 'Deploy to Staging',
      type: 'deploy',
      description: 'Deploys application to staging environment for testing',
      config: {
        environment: 'staging',
        url: 'https://staging-api.example.com',
        replicas: 2
      },
      dependencies: ['security-audit'],
      timeout: 240000,
      retryPolicy: { maxAttempts: 3, backoffMultiplier: 1.5, initialDelay: 20000 },
      successRate: 0.96,
      durationRange: { min: 30000, max: 120000, baseMultiplier: 1.2 },
      failureModes: [
        { type: 'k8s_error', probability: 0.03, message: 'Staging deployment failed', recoverable: true, recoveryTime: 30000 },
        { type: 'health_check_fail', probability: 0.01, message: 'Staging health checks failed', recoverable: false }
      ]
    };
  }

  private static createE2eTestStage(): StageConfig {
    return {
      id: 'e2e-tests',
      name: 'End-to-End Tests',
      type: 'e2e-tests',
      description: 'Runs end-to-end tests against staging deployment',
      config: {
        testCount: 20,
        browser: 'chrome',
        environment: 'staging'
      },
      dependencies: ['deploy-staging'],
      timeout: 900000,
      retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelay: 45000 },
      successRate: 0.76,
      durationRange: { min: 180000, max: 720000, baseMultiplier: 3.5 },
      failureModes: [
        { type: 'e2e_failure', probability: 0.22, message: 'End-to-end tests failed', recoverable: false },
        { type: 'browser_error', probability: 0.02, message: 'Browser automation failure', recoverable: true, recoveryTime: 60000 }
      ]
    };
  }

  private static createDeployProductionStage(): StageConfig {
    return {
      id: 'deploy-production',
      name: 'Deploy to Production',
      type: 'deploy',
      description: 'Final production deployment with blue-green strategy',
      config: {
        environment: 'production',
        url: 'https://api.example.com',
        replicas: 5,
        strategy: 'blue-green'
      },
      dependencies: ['e2e-tests', 'performance-tests'],
      timeout: 600000,
      retryPolicy: { maxAttempts: 1, backoffMultiplier: 1, initialDelay: 0 },
      successRate: 0.98,
      durationRange: { min: 90000, max: 300000, baseMultiplier: 2.2 },
      failureModes: [
        { type: 'production_deploy_failure', probability: 0.02, message: 'Production deployment failed', recoverable: false }
      ]
    };
  }



  /**
   * Get all available pipeline templates
   */
  static getAvailableTemplates(): Array<{ id: string; name: string; description: string; category: string }> {
    return [
      {
        id: 'nodejs-basic',
        name: 'Node.js Basic Pipeline',
        description: 'Simple CI/CD pipeline for Node.js applications',
        category: 'web-application'
      },
      {
        id: 'enterprise-advanced',
        name: 'Enterprise Pipeline',
        description: 'Comprehensive pipeline with security and performance testing',
        category: 'enterprise'
      },
      {
        id: 'fast-dev',
        name: 'Fast Development Pipeline',
        description: 'Accelerated pipeline for development and testing',
        category: 'development'
      },
      {
        id: 'chaotic-test',
        name: 'Chaos Testing Pipeline',
        description: 'Pipeline designed to test error handling and resilience',
        category: 'testing'
      },
      {
        id: 'microservices-parallel',
        name: 'Microservices Pipeline',
        description: 'Parallel pipeline for microservices architecture',
        category: 'microservices'
      }
    ];
  }

  /**
   * Get a pipeline configuration by ID
   */
  static getPipelineById(id: string): PipelineConfig | null {
    switch (id) {
      case 'nodejs-basic':
        return this.getNodeJSPipeline();
      case 'enterprise-advanced':
        return this.getEnterprisePipeline();
      case 'fast-dev':
        return this.getFastPipeline();
      case 'chaotic-test':
        return this.getChaoticPipeline();
      case 'microservices-parallel':
        return this.getMicroservicesPipeline();
      default:
        return null;
    }
  }
}

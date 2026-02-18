/**
 * Pipeline Configuration Manager
 * Manages pipeline configurations and templates for real CI/CD execution
 */

class PipelineConfigManager {
  constructor() {
    this.configs = new Map();
    this.loadDefaultConfigs();
  }

  loadDefaultConfigs() {
    // Default pipeline configurations for different project types
    this.configs.set('typescript-monorepo', {
      name: 'TypeScript Monorepo',
      description: 'Pipeline for TypeScript monorepo projects with npm workspaces',
      stages: [
        {
          name: 'Code Quality Analysis',
          command: 'npm run lint',
          timeout: 120000,
          critical: true,
          rollback: 'Exit pipeline - code quality issues must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'TypeScript Compilation Check',
          command: 'npm run typecheck',
          timeout: 180000,
          critical: true,
          rollback: 'Exit pipeline - TypeScript errors must be fixed',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Frontend Build',
          command: 'npm run build --workspace=packages/simulator-ui',
          timeout: 300000,
          critical: true,
          rollback: 'Exit pipeline - build failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Backend Build',
          command: 'npm run build:all',
          timeout: 300000,
          critical: true,
          rollback: 'Exit pipeline - backend build failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Unit Tests',
          command: 'npm run test:all',
          timeout: 420000,
          critical: true,
          rollback: 'Exit pipeline - test failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Security Check',
          command: 'node scripts/security-check.js',
          timeout: 120000,
          critical: true,
          rollback: 'Exit pipeline - security vulnerabilities must be addressed',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Docker Build',
          command: 'docker compose build',
          timeout: 600000,
          critical: true,
          rollback: 'Exit pipeline - Docker build failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Integration Test',
          command: 'docker compose up --build -d && sleep 30 && curl -f http://localhost:8080 || exit 1',
          timeout: 300000,
          critical: false,
          rollback: 'docker compose down -v',
          failureMode: 'ROLLBACK_AND_FAIL'
        },
        {
          name: 'Cleanup',
          command: 'docker compose down -v',
          timeout: 120000,
          critical: false,
          rollback: 'Force cleanup: docker compose down -v --remove-orphans',
          failureMode: 'CONTINUE'
        }
      ]
    });

    this.configs.set('react-vite', {
      name: 'React Vite Project',
      description: 'Pipeline for React projects using Vite build system',
      stages: [
        {
          name: 'Code Quality Analysis',
          command: 'npm run lint',
          timeout: 120000,
          critical: true,
          rollback: 'Exit pipeline - code quality issues must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'TypeScript Compilation Check',
          command: 'npm run typecheck',
          timeout: 180000,
          critical: true,
          rollback: 'Exit pipeline - TypeScript errors must be fixed',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Build',
          command: 'npm run build',
          timeout: 300000,
          critical: true,
          rollback: 'Exit pipeline - build failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Unit Tests',
          command: 'npm run test',
          timeout: 420000,
          critical: true,
          rollback: 'Exit pipeline - test failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Security Check',
          command: 'npm audit',
          timeout: 120000,
          critical: true,
          rollback: 'Exit pipeline - security vulnerabilities must be addressed',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Docker Build',
          command: 'docker build -t react-app .',
          timeout: 600000,
          critical: true,
          rollback: 'Exit pipeline - Docker build failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        }
      ]
    });

    this.configs.set('nodejs-express', {
      name: 'Node.js Express Project',
      description: 'Pipeline for Node.js backend projects with Express',
      stages: [
        {
          name: 'Code Quality Analysis',
          command: 'npm run lint',
          timeout: 120000,
          critical: true,
          rollback: 'Exit pipeline - code quality issues must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'TypeScript Compilation Check',
          command: 'npm run typecheck',
          timeout: 180000,
          critical: true,
          rollback: 'Exit pipeline - TypeScript errors must be fixed',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Unit Tests',
          command: 'npm run test',
          timeout: 420000,
          critical: true,
          rollback: 'Exit pipeline - test failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Security Check',
          command: 'npm audit',
          timeout: 120000,
          critical: true,
          rollback: 'Exit pipeline - security vulnerabilities must be addressed',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Build',
          command: 'npm run build',
          timeout: 300000,
          critical: true,
          rollback: 'Exit pipeline - build failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Integration Tests',
          command: 'npm run test:integration',
          timeout: 600000,
          critical: true,
          rollback: 'Exit pipeline - integration test failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        }
      ]
    });

    this.configs.set('docker-compose', {
      name: 'Docker Compose Project',
      description: 'Pipeline for projects using Docker Compose',
      stages: [
        {
          name: 'Docker Build',
          command: 'docker compose build',
          timeout: 600000,
          critical: true,
          rollback: 'Exit pipeline - Docker build failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Docker Tests',
          command: 'docker compose run --rm test npm test',
          timeout: 420000,
          critical: true,
          rollback: 'Exit pipeline - test failures must be resolved',
          failureMode: 'FAIL_PIPELINE'
        },
        {
          name: 'Integration Test',
          command: 'docker compose up -d && sleep 30 && curl -f http://localhost:3000 || exit 1',
          timeout: 300000,
          critical: false,
          rollback: 'docker compose down',
          failureMode: 'ROLLBACK_AND_FAIL'
        },
        {
          name: 'Cleanup',
          command: 'docker compose down',
          timeout: 120000,
          critical: false,
          rollback: 'Force cleanup: docker compose down --remove-orphans',
          failureMode: 'CONTINUE'
        }
      ]
    });
  }

  /**
   * Get all available pipeline configurations
   */
  getAvailableConfigs() {
    return Array.from(this.configs.values()).map(config => ({
      id: config.id,
      name: config.name,
      description: config.description,
      stageCount: config.stages.length
    }));
  }

  /**
   * Get a specific pipeline configuration by ID
   */
  getConfigById(id) {
    return this.configs.get(id);
  }

  /**
   * Generate pipeline stages based on detected project configuration
   */
  generatePipelineStages(projectConfig) {
    // Determine the best matching configuration
    let bestMatch = null;
    let matchScore = 0;

    for (const [id, config] of this.configs.entries()) {
      let score = 0;
      
      // Score based on project type match
      if (config.name.toLowerCase().includes(projectConfig.projectType.toLowerCase())) {
        score += 10;
      }

      // Score based on tool matches
      if (projectConfig.buildTools.includes('vite')) score += 5;
      if (projectConfig.buildTools.includes('typescript')) score += 3;
      if (projectConfig.testFrameworks.includes('jest')) score += 3;
      if (projectConfig.lintingTools.includes('eslint')) score += 2;
      if (projectConfig.deploymentTargets.includes('docker')) score += 4;

      if (score > matchScore) {
        matchScore = score;
        bestMatch = config;
      }
    }

    // If no good match found, use a generic configuration
    if (!bestMatch || matchScore < 5) {
      bestMatch = this.configs.get('typescript-monorepo');
    }

    return bestMatch.stages;
  }

  /**
   * Create a custom pipeline configuration
   */
  createCustomConfig(name, description, stages) {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const config = {
      id,
      name,
      description,
      stages
    };
    
    this.configs.set(id, config);
    return config;
  }

  /**
   * Update an existing pipeline configuration
   */
  updateConfig(id, updates) {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`Configuration ${id} not found`);
    }
    
    this.configs.set(id, { ...config, ...updates });
    return this.configs.get(id);
  }

  /**
   * Delete a pipeline configuration
   */
  deleteConfig(id) {
    return this.configs.delete(id);
  }
}

export default new PipelineConfigManager();
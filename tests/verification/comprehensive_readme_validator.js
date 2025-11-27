#!/usr/bin/env node

/**
 * Comprehensive README Claims Validator
 * Systematically verifies every major claim made in the README
 * Determines if the README is accurate or contains "ghost features"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    purple: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

class READMEValidator {
    constructor() {
        this.passes = 0;
        this.failures = 0;
        this.warnings = 0;
        this.claims = [];
        this.rootDir = path.resolve(__dirname);
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    success(message) {
        this.log(`✅ ${message}`, 'green');
        this.passes++;
    }

    failure(message, details = '') {
        this.log(`❌ ${message}`, 'red');
        if (details) this.log(`   ${details}`, 'yellow');
        this.failures++;
    }

    warning(message) {
        this.log(`⚠️  ${message}`, 'yellow');
        this.warnings++;
    }

    info(message) {
        this.log(`ℹ️  ${message}`, 'blue');
    }

    // Helper: Check if file exists
    fileExists(filePath) {
        return fs.existsSync(path.join(this.rootDir, filePath));
    }

    // Helper: Check if file contains pattern
    grepFile(filePath, pattern) {
        if (!this.fileExists(filePath)) return false;
        try {
            const content = fs.readFileSync(path.join(this.rootDir, filePath), 'utf8');
            return new RegExp(pattern).test(content);
        } catch {
            return false;
        }
    }

    // Helper: Search recursively for pattern
    grepRecursive(dir, pattern) {
        try {
            const result = execSync(`find "${path.join(this.rootDir, dir)}" -type f -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" | head -20 | xargs grep -l "${pattern}"`, { encoding: 'utf8' });
            return result.trim().split('\n').filter(line => line.length > 0).length > 0;
        } catch {
            return false;
        }
    }

    // Helper: Check package.json dependencies
    hasDependency(packagePath, depName) {
        if (!this.fileExists(packagePath)) return false;
        const pkg = JSON.parse(fs.readFileSync(path.join(this.rootDir, packagePath), 'utf8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        return depName in allDeps;
    }

    // Validate CLI Tool claims
    validateCliTool() {
        this.log('\n🛠️  VALIDATING CLI TOOL CLAIMS', 'bold');

        // Claim: Self-contained npm package
        if (this.fileExists('cli-tool/package.json') &&
            this.fileExists('cli-tool/bin/codeflow-hook.js')) {
            this.success('Self-contained npm package structure exists');
        } else {
            this.failure('Missing npm package structure');
        }

        // Claim: Local RAG System indexes and retrieves context
        if (this.grepRecursive('cli-tool', 'VectorStore|vectorStore|RAG|rag') &&
            this.fileExists('cli-tool/services/vector-store.js')) {
            this.success('RAG/vector store implementation found');
        } else {
            this.failure('RAG system implementation not found');
        }

        // Claim: Project Knowledge Graph learns patterns
        if ((this.grepRecursive('cli-tool', 'knowledge|graph|Graph|KnowledgeGraph|EKG|Ekg') &&
             this.fileExists('cli-tool/src/knowledge/ekg-core.js')) ||
            (this.grepRecursive('cli-tool', 'class KnowledgeGraph'))) {
            this.success('Project knowledge graph implementation');
        } else {
            this.failure('Project knowledge graph not implemented');
        }

        // Claim: Multi-Provider AI Support
        const aiProviders = ['@google/generative-ai', 'openai', '@anthropic-ai/sdk'];
        let providerCount = 0;
        aiProviders.forEach(provider => {
            if (this.hasDependency('cli-tool/package.json', provider)) {
                providerCount++;
            }
        });

        if (providerCount >= 2) {
            this.success('Multi-provider AI support (found ' + providerCount + ' providers)');
        } else {
            this.failure('Missing multi-provider AI support', `Found ${providerCount} providers, claimed 3+`);
        }

        // Claim: Compliance Engine (GDPR, SOX, HIPAA)
        const compliancePatterns = ['HIPAA', 'GDPR', 'SOX'];
        let complianceCount = 0;
        compliancePatterns.forEach(pattern => {
            if (this.grepRecursive('cli-tool', pattern)) complianceCount++;
        });

        if (complianceCount >= 2) {
            this.success('Compliance frameworks implemented');
        } else {
            this.failure('Compliance engine not fully implemented', `Found ${complianceCount} of 3 frameworks`);
        }

        // Claim: Git Automation (pre-commit, pre-push hooks)
        if (this.fileExists('hooks/pre-push') &&
            this.fileExists('hooks/pre-commit')) {
            this.success('Git automation hooks present');
        } else {
            this.warning('Git hooks incomplete - some missing');
        }
    }

    // Validate Enterprise Framework claims
    validateEnterpriseFramework() {
        this.log('\n🏢 VALIDATING ENTERPRISE FRAMEWORK CLAIMS', 'bold');

        // Claim: AI Agent Architecture
        if (this.grepRecursive('cli-tool/src/agents', 'class.*Agent|AgentOrchestrator|extends.*Agent') ||
            this.fileExists('cli-tool/src/agents/orchestrator.js')) {
            this.success('AI Agent Architecture implemented');
        } else {
            this.failure('AI Agent Architecture not found');
        }

        // Claim: Enterprise Knowledge Graph (EKG)
        if (this.grepRecursive('cli-tool', 'EKG|KnowledgeGraph|Enterprise.*Knowledge.*Graph') &&
            this.fileExists('cli-tool/src/knowledge/ekg-core.js')) {
            this.success('Enterprise Knowledge Graph (EKG) implementation');
        } else {
            this.failure('EKG implementation not found');
        }

        // Claim: Governance Safety Framework
        if (this.fileExists('codeflow-cli/src/validation/GovernanceSafetyFramework.ts')) {
            this.success('Governance Safety Framework implemented');
        } else {
            this.failure('Governance Safety Framework missing');
        }

        // Claim: Pattern Recognition & Best Practices Learning
        if (this.grepRecursive('codeflow-cli/src/learning', 'pattern|Pattern|learn|Learn')) {
            this.success('Pattern recognition and learning capabilities');
        } else {
            this.failure('Pattern recognition not implemented');
        }
    }

    // Validate CI/CD Simulator claims
    validateCicdSimulator() {
        this.log('\n🔄 VALIDATING CI/CD SIMULATOR CLAIMS', 'bold');

        // Claim: Interactive Pipeline UI (React + Vite)
        if (this.fileExists('index.html') &&
            this.fileExists('index.tsx') &&
            this.hasDependency('package.json', 'vite')) {
            this.success('Interactive Pipeline UI (React + Vite)');
        } else {
            this.failure('Frontend UI implementation incomplete');
        }

        // Claim: Live Code Analysis (ESLint integration)
        if (this.fileExists('.eslintrc.json') &&
            this.grepRecursive('', 'ESLint|eslint')) {
            this.success('Live code analysis (ESLint integration)');
        } else {
            this.failure('Code analysis integration missing');
        }

        // Claim: Docker Container Orchestration
        if (this.fileExists('docker-compose.yml') &&
            this.fileExists('Dockerfile')) {
            this.success('Docker container orchestration');
        } else {
            this.failure('Docker orchestration setup incomplete');
        }

        // Claim: AI Console direct integration
        if (this.grepRecursive('components', 'AiConsole|AI.*Console') &&
            this.fileExists('components/AiConsole.tsx')) {
            this.success('AI Console for code review and suggestions');
        } else {
            this.failure('AI Console implementation missing');
        }
    }

    // Validate Infrastructure claims
    validateInfrastructure() {
        this.log('\n🏗️  VALIDATING INFRASTRUCTURE CLAIMS', 'bold');

        // Claim: Nginx Reverse Proxy
        if (this.fileExists('nginx/default.conf') &&
            this.grepRecursive('docker-compose', 'nginx|Nginx')) {
            this.success('Nginx reverse proxy configuration');
        } else {
            this.failure('Nginx configuration missing');
        }

        // Claim: Express Backend API
        if (this.fileExists('backend/src/app.ts') ||
            this.fileExists('server/server.js')) {
            this.success('Express backend API implementation');
        } else {
            this.failure('Backend API implementation not found');
        }

        // Claim: GraphQL Microservices
        if (this.grepRecursive('cli-tool/services', 'GraphQL|graphql') &&
            this.fileExists('cli-tool/services/query-service/src/schemas/schema.graphql')) {
            this.success('GraphQL microservices architecture');
        } else {
            this.failure('GraphQL microservices incomplete');
        }
    }

    // Validate Security & Sentinel claims
    validateSecurityClaims() {
        this.log('\n🛡️  VALIDATING SECURITY & SENTINEL CLAIMS', 'bold');

        // Claim: ML Anomaly Detection (IsolationForest)
        if (this.grepRecursive('codeflow-sentinel', 'IsolationForest') &&
            this.hasDependency('codeflow-sentinel/requirements.txt', 'scikit-learn')) {
            this.success('ML anomaly detection (IsolationForest)');
        } else {
            this.failure('ML anomaly detection not implemented');
        }

        // Claim: FastAPI Security Endpoints
        if (this.grepRecursive('codeflow-sentinel', '@app\.post|fastapi|FastAPI') &&
            this.hasDependency('codeflow-sentinel/requirements.txt', 'fastapi')) {
            this.success('FastAPI security endpoints');
        } else {
            this.failure('FastAPI endpoints missing');
        }

        // Claim: Prometheus Metrics
        if (this.grepRecursive('codeflow-sentinel', 'prometheus|Prometheus')) {
            this.success('Prometheus metrics integration');
        } else {
            this.warning('Prometheus metrics not confirmed');
        }
    }

    // Validate Documentation claims
    validateDocumentation() {
        this.log('\n📚 VALIDATING DOCUMENTATION CLAIMS', 'bold');

        // Claim: Architecture Diagrams (Mermaid)
        if (this.fileExists('docs/architecture.mermaid') &&
            this.fileExists('docs/workflow.mermaid')) {
            this.success('Architecture and workflow diagrams');
        } else {
            this.failure('Architecture diagrams missing');
        }

        // Claim: Comprehensive Docs Structure
        const requiredDocs = [
            'docs/ARCHITECTURE.md',
            'docs/SECURITY.md',
            'docs/CLI-COMPONENTS.md',
            'social-media-posts.md'
        ];

        let docsCount = 0;
        requiredDocs.forEach(doc => {
            if (this.fileExists(doc)) docsCount++;
        });

        if (docsCount === requiredDocs.length) {
            this.success('Comprehensive documentation structure');
        } else {
            this.warning(`Documentation incomplete: ${docsCount}/${requiredDocs.length} files found`);
        }
    }

    // Test actual functionality
    async testActualFunctionality() {
        this.log('\n🧪 TESTING ACTUAL FUNCTIONALITY', 'bold');

        // Test CLI Help Command
        try {
            const helpOutput = execSync('cd cli-tool && node bin/codeflow-hook.js --help', { encoding: 'utf8' });
            if (helpOutput.includes('codeflow-hook')) {
                this.success('CLI help command functional');
            } else {
                this.failure('CLI help command not working');
            }
        } catch (error) {
            this.failure('CLI help command error', error.message);
        }

        // Test Package Version
        if (this.grepFile('cli-tool/package.json', '"version": "1.0.0"')) {
            this.success('Production version 1.0.0 confirmed');
        } else {
            this.failure('Version not updated to 1.0.0');
        }

        // Test Git Tags
        try {
            const tags = execSync('cd cli-tool && git tag -l', { encoding: 'utf8' });
            if (tags.includes('v1.0.0')) {
                this.success('Git release tags created');
            } else {
                this.warning('Release tags not found');
            }
        } catch {
            this.warning('Git tags check failed');
        }
    }

    // Generate comprehensive report
    generateReport() {
        const total = this.passes + this.failures + this.warnings;
        const completionRate = ((this.passes / total) * 100).toFixed(1);

        this.log('\n' + '='.repeat(80), 'blue');
        this.log('📊 COMPREHENSIVE README VALIDATION REPORT', 'bold');
        this.log('='.repeat(80), 'blue');

        this.log(`\n🎯 Overall Completion: ${completionRate}% (${this.passes}/${total} claims verified)`, 'cyan');

        if (this.failures === 0) {
            this.log('\n🎉 RESULT: README IS ACCURATE - All major claims verified!', 'green');
            this.log('   Your documentation appears to be the "real deal".', 'green');
        } else if (this.failures <= 3) {
            this.log('\n⚠️  RESULT: README MOSTLY ACCURATE - Minor implementation gaps found', 'yellow');
            this.log(`   ${this.failures} claims need attention.`, 'yellow');
        } else {
            this.log('\n❌ RESULT: README CONTAINS "GHOST FEATURES" - Significant gaps detected', 'red');
            this.log(`   ${this.failures} claims are missing implementation.`, 'red');
        }

        this.log('\n📈 Detailed Breakdown:');
        this.log(`   ✅ Verified Claims: ${this.passes}`, 'green');
        this.log(`   ❌ Missing Features: ${this.failures}`, 'red');
        this.log(`   ⚠️  Warnings: ${this.warnings}`, 'yellow');

        this.log('\n🔍 Critical Gaps (if any):', 'cyan');

        if (this.failures > 0) {
            this.log('   Implementation gaps found - review the ❌ failures above');
        } else {
            this.log('   No critical gaps detected');
        }

        this.log('\n📋 Recommendations:', 'cyan');
        if (this.failures > 0) {
            this.log('   1. Address the missing implementations marked with ❌');
            this.log('   2. Update README to reflect current capabilities');
            this.log('   3. Consider adding integration tests for verified features');
        } else {
            this.log('   1. Keep up the good work maintaining accurate documentation!');
            this.log('   2. Consider adding more detailed feature verification tests');
            this.log('   3. Your README accurately represents the codebase');
        }

        this.log('\n' + '='.repeat(80), 'blue');
    }

    // Main validation execution
    async run() {
        this.log('🔍 COMPREHENSIVE README CLAIMS VALIDATOR', 'bold');
        this.log('Systematically verifying if README represents the "real deal"\n');

        this.validateCliTool();
        this.validateEnterpriseFramework();
        this.validateCicdSimulator();
        this.validateInfrastructure();
        this.validateSecurityClaims();
        this.validateDocumentation();
        await this.testActualFunctionality();
        this.generateReport();
    }
}

// Run the validator
const validator = new READMEValidator();
validator.run().catch(console.error);

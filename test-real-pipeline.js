#!/usr/bin/env node

/**
 * Test Script for Real CI/CD Pipeline Execution
 * Validates the complete real execution pipeline from detection to execution
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3001';

class PipelineTestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Real CI/CD Pipeline Tests\n');

    // Test 1: Project Configuration Detection
    await this.addTest('Project Configuration Detection', async () => {
      const response = await fetch(`${API_BASE}/api/pipeline/config`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Config detection failed: ${data.error}`);
      }

      if (!data.config || !data.stages) {
        throw new Error('Missing config or stages in response');
      }

      console.log(`  ✅ Detected project type: ${data.config.projectType}`);
      console.log(`  ✅ Generated ${data.stages.length} pipeline stages`);
      
      return { config: data.config, stages: data.stages };
    });

    // Test 2: Pipeline Execution
    await this.addTest('Pipeline Execution', async () => {
      const response = await fetch(`${API_BASE}/api/pipeline/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitMessage: 'test: Validate real pipeline execution',
          stages: this.results[0].data.stages.slice(0, 3) // Test first 3 stages only
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Pipeline execution failed: ${data.error}`);
      }

      console.log(`  ✅ Pipeline started with ID: ${data.executionId}`);
      return { executionId: data.executionId };
    });

    // Test 3: Execution Status Monitoring
    await this.addTest('Execution Status Monitoring', async () => {
      const executionId = this.results[1].data.executionId;
      let status = 'running';
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max

      while (status === 'running' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const response = await fetch(`${API_BASE}/api/pipeline/status/${executionId}`);
        const data = await response.json();

        if (data.success) {
          status = data.execution.status;
          console.log(`  📊 Status: ${status} (${attempts}s)`);
        }
      }

      if (status === 'running') {
        throw new Error('Pipeline execution timed out');
      }

      console.log(`  ✅ Pipeline completed with status: ${status}`);
      return { finalStatus: status };
    });

    // Test 4: Stage Logs Retrieval
    await this.addTest('Stage Logs Retrieval', async () => {
      const executionId = this.results[1].data.executionId;
      const stages = this.results[0].data.stages.slice(0, 3);

      for (const stage of stages) {
        const stageId = `${executionId}-${stage.name.replace(/\s+/g, '-').toLowerCase()}`;
        const response = await fetch(`${API_BASE}/api/pipeline/logs/${executionId}/${stageId}`);
        const data = await response.json();

        if (data.success) {
          console.log(`  📝 Stage "${stage.name}": ${data.stage.logs.length} log lines`);
        } else {
          console.log(`  ⚠️  Stage "${stage.name}": No logs available`);
        }
      }

      return { stageCount: stages.length };
    });

    // Test 5: Results Persistence
    await this.addTest('Results Persistence', async () => {
      const response = await fetch(`${API_BASE}/api/pipeline/results`);
      const data = await response.json();

      if (!data.success || !data.results || data.results.length === 0) {
        throw new Error('No pipeline results found');
      }

      const latestResult = data.results[data.results.length - 1];
      console.log(`  📊 Latest execution: ${latestResult.id}`);
      console.log(`  📊 Status: ${latestResult.overallStatus}`);
      console.log(`  📊 Duration: ${(latestResult.metrics.totalDuration / 1000).toFixed(2)}s`);
      console.log(`  📊 Stages: ${latestResult.metrics.successCount}/${latestResult.stages.length} succeeded`);

      return { result: latestResult };
    });

    // Test 6: Error Handling
    await this.addTest('Error Handling', async () => {
      // Test with invalid execution ID
      const response = await fetch(`${API_BASE}/api/pipeline/status/invalid-id`);
      const data = await response.json();

      if (data.success) {
        throw new Error('Should have failed with invalid ID');
      }

      console.log(`  ✅ Error handling works: ${data.error}`);
      return { errorHandling: true };
    });

    // Run all tests
    for (const test of this.tests) {
      try {
        console.log(`\n🧪 Running: ${test.name}`);
        const result = await test.fn();
        this.results.push({ test: test.name, success: true, data: result });
        console.log(`  ✅ PASSED`);
      } catch (error) {
        this.results.push({ test: test.name, success: false, error: error.message });
        console.log(`  ❌ FAILED: ${error.message}`);
      }
    }

    this.printSummary();
  }

  addTest(name, fn) {
    this.tests.push({ name, fn });
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;

    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`🎯 Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Real CI/CD pipeline is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above.');
    }
    console.log('='.repeat(60));
  }
}

// Run the tests
const runner = new PipelineTestRunner();
runner.runAllTests().catch(console.error);
#!/usr/bin/env python3
"""
Python Test Runner for Real CI/CD Pipeline Execution

This script validates the complete real execution pipeline from detection to execution.
It's a Python equivalent of the JavaScript test script.
"""

import asyncio
import aiohttp
import json
import sys
import time
from typing import Dict, List, Any, Optional

API_BASE = "http://localhost:3001"

class PipelineTestRunner:
    def __init__(self):
        self.tests = []
        self.results = []
    
    async def run_all_tests(self):
        """Run all pipeline tests"""
        print('🚀 Starting Real CI/CD Pipeline Tests\n')
        
        # Test 1: Project Configuration Detection
        await self.add_test('Project Configuration Detection', self.test_project_config)
        
        # Test 2: Pipeline Execution
        await self.add_test('Pipeline Execution', self.test_pipeline_execution)
        
        # Test 3: Execution Status Monitoring
        await self.add_test('Execution Status Monitoring', self.test_status_monitoring)
        
        # Test 4: Stage Logs Retrieval
        await self.add_test('Stage Logs Retrieval', self.test_stage_logs)
        
        # Test 5: Results Persistence
        await self.add_test('Results Persistence', self.test_results_persistence)
        
        # Test 6: Error Handling
        await self.add_test('Error Handling', self.test_error_handling)
        
        # Run all tests
        for test in self.tests:
            try:
                print(f'\n🧪 Running: {test["name"]}')
                result = await test["fn"]()
                self.results.append({"test": test["name"], "success": True, "data": result})
                print(f'  ✅ PASSED')
            except Exception as e:
                self.results.append({"test": test["name"], "success": False, "error": str(e)})
                print(f'  ❌ FAILED: {e}')
        
        self.print_summary()
    
    async def add_test(self, name: str, fn):
        """Add a test to the test suite"""
        self.tests.append({"name": name, "fn": fn})
    
    async def test_project_config(self):
        """Test project configuration detection"""
        async with aiohttp.ClientSession() as session:
            async with session.get(f'{API_BASE}/api/pipeline/config') as response:
                data = await response.json()
                
                if not data.get('success'):
                    raise Exception(f'Config detection failed: {data.get("error")}')
                
                if not data.get('config') or not data.get('stages'):
                    raise Exception('Missing config or stages in response')
                
                print(f'  ✅ Detected project type: {data["config"]["project_type"]}')
                print(f'  ✅ Generated {len(data["stages"])} pipeline stages')
                
                return {"config": data["config"], "stages": data["stages"]}
    
    async def test_pipeline_execution(self):
        """Test pipeline execution"""
        async with aiohttp.ClientSession() as session:
            # Use first 3 stages only for testing
            stages = self.results[0]["data"]["stages"][:3]
            
            payload = {
                "commit_message": "test: Validate real pipeline execution",
                "stages": stages
            }
            
            async with session.post(f'{API_BASE}/api/pipeline/execute', 
                                  json=payload) as response:
                data = await response.json()
                
                if not data.get('success'):
                    raise Exception(f'Pipeline execution failed: {data.get("message")}')
                
                print(f'  ✅ Pipeline started with ID: {data["execution_id"]}')
                return {"execution_id": data["execution_id"]}
    
    async def test_status_monitoring(self):
        """Test execution status monitoring"""
        execution_id = self.results[1]["data"]["execution_id"]
        status = 'running'
        attempts = 0
        max_attempts = 30  # 30 seconds max
        
        async with aiohttp.ClientSession() as session:
            while status == 'running' and attempts < max_attempts:
                await asyncio.sleep(1)
                attempts += 1
                
                async with session.get(f'{API_BASE}/api/pipeline/status/{execution_id}') as response:
                    data = await response.json()
                    
                    if data.get('success'):
                        status = data["execution"]["status"]
                        print(f'  📊 Status: {status} ({attempts}s)')
            
            if status == 'running':
                raise Exception('Pipeline execution timed out')
            
            print(f'  ✅ Pipeline completed with status: {status}')
            return {"final_status": status}
    
    async def test_stage_logs(self):
        """Test stage logs retrieval"""
        execution_id = self.results[1]["data"]["execution_id"]
        stages = self.results[0]["data"]["stages"][:3]
        
        async with aiohttp.ClientSession() as session:
            for stage in stages:
                stage_id = f"{execution_id}-{stage['name'].replace(' ', '-').lower()}"
                
                async with session.get(f'{API_BASE}/api/pipeline/logs/{execution_id}/{stage_id}') as response:
                    data = await response.json()
                    
                    if data.get('success'):
                        print(f'  📝 Stage "{stage["name"]}": {len(data["stage"]["logs"])} log lines')
                    else:
                        print(f'  ⚠️  Stage "{stage["name"]}": No logs available')
            
            return {"stage_count": len(stages)}
    
    async def test_results_persistence(self):
        """Test results persistence"""
        async with aiohttp.ClientSession() as session:
            async with session.get(f'{API_BASE}/api/pipeline/results') as response:
                data = await response.json()
                
                if not data.get('success') or not data.get('results') or len(data['results']) == 0:
                    raise Exception('No pipeline results found')
                
                latest_result = data['results'][-1]
                print(f'  📊 Latest execution: {latest_result["id"]}')
                print(f'  📊 Status: {latest_result["overall_status"]}')
                print(f'  📊 Duration: {latest_result["metrics"]["total_duration"]:.2f}s')
                print(f'  📊 Stages: {latest_result["metrics"]["success_count"]}/{len(latest_result["stages"])} succeeded')
                
                return {"result": latest_result}
    
    async def test_error_handling(self):
        """Test error handling"""
        async with aiohttp.ClientSession() as session:
            # Test with invalid execution ID
            async with session.get(f'{API_BASE}/api/pipeline/status/invalid-id') as response:
                data = await response.json()
                
                if data.get('success'):
                    raise Exception('Should have failed with invalid ID')
                
                print(f'  ✅ Error handling works: {data.get("error")}')
                return {"error_handling": True}
    
    def print_summary(self):
        """Print test summary"""
        print('\n' + '=' * 60)
        print('📊 TEST SUMMARY')
        print('=' * 60)
        
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        
        for i, result in enumerate(self.results):
            status = '✅' if result["success"] else '❌'
            print(f'{i + 1}. {status} {result["test"]}')
            if not result["success"]:
                print(f'   Error: {result["error"]}')
        
        print('\n' + '=' * 60)
        print(f'🎯 Results: {passed}/{total} tests passed')
        
        if passed == total:
            print('🎉 All tests passed! Real CI/CD pipeline is working correctly.')
        else:
            print('⚠️  Some tests failed. Check the errors above.')
        print('=' * 60)

async def main():
    """Main test runner"""
    runner = PipelineTestRunner()
    await runner.run_all_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n⚠️  Tests interrupted by user')
        sys.exit(1)
    except Exception as e:
        print(f'\n💥 Test runner failed: {e}')
        sys.exit(1)
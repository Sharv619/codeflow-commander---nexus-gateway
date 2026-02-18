import React from 'react';

const PipelineSandbox: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Pipeline Sandbox</h2>
        <span className="text-sm text-gray-400">Real-time execution</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Configuration */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium mb-3">Pipeline Configuration</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span>Code Quality Analysis</span>
              <label className="inline-flex items-center">
                <input type="checkbox" defaultChecked className="form-checkbox" />
              </label>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span>TypeScript Compilation</span>
              <label className="inline-flex items-center">
                <input type="checkbox" defaultChecked className="form-checkbox" />
              </label>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span>Frontend Build</span>
              <label className="inline-flex items-center">
                <input type="checkbox" defaultChecked className="form-checkbox" />
              </label>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span>Unit Tests</span>
              <label className="inline-flex items-center">
                <input type="checkbox" defaultChecked className="form-checkbox" />
              </label>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span>Security Check</span>
              <label className="inline-flex items-center">
                <input type="checkbox" defaultChecked className="form-checkbox" />
              </label>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span>Docker Build</span>
              <label className="inline-flex items-center">
                <input type="checkbox" className="form-checkbox" />
              </label>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Start Pipeline
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Stop Pipeline
            </button>
          </div>
        </div>
        
        {/* Execution Status */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium mb-3">Execution Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span className="text-green-400">✅ Code Quality Analysis</span>
              <span className="text-xs text-gray-400">30s</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span className="text-green-400">✅ TypeScript Compilation</span>
              <span className="text-xs text-gray-400">45s</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span className="text-green-400">✅ Frontend Build</span>
              <span className="text-xs text-gray-400">2m 15s</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span className="text-green-400">✅ Unit Tests</span>
              <span className="text-xs text-gray-400">1m 30s</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span className="text-green-400">✅ Security Check</span>
              <span className="text-xs text-gray-400">15s</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-600 rounded">
              <span className="text-yellow-400">⏳ Docker Build</span>
              <span className="text-xs text-gray-400">Running...</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-900 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Overall Progress</span>
              <span className="text-sm">5/6 stages completed</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '83%' }}></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Logs */}
      <div className="mt-6 bg-gray-700 rounded-lg p-4">
        <h3 className="font-medium mb-3">Pipeline Logs</h3>
        <div className="bg-black rounded p-4 h-48 overflow-y-auto">
          <div className="text-green-400">[13:09:28] Pipeline execution started</div>
          <div className="text-blue-400">[13:09:28] Running code quality analysis...</div>
          <div className="text-green-400">[13:09:58] Code quality analysis completed successfully</div>
          <div className="text-blue-400">[13:09:58] Running TypeScript compilation...</div>
          <div className="text-green-400">[13:10:43] TypeScript compilation completed successfully</div>
          <div className="text-blue-400">[13:10:43] Running frontend build...</div>
          <div className="text-green-400">[13:12:58] Frontend build completed successfully</div>
          <div className="text-blue-400">[13:12:58] Running unit tests...</div>
          <div className="text-green-400">[13:14:28] Unit tests completed successfully</div>
          <div className="text-blue-400">[13:14:28] Running security check...</div>
          <div className="text-green-400">[13:14:43] Security check completed successfully</div>
          <div className="text-blue-400">[13:14:43] Running Docker build...</div>
          <div className="text-yellow-400">[13:14:43] Docker build in progress...</div>
        </div>
      </div>
    </div>
  );
};

export default PipelineSandbox;
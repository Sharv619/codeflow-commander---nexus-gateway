import React from 'react';
import Pipeline from '../Pipeline';

const PipelineSandbox: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-200">Pipeline Sandbox</h2>
        <p className="text-gray-400 mt-1">
          Prototype and test CI/CD pipeline configurations before deployment
        </p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-400">⚠️</span>
          <div>
            <h4 className="text-yellow-400 font-medium">Sandbox Environment</h4>
            <p className="text-yellow-300 text-sm">
              This is a safe testing environment. Changes made here do not affect production pipelines.
            </p>
          </div>
        </div>
      </div>

      {/* Reusing the existing Pipeline component */}
      <Pipeline />
    </div>
  );
};

export default PipelineSandbox;

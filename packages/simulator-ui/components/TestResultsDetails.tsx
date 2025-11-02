import React from 'react';

interface TestResultsDetailsProps {
  logs: string[];
}

const TestResultsDetails: React.FC<TestResultsDetailsProps> = ({ logs }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg mb-1">Test Results (Raw Output)</h3>
      {logs.length > 0 ? (
        <pre className="mt-2 whitespace-pre-wrap bg-gray-800 p-2 rounded">
          {logs.join('\n')}
        </pre>
      ) : (
        <p className="text-gray-400">No detailed test output available.</p>
      )}
    </div>
  );
};

export default TestResultsDetails;

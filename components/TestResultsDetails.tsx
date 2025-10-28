import React from 'react';

interface JestTestResult {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  startTime: number;
  endTime: number;
  testResults: Array<{
    status: 'passed' | 'failed';
    name: string;
    message: string;
    summary: string;
    assertionResults: Array<{
      status: 'passed' | 'failed';
      title: string;
      fullName: string;
      failureMessages: string[];
    }>;
  }>;
}

interface TestResultsDetailsProps {
  result: {
    success: boolean;
    output: string;
    error: string;
  };
}

const TestResultsDetails: React.FC<TestResultsDetailsProps> = ({ result }) => {
  let parsedResult: JestTestResult | null = null;
  try {
    if (result.output) {
      parsedResult = JSON.parse(result.output);
    }
  } catch (e) {
    // Fallback to raw output if JSON parsing fails
    console.error("Failed to parse Jest JSON output:", e);
  }

  if (!parsedResult) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg mb-1">Test Results (Raw Output)</h3>
        {result.error && <pre className="mt-2 whitespace-pre-wrap bg-red-900/50 p-2 rounded text-red-300">{result.error}</pre>}
        {result.output && <pre className="mt-2 whitespace-pre-wrap bg-gray-800 p-2 rounded">{result.output}</pre>}
        {!result.output && !result.error && <p className="text-gray-400">No detailed test output available.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Overall Test Status:
          <span className={`ml-2 ${parsedResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {parsedResult.success ? 'PASS' : 'FAIL'}
          </span>
        </h3>
        <p className="text-gray-400">
          {parsedResult.numPassedTests} passed, {parsedResult.numFailedTests} failed, {parsedResult.numTotalTests} total tests.
        </p>
        <p className="text-gray-400">
          {parsedResult.numPassedTestSuites} passed, {parsedResult.numFailedTestSuites} failed, {parsedResult.numTotalTestSuites} total test suites.
        </p>
        <p className="text-gray-400">
          Time: {((parsedResult.endTime - parsedResult.startTime) / 1000).toFixed(2)}s
        </p>
      </div>

      {parsedResult.testResults.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-bold border-b border-gray-700 pb-2">Test Suites:</h4>
          {parsedResult.testResults.map((suite, index) => (
            <div key={index} className="bg-gray-900/50 p-4 rounded-md border border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${suite.status === 'passed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {suite.status.toUpperCase()}
                  </span>
                  <h5 className="font-mono font-semibold text-white">{suite.name}</h5>
                </div>
              </div>

              {suite.assertionResults.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-sm font-semibold text-gray-400 mb-2">Tests:</h6>
                  <ul className="space-y-2">
                    {suite.assertionResults.map((assertion, assertIndex) => (
                      <li key={assertIndex} className="text-sm bg-gray-800 p-2 rounded-md">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded ${assertion.status === 'passed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {assertion.status.toUpperCase()}
                          </span>
                          <span className="text-gray-300">{assertion.title}</span>
                        </div>
                        {assertion.failureMessages.length > 0 && (
                          <pre className="mt-1 text-red-300 text-xs whitespace-pre-wrap bg-gray-900 p-1 rounded">
                            {assertion.failureMessages.join('\n')}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestResultsDetails;

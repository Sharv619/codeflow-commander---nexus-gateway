
import React from 'react';
import type { CodeReviewResult, CodeReviewFileResult, CodeReviewIssue } from '../../../types';

const getIssueTypeColor = (type: CodeReviewIssue['type']) => {
  switch (type) {
    case 'Security': return 'bg-red-500/20 text-red-400';
    case 'Bug': return 'bg-red-500/20 text-red-400';
    case 'Performance': return 'bg-yellow-500/20 text-yellow-400';
    case 'Quality': return 'bg-blue-500/20 text-blue-400';
    case 'Best Practice': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const ExternalLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline-block ml-1 text-gray-500 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
);


const FileResult: React.FC<{ file: CodeReviewFileResult }> = ({ file }) => (
  <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700">
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center space-x-3">
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${file.status === 'PASS' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {file.status}
        </span>
        <h4 className="font-mono font-semibold text-white">{file.fileName}</h4>
      </div>
      <div className="text-lg font-bold">Score: {file.score}/10</div>
    </div>

    {file.issues.length > 0 && (
      <div className="mb-3">
        <h5 className="text-sm font-semibold text-gray-400 mb-2">Issues Found:</h5>
        <ul className="space-y-2">
          {file.issues.map((issue, index) => (
            <li key={index} className="text-sm bg-gray-800 p-2 rounded-md">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${getIssueTypeColor(issue.type)}`}>{issue.type}</span>
                <span className="text-gray-400 font-mono">L{issue.line}:</span>
                {issue.link ? (
                  <a href={issue.link} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-cyan-400 hover:underline group transition-colors">
                    {issue.description}
                    <ExternalLinkIcon />
                  </a>
                ) : (
                  <span className="text-gray-300">{issue.description}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )}

    {file.suggestions.length > 0 && (
      <div>
        <h5 className="text-sm font-semibold text-gray-400 mb-2">Suggestions:</h5>
        <ul className="space-y-2 list-disc list-inside">
          {file.suggestions.map((suggestion, index) => (
            <li key={index} className="text-sm text-gray-300 ml-2">{suggestion}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const CodeReviewDetails: React.FC<{ result: CodeReviewResult }> = ({ result }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Overall Status:
          <span className={`ml-2 ${result.overallStatus === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>
            {result.overallStatus}
          </span>
        </h3>
        <p className="text-gray-400">{result.summary}</p>
      </div>
      <div className="space-y-4">
        {result.files.map((file, index) => (
          <FileResult key={index} file={file} />
        ))}
      </div>
    </div>
  );
};

export default CodeReviewDetails;

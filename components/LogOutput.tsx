
import React, { useEffect, useRef } from 'react';

interface LogOutputProps {
  logs: string[];
}

const LogOutput: React.FC<LogOutputProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div ref={logContainerRef} className="bg-gray-900 font-mono text-sm text-gray-300 p-4 rounded-md h-80 overflow-y-auto">
      {logs.map((log, index) => {
        let colorClass = 'text-gray-300';
        if (log.includes('[SUCCESS]')) colorClass = 'text-green-400';
        else if (log.includes('[ERROR]') || log.includes('[FAIL]')) colorClass = 'text-red-400';
        else if (log.includes('[INFO]') || log.includes('[API]')) colorClass = 'text-cyan-400';
        else if (log.includes('[WARN]')) colorClass = 'text-yellow-400';

        return (
          <div key={index} className={`whitespace-pre-wrap ${colorClass}`}>
            {log}
          </div>
        );
      })}
    </div>
  );
};

export default LogOutput;

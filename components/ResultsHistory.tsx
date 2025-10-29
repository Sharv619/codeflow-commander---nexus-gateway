import React, { useState, useEffect } from 'react';

interface Result {
  id: string;
  type: string;
  timestamp: string;
  data: any;
}

const ResultsHistory: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching results from http://localhost:3001/results');
      const res = await fetch('http://localhost:3001/results');
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, body: ${errorText}`);
      }
      const data = await res.json();
      console.log('Fetched results:', data);
      setResults(data);
    } catch (err: any) {
      console.error('Error fetching results:', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-3 border border-gray-700 rounded">
      <h3 className="font-semibold">Previous Analyses</h3>
      <button
        className="mt-2 px-3 py-1 bg-cyan-500 text-black rounded"
        onClick={fetchResults}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>
      {error && <div className="text-red-400 mt-2">Error: {error}</div>}
      {results.length === 0 && !loading && (
        <div className="mt-2 text-gray-400">No previous results found.</div>
      )}
      <div className="mt-2 space-y-2">
        {results.map((result) => (
          <div key={result.id} className="p-2 bg-gray-800 rounded">
            <div className="text-sm text-gray-300">
              Type: {result.type} | Time: {new Date(result.timestamp).toLocaleString()}
            </div>
            <pre className="mt-1 text-xs bg-gray-900 p-1 rounded overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsHistory;

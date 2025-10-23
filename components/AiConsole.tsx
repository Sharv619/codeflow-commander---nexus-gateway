import React, { useState } from 'react';

export default function AiConsole() {
  const [input, setInput] = useState('Summarize: const a = 1;');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callAi() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 p-3 border border-gray-700 rounded">
      <h3 className="font-semibold">AI Console</h3>
      <label className="sr-only" htmlFor="ai-input">AI input</label>
      <textarea id="ai-input" className="w-full mt-2 p-2 text-black" value={input} onChange={(e) => setInput(e.target.value)} rows={4} />
      <div className="mt-2">
        <button className="px-3 py-1 bg-cyan-500 text-black rounded" onClick={callAi} disabled={loading}>
          {loading ? 'Calling AI...' : 'Call AI'}
        </button>
      </div>
      {error && <div className="text-red-400 mt-2">Error: {error}</div>}
      {result && (
        <pre className="mt-2 whitespace-pre-wrap bg-gray-800 p-2 rounded">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}

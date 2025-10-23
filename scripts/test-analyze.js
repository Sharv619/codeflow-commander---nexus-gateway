import fetch from 'node-fetch';

async function run() {
  const res = await fetch('http://localhost:3001/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'const unused = 1; console.log(2);' })
  });

  const json = await res.json();
  console.log('Response:', JSON.stringify(json, null, 2));

  // Basic assertions for the normalized shape
  if (!json || typeof json.overallStatus !== 'string' || typeof json.summary !== 'string' || !Array.isArray(json.files)) {
    console.error('Invalid response shape');
    process.exit(2);
  }

  console.log('OK: /analyze returned normalized CodeReviewResult shape');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

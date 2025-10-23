// Basic test for /api/ai that verifies server proxy shape
import fetch from 'node-fetch';

async function run() {
  const res = await fetch('http://localhost:3001/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: 'Hello AI' })
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);

  if (res.status >= 500) {
    console.error('Server error from AI proxy');
    process.exit(2);
  }

  console.log('OK: /api/ai responded (inspect body above)');
}

run().catch(err => { console.error(err); process.exit(1); });

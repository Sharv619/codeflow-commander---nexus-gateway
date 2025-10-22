import http from 'http';

function run() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ diff: '+++ b/src/main.go\\n+// TODO: remove this debug\\n+fmt.Println("secret=abc123")\\n' });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          console.log(JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

run().catch(e => { console.error(e); process.exit(1); });

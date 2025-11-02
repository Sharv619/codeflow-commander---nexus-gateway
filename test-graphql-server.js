const http = require('http');

// Simple mock GraphQL server that responds to basic queries
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // GraphQL endpoint
  if (req.url === '/graphql' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { query } = JSON.parse(body);

        // Mock responses for different queries
        let response = {};

        if (query.includes('repositoryIntelligence')) {
          response = {
            data: null // Repository not found
          };
        } else if (query.includes('similarRepositories')) {
          response = {
            data: {
              similarRepositories: [] // No similar repos
            }
          };
        } else if (query.includes('patterns(')) {
          response = {
            data: {
              patterns: [] // No patterns
            }
          };
        } else {
          response = {
            data: {
              health: 'healthy'
            }
          };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // GraphQL playground for GET requests
  if (req.url === '/graphql' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Mock GraphQL Server</title></head>
        <body>
          <h1>Mock EKG Query Service</h1>
          <p>GraphQL endpoint is running at /graphql</p>
          <p>Health check at /health</p>
        </body>
      </html>
    `);
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Mock EKG Query Service running on http://localhost:${PORT}`);
  console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`\nReady to accept codeflow-hook connections!`);
});

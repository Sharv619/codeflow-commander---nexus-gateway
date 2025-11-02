import fs from 'fs';
import crypto from 'crypto';

const indexPath = 'packages/simulator-ui/index.html';
const nginxPath = 'nginx/default.conf';

function sha256Base64(s) {
  return 'sha256-' + crypto.createHash('sha256').update(s, 'utf8').digest('base64');
}

const html = fs.readFileSync(indexPath, 'utf8');
const reInline = /<script>([\s\S]*?)<\/script>/g;
let match;
const hashes = [];
while ((match = reInline.exec(html)) !== null) {
  const code = match[1].trim();
  if (code) hashes.push(sha256Base64(code));
}

if (hashes.length === 0) {
  console.error('No inline scripts found to hash');
  process.exit(1);
}

let nginx = fs.readFileSync(nginxPath, 'utf8');
// Replace the development CSP with production-ready CSP that includes computed hashes
const hashList = hashes.map(h => `'${h}'`).join(' ');
const productionCSP = `add_header Content-Security-Policy "default-src 'self'; script-src 'self' ${hashList}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; connect-src 'self' http://backend:3001; font-src 'self' https: data:";`;

// Replace the development CSP header (the one with 'unsafe-inline' and external domains)
nginx = nginx.replace(/add_header Content-Security-Policy "default-src 'self' http: https: data:; script-src 'self' 'unsafe-inline' https:\/\/cdn\.tailwindcss\.com https:\/\/aistudiocdn\.com 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com https:\/\/cdn\.tailwindcss\.com; img-src 'self' data: http:\/\/localhost:3001; connect-src 'self' http:\/\/backend:3001 http:\/\/localhost:3001 ws:; font-src 'self' https: data:";/, productionCSP);

fs.writeFileSync(nginxPath, nginx, 'utf8');
console.log('Injected CSP hashes into', nginxPath);
console.log('Generated hashes:', hashes);

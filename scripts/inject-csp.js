import fs from 'fs';
import crypto from 'crypto';

const indexPath = 'index.html';
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
// Replace placeholder list or insert after production comment
const hashList = hashes.map(h => `'${h}'`).join(' ');
nginx = nginx.replace(/(add_header Content-Security-Policy \"default-src 'self'; script-src 'self')(.*?);\";/s, `$1 ${hashList};\";`);
fs.writeFileSync(nginxPath, nginx, 'utf8');
console.log('Injected CSP hashes into', nginxPath);

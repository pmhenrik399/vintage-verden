// Local receiver: the browser-side scraper POSTs ad data here in batches.
const http = require('http');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const outFile = path.join(dataDir, 'ads.jsonl');

let received = 0;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/chunk') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const items = JSON.parse(body);
        const lines = items.map((it) => JSON.stringify(it)).join('\n') + '\n';
        fs.appendFileSync(outFile, lines, 'utf8');
        received += items.length;
        console.log(`received total=${received}`);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, received }));
      } catch (e) {
        console.error('bad chunk', e.message);
        res.writeHead(400); res.end('bad json');
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ received }));
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(3999, '127.0.0.1', () => console.log('receiver on http://127.0.0.1:3999'));

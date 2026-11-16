import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const argument = process.argv.indexOf('--port');
const proposed = argument < 0 ? 8080 : Number(process.argv[argument + 1]);
const port = Number.isInteger(proposed) && proposed > 0 && proposed < 65536 ? proposed : 8080;
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg' };

createServer((request, response) => {
  let pathname = '/index.html';
  try { pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname); } catch { response.writeHead(400).end('Bad request'); return; }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403).end('Forbidden'); return; }
  try {
    const stat = statSync(file);
    if (!stat.isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'content-length': stat.size, 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Fieldwork is live at http://127.0.0.1:${port}`));

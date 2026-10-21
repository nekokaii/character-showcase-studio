/** Local, read-only static server. No third-party packages or account required. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMediaService } from './editor-media.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8768);
const mediaService = createMediaService(root,()=>`http://127.0.0.1:${port}`);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.md':'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    if(await mediaService(req,res,new URL(req.url,`http://127.0.0.1:${port}`)))return;
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if(pathname.split('/').some(segment=>segment.startsWith('.'))||pathname.startsWith('/node_modules/')){res.writeHead(403);res.end();return;}
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const stat = await fs.stat(file);
    if (!stat.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length':stat.size, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : await fs.readFile(file));
  } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 400); res.end('File not found'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try: node tools/server.mjs 8769` : error.message); process.exitCode=1; });
server.listen(port, '127.0.0.1', () => console.log(`Character Showcase Studio\nhttp://127.0.0.1:${port}/\nPress Ctrl+C to stop.`));

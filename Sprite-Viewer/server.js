const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const LIB = path.join(ROOT, 'lib');
const DATA = path.join(ROOT, 'data');
const ANIM_DIR = path.join(ROOT, '..', 'ANIM-To-BMP');
const PAL_DIR = path.join(ANIM_DIR, 'Palettes');
const BANKS = new Set(['Sprites.anim', 'Puck.anim', 'Crowd.anim', 'Zam.anim']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.asm': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.anim': 'application/octet-stream',
  '.pal': 'application/octet-stream'
};

function send(res, status, body, type, extra) {
  const headers = Object.assign({ 'Content-Type': type, 'Cache-Control': 'no-cache' }, extra);
  res.writeHead(status, headers);
  res.end(body);
}

function safeFile(dir, name) {
  const base = path.basename(name);
  const full = path.join(dir, base);
  if (path.dirname(full) !== dir) return null;
  return full;
}

function serveFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) {
      send(res, err.code === 'ENOENT' ? 404 : 500, err.code === 'ENOENT' ? 'Not found' : 'Read failed', 'text/plain; charset=utf-8');
      return;
    }
    send(res, 200, buf, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/palettes') {
    fs.readdir(PAL_DIR, (err, names) => {
      if (err) {
        send(res, 500, 'Cannot read palettes', 'text/plain; charset=utf-8');
        return;
      }
      const pals = names.filter((n) => n.toLowerCase().endsWith('.pal')).sort();
      send(res, 200, JSON.stringify(pals), MIME['.json']);
    });
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(PUBLIC, 'index.html'));
    return;
  }
  if (pathname === '/data/frames.asm') {
    serveFile(res, path.join(DATA, 'frames.asm'));
    return;
  }
  if (pathname.startsWith('/lib/')) {
    const file = safeFile(LIB, pathname.slice('/lib/'.length));
    if (!file) { send(res, 400, 'Bad path', 'text/plain; charset=utf-8'); return; }
    serveFile(res, file);
    return;
  }
  if (pathname.startsWith('/anim/')) {
    const name = path.basename(pathname);
    if (!BANKS.has(name)) { send(res, 404, 'Unknown ANIM bank', 'text/plain; charset=utf-8'); return; }
    serveFile(res, path.join(ANIM_DIR, name));
    return;
  }
  if (pathname.startsWith('/palettes/')) {
    const file = safeFile(PAL_DIR, pathname.slice('/palettes/'.length));
    if (!file || !file.toLowerCase().endsWith('.pal')) {
      send(res, 404, 'Unknown palette', 'text/plain; charset=utf-8');
      return;
    }
    serveFile(res, file);
    return;
  }
  if (pathname === '/viewer.js' || pathname === '/viewer.css') {
    serveFile(res, path.join(PUBLIC, pathname.slice(1)));
    return;
  }
  send(res, 404, 'Not found', 'text/plain; charset=utf-8');
});

const port = Number(process.env.PORT) || 8732;
server.listen(port, () => {
  console.log('NHL 92 sprite viewer at http://localhost:' + port);
});

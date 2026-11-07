// Preprost lokalni strežnik za "Moj feed" (brez odvisnosti).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
const ALLOWED = new Set([
  '/index.html', '/app.js', '/style.css', '/manifest.webmanifest',
  '/icon-180.png', '/icon-192.png', '/icon-512.png',
]);

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    if (!ALLOWED.has(p)) {
      res.writeHead(404);
      return res.end('Ni najdeno');
    }
    fs.readFile(path.join(ROOT, p), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Napaka');
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      });
      res.end(data);
    });
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`Moj feed teče na http://localhost:${PORT}`);
  });

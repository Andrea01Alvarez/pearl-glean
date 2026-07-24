/**
 * Servidor de desarrollo SPA para Pearl Glean
 * Sirve archivos estáticos y redirige rutas desconocidas a index.html
 *
 * Uso: node frontend/server.js
 * URL: http://localhost:5500/pearl-glean/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5500;
const DIR = __dirname;
const BASE = '/pearl-glean';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // Redirigir raíz a /pearl-glean/
  if (url === '/' || url === '') {
    res.writeHead(302, { Location: `${BASE}/` });
    res.end();
    return;
  }

  // Solo procesar rutas que empiecen con /pearl-glean
  if (!url.startsWith(BASE)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Quitar el prefijo /pearl-glean para buscar el archivo
  const relativePath = url.substring(BASE.length) || '/';
  const filePath = path.join(DIR, relativePath === '/' ? 'index.html' : relativePath);

  // Si el archivo existe, servirlo
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback: servir index.html para cualquier ruta
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(DIR, 'index.html')).pipe(res);
  }
});

server.listen(PORT, () => {
  console.log(`Pearl Glean frontend: http://localhost:${PORT}${BASE}/`);
  console.log('Modo SPA activo');
});

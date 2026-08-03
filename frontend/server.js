/**
 * Servidor de desarrollo para Pearl Glean
 *
 * Uso: node frontend/server.js
 * Tienda:  http://localhost:5500/
 * Admin:   http://localhost:5500/admin-login
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5500;
const DIR = __dirname;

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

// Páginas HTML independientes (no son rutas SPA)
const HTML_PAGES = ['admin-login', 'admin'];

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // Raíz → catalogo.html
  if (url === '/' || url === '') {
    return serveFile(path.join(DIR, 'catalogo.html'), res);
  }

  const clean = url.replace(/^\//, '');

  // 1. Buscar archivo exacto (CSS, JS, imágenes, etc.)
  const exactPath = path.join(DIR, clean);
  if (fs.existsSync(exactPath) && fs.statSync(exactPath).isFile()) {
    return serveFile(exactPath, res);
  }

  // 2. Intentar con extensión .html (ej: /admin-login → admin-login.html)
  const withHtml = exactPath + '.html';
  if (fs.existsSync(withHtml) && fs.statSync(withHtml).isFile()) {
    return serveFile(withHtml, res);
  }

  // 3. SPA fallback: servir catalogo.html para rutas del catálogo
  return serveFile(path.join(DIR, 'catalogo.html'), res);
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, () => {
  console.log(`\n  Pearl Glean dev server\n`);
  console.log(`  Tienda:  http://localhost:${PORT}/`);
  console.log(`  Admin:   http://localhost:${PORT}/admin-login`);
  console.log(`  Admin:   http://localhost:${PORT}/admin-login.html\n`);
});

/**
 * tunnel.js — Expone frontend y backend vía localtunnel
 *
 * Uso:
 *   1. Tener frontend (puerto 5500) y backend (puerto 3300) corriendo
 *   2. node tunnel.js
 *   3. Abrir en el teléfono la URL del frontend que aparece
 *
 * Al terminar: Ctrl+C cierra ambos túneles y restaura config.js a local
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'frontend', 'config.js');

function startTunnel(port, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['localtunnel', '--port', String(port)], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      reject(new Error(`Timeout esperando URL del túnel (${label})`));
    }, 30000);

    proc.stdout.on('data', (data) => {
      const line = data.toString().trim();
      if (line) console.log(`  [${label}] ${line}`);
      const match = line.match(/your url is:\s*(https?:\/\/[^\s]+)/i);
      if (match) {
        clearTimeout(timer);
        resolve({ url: match[1].trim(), proc });
      }
    });

    proc.stderr.on('data', () => {});

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function updateConfig(backendUrl) {
  let content = fs.readFileSync(CONFIG_PATH, 'utf8');
  content = content.replace(
    /var TUNNEL_BACKEND_URL\s*=\s*'[^']*'/,
    `var TUNNEL_BACKEND_URL = '${backendUrl}'`,
  );
  fs.writeFileSync(CONFIG_PATH, content, 'utf8');
}

function restoreConfig() {
  let content = fs.readFileSync(CONFIG_PATH, 'utf8');
  content = content.replace(
    /var TUNNEL_BACKEND_URL\s*=\s*'[^']*'/,
    `var TUNNEL_BACKEND_URL = ''`,
  );
  fs.writeFileSync(CONFIG_PATH, content, 'utf8');
  console.log('\nconfig.js restaurado a modo local.');
}

async function main() {
  console.log('\nIniciando túneles — asegurate de tener backend y frontend corriendo.\n');

  console.log('Abriendo túnel del backend (puerto 3300)...');
  let backend;
  try {
    backend = await startTunnel(3300, 'Backend');
  } catch (e) {
    console.error('Error al abrir túnel del backend:', e.message);
    process.exit(1);
  }

  updateConfig(backend.url);
  console.log(`  → Backend URL: ${backend.url}`);
  console.log(`  → config.js actualizado\n`);

  console.log('Abriendo túnel del frontend (puerto 5500)...');
  let frontend;
  try {
    frontend = await startTunnel(5500, 'Frontend');
  } catch (e) {
    console.error('Error al abrir túnel del frontend:', e.message);
    backend.proc.kill();
    restoreConfig();
    process.exit(1);
  }

  console.log(`\n${'='.repeat(52)}`);
  console.log('  LISTO — Abre esta URL en tu teléfono:');
  console.log(`\n    ${frontend.url}\n`);
  console.log('  NOTA: Si localtunnel pide confirmación,');
  console.log('  abre primero esa URL en tu PC y hacé clic');
  console.log('  en "Click to continue".');
  console.log(`${'='.repeat(52)}\n`);
  console.log('Ctrl+C para cerrar los túneles.\n');

  const shutdown = () => {
    console.log('\nCerrando túneles...');
    backend.proc.kill();
    frontend.proc.kill();
    restoreConfig();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Error inesperado:', err);
  process.exit(1);
});

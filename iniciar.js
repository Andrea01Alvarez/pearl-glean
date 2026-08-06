'use strict';

const { spawn } = require('child_process');
const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');

const ROOT         = __dirname;
const BACKEND_DIR  = path.join(ROOT, 'backend');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const CONFIG_PATH  = path.join(FRONTEND_DIR, 'config.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg)  { console.log(msg); }
function ok(msg)   { console.log('  ✅ ' + msg); }
function err(msg)  { console.error('  ❌ ' + msg); }
function info(msg) { console.log('  →  ' + msg); }

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

function startProc(cmd, args, cwd, label) {
  const proc = spawn(cmd, args, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
  proc.stderr.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
  proc.on('error', (e) => err(`${label}: ${e.message}`));
  return proc;
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(1000);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error',   () => { s.destroy(); resolve(false); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.connect(port, '127.0.0.1');
  });
}

function waitForPort(port, maxMs = 120_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const try_ = () => {
      const s = new net.Socket();
      s.setTimeout(1000);
      s.on('connect', () => { s.destroy(); resolve(); });
      s.on('error',   () => { s.destroy(); retry(); });
      s.on('timeout', () => { s.destroy(); retry(); });
      s.connect(port, '127.0.0.1');
    };
    const retry = () => {
      if (Date.now() - start > maxMs) reject(new Error(`Puerto ${port} no disponible`));
      else setTimeout(try_, 2000);
    };
    setTimeout(try_, 3000);
  });
}

function setTunnelUrl(url) {
  let c = fs.readFileSync(CONFIG_PATH, 'utf8');
  c = c.replace(/var TUNNEL_BACKEND_URL\s*=\s*'[^']*'/, `var TUNNEL_BACKEND_URL = '${url}'`);
  fs.writeFileSync(CONFIG_PATH, c, 'utf8');
}

function clearTunnelUrl() {
  setTunnelUrl('');
}

function openCloudflaredTunnel(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      shell: true, stdio: ['ignore', 'pipe', 'pipe']
    });
    const timer = setTimeout(() => { proc.kill(); reject(new Error('timeout')); }, 35_000);
    const onData = (d) => {
      const m = d.toString().match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/i);
      if (m) { clearTimeout(timer); resolve({ url: m[0], proc }); }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Siempre limpiar URL de túnel al arrancar
  clearTunnelUrl();

  log('\n╔══════════════════════════════════════╗');
  log('║        PEARL GLEAN — Iniciando       ║');
  log('╚══════════════════════════════════════╝\n');

  // 1. Backend
  log('1/2  Backend (puerto 3300)...');
  const backendYaCorre = await isPortInUse(3300);
  let backendProc = null;
  if (backendYaCorre) {
    ok('Backend ya estaba corriendo.\n');
  } else {
    backendProc = startProc('pnpm', ['run', 'start:dev'], BACKEND_DIR, 'Backend');
    log('     Esperando que arranque (hasta 2 min)...');
    try {
      await waitForPort(3300, 120_000);
      ok('Backend listo.\n');
    } catch (e) {
      err('El backend no arrancó. Revisá que pnpm esté instalado.');
      if (backendProc) backendProc.kill();
      process.exit(1);
    }
  }

  // 2. Frontend
  log('2/2  Frontend (puerto 5500)...');
  const frontendYaCorre = await isPortInUse(5500);
  let frontendProc = null;
  if (frontendYaCorre) {
    ok('Frontend ya estaba corriendo.\n');
  } else {
    frontendProc = startProc('node', ['server.js'], FRONTEND_DIR, 'Frontend');
    await new Promise(r => setTimeout(r, 2000));
    ok('Frontend listo.\n');
  }

  // 3. Túnel (opcional — si cloudflared está instalado)
  log('Intentando abrir túnel con cloudflared...');
  let backendTunnel = null, frontendTunnel = null;

  try {
    backendTunnel  = await openCloudflaredTunnel(3300);
    frontendTunnel = await openCloudflaredTunnel(5500);

    setTunnelUrl(backendTunnel.url);

    log('\n╔══════════════════════════════════════════════════════╗');
    log('║  LISTO con TÚNEL — Abrí en tu teléfono:             ║');
    log('║                                                      ║');
    log(`║  Catálogo:  ${frontendTunnel.url}`.padEnd(54) + '║');
    log(`║  Admin:     ${frontendTunnel.url}/admin-login`.padEnd(54) + '║');
    log('║                                                      ║');
    log('║  (Funciona desde cualquier red, no solo WiFi)        ║');
    log('╚══════════════════════════════════════════════════════╝\n');

  } catch (_) {
    // cloudflared no disponible o falló → modo WiFi local
    const ip = getLocalIP();
    log('  (cloudflared no disponible, usando WiFi local)\n');
    log('╔══════════════════════════════════════════════════════╗');
    log('║  LISTO por WiFi — Abrí en tu teléfono:             ║');
    log('║  (el teléfono debe estar en el mismo WiFi)           ║');
    log('║                                                      ║');
    log(`║  Catálogo:  http://${ip}:5500/`.padEnd(54) + '║');
    log(`║  Admin:     http://${ip}:5500/admin-login`.padEnd(54) + '║');
    log('║                                                      ║');
    log('╚══════════════════════════════════════════════════════╝\n');
  }

  log('Ctrl+C para apagar todo.\n');

  const procs = [backendTunnel?.proc, frontendTunnel?.proc, backendProc, frontendProc].filter(Boolean);
  const shutdown = () => {
    log('\nApagando...');
    procs.forEach((p) => { try { p.kill(); } catch (_) {} });
    clearTunnelUrl();
    process.exit(0);
  };

  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);
  setInterval(() => {}, 60_000);
}

main().catch((e) => { console.error('Error:', e); process.exit(1); });

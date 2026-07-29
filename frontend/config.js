'use strict';

/**
 * CONFIGURACIÓN DEL BACKEND
 *
 * Para compartir por túnel:
 * 1. Exponé el backend con: npx localtunnel --port 3300
 * 2. Copiá la URL que te da (ej: https://xxx.loca.lt)
 * 3. Pegala aquí en TUNNEL_BACKEND_URL
 * 4. Exponé el frontend con: npx localtunnel --port 5500
 * 5. Compartí la URL del frontend a la otra persona
 *
 * Para volver a local: dejá TUNNEL_BACKEND_URL vacío ('')
 */
var TUNNEL_BACKEND_URL = 'https://dropped-choosing-abroad-realtor.trycloudflare.com';

// --- No tocar debajo de esta línea ---
var _isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

var BACKEND_CONFIG = TUNNEL_BACKEND_URL
  ? TUNNEL_BACKEND_URL.replace(/\/+$/, '')
  : _isLocal
    ? 'http://localhost:3300'
    : 'https://pearl-glean.onrender.com';

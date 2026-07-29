'use strict';

// ============================================================================
// CONFIGURACIÓN (usa config.js)
// ============================================================================
const BACKEND = BACKEND_CONFIG;
const API_URL = `${BACKEND}/api`;

// ============================================================================
// ELEMENTOS DEL DOM
// ============================================================================
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// ============================================================================
// AL CARGAR: verificar si ya hay sesión activa
// ============================================================================
(function checkExistingSession() {
  const token = sessionStorage.getItem('admin_token');
  const lastActivity = sessionStorage.getItem('admin_last_activity');

  // Si la sesión expiró por inactividad (30 min), limpiar
  if (token && lastActivity) {
    const elapsed = Date.now() - parseInt(lastActivity, 10);
    if (elapsed > 30 * 60 * 1000) {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_last_activity');
      return;
    }
    window.location.href = './admin.html';
  }
})();

// ============================================================================
// TOGGLE CONTRASEÑA (ojito)
// ============================================================================
const toggleBtn = document.getElementById('toggle-password');
const eyeOpen = document.getElementById('eye-open');
const eyeClosed = document.getElementById('eye-closed');

toggleBtn.addEventListener('click', function () {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  eyeOpen.style.display = isHidden ? 'none' : 'block';
  eyeClosed.style.display = isHidden ? 'block' : 'none';
  toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

// ============================================================================
// LOGIN
// ============================================================================
function showError(message) {
  loginError.textContent = message;
  loginError.classList.add('visible');
}

function hideError() {
  loginError.classList.remove('visible');
}

loginForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError('Ingresa usuario y contraseña.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Ingresando...';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      sessionStorage.setItem('admin_token', data.token);
      sessionStorage.setItem('admin_last_activity', Date.now().toString());
      window.location.href = './admin.html';
      return;
    }

    if (response.status === 401) {
      showError('Usuario o contraseña incorrectos.');
    } else {
      showError('Ocurrió un error en el servidor. Intenta de nuevo.');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      showError('El servidor tardó demasiado en responder. Intenta de nuevo.');
    } else {
      showError('No se pudo conectar al servidor. Verifica tu conexión.');
    }
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Ingresar';
  }
});

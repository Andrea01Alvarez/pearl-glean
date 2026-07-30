'use strict';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const BACKEND = isLocal
  ? 'http://localhost:3300'
  : 'https://pearl-glean.onrender.com';

const API_URL = `${BACKEND}/api`;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos

// ============================================================================
// ESTADO
// ============================================================================
let allProducts = [];
let currentEditId = null;
let currentSection = 'dashboard';

// ============================================================================
// SIDEBAR — Navegación entre secciones
// ============================================================================
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const sectionTitles = {
  dashboard: 'Dashboard',
  productos: 'Productos',
  promociones: 'Promociones',
  ventas: 'Ventas',
};

function navigateTo(section) {
  currentSection = section;

  // Actualizar links activos
  sidebarLinks.forEach(function (link) {
    link.classList.toggle('active', link.getAttribute('data-section') === section);
  });

  // Mostrar sección correspondiente
  document.querySelectorAll('.admin-section').forEach(function (sec) {
    sec.classList.remove('active');
  });
  var targetSection = document.getElementById('section-' + section);
  if (targetSection) targetSection.classList.add('active');

  // Actualizar título del header
  document.getElementById('header-title').textContent = sectionTitles[section] || section;

  // Mostrar/ocultar botón nuevo producto
  var btnNew = document.getElementById('btn-new-product');
  btnNew.style.display = section === 'productos' ? 'inline-flex' : 'none';

  // Cerrar sidebar en móvil
  closeSidebar();
}

sidebarLinks.forEach(function (link) {
  link.addEventListener('click', function () {
    navigateTo(link.getAttribute('data-section'));
  });
});

// Sidebar toggle en móvil
var sidebarEl = document.getElementById('sidebar');
var sidebarToggle = document.getElementById('sidebar-toggle');

// Crear overlay para cerrar sidebar en móvil
var sidebarOverlay = document.createElement('div');
sidebarOverlay.className = 'sidebar-overlay';
document.body.appendChild(sidebarOverlay);

function openSidebar() {
  sidebarEl.classList.add('open');
  sidebarOverlay.classList.add('visible');
}

function closeSidebar() {
  sidebarEl.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
}

sidebarToggle.addEventListener('click', function () {
  if (sidebarEl.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay.addEventListener('click', closeSidebar);

// ============================================================================
// AUTH — Sesión y token
// ============================================================================
function getToken() {
  return sessionStorage.getItem('admin_token');
}

function updateActivity() {
  sessionStorage.setItem('admin_last_activity', Date.now().toString());
}

function checkSession() {
  const token = getToken();
  const lastActivity = sessionStorage.getItem('admin_last_activity');

  if (!token) {
    redirectToLogin();
    return false;
  }

  if (lastActivity) {
    const elapsed = Date.now() - parseInt(lastActivity, 10);
    if (elapsed > SESSION_TIMEOUT) {
      sessionStorage.clear();
      redirectToLogin();
      return false;
    }
  }

  updateActivity();
  return true;
}

function redirectToLogin() {
  window.location.href = './admin-login.html';
}

// Verificar sesión al cargar
if (!checkSession()) {
  throw new Error('Sin sesión');
}

// Verificar inactividad cada minuto
setInterval(function () {
  const lastActivity = sessionStorage.getItem('admin_last_activity');
  if (lastActivity) {
    const elapsed = Date.now() - parseInt(lastActivity, 10);
    if (elapsed > SESSION_TIMEOUT) {
      sessionStorage.clear();
      redirectToLogin();
    }
  }
}, 60000);

// ============================================================================
// FETCH CON AUTH — Wrapper que agrega token y maneja errores
// ============================================================================
async function authFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return null;
  }

  updateActivity();

  const headers = options.headers || {};
  headers['Authorization'] = `Bearer ${token}`;

  // No poner Content-Type si es FormData (el navegador lo pone)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status === 401) {
      sessionStorage.clear();
      showToast('Tu sesión ha expirado. Inicia sesión de nuevo.', 'error');
      setTimeout(redirectToLogin, 1500);
      return null;
    }

    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      showToast('El servidor tardó demasiado. Intenta de nuevo.', 'error');
    } else {
      showToast('No se pudo conectar al servidor.', 'error');
    }
    return null;
  }
}

// ============================================================================
// TOAST — Notificaciones
// ============================================================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function () {
    toast.classList.add('fadeout');
    setTimeout(function () { toast.remove(); }, 300);
  }, 3000);
}

// ============================================================================
// FORMATEO
// ============================================================================
function formatLempiras(price) {
  return 'L ' + Number(price).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function categoryLabel(category) {
  const labels = { aretes: 'Aretes', collar: 'Collar', pulsera: 'Pulsera' };
  return labels[category] || category;
}

// ============================================================================
// DATE PICKER — Componente calendario personalizado
// ============================================================================
var MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
var MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
var WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function createDatePicker(wrapperId, onChange) {
  var wrapper = document.getElementById(wrapperId);
  if (!wrapper) return null;

  var mode = wrapper.getAttribute('data-mode') || 'date'; // 'date' o 'month'
  var picker = {
    wrapper: wrapper,
    mode: mode,
    view: mode === 'month' ? 'months' : 'days', // 'days', 'months', 'years'
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    selectedYear: null,
    selectedMonth: null,
    selectedDay: null,
    onChange: onChange,
  };

  // Crear HTML interno
  var triggerText = mode === 'month' ? 'Seleccionar mes...' : 'Seleccionar fecha...';
  wrapper.innerHTML =
    '<div class="datepicker-trigger">' + triggerText + '</div>' +
    '<div class="datepicker-dropdown">' +
      '<div class="datepicker-header">' +
        '<button type="button" class="datepicker-nav" data-dir="prev">&#8249;</button>' +
        '<span class="datepicker-header-label"></span>' +
        '<button type="button" class="datepicker-nav" data-dir="next">&#8250;</button>' +
      '</div>' +
      '<div class="datepicker-body"></div>' +
      '<button type="button" class="datepicker-clear">Limpiar</button>' +
    '</div>';

  var trigger = wrapper.querySelector('.datepicker-trigger');
  var dropdown = wrapper.querySelector('.datepicker-dropdown');
  var headerLabel = wrapper.querySelector('.datepicker-header-label');
  var body = wrapper.querySelector('.datepicker-body');
  var clearBtn = wrapper.querySelector('.datepicker-clear');
  var navBtns = wrapper.querySelectorAll('.datepicker-nav');

  function render() {
    if (picker.view === 'days') renderDays();
    else if (picker.view === 'months') renderMonths();
    else if (picker.view === 'years') renderYears();
  }

  function renderDays() {
    headerLabel.textContent = MONTH_NAMES[picker.viewMonth] + ' ' + picker.viewYear;

    var firstDay = new Date(picker.viewYear, picker.viewMonth, 1).getDay();
    var daysInMonth = new Date(picker.viewYear, picker.viewMonth + 1, 0).getDate();
    var daysInPrev = new Date(picker.viewYear, picker.viewMonth, 0).getDate();

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var html = '<div class="datepicker-weekdays">';
    WEEKDAYS.forEach(function (d) { html += '<span class="datepicker-weekday">' + d + '</span>'; });
    html += '</div><div class="datepicker-days">';

    // Días del mes anterior
    for (var p = firstDay - 1; p >= 0; p--) {
      html += '<div class="datepicker-day other-month" data-day="' + (daysInPrev - p) + '" data-month="' + (picker.viewMonth - 1) + '">' + (daysInPrev - p) + '</div>';
    }

    // Días del mes actual
    for (var d = 1; d <= daysInMonth; d++) {
      var classes = 'datepicker-day';
      var cellDate = new Date(picker.viewYear, picker.viewMonth, d);
      if (cellDate.getTime() === today.getTime()) classes += ' today';
      if (picker.selectedYear === picker.viewYear && picker.selectedMonth === picker.viewMonth && picker.selectedDay === d) {
        classes += ' selected';
      }
      html += '<div class="' + classes + '" data-day="' + d + '" data-month="' + picker.viewMonth + '">' + d + '</div>';
    }

    // Días del mes siguiente
    var totalCells = firstDay + daysInMonth;
    var remaining = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
    for (var n = 1; n <= remaining; n++) {
      html += '<div class="datepicker-day other-month" data-day="' + n + '" data-month="' + (picker.viewMonth + 1) + '">' + n + '</div>';
    }

    html += '</div>';
    body.innerHTML = html;

    // Eventos en días
    body.querySelectorAll('.datepicker-day').forEach(function (el) {
      el.addEventListener('click', function () {
        var day = parseInt(el.getAttribute('data-day'));
        var month = parseInt(el.getAttribute('data-month'));
        var year = picker.viewYear;

        if (month < 0) { month = 11; year--; }
        else if (month > 11) { month = 0; year++; }

        picker.selectedYear = year;
        picker.selectedMonth = month;
        picker.selectedDay = day;
        picker.viewYear = year;
        picker.viewMonth = month;

        updateTriggerText();
        close();
        if (picker.onChange) picker.onChange(getValue());
      });
    });
  }

  function renderMonths() {
    headerLabel.textContent = picker.viewYear;

    var html = '<div class="datepicker-months">';
    for (var m = 0; m < 12; m++) {
      var classes = 'datepicker-month-cell';
      if (picker.selectedYear === picker.viewYear && picker.selectedMonth === m) classes += ' selected';
      html += '<div class="' + classes + '" data-month="' + m + '">' + MONTH_SHORT[m] + '</div>';
    }
    html += '</div>';
    body.innerHTML = html;

    body.querySelectorAll('.datepicker-month-cell').forEach(function (el) {
      el.addEventListener('click', function () {
        var m = parseInt(el.getAttribute('data-month'));
        picker.selectedMonth = m;
        picker.selectedYear = picker.viewYear;
        picker.viewMonth = m;

        if (mode === 'month') {
          updateTriggerText();
          close();
          if (picker.onChange) picker.onChange(getValue());
        } else {
          picker.view = 'days';
          render();
        }
      });
    });
  }

  function renderYears() {
    var startYear = picker.viewYear - 4;
    headerLabel.textContent = startYear + ' - ' + (startYear + 8);

    var html = '<div class="datepicker-years">';
    for (var y = startYear; y <= startYear + 8; y++) {
      var classes = 'datepicker-year-cell';
      if (picker.selectedYear === y) classes += ' selected';
      html += '<div class="' + classes + '" data-year="' + y + '">' + y + '</div>';
    }
    html += '</div>';
    body.innerHTML = html;

    body.querySelectorAll('.datepicker-year-cell').forEach(function (el) {
      el.addEventListener('click', function () {
        var y = parseInt(el.getAttribute('data-year'));
        picker.viewYear = y;
        picker.selectedYear = y;
        picker.view = 'months';
        render();
      });
    });
  }

  function updateTriggerText() {
    if (mode === 'month' && picker.selectedMonth !== null && picker.selectedYear !== null) {
      trigger.textContent = MONTH_NAMES[picker.selectedMonth] + ' ' + picker.selectedYear;
    } else if (mode === 'date' && picker.selectedDay !== null) {
      var dd = String(picker.selectedDay).padStart(2, '0');
      var mm = String(picker.selectedMonth + 1).padStart(2, '0');
      trigger.textContent = dd + '/' + mm + '/' + picker.selectedYear;
    } else {
      trigger.textContent = mode === 'month' ? 'Seleccionar mes...' : 'Seleccionar fecha...';
    }
  }

  function getValue() {
    if (mode === 'month' && picker.selectedMonth !== null && picker.selectedYear !== null) {
      return picker.selectedYear + '-' + String(picker.selectedMonth + 1).padStart(2, '0');
    } else if (mode === 'date' && picker.selectedDay !== null) {
      return picker.selectedYear + '-' + String(picker.selectedMonth + 1).padStart(2, '0') + '-' + String(picker.selectedDay).padStart(2, '0');
    }
    return '';
  }

  function setValue(dateStr) {
    if (!dateStr) {
      picker.selectedYear = null;
      picker.selectedMonth = null;
      picker.selectedDay = null;
      updateTriggerText();
      return;
    }
    var parts = dateStr.split('-');
    picker.selectedYear = parseInt(parts[0]);
    picker.selectedMonth = parseInt(parts[1]) - 1;
    picker.viewYear = picker.selectedYear;
    picker.viewMonth = picker.selectedMonth;
    if (parts[2]) {
      picker.selectedDay = parseInt(parts[2]);
    }
    updateTriggerText();
  }

  function open() {
    // Cerrar todos los demás pickers abiertos
    document.querySelectorAll('.datepicker-wrapper.open').forEach(function (el) {
      if (el !== wrapper) el.classList.remove('open');
    });
    // Posicionar dropdown con position:fixed relativo al trigger
    var rect = trigger.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.left = rect.left + 'px';
    wrapper.classList.add('open');
    render();
  }

  function close() {
    wrapper.classList.remove('open');
  }

  // Event: abrir/cerrar
  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (wrapper.classList.contains('open')) close();
    else open();
  });

  // Event: navegación
  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var dir = btn.getAttribute('data-dir') === 'prev' ? -1 : 1;
      if (picker.view === 'days') {
        picker.viewMonth += dir;
        if (picker.viewMonth < 0) { picker.viewMonth = 11; picker.viewYear--; }
        else if (picker.viewMonth > 11) { picker.viewMonth = 0; picker.viewYear++; }
      } else if (picker.view === 'months') {
        picker.viewYear += dir;
      } else if (picker.view === 'years') {
        picker.viewYear += dir * 9;
      }
      render();
    });
  });

  // Event: click en label de header (cambiar vista)
  headerLabel.addEventListener('click', function (e) {
    e.stopPropagation();
    if (picker.view === 'days') picker.view = 'months';
    else if (picker.view === 'months') picker.view = 'years';
    render();
  });

  // No cerrar al hacer click dentro del dropdown
  dropdown.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  // Event: limpiar (registrado después del dropdown para que siempre se ejecute)
  clearBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    picker.selectedYear = null;
    picker.selectedMonth = null;
    picker.selectedDay = null;
    updateTriggerText();
    close();
    if (picker.onChange) picker.onChange('');
  });

  // API pública
  picker.getValue = getValue;
  picker.setValue = setValue;
  picker.render = render;

  return picker;
}

// Cerrar todos los pickers al hacer click fuera
document.addEventListener('click', function () {
  document.querySelectorAll('.datepicker-wrapper.open').forEach(function (el) {
    el.classList.remove('open');
  });
});

// ============================================================================
// CARGA DE DATOS
// ============================================================================
async function loadProducts() {
  const response = await authFetch(`${API_URL}/admin/products`);
  if (!response) return;

  if (!response.ok) {
    showToast('No se pudieron cargar los productos.', 'error');
    return;
  }

  allProducts = await response.json();
  renderStats();
  renderTable();
  renderNotifications();
}

// ============================================================================
// STATS — Cards de resumen
// ============================================================================
function renderStats() {
  const active = allProducts.filter(function (p) { return p.isActive; });
  const inactive = allProducts.filter(function (p) { return !p.isActive; });

  // Card 1: Inventario disponible (suma total de stock de productos activos)
  const totalStock = active.reduce(function (sum, p) {
    return sum + (Number(p.stock) || 0);
  }, 0);
  document.getElementById('stat-active').textContent = totalStock;

  // Card 2: Agotado (inactivos)
  document.getElementById('stat-inactive').textContent = inactive.length;

  // Card 3: Valor en catálogo (precio × stock de cada producto activo)
  const totalValue = active.reduce(function (sum, p) {
    return sum + (Number(p.price) * (Number(p.stock) || 0));
  }, 0);
  document.getElementById('stat-catalog-value').textContent = formatLempiras(totalValue);

  // Card 4: Por categoría (suma de stock de productos activos por categoría)
  const byCategory = { aretes: 0, collar: 0, pulsera: 0 };
  active.forEach(function (p) {
    if (byCategory[p.category] !== undefined) {
      byCategory[p.category] += (Number(p.stock) || 0);
    }
  });

  document.getElementById('stat-by-category').innerHTML =
    '<div class="stat-category-item"><span>Aretes</span><span>' + byCategory.aretes + '</span></div>' +
    '<div class="stat-category-item"><span>Collares</span><span>' + byCategory.collar + '</span></div>' +
    '<div class="stat-category-item"><span>Pulseras</span><span>' + byCategory.pulsera + '</span></div>';
}

// ============================================================================
// NOTIFICACIONES — Stock bajo
// ============================================================================
function renderNotifications() {
  var lowStock = allProducts.filter(function (p) {
    return p.isActive && p.stock !== null && p.stock !== undefined && Number(p.stock) < 3;
  });

  var badge = document.getElementById('notif-badge');
  var list = document.getElementById('notif-list');

  if (lowStock.length === 0) {
    badge.style.display = 'none';
    list.innerHTML = '<div class="notif-empty">Todo el inventario está bien.</div>';
    return;
  }

  badge.style.display = 'flex';
  badge.textContent = lowStock.length;

  list.innerHTML = lowStock.map(function (p) {
    var stockNum = Number(p.stock);
    var stockClass = stockNum === 0 ? 'stock-zero' : 'stock-low';
    var stockLabel = stockNum === 0 ? 'Sin stock' : 'Quedan ' + stockNum;
    var message = stockNum === 0
      ? 'Se agotó, fue desactivado de la tienda.'
      : 'Queda poco, considera reabastecer pronto.';
    return '<div class="notif-item">' +
      '<div class="notif-item-info">' +
        '<span class="notif-item-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="notif-item-message">' + message + '</span>' +
      '</div>' +
      '<span class="notif-item-stock ' + stockClass + '">' + stockLabel + '</span>' +
    '</div>';
  }).join('');
}

// Toggle panel de notificaciones
document.getElementById('notif-bell').addEventListener('click', function (e) {
  e.stopPropagation();
  document.getElementById('notif-panel').classList.toggle('open');
  document.getElementById('notif-badge').style.display = 'none';
});

// Cerrar panel al hacer click fuera
document.addEventListener('click', function (e) {
  var panel = document.getElementById('notif-panel');
  var wrapper = document.getElementById('notif-wrapper');
  if (!wrapper.contains(e.target)) {
    panel.classList.remove('open');
  }
});

// ============================================================================
// TABLA — Renderizado con filtros
// ============================================================================
function getFilteredProducts() {
  const searchText = document.getElementById('filter-search').value.trim().toLowerCase();
  const categoryFilter = document.getElementById('filter-category').value;
  const statusFilter = document.getElementById('filter-status').value;

  return allProducts.filter(function (p) {
    if (searchText && !p.name.toLowerCase().includes(searchText)) return false;
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (statusFilter === 'active' && !p.isActive) return false;
    if (statusFilter === 'inactive' && p.isActive) return false;
    return true;
  });
}

function renderTable() {
  const tbody = document.getElementById('products-table-body');
  const filtered = getFilteredProducts();

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No se encontraron productos.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (p) {
    const imgSrc = p.imageUrl || '';
    const imgTag = imgSrc
      ? '<img class="product-thumbnail" src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(p.name) + '" loading="lazy"/>'
      : '<div class="product-thumbnail" style="background:#eee;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:11px">Sin img</div>';

    const statusDot = p.isActive ? 'active' : 'inactive';
    const statusText = p.isActive ? 'Activo' : 'Inactivo';
    const stockValue = p.stock != null ? p.stock : 0;

    const toggleBtn = p.isActive
      ? '<button class="btn btn-outline btn-sm" onclick="toggleStatus(\'' + p.id + '\', true)">Desactivar</button>'
      : '<button class="btn btn-success btn-sm" onclick="toggleStatus(\'' + p.id + '\', false)">Activar</button>';

    return '<tr>' +
      '<td>' + imgTag + '</td>' +
      '<td class="product-name">' + escapeHtml(p.name) + '</td>' +
      '<td>' + escapeHtml(categoryLabel(p.category)) + '</td>' +
      '<td>' + formatLempiras(p.price) + '</td>' +
      '<td>' + stockValue + '</td>' +
      '<td><span class="status-badge"><span class="status-dot ' + statusDot + '"></span>' + statusText + '</span></td>' +
      '<td class="table-actions">' +
        '<button class="btn btn-outline btn-sm" onclick="openEditModal(\'' + p.id + '\')">Editar</button>' +
        toggleBtn +
      '</td>' +
    '</tr>';
  }).join('');
}

// ============================================================================
// CUSTOM SELECT — Lógica
// ============================================================================
function initCustomSelect(wrapperId, onChange) {
  const wrapper = document.getElementById(wrapperId);
  const trigger = wrapper.querySelector('.custom-select-trigger');
  const optionsContainer = wrapper.querySelector('.custom-select-options');
  const options = wrapper.querySelectorAll('.custom-select-option');
  const hiddenInput = wrapper.querySelector('input[type="hidden"]');

  // Solo agregar listener al trigger una vez
  if (!wrapper._triggerInit) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      // Cerrar otros selects abiertos
      document.querySelectorAll('.custom-select.open').forEach(function (el) {
        if (el !== wrapper) el.classList.remove('open');
      });

      if (wrapper.classList.contains('open')) {
        wrapper.classList.remove('open');
      } else {
        // Posicionar dropdown con fixed si está dentro de un modal
        if (wrapper.closest('.modal-content')) {
          var opts = wrapper.querySelector('.custom-select-options');
          var rect = trigger.getBoundingClientRect();
          opts.style.position = 'fixed';
          opts.style.top = (rect.bottom + 2) + 'px';
          opts.style.left = rect.left + 'px';
          opts.style.width = rect.width + 'px';
          opts.style.zIndex = '2000';
        }
        wrapper.classList.add('open');
      }
    });
    wrapper._triggerInit = true;
  }

  options.forEach(function (option) {
    option.addEventListener('click', function (e) {
      e.stopPropagation();
      const value = option.getAttribute('data-value');
      const text = option.textContent;

      // Actualizar selección visual
      wrapper.querySelectorAll('.custom-select-option').forEach(function (o) {
        o.classList.remove('selected');
      });
      option.classList.add('selected');

      trigger.textContent = text;
      hiddenInput.value = value;
      wrapper.classList.remove('open');

      if (onChange) onChange(value);
    });
  });
}

// Cerrar selects al hacer click fuera
document.addEventListener('click', function () {
  document.querySelectorAll('.custom-select.open').forEach(function (el) {
    el.classList.remove('open');
  });
});

// Inicializar los 3 custom selects
initCustomSelect('filter-category-wrapper', renderTable);
initCustomSelect('filter-status-wrapper', renderTable);
initCustomSelect('product-category-wrapper', function () {
  clearFieldError('product-category');
  validateModalFields();
});
initCustomSelect('promo-type-wrapper');

// Función para llenar custom-selects dinámicamente
function populateDynamicSelect(wrapperId, options, placeholder) {
  var wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  var trigger = wrapper.querySelector('.custom-select-trigger');
  var optionsContainer = wrapper.querySelector('.custom-select-options');
  var hiddenInput = wrapper.querySelector('input[type="hidden"]');

  hiddenInput.value = '';
  trigger.textContent = placeholder;

  var html = '<div class="custom-select-option selected" data-value="">' + placeholder + '</div>';
  options.forEach(function (opt) {
    var attrs = '';
    if (opt.dataAttrs) {
      for (var key in opt.dataAttrs) {
        attrs += ' data-' + key + '="' + opt.dataAttrs[key] + '"';
      }
    }
    html += '<div class="custom-select-option" data-value="' + escapeHtml(opt.value) + '"' + attrs + '>' + escapeHtml(opt.label) + '</div>';
  });
  optionsContainer.innerHTML = html;

  // Reinicializar eventos
  initCustomSelect(wrapperId, wrapper._onChange || null);
}

function setDynamicSelectValue(wrapperId, value) {
  setCustomSelectValue(wrapperId, value);
}

// Filtros — search input
document.getElementById('filter-search').addEventListener('input', renderTable);

// ============================================================================
// DESACTIVAR / ACTIVAR PRODUCTO
// ============================================================================
function toggleStatus(id, isCurrentlyActive) {
  const product = allProducts.find(function (p) { return p.id === id; });
  const productName = product ? product.name : 'este producto';

  if (isCurrentlyActive) {
    showConfirm(
      '¿Desactivar producto?',
      '"' + escapeHtml(productName) + '" dejará de ser visible en la tienda.',
      async function () {
        const response = await authFetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
        if (!response) return;
        if (response.ok) {
          showToast('"' + productName + '" fue desactivado.');
          await loadProducts();
        } else {
          const data = await response.json().catch(function () { return {}; });
          showToast(data.message || 'No se pudo desactivar el producto.', 'error');
        }
      }
    );
  } else {
    showConfirm(
      '¿Activar producto?',
      '"' + escapeHtml(productName) + '" volverá a ser visible en la tienda.',
      async function () {
        const response = await authFetch(`${API_URL}/admin/products/${id}/reactivate`, { method: 'PUT' });
        if (!response) return;
        if (response.ok) {
          showToast('"' + productName + '" fue activado.');
          await loadProducts();
        } else {
          const data = await response.json().catch(function () { return {}; });
          showAlert('No se puede activar', data.message || 'No se pudo activar el producto.');
        }
      }
    );
  }
}

// ============================================================================
// MODAL CONFIRMACIÓN
// ============================================================================
let confirmCallback = null;

function showConfirm(title, message, onAccept) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-modal').classList.add('visible');
  confirmCallback = onAccept;
}

document.getElementById('confirm-cancel').addEventListener('click', function () {
  document.getElementById('confirm-modal').classList.remove('visible');
  confirmCallback = null;
});

document.getElementById('confirm-accept').addEventListener('click', async function () {
  document.getElementById('confirm-modal').classList.remove('visible');
  if (confirmCallback) {
    await confirmCallback();
    confirmCallback = null;
  }
});

// ============================================================================
// MODAL AVISO — Solo mensaje con botón "Entendido"
// ============================================================================
function showAlert(title, message) {
  document.getElementById('alert-title').textContent = title;
  document.getElementById('alert-message').textContent = message;
  document.getElementById('alert-modal').classList.add('visible');
}

document.getElementById('alert-close').addEventListener('click', function () {
  document.getElementById('alert-modal').classList.remove('visible');
});

document.getElementById('alert-modal').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('visible');
});

// ============================================================================
// MODAL CREAR / EDITAR
// ============================================================================
function setCustomSelectValue(wrapperId, value) {
  const wrapper = document.getElementById(wrapperId);
  const trigger = wrapper.querySelector('.custom-select-trigger');
  const hiddenInput = wrapper.querySelector('input[type="hidden"]');
  const options = wrapper.querySelectorAll('.custom-select-option');

  hiddenInput.value = value;
  options.forEach(function (o) {
    o.classList.remove('selected');
    if (o.getAttribute('data-value') === value) {
      o.classList.add('selected');
      trigger.textContent = o.textContent;
    }
  });
}

function openCreateModal() {
  currentEditId = null;
  document.getElementById('modal-title').textContent = 'Nuevo producto';
  document.getElementById('btn-submit-modal').textContent = 'Crear';
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';
  document.getElementById('current-images-section').style.display = 'none';
  setCustomSelectValue('product-category-wrapper', '');
  hideModalError();
  clearFieldErrors();
  validateModalFields();
  document.getElementById('product-modal').classList.add('visible');
}

function openEditModal(id) {
  const product = allProducts.find(function (p) { return p.id === id; });
  if (!product) {
    showToast('No se encontró el producto.', 'error');
    return;
  }

  currentEditId = id;
  document.getElementById('modal-title').textContent = 'Editar producto';
  document.getElementById('btn-submit-modal').textContent = 'Guardar cambios';
  document.getElementById('product-id').value = id;

  // Llenar campos
  document.getElementById('product-name').value = product.name || '';
  setCustomSelectValue('product-category-wrapper', product.category || '');
  document.getElementById('product-price').value = product.price || '';
  document.getElementById('product-description').value = product.description || '';
  document.getElementById('product-material').value = product.material || '';
  document.getElementById('product-dimensions').value = product.dimensions || '';
  document.getElementById('product-stock').value = product.stock != null ? product.stock : '';
  document.getElementById('product-image').value = '';

  // Mostrar imágenes actuales
  renderCurrentImages(product);

  hideModalError();
  clearFieldErrors();
  validateModalFields();
  document.getElementById('product-modal').classList.add('visible');
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('visible');
  currentEditId = null;
}

function showModalError(msg) {
  const el = document.getElementById('modal-error');
  el.textContent = msg;
  el.classList.add('visible');
}

function hideModalError() {
  document.getElementById('modal-error').classList.remove('visible');
}

// ============================================================================
// VALIDACIÓN DE CAMPOS EN TIEMPO REAL
// ============================================================================
const requiredFields = [
  { id: 'product-name', label: 'Nombre' },
  { id: 'product-category', label: 'Categoría' },
  { id: 'product-price', label: 'Precio' },
  { id: 'product-description', label: 'Descripción' },
  { id: 'product-stock', label: 'Stock', createOnly: true },
  { id: 'product-image', label: 'Imagen', createOnly: true, isFile: true },
];

function validateModalFields() {
  const isEdit = !!currentEditId;
  const submitBtn = document.getElementById('btn-submit-modal');
  let allValid = true;

  requiredFields.forEach(function (field) {
    if (field.createOnly && isEdit) return;

    const el = document.getElementById(field.id);
    let isEmpty;

    if (field.isFile) {
      isEmpty = el.files.length === 0;
    } else {
      isEmpty = !el.value.trim();
    }

    if (isEmpty) {
      allValid = false;
    }
  });

  submitBtn.disabled = !allValid;
}

function showFieldError(fieldId, message) {
  const el = document.getElementById(fieldId);
  // Para custom selects, marcar el trigger
  const customWrapper = el.closest('.custom-select');
  const targetEl = customWrapper ? customWrapper.querySelector('.custom-select-trigger') : el;
  targetEl.style.borderColor = 'var(--admin-danger)';

  // Agregar mensaje de error debajo del campo
  const parentEl = customWrapper || el.parentElement;
  let errorEl = parentEl.querySelector('.field-error');
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.className = 'field-error';
    parentEl.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

function clearFieldError(fieldId) {
  const el = document.getElementById(fieldId);
  const customWrapper = el.closest('.custom-select');
  const targetEl = customWrapper ? customWrapper.querySelector('.custom-select-trigger') : el;
  targetEl.style.borderColor = '';

  const parentEl = customWrapper || el.parentElement;
  const errorEl = parentEl.querySelector('.field-error');
  if (errorEl) errorEl.remove();
}

function clearFieldErrors() {
  requiredFields.forEach(function (field) {
    clearFieldError(field.id);
  });
}

// Listeners en tiempo real para validar y habilitar/deshabilitar botón
requiredFields.forEach(function (field) {
  const el = document.getElementById(field.id);
  const eventType = field.isFile ? 'change' : 'input';
  el.addEventListener(eventType, function () {
    clearFieldError(field.id);
    validateModalFields();
  });
});

// Botones
document.getElementById('btn-new-product').addEventListener('click', openCreateModal);
document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

// Cerrar modal al hacer click fuera
document.getElementById('product-modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

document.getElementById('confirm-modal').addEventListener('click', function (e) {
  if (e.target === this) {
    this.classList.remove('visible');
    confirmCallback = null;
  }
});

// ============================================================================
// IMÁGENES EN MODAL DE EDICIÓN
// ============================================================================
function renderCurrentImages(product) {
  const section = document.getElementById('current-images-section');
  const mainPreview = document.getElementById('main-image-preview');
  const additionalWrapper = document.getElementById('additional-images-wrapper');
  const additionalGrid = document.getElementById('additional-images-grid');

  if (!product.imageUrl && (!product.additionalImages || product.additionalImages.length === 0)) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Imagen principal
  if (product.imageUrl) {
    mainPreview.innerHTML =
      '<div class="current-image-preview">' +
        '<img src="' + escapeHtml(product.imageUrl) + '" alt="' + escapeHtml(product.name) + '"/>' +
        '<button type="button" class="image-delete-btn" onclick="deleteMainImage(\'' + product.id + '\')" title="Eliminar imagen principal">&times;</button>' +
      '</div>';
  } else {
    mainPreview.innerHTML = '<p style="color:var(--admin-text-light);font-size:0.85rem">Sin imagen principal</p>';
  }

  // Imágenes adicionales
  if (product.additionalImages && product.additionalImages.length > 0) {
    additionalWrapper.style.display = 'block';
    additionalGrid.innerHTML = product.additionalImages.map(function (url, index) {
      return '<div class="current-image-preview">' +
        '<img src="' + escapeHtml(url) + '" alt="Imagen adicional"/>' +
        '<button type="button" class="image-delete-btn" onclick="deleteAdditionalImage(\'' + product.id + '\', ' + index + ')" title="Eliminar imagen">&times;</button>' +
      '</div>';
    }).join('');
  } else {
    additionalWrapper.style.display = 'none';
    additionalGrid.innerHTML = '';
  }
}

async function deleteMainImage(productId) {
  showConfirm(
    '¿Eliminar imagen principal?',
    'Se eliminará la imagen principal del producto.',
    async function () {
      const response = await authFetch(`${API_URL}/admin/products/${productId}/main-image`, {
        method: 'DELETE',
      });
      if (!response) return;

      if (response.ok) {
        showToast('Imagen principal eliminada.');
        await loadProducts();
        const updatedProduct = allProducts.find(function (p) { return p.id === productId; });
        if (updatedProduct) renderCurrentImages(updatedProduct);
      } else {
        const data = await response.json().catch(function () { return {}; });
        showToast(data.message || 'No se pudo eliminar la imagen.', 'error');
      }
    }
  );
}

async function deleteAdditionalImage(productId, imageIndex) {
  showConfirm(
    '¿Eliminar imagen?',
    'Esta imagen se eliminará permanentemente.',
    async function () {
      const response = await authFetch(`${API_URL}/admin/products/${productId}/images/${imageIndex}`, {
        method: 'DELETE',
      });
      if (!response) return;

      if (response.ok) {
        showToast('Imagen eliminada.');
        await loadProducts();
        // Actualizar el modal con los datos nuevos
        const updatedProduct = allProducts.find(function (p) { return p.id === productId; });
        if (updatedProduct) renderCurrentImages(updatedProduct);
      } else {
        const data = await response.json().catch(function () { return {}; });
        showToast(data.message || 'No se pudo eliminar la imagen.', 'error');
      }
    }
  );
}

// ============================================================================
// SUBMIT — Crear o Editar producto
// ============================================================================
document.getElementById('product-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  hideModalError();

  const submitBtn = document.getElementById('btn-submit-modal');
  const isEdit = !!currentEditId;

  const name = document.getElementById('product-name').value.trim();
  const category = document.getElementById('product-category').value;
  const price = document.getElementById('product-price').value;
  const description = document.getElementById('product-description').value.trim();
  const material = document.getElementById('product-material').value.trim();
  const dimensions = document.getElementById('product-dimensions').value.trim();
  const stock = document.getElementById('product-stock').value;
  const imageFile = document.getElementById('product-image').files[0];

  // Validación campo por campo
  clearFieldErrors();
  let hasErrors = false;

  if (!name) { showFieldError('product-name', 'El nombre es obligatorio.'); hasErrors = true; }
  if (!category) { showFieldError('product-category', 'Selecciona una categoría.'); hasErrors = true; }
  if (!price) { showFieldError('product-price', 'El precio es obligatorio.'); hasErrors = true; }
  if (!description) { showFieldError('product-description', 'La descripción es obligatoria.'); hasErrors = true; }
  if (!isEdit && stock === '') { showFieldError('product-stock', 'El stock es obligatorio.'); hasErrors = true; }
  if (!isEdit && !imageFile) { showFieldError('product-image', 'Debes subir al menos una imagen.'); hasErrors = true; }

  if (hasErrors) {
    showModalError('Completa todos los campos obligatorios marcados en rojo.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = isEdit ? 'Guardando...' : 'Creando...';

  const formData = new FormData();
  formData.append('name', name);
  formData.append('category', category);
  formData.append('price', price);
  formData.append('description', description);
  if (material) formData.append('material', material);
  if (dimensions) formData.append('dimensions', dimensions);
  if (stock !== '') formData.append('stock', stock);
  if (imageFile) formData.append('image', imageFile);

  try {
    const url = isEdit ? `${API_URL}/products/${currentEditId}` : `${API_URL}/products`;
    const method = isEdit ? 'PUT' : 'POST';

    const response = await authFetch(url, { method, body: formData });
    if (!response) return;

    if (response.ok) {
      showToast(isEdit ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.');
      closeModal();
      await loadProducts();
    } else {
      const data = await response.json().catch(function () { return {}; });
      showModalError(data.message || (isEdit ? 'No se pudo actualizar el producto.' : 'No se pudo crear el producto.'));
    }
  } catch (error) {
    showModalError('Ocurrió un error inesperado. Intenta de nuevo.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear';
  }
});

// ============================================================================
// PROMOCIONES — Estado y carga
// ============================================================================
let currentEditPromoId = null;

async function loadAllPromotions() {
  // Carga TODAS las promociones (activas e inactivas) para la tabla del admin
  var response = await authFetch(API_URL + '/promotions/admin/all');
  if (!response) return;
  if (!response.ok) return;
  allPromotions = await response.json();
  renderPromosTable();
}

// ============================================================================
// PROMOCIONES — Tabla
// ============================================================================
function renderPromosTable() {
  var tbody = document.getElementById('promos-table-body');
  if (!tbody) return;

  if (allPromotions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No hay promociones registradas.</td></tr>';
    return;
  }

  var now = new Date();
  now.setHours(0, 0, 0, 0);

  tbody.innerHTML = allPromotions.map(function (p) {
    var typeLabel = p.type === 'descuento' ? 'Descuento' : 'Promoción';
    var discountText = p.discountPercentage ? Number(p.discountPercentage) + '%' : '-';
    var startText = p.startDate ? new Date(p.startDate).toLocaleDateString('es-HN') : '-';
    var endText = p.endDate ? new Date(p.endDate).toLocaleDateString('es-HN') : '-';
    var productCount = (p.products && p.products.length) || 0;

    // Determinar estado
    var isExpired = p.endDate && new Date(p.endDate) < now;
    var statusText, statusDot;
    if (!p.isActive) {
      statusText = 'Inactiva';
      statusDot = 'inactive';
    } else if (isExpired) {
      statusText = 'Expirada';
      statusDot = 'inactive';
    } else {
      statusText = 'Activa';
      statusDot = 'active';
    }

    var toggleBtn = p.isActive
      ? '<button class="btn btn-outline btn-sm" onclick="togglePromoStatus(\'' + p.id + '\', true)">Desactivar</button>'
      : '<button class="btn btn-success btn-sm" onclick="togglePromoStatus(\'' + p.id + '\', false)">Activar</button>';

    return '<tr>' +
      '<td class="product-name">' + escapeHtml(p.name) + '</td>' +
      '<td>' + typeLabel + '</td>' +
      '<td>' + discountText + '</td>' +
      '<td>' + startText + '</td>' +
      '<td>' + endText + '</td>' +
      '<td>' + productCount + ' producto' + (productCount !== 1 ? 's' : '') + '</td>' +
      '<td><span class="status-badge"><span class="status-dot ' + statusDot + '"></span>' + statusText + '</span></td>' +
      '<td class="table-actions">' +
        '<button class="btn btn-outline btn-sm" onclick="openEditPromoModal(\'' + p.id + '\')">Editar</button>' +
        toggleBtn +
        '<button class="btn btn-danger btn-sm" onclick="deletePromo(\'' + p.id + '\')">Eliminar</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

// ============================================================================
// PROMOCIONES — Modal crear/editar
// ============================================================================
function populatePromoProductsSelector(selectedIds) {
  var container = document.getElementById('promo-products-selector');
  var selectedSet = new Set(selectedIds || []);

  // Solo productos activos con stock disponible
  var availableProducts = allProducts.filter(function (p) {
    return p.isActive && (Number(p.stock) > 0);
  });

  // Si estamos editando, incluir también los que ya están seleccionados aunque no tengan stock
  if (selectedIds && selectedIds.length > 0) {
    allProducts.forEach(function (p) {
      if (selectedSet.has(p.id) && !availableProducts.find(function (ap) { return ap.id === p.id; })) {
        availableProducts.push(p);
      }
    });
  }

  if (availableProducts.length === 0) {
    container.innerHTML = '<div style="padding:1rem;color:var(--admin-text-light);text-align:center;font-size:0.85rem">No hay productos con stock disponible.</div>';
    return;
  }

  container.innerHTML = availableProducts.map(function (p) {
    var imgTag = p.imageUrl
      ? '<img src="' + escapeHtml(p.imageUrl) + '" alt="' + escapeHtml(p.name) + '"/>'
      : '<div style="width:36px;height:36px;background:#eee;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa">Sin img</div>';
    var checked = selectedSet.has(p.id) ? 'checked' : '';

    return '<label class="promo-product-item">' +
      '<input type="checkbox" value="' + p.id + '" ' + checked + '/>' +
      imgTag +
      '<div class="promo-product-item-info">' +
        '<strong>' + escapeHtml(p.name) + '</strong>' +
        '<span>' + formatLempiras(p.price) + ' — ' + categoryLabel(p.category) + '</span>' +
      '</div>' +
    '</label>';
  }).join('');
}

function getSelectedPromoProductIds() {
  var checkboxes = document.querySelectorAll('#promo-products-selector input[type="checkbox"]:checked');
  var ids = [];
  checkboxes.forEach(function (cb) { ids.push(cb.value); });
  return ids;
}

function openCreatePromoModal() {
  currentEditPromoId = null;
  document.getElementById('promo-modal-title').textContent = 'Nueva promoción';
  document.getElementById('btn-submit-promo').textContent = 'Crear';
  document.getElementById('promo-form').reset();
  document.getElementById('promo-id').value = '';
  setCustomSelectValue('promo-type-wrapper', '');
  if (promoStartPicker) promoStartPicker.setValue('');
  if (promoEndPicker) promoEndPicker.setValue('');
  populatePromoProductsSelector([]);
  hidePromoModalError();
  document.getElementById('promo-modal').classList.add('visible');
}

function openEditPromoModal(id) {
  var promo = allPromotions.find(function (p) { return p.id === id; });
  if (!promo) {
    showToast('No se encontró la promoción.', 'error');
    return;
  }

  currentEditPromoId = id;
  document.getElementById('promo-modal-title').textContent = 'Editar promoción';
  document.getElementById('btn-submit-promo').textContent = 'Guardar cambios';
  document.getElementById('promo-id').value = id;

  document.getElementById('promo-name').value = promo.name || '';
  setCustomSelectValue('promo-type-wrapper', promo.type || '');
  document.getElementById('promo-discount').value = promo.discountPercentage || '';
  document.getElementById('promo-label').value = promo.label || '';
  if (promoStartPicker) promoStartPicker.setValue(promo.startDate ? promo.startDate.split('T')[0] : '');
  if (promoEndPicker) promoEndPicker.setValue(promo.endDate ? promo.endDate.split('T')[0] : '');

  var selectedIds = (promo.products || []).map(function (p) { return p.id; });
  populatePromoProductsSelector(selectedIds);

  hidePromoModalError();
  document.getElementById('promo-modal').classList.add('visible');
}

function closePromoModal() {
  document.getElementById('promo-modal').classList.remove('visible');
  currentEditPromoId = null;
}

function showPromoModalError(msg) {
  var el = document.getElementById('promo-modal-error');
  el.textContent = msg;
  el.classList.add('visible');
}

function hidePromoModalError() {
  document.getElementById('promo-modal-error').classList.remove('visible');
}

document.getElementById('btn-new-promo').addEventListener('click', openCreatePromoModal);
document.getElementById('btn-cancel-promo-modal').addEventListener('click', closePromoModal);
document.getElementById('promo-modal').addEventListener('click', function (e) {
  if (e.target === this) closePromoModal();
});

// ============================================================================
// PROMOCIONES — Submit (crear / editar)
// ============================================================================
document.getElementById('promo-form').addEventListener('submit', function (e) {
  e.preventDefault();
  hidePromoModalError();

  var isEdit = !!currentEditPromoId;
  var name = document.getElementById('promo-name').value.trim();
  var type = document.getElementById('promo-type').value;
  var discountPercentage = parseFloat(document.getElementById('promo-discount').value) || 0;
  var label = document.getElementById('promo-label').value.trim();
  var startDate = promoStartPicker ? promoStartPicker.getValue() : '';
  var endDate = promoEndPicker ? promoEndPicker.getValue() : '';
  var productIds = getSelectedPromoProductIds();

  // Validaciones
  if (!name) { showPromoModalError('El nombre es obligatorio.'); return; }
  if (!type) { showPromoModalError('Selecciona un tipo.'); return; }
  if (type === 'descuento' && discountPercentage <= 0) {
    showPromoModalError('El porcentaje de descuento debe ser mayor a 0.'); return;
  }
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    showPromoModalError('La fecha de inicio no puede ser posterior a la fecha fin.'); return;
  }

  var promoData = {
    name: name,
    type: type,
    discountPercentage: discountPercentage || null,
    label: label || null,
    startDate: startDate || null,
    endDate: endDate || null,
    productIds: productIds,
  };

  var confirmTitle = isEdit ? '¿Guardar cambios?' : '¿Crear promoción?';
  var confirmMsg = isEdit
    ? '¿Está seguro de guardar los cambios en "' + escapeHtml(name) + '"?'
    : '¿Está seguro de crear la promoción "' + escapeHtml(name) + '"?';

  showConfirm(confirmTitle, confirmMsg, async function () {
    var submitBtn = document.getElementById('btn-submit-promo');
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Guardando...' : 'Creando...';

    try {
      var url = isEdit ? API_URL + '/promotions/' + currentEditPromoId : API_URL + '/promotions';
      var method = isEdit ? 'PUT' : 'POST';
      var response = await authFetch(url, {
        method: method,
        body: JSON.stringify(promoData),
      });

      if (!response) return;

      if (response.ok) {
        showToast(isEdit ? 'Promoción actualizada correctamente.' : 'Promoción creada correctamente.');
        closePromoModal();
        await loadAllPromotions();
        await loadProducts();
      } else {
        var data = await response.json().catch(function () { return {}; });
        showPromoModalError(data.message || 'No se pudo guardar la promoción.');
      }
    } catch (error) {
      showPromoModalError('Ocurrió un error inesperado.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear';
    }
  });
});

// ============================================================================
// PROMOCIONES — Activar / Desactivar
// ============================================================================
function togglePromoStatus(id, isCurrentlyActive) {
  var promo = allPromotions.find(function (p) { return p.id === id; });
  var promoName = promo ? promo.name : 'esta promoción';

  if (isCurrentlyActive) {
    showConfirm(
      '¿Desactivar promoción?',
      '"' + escapeHtml(promoName) + '" dejará de aplicarse. Los productos volverán a su precio normal.',
      async function () {
        var response = await authFetch(API_URL + '/promotions/' + id, {
          method: 'PUT',
          body: JSON.stringify({ isActive: false, productIds: [] }),
        });
        if (!response) return;
        if (response.ok) {
          showToast('"' + promoName + '" fue desactivada. Productos a precio normal.');
          await loadAllPromotions();
          await loadProducts();
        } else {
          showToast('No se pudo desactivar la promoción.', 'error');
        }
      }
    );
  } else {
    // Al reactivar, NO se aplican productos automáticamente
    showConfirm(
      '¿Activar promoción?',
      '"' + escapeHtml(promoName) + '" se activará pero sin productos asignados. Deberás asignar productos manualmente desde Editar.',
      async function () {
        var response = await authFetch(API_URL + '/promotions/' + id, {
          method: 'PUT',
          body: JSON.stringify({ isActive: true, productIds: [] }),
        });
        if (!response) return;
        if (response.ok) {
          showToast('"' + promoName + '" fue activada. Asigna productos desde Editar.');
          await loadAllPromotions();
          await loadProducts();
        } else {
          showToast('No se pudo activar la promoción.', 'error');
        }
      }
    );
  }
}

// ============================================================================
// PROMOCIONES — Eliminar
// ============================================================================
function deletePromo(id) {
  var promo = allPromotions.find(function (p) { return p.id === id; });
  var promoName = promo ? promo.name : 'esta promoción';

  showConfirm(
    '¿Eliminar promoción?',
    '¿Está seguro de eliminar "' + escapeHtml(promoName) + '"? Los productos volverán a su precio normal.',
    async function () {
      var response = await authFetch(API_URL + '/promotions/' + id, { method: 'DELETE' });
      if (!response) return;
      if (response.ok) {
        showToast('Promoción eliminada. Productos a precio normal.');
        await loadAllPromotions();
        await loadProducts();
      } else {
        var data = await response.json().catch(function () { return {}; });
        showToast(data.message || 'No se pudo eliminar la promoción.', 'error');
      }
    }
  );
}

// ============================================================================
// VENTAS — Estado y carga
// ============================================================================
let allSales = [];
let allPromotions = [];
let currentEditSaleId = null;

async function loadPromotions() {
  var response = await authFetch(API_URL + '/promotions');
  if (!response) return;
  if (!response.ok) return;
  allPromotions = await response.json();
}

async function loadSales() {
  const response = await authFetch(`${API_URL}/sales`);
  if (!response) return;
  if (!response.ok) {
    showToast('No se pudieron cargar las ventas.', 'error');
    return;
  }
  allSales = await response.json();
  renderSalesTable();
  renderDashboardSales();
}

// ============================================================================
// DASHBOARD — Cards y gráficos
// ============================================================================
var weeklyChart = null;
var monthlyChart = null;

function renderDashboardSales() {
  // Total ventas (suma de cantidades, no de registros)
  var totalCount = allSales.reduce(function (sum, s) { return sum + Number(s.quantity); }, 0);
  var totalAmount = allSales.reduce(function (sum, s) { return sum + Number(s.total); }, 0);
  document.getElementById('stat-total-sales').textContent = totalCount;
  document.getElementById('stat-total-sales-amount').textContent = formatLempiras(totalAmount) + ' generado';

  // Ventas este mes (suma de cantidades)
  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();
  var monthSales = allSales.filter(function (s) {
    var d = new Date(s.saleDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  var monthCount = monthSales.reduce(function (sum, s) { return sum + Number(s.quantity); }, 0);
  var monthAmount = monthSales.reduce(function (sum, s) { return sum + Number(s.total); }, 0);
  document.getElementById('stat-month-sales').textContent = monthCount;
  document.getElementById('stat-month-sales-amount').textContent = formatLempiras(monthAmount) + ' este mes';

  // Descuentos activos
  var nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  var activePromos = allPromotions.filter(function (p) {
    if (!p.isActive) return false;
    if (p.endDate && new Date(p.endDate) < nowDate) return false;
    return true;
  });
  document.getElementById('stat-active-promos').textContent = activePromos.length;
  var promoListEl = document.getElementById('stat-active-promos-list');
  if (activePromos.length === 0) {
    promoListEl.textContent = 'Sin descuentos activos';
  } else {
    promoListEl.innerHTML = activePromos.slice(0, 3).map(function (p) {
      return '<div style="font-size:0.8rem">' + escapeHtml(p.name) + ' (' + Number(p.discountPercentage || 0) + '%)</div>';
    }).join('');
    if (activePromos.length > 3) {
      promoListEl.innerHTML += '<div style="font-size:0.8rem;color:var(--admin-accent)">+' + (activePromos.length - 3) + ' más</div>';
    }
  }

  // Establecer rango por defecto: primer día del mes actual hasta hoy
  if (dashboardStartPicker && !dashboardStartPicker.getValue()) {
    var firstDay = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-01';
    dashboardStartPicker.setValue(firstDay);
  }
  if (dashboardEndPicker && !dashboardEndPicker.getValue()) {
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    dashboardEndPicker.setValue(todayStr);
  }

  renderDashboardCharts();
}

function renderDashboardCharts() {
  var startVal = dashboardStartPicker ? dashboardStartPicker.getValue() : '';
  var endVal = dashboardEndPicker ? dashboardEndPicker.getValue() : '';
  if (!startVal || !endVal) return;

  var startDate = new Date(startVal + 'T00:00:00');
  var endDate = new Date(endVal + 'T23:59:59');

  // Filtrar ventas dentro del rango
  var filteredSales = allSales.filter(function (s) {
    var d = new Date(s.saleDate);
    return d >= startDate && d <= endDate;
  });

  // Para el gráfico semanal: usar el mes de la fecha inicio
  renderWeeklyChart(filteredSales, startDate.getFullYear(), startDate.getMonth());

  // Para el gráfico mensual: centrar en el mes de la fecha inicio
  renderMonthlyChart(startDate.getFullYear(), startDate.getMonth());
}

function renderWeeklyChart(salesInMonth, year, month) {
  // Agrupar ventas por semana del mes
  var weeks = {};
  var daysInMonth = new Date(year, month + 1, 0).getDate();

  for (var w = 1; w <= 5; w++) {
    weeks['Semana ' + w] = 0;
  }

  salesInMonth.forEach(function (s) {
    var d = new Date(s.saleDate);
    var day = d.getDate();
    var weekNum = Math.min(Math.ceil(day / 7), 5);
    weeks['Semana ' + weekNum] += Number(s.total);
  });

  var labels = Object.keys(weeks);
  var data = Object.values(weeks);

  var ctx = document.getElementById('chart-sales-weekly').getContext('2d');

  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ventas (L)',
        data: data,
        backgroundColor: 'rgba(192, 136, 106, 0.6)',
        borderColor: '#c0886a',
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) { return 'L ' + value.toLocaleString(); }
          }
        }
      }
    }
  });
}

function renderMonthlyChart(centerYear, centerMonth) {
  // Mostrar 6 meses: 3 antes del mes seleccionado, el mes seleccionado, y 2 después
  var months = [];
  var totals = [];
  var monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (var i = -3; i <= 2; i++) {
    var d = new Date(centerYear, centerMonth + i, 1);
    var m = d.getMonth();
    var y = d.getFullYear();
    months.push(monthNames[m] + ' ' + y);

    var monthTotal = allSales.reduce(function (sum, s) {
      var sd = new Date(s.saleDate);
      if (sd.getMonth() === m && sd.getFullYear() === y) {
        return sum + Number(s.total);
      }
      return sum;
    }, 0);
    totals.push(monthTotal);
  }

  var ctx = document.getElementById('chart-sales-monthly').getContext('2d');

  if (monthlyChart) monthlyChart.destroy();

  monthlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Ventas (L)',
        data: totals,
        borderColor: '#c0886a',
        backgroundColor: 'rgba(192, 136, 106, 0.15)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#c0886a',
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) { return 'L ' + value.toLocaleString(); }
          }
        }
      }
    }
  });
}

// Dashboard month picker se inicializa abajo en INICIALIZACIÓN

// ============================================================================
// VENTAS — Tabla
// ============================================================================

function getFilteredSales() {
  if (salesDatePicker) {
    var dateVal = salesDatePicker.getValue();
    if (dateVal) {
      var filterDate = new Date(dateVal + 'T00:00:00');
      return allSales.filter(function (s) {
        var d = new Date(s.saleDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === filterDate.getTime();
      });
    }
  }

  return allSales;
}

function renderSalesTable() {
  var tbody = document.getElementById('sales-table-body');
  if (!tbody) return;

  var filtered = getFilteredSales();

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="table-empty">No hay ventas registradas.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (s) {
    var product = s.product || {};
    var imgSrc = product.imageUrl || '';
    var imgTag = imgSrc
      ? '<img class="product-thumbnail" src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(s.productName) + '" loading="lazy"/>'
      : '<div class="product-thumbnail" style="background:#eee;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:11px">Sin img</div>';

    var discountText = 'Sin descuento';
    if (s.hasDiscount) {
      var dtName = s.discountType || '';
      var pct = Number(s.discountPercentage);
      // Si el nombre ya incluye el porcentaje, no lo repetimos
      if (dtName.indexOf(pct + '%') !== -1) {
        discountText = escapeHtml(dtName);
      } else {
        discountText = escapeHtml(dtName) + (dtName ? ' — ' : '') + pct + '%';
      }
    }

    var saleDate = s.saleDate ? new Date(s.saleDate).toLocaleDateString('es-HN') : '-';

    return '<tr>' +
      '<td>' + imgTag + '</td>' +
      '<td class="product-name">' + escapeHtml(s.productName) + '</td>' +
      '<td>' + s.quantity + '</td>' +
      '<td>' + formatLempiras(s.unitPrice) + '</td>' +
      '<td class="sale-discount-col">' + discountText + '</td>' +
      '<td>' + formatLempiras(s.subtotal) + '</td>' +
      '<td><strong>' + formatLempiras(s.total) + '</strong></td>' +
      '<td>' + saleDate + '</td>' +
      '<td class="table-actions">' +
        '<button class="btn btn-outline btn-sm" onclick="openEditSaleModal(\'' + s.id + '\')">Editar</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteSale(\'' + s.id + '\')">Eliminar</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

// ============================================================================
// VENTAS — Modal crear/editar
// ============================================================================
function populateSaleProductSelect() {
  var activeProducts = allProducts.filter(function (p) { return p.isActive && (p.stock > 0); });
  var options = activeProducts.map(function (p) {
    return { value: p.id, label: p.name + ' — ' + formatLempiras(p.price) + ' (Stock: ' + (p.stock || 0) + ')' };
  });
  populateDynamicSelect('sale-product-wrapper', options, 'Seleccionar producto...');
  document.getElementById('sale-product-wrapper')._onChange = onSaleProductChange;
  initCustomSelect('sale-product-wrapper', onSaleProductChange);
}

function getProductActivePromotion(product) {
  if (!product.promotions || product.promotions.length === 0) return null;
  var now = new Date();
  now.setHours(0, 0, 0, 0);
  for (var i = 0; i < product.promotions.length; i++) {
    var promo = product.promotions[i];
    if (!promo.isActive) continue;
    if (promo.startDate && new Date(promo.startDate) > now) continue;
    if (promo.endDate && new Date(promo.endDate) < now) continue;
    return promo;
  }
  return null;
}

function populateDiscountTypeSelect(selectedPromoId) {
  var now = new Date();
  now.setHours(0, 0, 0, 0);

  var activePromos = allPromotions.filter(function (p) {
    if (!p.isActive) return false;
    if (p.startDate && new Date(p.startDate) > now) return false;
    if (p.endDate && new Date(p.endDate) < now) return false;
    return true;
  });

  var options = activePromos.map(function (p) {
    return {
      value: p.id,
      label: p.name + ' (' + Number(p.discountPercentage) + '%)',
      dataAttrs: { percentage: p.discountPercentage || 0 }
    };
  });
  populateDynamicSelect('sale-discount-type-wrapper', options, 'Seleccionar descuento...');
  document.getElementById('sale-discount-type-wrapper')._onChange = function (val) {
    // Auto-llenar porcentaje
    var wrapper = document.getElementById('sale-discount-type-wrapper');
    var selected = wrapper.querySelector('.custom-select-option.selected');
    if (selected && selected.getAttribute('data-value')) {
      var pct = selected.getAttribute('data-percentage');
      document.getElementById('sale-discount-percentage').value = pct || '';
    } else {
      document.getElementById('sale-discount-percentage').value = '';
    }
    updateSaleCalculation();
  };
  initCustomSelect('sale-discount-type-wrapper', document.getElementById('sale-discount-type-wrapper')._onChange);

  if (selectedPromoId) {
    setCustomSelectValue('sale-discount-type-wrapper', selectedPromoId);
  }
}

function onSaleProductChange() {
  var productId = document.getElementById('sale-product-select').value;
  var preview = document.getElementById('sale-product-preview');

  if (!productId) {
    preview.style.display = 'none';
    document.getElementById('sale-unit-price').value = '';
    document.getElementById('sale-has-discount').checked = false;
    document.getElementById('sale-discount-fields').style.display = 'none';
    setCustomSelectValue('sale-discount-type-wrapper', '');
    document.getElementById('sale-discount-percentage').value = '';
    document.getElementById('sale-quantity').value = '';
    document.getElementById('sale-quantity').removeAttribute('max');
    updateSaleCalculation();
    return;
  }

  var product = allProducts.find(function (p) { return p.id === productId; });
  if (!product) return;

  // Mostrar preview
  preview.style.display = 'flex';
  var img = document.getElementById('sale-product-img');
  if (product.imageUrl) {
    img.src = product.imageUrl;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
  document.getElementById('sale-product-name-display').textContent = product.name;
  document.getElementById('sale-product-price-display').textContent = formatLempiras(product.price);
  document.getElementById('sale-product-stock-display').textContent = 'Stock disponible: ' + (product.stock || 0);

  // Llenar precio
  document.getElementById('sale-unit-price').value = product.price;

  // Limitar cantidad al stock
  var qtyInput = document.getElementById('sale-quantity');
  qtyInput.setAttribute('max', product.stock || 0);
  if (!qtyInput.value) qtyInput.value = 1;

  // Verificar si tiene promoción activa
  var promo = getProductActivePromotion(product);
  var discountCheck = document.getElementById('sale-has-discount');
  var discountFields = document.getElementById('sale-discount-fields');

  // Llenar el select de descuentos disponibles
  populateDiscountTypeSelect(promo ? promo.id : '');

  if (promo && promo.discountPercentage) {
    discountCheck.checked = true;
    discountFields.style.display = 'block';
    document.getElementById('sale-discount-percentage').value = promo.discountPercentage;
  } else {
    discountCheck.checked = false;
    discountFields.style.display = 'none';
    setCustomSelectValue('sale-discount-type-wrapper', '');
    document.getElementById('sale-discount-percentage').value = '';
  }

  updateSaleCalculation();
}

function updateSaleCalculation() {
  var quantity = parseInt(document.getElementById('sale-quantity').value) || 0;
  var unitPrice = parseFloat(document.getElementById('sale-unit-price').value) || 0;
  var hasDiscount = document.getElementById('sale-has-discount').checked;
  var discountPct = hasDiscount ? (parseFloat(document.getElementById('sale-discount-percentage').value) || 0) : 0;

  var subtotal = unitPrice * quantity;
  var discountAmount = subtotal * (discountPct / 100);
  var total = subtotal - discountAmount;

  var calcSection = document.getElementById('sale-calculation');
  var discountRow = document.getElementById('sale-calc-discount-row');

  if (quantity > 0 && unitPrice > 0) {
    calcSection.style.display = 'block';
    document.getElementById('sale-calc-subtotal').textContent = formatLempiras(subtotal);
    document.getElementById('sale-calc-total').textContent = formatLempiras(total);

    if (hasDiscount && discountPct > 0) {
      discountRow.style.display = 'flex';
      document.getElementById('sale-calc-discount-pct').textContent = discountPct;
      document.getElementById('sale-calc-discount-amount').textContent = '- ' + formatLempiras(discountAmount);
    } else {
      discountRow.style.display = 'none';
    }
  } else {
    calcSection.style.display = 'none';
  }
}

function openCreateSaleModal() {
  currentEditSaleId = null;
  document.getElementById('sale-modal-title').textContent = 'Nueva venta';
  document.getElementById('btn-submit-sale').textContent = 'Registrar';
  document.getElementById('sale-form').reset();
  document.getElementById('sale-id').value = '';
  document.getElementById('sale-product-preview').style.display = 'none';
  document.getElementById('sale-discount-fields').style.display = 'none';
  document.getElementById('sale-calculation').style.display = 'none';

  // Fecha de hoy por defecto
  var today = new Date().toISOString().split('T')[0];
  if (saleDatePicker) saleDatePicker.setValue(today);

  populateSaleProductSelect();
  setCustomSelectValue('sale-product-wrapper', '');
  hideSaleModalError();
  document.getElementById('sale-modal').classList.add('visible');
}

function openEditSaleModal(id) {
  var sale = allSales.find(function (s) { return s.id === id; });
  if (!sale) {
    showToast('No se encontró la venta.', 'error');
    return;
  }

  currentEditSaleId = id;
  document.getElementById('sale-modal-title').textContent = 'Editar venta';
  document.getElementById('btn-submit-sale').textContent = 'Guardar cambios';
  document.getElementById('sale-id').value = id;

  populateSaleProductSelect();

  // Si el producto ya no está en la lista (inactivo), agregarlo temporalmente
  var optionsContainer = document.getElementById('sale-product-options');
  var exists = optionsContainer.querySelector('[data-value="' + sale.productId + '"]');
  if (!exists) {
    var tempDiv = document.createElement('div');
    tempDiv.className = 'custom-select-option';
    tempDiv.setAttribute('data-value', sale.productId);
    tempDiv.textContent = sale.productName + ' (producto actual)';
    optionsContainer.appendChild(tempDiv);
    initCustomSelect('sale-product-wrapper', onSaleProductChange);
  }

  setCustomSelectValue('sale-product-wrapper', sale.productId);

  // Llenar campos
  document.getElementById('sale-quantity').value = sale.quantity;
  document.getElementById('sale-unit-price').value = sale.unitPrice;
  document.getElementById('sale-has-discount').checked = sale.hasDiscount;
  document.getElementById('sale-discount-fields').style.display = sale.hasDiscount ? 'block' : 'none';
  if (saleDatePicker) saleDatePicker.setValue(sale.saleDate ? sale.saleDate.split('T')[0] : '');

  // Llenar select de descuentos
  if (sale.hasDiscount) {
    populateDiscountTypeSelect('');
    // Buscar la promo que coincida por nombre
    var matched = false;
    var dtOptions = document.querySelectorAll('#sale-discount-type-options .custom-select-option');
    dtOptions.forEach(function (opt) {
      if (opt.textContent === sale.discountType) {
        setCustomSelectValue('sale-discount-type-wrapper', opt.getAttribute('data-value'));
        matched = true;
      }
    });
    // Si no matchea, agregar opción temporal
    if (!matched && sale.discountType) {
      var dtContainer = document.getElementById('sale-discount-type-options');
      var tempOpt = document.createElement('div');
      tempOpt.className = 'custom-select-option';
      tempOpt.setAttribute('data-value', 'custom');
      tempOpt.setAttribute('data-percentage', sale.discountPercentage || 0);
      tempOpt.textContent = sale.discountType;
      dtContainer.appendChild(tempOpt);
      initCustomSelect('sale-discount-type-wrapper', document.getElementById('sale-discount-type-wrapper')._onChange);
      setCustomSelectValue('sale-discount-type-wrapper', 'custom');
    }
  }
  document.getElementById('sale-discount-percentage').value = sale.discountPercentage || '';

  // Preview
  var product = sale.product || {};
  var preview = document.getElementById('sale-product-preview');
  preview.style.display = 'flex';
  var img = document.getElementById('sale-product-img');
  if (product.imageUrl) {
    img.src = product.imageUrl;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
  document.getElementById('sale-product-name-display').textContent = sale.productName;
  document.getElementById('sale-product-price-display').textContent = formatLempiras(sale.unitPrice);
  document.getElementById('sale-product-stock-display').textContent = '';

  updateSaleCalculation();
  hideSaleModalError();
  document.getElementById('sale-modal').classList.add('visible');
}

function closeSaleModal() {
  document.getElementById('sale-modal').classList.remove('visible');
  currentEditSaleId = null;
}

function showSaleModalError(msg) {
  var el = document.getElementById('sale-modal-error');
  el.textContent = msg;
  el.classList.add('visible');
}

function hideSaleModalError() {
  document.getElementById('sale-modal-error').classList.remove('visible');
}

// Event listeners para el modal de ventas
// (sale-product-select se conecta via initCustomSelect en populateSaleProductSelect)
document.getElementById('sale-quantity').addEventListener('input', function () {
  var productId = document.getElementById('sale-product-select').value;
  var product = allProducts.find(function (p) { return p.id === productId; });
  var qty = parseInt(this.value) || 0;

  if (product && !currentEditSaleId && qty > (product.stock || 0)) {
    this.style.borderColor = 'var(--admin-danger)';
    var parent = this.parentElement;
    var err = parent.querySelector('.field-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field-error';
      parent.appendChild(err);
    }
    err.textContent = 'Solo hay ' + (product.stock || 0) + ' unidades disponibles.';
  } else {
    this.style.borderColor = '';
    var parent2 = this.parentElement;
    var err2 = parent2.querySelector('.field-error');
    if (err2) err2.remove();
  }

  updateSaleCalculation();
});
document.getElementById('sale-unit-price').addEventListener('input', updateSaleCalculation);
document.getElementById('sale-discount-percentage').addEventListener('input', updateSaleCalculation);

document.getElementById('sale-has-discount').addEventListener('change', function () {
  var fields = document.getElementById('sale-discount-fields');
  fields.style.display = this.checked ? 'block' : 'none';
  if (this.checked) {
    populateDiscountTypeSelect('');
  } else {
    setCustomSelectValue('sale-discount-type-wrapper', '');
    document.getElementById('sale-discount-percentage').value = '';
  }
  updateSaleCalculation();
});

// Filtros de ventas — se conectan via date pickers en INICIALIZACIÓN
document.getElementById('sales-filter-clear').addEventListener('click', function () {
  if (salesDatePicker) salesDatePicker.setValue('');
  renderSalesTable();
});

document.getElementById('btn-new-sale').addEventListener('click', openCreateSaleModal);
document.getElementById('btn-cancel-sale-modal').addEventListener('click', closeSaleModal);
document.getElementById('sale-modal').addEventListener('click', function (e) {
  if (e.target === this) closeSaleModal();
});

// ============================================================================
// VENTAS — Submit (crear / editar)
// ============================================================================
document.getElementById('sale-form').addEventListener('submit', function (e) {
  e.preventDefault();
  hideSaleModalError();

  var isEdit = !!currentEditSaleId;
  var productId = document.getElementById('sale-product-select').value;
  var quantity = parseInt(document.getElementById('sale-quantity').value) || 0;
  var unitPrice = parseFloat(document.getElementById('sale-unit-price').value) || 0;
  var hasDiscount = document.getElementById('sale-has-discount').checked;
  var discountTypeName = '';
  if (hasDiscount) {
    var dtWrapper = document.getElementById('sale-discount-type-wrapper');
    var dtSelected = dtWrapper.querySelector('.custom-select-option.selected');
    if (dtSelected && dtSelected.getAttribute('data-value')) {
      discountTypeName = dtSelected.textContent;
    }
  }
  var discountPercentage = hasDiscount ? (parseFloat(document.getElementById('sale-discount-percentage').value) || 0) : 0;
  var saleDate = saleDatePicker ? saleDatePicker.getValue() : '';

  // Validaciones
  if (!productId) { showSaleModalError('Selecciona un producto.'); return; }
  if (quantity < 1) { showSaleModalError('La cantidad debe ser al menos 1.'); return; }
  if (unitPrice <= 0) { showSaleModalError('El precio unitario debe ser mayor a 0.'); return; }
  if (!saleDate) { showSaleModalError('Selecciona la fecha de venta.'); return; }

  // Validar stock (solo al crear)
  if (!isEdit) {
    var product = allProducts.find(function (p) { return p.id === productId; });
    if (product && quantity > (product.stock || 0)) {
      showSaleModalError('Stock insuficiente. Solo hay ' + (product.stock || 0) + ' unidades disponibles.');
      return;
    }
  }

  if (hasDiscount && discountPercentage <= 0) {
    showSaleModalError('Si aplica descuento, el porcentaje debe ser mayor a 0.'); return;
  }

  var subtotal = unitPrice * quantity;
  var total = subtotal - (subtotal * discountPercentage / 100);

  var productName = '';
  var prod = allProducts.find(function (p) { return p.id === productId; });
  if (prod) {
    productName = prod.name;
  } else {
    var selOpt = document.querySelector('#sale-product-options .custom-select-option.selected');
    productName = selOpt ? selOpt.textContent : '';
  }

  var saleData = {
    productId: productId,
    productName: productName,
    quantity: quantity,
    unitPrice: unitPrice,
    hasDiscount: hasDiscount,
    discountType: hasDiscount ? discountTypeName : null,
    discountPercentage: discountPercentage,
    subtotal: parseFloat(subtotal.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    saleDate: saleDate,
  };

  // Confirmación antes de guardar
  var confirmMsg = isEdit
    ? '¿Está seguro de guardar los cambios en esta venta?'
    : '¿Está seguro de registrar esta venta?\n\n' +
      productName + ' x' + quantity + '\n' +
      'Total: ' + formatLempiras(total);

  showConfirm(
    isEdit ? '¿Guardar cambios?' : '¿Registrar venta?',
    confirmMsg,
    async function () {
      var submitBtn = document.getElementById('btn-submit-sale');
      submitBtn.disabled = true;
      submitBtn.textContent = isEdit ? 'Guardando...' : 'Registrando...';

      try {
        var url = isEdit ? API_URL + '/sales/' + currentEditSaleId : API_URL + '/sales';
        var method = isEdit ? 'PUT' : 'POST';
        var response = await authFetch(url, {
          method: method,
          body: JSON.stringify(saleData),
        });

        if (!response) return;

        if (response.ok) {
          showToast(isEdit ? 'Venta actualizada correctamente.' : 'Venta registrada correctamente.');
          closeSaleModal();
          await loadProducts();
          await loadSales();
        } else {
          var data = await response.json().catch(function () { return {}; });
          showSaleModalError(data.message || 'No se pudo guardar la venta.');
        }
      } catch (error) {
        showSaleModalError('Ocurrió un error inesperado.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'Guardar cambios' : 'Registrar';
      }
    }
  );
});

// ============================================================================
// VENTAS — Eliminar
// ============================================================================
function deleteSale(id) {
  var sale = allSales.find(function (s) { return s.id === id; });
  var saleName = sale ? sale.productName : 'esta venta';

  showConfirm(
    '¿Eliminar venta?',
    'Se eliminará la venta de "' + escapeHtml(saleName) + '" y se devolverá el stock al producto.',
    async function () {
      var response = await authFetch(API_URL + '/sales/' + id, { method: 'DELETE' });
      if (!response) return;
      if (response.ok) {
        showToast('Venta eliminada. Stock devuelto.');
        await loadProducts();
        await loadSales();
      } else {
        var data = await response.json().catch(function () { return {}; });
        showToast(data.message || 'No se pudo eliminar la venta.', 'error');
      }
    }
  );
}

// ============================================================================
// VENTA RÁPIDA
// ============================================================================
var quickSaleCart = [];

function openQuickSaleModal() {
  quickSaleCart = [];

  // Poblar selector de productos con stock disponible
  var options = allProducts
    .filter(function (p) { return !p.isDeleted && (p.stock || 0) > 0; })
    .map(function (p) {
      return { value: p.id, label: p.name + ' — L ' + Number(p.price).toFixed(2) + ' (Stock: ' + (p.stock || 0) + ')' };
    });
  populateDynamicSelect('qs-product-wrapper', options, 'Buscar producto...');

  // Fecha por defecto: hoy
  if (qsDatePicker) {
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    qsDatePicker.setValue(todayStr);
  }

  document.getElementById('qs-notes').value = '';
  hideQuickSaleError();
  renderQuickSaleCart();
  document.getElementById('quick-sale-modal').classList.add('visible');
}

function closeQuickSaleModal() {
  document.getElementById('quick-sale-modal').classList.remove('visible');
  quickSaleCart = [];
}

function showQuickSaleError(msg) {
  var el = document.getElementById('quick-sale-modal-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideQuickSaleError() {
  var el = document.getElementById('quick-sale-modal-error');
  el.textContent = '';
  el.style.display = 'none';
}

function addProductToQuickSale() {
  var productId = document.getElementById('qs-product-select').value;
  if (!productId) {
    showQuickSaleError('Selecciona un producto para agregar.');
    return;
  }

  // Si ya está en el carrito, incrementar cantidad
  var existing = quickSaleCart.find(function (item) { return item.productId === productId; });
  if (existing) {
    if (existing.quantity < existing.maxStock) {
      existing.quantity++;
      hideQuickSaleError();
      renderQuickSaleCart();
    } else {
      showQuickSaleError('Ya agregaste el máximo de stock disponible para ese producto.');
    }
    return;
  }

  var product = allProducts.find(function (p) { return p.id === productId; });
  if (!product) return;

  var promo = getProductActivePromotion(product);
  var item = {
    productId: product.id,
    productName: product.name,
    imageUrl: product.imageUrl || '',
    unitPrice: Number(product.price),
    quantity: 1,
    maxStock: product.stock || 0,
    hasDiscount: !!promo,
    discountType: promo ? promo.name : '',
    discountPercentage: promo ? Number(promo.discountPercentage || 0) : 0
  };

  quickSaleCart.push(item);
  hideQuickSaleError();
  renderQuickSaleCart();

  // Reset selector
  var hiddenInput = document.getElementById('qs-product-select');
  hiddenInput.value = '';
  var trigger = document.getElementById('qs-product-trigger');
  if (trigger) trigger.textContent = 'Buscar producto...';
}

function removeFromQuickSale(productId) {
  quickSaleCart = quickSaleCart.filter(function (item) { return item.productId !== productId; });
  renderQuickSaleCart();
}

function updateQuickSaleQty(productId, newQty) {
  var item = quickSaleCart.find(function (i) { return i.productId === productId; });
  if (!item) return;
  newQty = Math.max(1, Math.min(newQty, item.maxStock));
  item.quantity = newQty;
  renderQuickSaleCart();
}

function getItemSubtotal(item) {
  var subtotal = item.unitPrice * item.quantity;
  if (item.hasDiscount && item.discountPercentage > 0) {
    return subtotal - (subtotal * item.discountPercentage / 100);
  }
  return subtotal;
}

function renderQuickSaleCart() {
  var cartEl = document.getElementById('qs-cart');
  var totalEl = document.getElementById('qs-grand-total');
  var submitBtn = document.getElementById('qs-submit');

  if (quickSaleCart.length === 0) {
    cartEl.innerHTML = '<div class="qs-cart-empty">Agrega productos para iniciar la venta</div>';
    totalEl.style.display = 'none';
    submitBtn.disabled = true;
    return;
  }

  var grandTotal = 0;
  var html = '';

  quickSaleCart.forEach(function (item) {
    var lineTotal = getItemSubtotal(item);
    grandTotal += lineTotal;

    var imgHtml = item.imageUrl
      ? '<img class="qs-cart-item-img" src="' + escapeHtml(item.imageUrl) + '" alt="' + escapeHtml(item.productName) + '"/>'
      : '<div class="qs-cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--admin-text-light)">Sin img</div>';

    var discountHtml = '';
    if (item.hasDiscount && item.discountPercentage > 0) {
      discountHtml = '<span class="qs-cart-item-discount">' + escapeHtml(item.discountType) + ' -' + item.discountPercentage + '%</span>';
    }

    html += '<div class="qs-cart-item" data-product-id="' + item.productId + '">' +
      imgHtml +
      '<div class="qs-cart-item-info">' +
        '<strong>' + escapeHtml(item.productName) + '</strong>' +
        '<span>L ' + item.unitPrice.toFixed(2) + ' | Stock: ' + item.maxStock + '</span>' +
        discountHtml +
      '</div>' +
      '<div class="qs-cart-item-qty">' +
        '<button type="button" class="qs-qty-btn" data-action="dec" data-id="' + item.productId + '">−</button>' +
        '<input type="number" class="qs-qty-input" value="' + item.quantity + '" min="1" max="' + item.maxStock + '" data-id="' + item.productId + '"/>' +
        '<button type="button" class="qs-qty-btn" data-action="inc" data-id="' + item.productId + '">+</button>' +
      '</div>' +
      '<div class="qs-cart-item-subtotal">L ' + lineTotal.toFixed(2) + '</div>' +
      '<button type="button" class="qs-cart-item-remove" data-id="' + item.productId + '" title="Quitar">&times;</button>' +
    '</div>';
  });

  cartEl.innerHTML = html;
  document.getElementById('qs-grand-total-value').textContent = 'L ' + grandTotal.toFixed(2);
  totalEl.style.display = 'flex';
  submitBtn.disabled = false;
}

// Delegación de eventos en el carrito
document.getElementById('qs-cart').addEventListener('click', function (e) {
  var target = e.target;

  // Botones +/-
  if (target.classList.contains('qs-qty-btn')) {
    var id = target.getAttribute('data-id');
    var action = target.getAttribute('data-action');
    var item = quickSaleCart.find(function (i) { return i.productId === id; });
    if (!item) return;
    if (action === 'inc') {
      updateQuickSaleQty(id, item.quantity + 1);
    } else {
      updateQuickSaleQty(id, item.quantity - 1);
    }
    return;
  }

  // Botón quitar
  if (target.classList.contains('qs-cart-item-remove')) {
    removeFromQuickSale(target.getAttribute('data-id'));
    return;
  }
});

document.getElementById('qs-cart').addEventListener('change', function (e) {
  if (e.target.classList.contains('qs-qty-input')) {
    var id = e.target.getAttribute('data-id');
    updateQuickSaleQty(id, parseInt(e.target.value) || 1);
  }
});

function submitQuickSale() {
  hideQuickSaleError();

  if (quickSaleCart.length === 0) {
    showQuickSaleError('Agrega al menos un producto.');
    return;
  }

  var saleDate = qsDatePicker ? qsDatePicker.getValue() : '';
  if (!saleDate) {
    showQuickSaleError('Selecciona la fecha de venta.');
    return;
  }

  var notes = document.getElementById('qs-notes').value.trim();

  // Calcular total para la confirmación
  var grandTotal = 0;
  var summaryLines = [];
  quickSaleCart.forEach(function (item) {
    var lineTotal = getItemSubtotal(item);
    grandTotal += lineTotal;
    summaryLines.push(item.productName + ' x' + item.quantity + ' = L ' + lineTotal.toFixed(2));
  });

  var confirmMsg = summaryLines.join('\n') + '\n\nTotal: L ' + grandTotal.toFixed(2);

  showConfirm(
    '¿Registrar venta?',
    confirmMsg,
    async function () {
      var submitBtn = document.getElementById('qs-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registrando...';

      try {
        var promises = quickSaleCart.map(function (item) {
          var subtotal = item.unitPrice * item.quantity;
          var total = getItemSubtotal(item);

          var saleData = {
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            hasDiscount: item.hasDiscount,
            discountType: item.hasDiscount ? item.discountType : null,
            discountPercentage: item.discountPercentage,
            subtotal: parseFloat(subtotal.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            saleDate: saleDate,
          };

          return authFetch(API_URL + '/sales', {
            method: 'POST',
            body: JSON.stringify(saleData),
          }).then(function (response) {
            if (!response || !response.ok) {
              return { success: false, product: item.productName };
            }
            return { success: true, product: item.productName };
          });
        });

        var results = await Promise.all(promises);
        var failed = results.filter(function (r) { return !r.success; });

        if (failed.length === 0) {
          var msg = quickSaleCart.length === 1
            ? 'Venta registrada correctamente.'
            : quickSaleCart.length + ' ventas registradas correctamente.';
          showToast(msg);
          closeQuickSaleModal();
          await loadProducts();
          await loadSales();
        } else {
          var failedNames = failed.map(function (f) { return f.product; }).join(', ');
          showQuickSaleError('Error al registrar: ' + failedNames + '. Las demás se registraron correctamente.');
          await loadProducts();
          await loadSales();
        }
      } catch (error) {
        showQuickSaleError('Ocurrió un error inesperado.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Registrar venta';
      }
    }
  );
}

// Event listeners
document.getElementById('fab-quick-sale').addEventListener('click', openQuickSaleModal);
document.getElementById('qs-add-product').addEventListener('click', addProductToQuickSale);
document.getElementById('qs-cancel').addEventListener('click', closeQuickSaleModal);
document.getElementById('qs-submit').addEventListener('click', submitQuickSale);
document.getElementById('quick-sale-modal').addEventListener('click', function (e) {
  if (e.target === this) closeQuickSaleModal();
});

// ============================================================================
// LOGOUT
// ============================================================================
document.getElementById('btn-logout').addEventListener('click', function () {
  showConfirm(
    '¿Cerrar sesión?',
    'Se cerrará tu sesión actual.',
    async function () {
      try {
        await authFetch(`${API_URL}/auth/logout`, { method: 'POST' });
      } catch (e) {
        // Si falla el logout en el servidor, limpiar local de todas formas
      }
      sessionStorage.clear();
      redirectToLogin();
    }
  );
});

// ============================================================================
// DATE PICKERS — Inicialización
// ============================================================================
var dashboardStartPicker = createDatePicker('dashboard-start-picker', renderDashboardCharts);
var dashboardEndPicker = createDatePicker('dashboard-end-picker', renderDashboardCharts);

var salesDatePicker = createDatePicker('sales-date-picker', function () {
  renderSalesTable();
});

var promoStartPicker = createDatePicker('promo-start-picker');
var promoEndPicker = createDatePicker('promo-end-picker');
var saleDatePicker = createDatePicker('sale-date-picker');
var qsDatePicker = createDatePicker('qs-date-picker');

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
loadProducts();
loadAllPromotions();
loadSales();

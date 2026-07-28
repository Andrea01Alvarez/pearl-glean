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
  const options = wrapper.querySelectorAll('.custom-select-option');
  const hiddenInput = wrapper.querySelector('input[type="hidden"]');

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    // Cerrar otros selects abiertos
    document.querySelectorAll('.custom-select.open').forEach(function (el) {
      if (el !== wrapper) el.classList.remove('open');
    });
    wrapper.classList.toggle('open');
  });

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
// LOGOUT
// ============================================================================
document.getElementById('btn-logout').addEventListener('click', async function () {
  try {
    await authFetch(`${API_URL}/auth/logout`, { method: 'POST' });
  } catch (e) {
    // Si falla el logout en el servidor, limpiar local de todas formas
  }
  sessionStorage.clear();
  redirectToLogin();
});

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
loadProducts();

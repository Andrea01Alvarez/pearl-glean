/**
 * Pearl Glean - Aplicación de Catálogo de Joyería
 * Frontend JavaScript - Gestión de productos y UI
 */

'use strict';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const CONFIG = {
  API_BASE_URL: 'http://localhost:3300/api',
  BACKEND_URL: 'http://localhost:3300',
  API_TIMEOUT: 10000,
  WHATSAPP_NUMBER: '50496310509',
};

// ============================================================================
// ESTADO DE LA APLICACIÓN
// ============================================================================
const AppState = {
  products: [],
  currentFilter: 'todos',
  isLoading: false,
  isModalOpen: false,
};

// ============================================================================
// ELEMENTOS DEL DOM
// ============================================================================
const DOM = {
  productsGrid: document.getElementById('products-grid'),
  filterBtns: document.querySelectorAll('.filter-btn'),
  detailModal: document.getElementById('detail-modal'),
  modalClose: document.querySelector('.modal-close'),
  modalCloseBtn: document.querySelector('.modal-close-btn'),
};

// Validar que los elementos del DOM existan
function validateDOM() {
  const required = ['productsGrid', 'detailModal'];
  const missing = required.filter((key) => !DOM[key]);

  if (missing.length > 0) {
    console.error('Elementos del DOM faltantes:', missing);
    return false;
  }
  return true;
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (!validateDOM()) {
    showError('Error de configuración del DOM');
    return;
  }

  setupEventListeners();
  fetchProducts();
});

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
  // Filtros
  DOM.filterBtns.forEach((btn) => {
    btn.addEventListener('click', handleFilterClick);
  });

  // Modal
  DOM.modalClose?.addEventListener('click', closeModal);
  DOM.modalCloseBtn?.addEventListener('click', closeModal);
  DOM.detailModal?.addEventListener('click', handleModalBackdropClick);

  // Teclado - cerrar modal con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && AppState.isModalOpen) {
      closeModal();
    }
  });
}

function handleFilterClick(e) {
  e.preventDefault();
  const filter = e.target.dataset.filter;
  if (filter) {
    setFilter(filter);
  }
}

function handleModalBackdropClick(e) {
  if (e.target === DOM.detailModal) {
    closeModal();
  }
}

// ============================================================================
// FETCH DE DATOS
// ============================================================================
async function fetchProducts() {
  AppState.isLoading = true;
  showLoadingState();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

    const response = await fetch(`${CONFIG.API_BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Formato de respuesta inválido');
    }

    AppState.products = data;
    renderProducts();
  } catch (error) {
    handleFetchError(error);
  } finally {
    AppState.isLoading = false;
  }
}

function handleFetchError(error) {
  console.error('Error al cargar productos:', error);

  let message = 'Error al cargar los productos.';

  if (error.name === 'AbortError') {
    message = 'La solicitud tardó demasiado. Por favor, verifica la conexión.';
  } else if (error instanceof TypeError) {
   message = 'No se pudo conectar al servidor. ¿Está ejecutándose el backend en localhost:3300?';
  }

  showError(message);
}

function showLoadingState() {
  DOM.productsGrid.innerHTML =
    '<div class="skeleton">⏳ Cargando productos...</div>';
}

function showError(message) {
  DOM.productsGrid.innerHTML = `<div class="skeleton">❌ ${escapeHtml(message)}</div>`;
}

// ============================================================================
// FILTRADO Y RENDERIZADO
// ============================================================================
function setFilter(filter) {
  filter = filter.toLowerCase().trim();

  if (AppState.currentFilter === filter) {
    return;
  }

  AppState.currentFilter = filter;
  updateFilterButtons();
  renderProducts();
}

function updateFilterButtons() {
  DOM.filterBtns.forEach((btn) => {
    const isActive = btn.dataset.filter === AppState.currentFilter;
    btn.classList.toggle('active', isActive);
  });
}

function renderProducts() {
  const filtered = getFilteredProducts();

  if (filtered.length === 0) {
    const msg = AppState.currentFilter === 'ofertas'
      ? 'No hay ofertas activas en este momento.'
      : 'No hay productos en esta categoría.';
    DOM.productsGrid.innerHTML = `<div class="skeleton">${msg}</div>`;
    return;
  }

  DOM.productsGrid.innerHTML = filtered
    .map((product) => createProductCard(product))
    .join('');

  attachProductEventListeners();
}

function getFilteredProducts() {
  if (AppState.currentFilter === 'todos') {
    return AppState.products;
  }

  if (AppState.currentFilter === 'ofertas') {
    return AppState.products.filter((p) => getActivePromotion(p) !== null);
  }

  return AppState.products.filter(
    (p) => p.category && p.category.toLowerCase() === AppState.currentFilter
  );
}

function filterByAll(e) {
  e.preventDefault();
  setFilter('todos');
  document.getElementById('coleccion')?.scrollIntoView({ behavior: 'smooth' });
}

function filterByOffers(e) {
  e.preventDefault();
  setFilter('ofertas');
  document.getElementById('coleccion')?.scrollIntoView({ behavior: 'smooth' });
}

function attachProductEventListeners() {
  // Click en tarjeta
  document.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.product-footer a')) {
        const productId = card.dataset.productId;
        showProductDetail(productId);
      }
    });
  });

  // Click en "VER DETALLE"
  document.querySelectorAll('.product-footer a').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const productId = link.closest('.product-card')?.dataset.productId;
      if (productId) {
        showProductDetail(productId);
      }
    });
  });
}

// ============================================================================
// CREAR ELEMENTOS
// ============================================================================
function createProductCard(product) {
  // Validar datos del producto
  if (!product.id || !product.name || product.price === undefined) {
    console.warn('Producto inválido:', product);
    return '';
  }

  const category = (product.category || 'Sin categoría').toUpperCase();
  const description = escapeHtml(product.description || '');
  const name = escapeHtml(product.name);

  const imageHtml = product.imageUrl
    ? `<img src="${escapeHtml(resolveImageUrl(product.imageUrl))}" alt="${name}" loading="lazy" />`
    : `<span>FOTO<br/>${name}</span>`;

  // Promoción activa
  const promo = getActivePromotion(product);
  let priceHtml = '';
  let badgeHtml = '';

  let promoHtml = '';

  if (promo && promo.discountPercentage > 0) {
    const discounted = product.price * (1 - promo.discountPercentage / 100);
    priceHtml = `<span class="product-price-original">${formatLempiras(product.price)}</span>
                 <span class="product-price product-price-discount">${formatLempiras(discounted)}</span>`;
    badgeHtml = `<div class="product-badge">-${parseFloat(promo.discountPercentage)}%</div>`;
    promoHtml = `<div class="product-promo-name">${escapeHtml(promo.name)}</div>`;
  } else if (promo && promo.label) {
    priceHtml = `<span class="product-price">${formatLempiras(product.price)}</span>`;
    badgeHtml = `<div class="product-badge product-badge-promo">${escapeHtml(promo.label)}</div>`;
    promoHtml = `<div class="product-promo-name">${escapeHtml(promo.name)}</div>`;
  } else {
    priceHtml = `<span class="product-price">${formatLempiras(product.price)}</span>`;
  }

  return `
    <div class="product-card" data-product-id="${escapeHtml(product.id)}">
      <div class="product-image">
        ${badgeHtml}
        ${imageHtml}
      </div>
      <div class="product-info">
        <div class="product-category">${category}</div>
        <div class="product-name">${name}</div>
        <p class="product-description">${description}</p>
        ${promoHtml}
        <div class="product-footer">
          ${priceHtml}
          <a href="#">VER DETALLE</a>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// MODAL DE DETALLE
// ============================================================================
function showProductDetail(productId) {
  const product = AppState.products.find((p) => p.id === productId);

  if (!product) {
    console.warn('Producto no encontrado:', productId);
    return;
  }

  // Llenar modal
  const category = (product.category || 'Sin categoría').toUpperCase();
  const name = product.name || 'Producto sin nombre';
  const price = formatLempiras(product.price);
  const description = product.description || 'Sin descripción disponible';

  // Imagen del modal
  const modalImageContainer = document.querySelector('.modal-image');
  if (modalImageContainer) {
    if (product.imageUrl) {
      modalImageContainer.innerHTML = `<img src="${escapeHtml(resolveImageUrl(product.imageUrl))}" alt="${escapeHtml(name)}" />`;
    } else {
      modalImageContainer.innerHTML = `<span id="modal-image-placeholder">FOTO DEL PRODUCTO</span>`;
    }
  }

  document.getElementById('modal-category').textContent = category;
  document.getElementById('modal-name').textContent = name;
  document.getElementById('modal-description').textContent = description;

  // Precio con o sin descuento en el modal
  const modalPriceEl = document.getElementById('modal-price');
  const promo = getActivePromotion(product);
  // Mostrar nombre de la promoción
  const modalPromoEl = document.getElementById('modal-promo');
  if (modalPromoEl) {
    if (promo) {
      const promoText = promo.discountPercentage > 0
        ? `${escapeHtml(promo.name)} — ${parseFloat(promo.discountPercentage)}% de descuento`
        : promo.label ? `${escapeHtml(promo.name)} — ${escapeHtml(promo.label)}` : escapeHtml(promo.name);
      modalPromoEl.innerHTML = promoText;
      modalPromoEl.style.display = 'block';
    } else {
      modalPromoEl.innerHTML = '';
      modalPromoEl.style.display = 'none';
    }
  }

  if (promo && promo.discountPercentage > 0) {
    const discounted = product.price * (1 - promo.discountPercentage / 100);
    modalPriceEl.innerHTML = `<span class="modal-price-original">${price}</span> ${formatLempiras(discounted)}`;
  } else {
    modalPriceEl.textContent = price;
  }

  // Campos adicionales: material, dimensiones, stock
  const detailsContainer = document.getElementById('modal-details');
  if (detailsContainer) {
    const details = [];
    if (product.material) {
      details.push(`<div class="modal-detail-item"><span class="detail-label">Material</span><span class="detail-value">${escapeHtml(product.material)}</span></div>`);
    }
    if (product.dimensions) {
      details.push(`<div class="modal-detail-item"><span class="detail-label">Dimensiones</span><span class="detail-value">${escapeHtml(product.dimensions)}</span></div>`);
    }
    if (product.stock !== null && product.stock !== undefined) {
      const stockText = product.stock > 0 ? `${product.stock} disponible${product.stock > 1 ? 's' : ''}` : 'Agotado';
      details.push(`<div class="modal-detail-item"><span class="detail-label">Stock</span><span class="detail-value">${stockText}</span></div>`);
    }
    detailsContainer.innerHTML = details.length > 0 ? details.join('') : '';
  }

  const whatsappLink = document.getElementById('modal-whatsapp');
  if (whatsappLink) {
    whatsappLink.href = generateWhatsAppLink(product);
  }

  openModal();
}

function openModal() {
  DOM.detailModal?.classList.remove('hidden');
  AppState.isModalOpen = true;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  DOM.detailModal?.classList.add('hidden');
  AppState.isModalOpen = false;
  document.body.style.overflow = 'auto';
}

// ============================================================================
// WHATSAPP
// ============================================================================
function generateWhatsAppLink(product) {
  if (!product.name || product.price === undefined || product.price === null) {
    return '#';
  }

  const price = formatLempiras(product.price);
  const message = encodeURIComponent(
    `Hola, me interesa "${product.name}" (${price}). ¿Está disponible?`
  );

  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${message}`;
}

// ============================================================================
// PROMOCIONES
// ============================================================================
function getActivePromotion(product) {
  if (!product.promotions || product.promotions.length === 0) {
    return null;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Buscar la primera promoción activa y vigente
  return product.promotions.find((promo) => {
    if (!promo.isActive) return false;
    if (promo.startDate && new Date(promo.startDate) > now) return false;
    if (promo.endDate && new Date(promo.endDate) < now) return false;
    return true;
  }) || null;
}

// ============================================================================
// UTILIDADES
// ============================================================================
function formatLempiras(price) {
  const num = Number(price);
  if (isNaN(num) || num < 0) {
    return 'L 0.00';
  }

  return (
    'L ' +
    num.toLocaleString('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return '';
  // Si ya es una URL completa (Cloudinary, etc.), usarla tal cual
  if (imageUrl.startsWith('http')) return imageUrl;
  // Si es ruta relativa del backend (/uploads/...), agregar la URL del backend
  return CONFIG.BACKEND_URL + imageUrl;
}

function escapeHtml(text) {
  if (typeof text !== 'string') {
    return '';
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// ============================================================================
// LOGGING Y DEBUGGING
// ============================================================================
console.log('Pearl Glean - Frontend v1.0 inicializado');
console.log('API URL:', CONFIG.API_BASE_URL);

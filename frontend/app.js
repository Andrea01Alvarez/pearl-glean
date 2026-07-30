/**
 * Pearl Glean - SPA de Catálogo de Joyería
 * Frontend JavaScript con Router History API
 */

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

const CONFIG = {
  API_BASE_URL: `${BACKEND}/api`,
  BACKEND_URL: BACKEND,
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
};

// ============================================================================
// ROUTER — DEFINICIÓN DE RUTAS
// ============================================================================
const router = new Router();

router.add('/', viewHome);
router.add('/productos', viewProductos);
router.add('/ofertas', viewOfertas);
router.add('/contacto', viewContacto);
router.add('/producto/:id', viewProductoDetalle);

router.onNavigate = updateActiveNavLink;

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  await fetchProducts();
  router.init();
});

// ============================================================================
// VISTAS (ROUTE HANDLERS)
// ============================================================================
function viewHome() {
  const view = document.getElementById('app-view');
  view.innerHTML = getHeroHTML() + getCatalogHTML();
  AppState.currentFilter = 'todos';
  setupCatalogEvents();
  renderProducts();
  window.scrollTo(0, 0);
}

function viewProductos() {
  const view = document.getElementById('app-view');
  view.innerHTML = getCatalogHTML();
  AppState.currentFilter = 'todos';
  setupCatalogEvents();
  renderProducts();
  window.scrollTo(0, 0);
}

function viewOfertas() {
  const view = document.getElementById('app-view');
  view.innerHTML = getCatalogHTML('Ofertas', false, true);
  AppState.currentFilter = 'ofertas';
  renderProducts();
  window.scrollTo(0, 0);
}

function viewContacto() {
  const view = document.getElementById('app-view');
  view.innerHTML = getContactoHTML();
  window.scrollTo(0, 0);
}

async function viewProductoDetalle(params) {
  const view = document.getElementById('app-view');

  if (AppState.products.length === 0) {
    view.innerHTML = '<div class="skeleton">Cargando producto...</div>';
    await fetchProducts();
  }

  const product = AppState.products.find(
    (p) => String(p.id) === String(params.id),
  );

  if (!product) {
    view.innerHTML =
      '<div class="detail-not-found"><h2>Producto no encontrado</h2><a href="/productos" data-link class="btn btn-secondary">VER LA COLECCIÓN</a></div>';
    return;
  }

  view.innerHTML = getProductDetailHTML(product);
  window.scrollTo(0, 0);
}

// ============================================================================
// PLANTILLAS HTML
// ============================================================================
function getHeroHTML() {
  return `
    <section class="hero">
      <div class="hero-content">
        <span class="hero-label">JOYERÍA FINA · HONDURAS</span>
        <h1 class="hero-title">Piezas que se llevan como un legado.</h1>
        <p class="hero-text">
          Collares, aretes y pulseras diseñados. Precios claros en lempiras,
          entrega coordinada por WhatsApp.
        </p>
        <div class="hero-buttons">
          <a href="/productos" class="btn btn-primary" data-link>VER LA COLECCIÓN</a>
          <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}" target="_blank" class="btn btn-secondary">HABLAR POR WHATSAPP</a>
        </div>
      </div>
      <div class="hero-image">
        <img src="./images/imagen_principal.jpeg" alt="Joyería Pearl Glean" />
      </div>
    </section>`;
}

function getCatalogHTML(title = 'Colección', showFilters = true, showFilterTag = false) {
  const filtersHTML = showFilters
    ? `
      <div class="filters">
        <a href="#" class="filter-btn active" data-filter="todos">TODOS</a>
        <a href="#" class="filter-btn" data-filter="collar">COLLARES</a>
        <a href="#" class="filter-btn" data-filter="aretes">ARETES</a>
        <a href="#" class="filter-btn" data-filter="pulsera">PULSERAS</a>
      </div>`
    : '';

  const filterTagHTML = showFilterTag
    ? `<a href="/" data-link class="filter-tag">&larr; Volver al inicio</a>`
    : '';

  return `
    <section class="catalog">
      <div class="catalog-header">
        <h2>${title} ${filterTagHTML}</h2>
        ${filtersHTML}
      </div>
      <div id="products-grid" class="products-grid">
        <div class="skeleton">Cargando productos...</div>
      </div>
    </section>`;
}

function getContactoHTML() {
  return `
    <section class="contacto-page">
      <h2>Contacto</h2>
      <p class="contacto-text">
        ¿Tienes preguntas sobre nuestras piezas? Escríbenos directamente
        por WhatsApp o síguenos en redes sociales.
      </p>
      <div class="contacto-links">
        <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}" target="_blank" class="contacto-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
            <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5z"></path>
          </svg>
          <div>
            <div class="contacto-label">WHATSAPP</div>
            <div class="contacto-value">+504 9631-0509</div>
          </div>
        </a>
        <a href="https://instagram.com" target="_blank" class="contacto-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
            <rect x="3" y="3" width="18" height="18" rx="5"></rect>
            <circle cx="12" cy="12" r="4"></circle>
            <circle cx="17.5" cy="6.5" r="1"></circle>
          </svg>
          <div>
            <div class="contacto-label">INSTAGRAM</div>
            <div class="contacto-value">@pearlglean</div>
          </div>
        </a>
        <a href="https://facebook.com" target="_blank" class="contacto-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
            <path d="M14 9h3V6h-3c-2 0-3.5 1.5-3.5 3.5V12H8v3h2.5v6h3v-6H16l.5-3h-3V9.6c0-.4.4-.6.5-.6z"></path>
          </svg>
          <div>
            <div class="contacto-label">FACEBOOK</div>
            <div class="contacto-value">Pearl Glean</div>
          </div>
        </a>
      </div>
    </section>`;
}

function getProductDetailHTML(product) {
  const category = (product.category || 'Sin categoría').toUpperCase();
  const name = escapeHtml(product.name || 'Producto sin nombre');
  const description = escapeHtml(
    product.description || 'Sin descripción disponible',
  );
  const price = formatLempiras(product.price);

  const imageHTML = product.imageUrl
    ? `<img src="${escapeHtml(resolveImageUrl(product.imageUrl))}" alt="${name}" />`
    : '<span>FOTO DEL PRODUCTO</span>';

  const promo = getActivePromotion(product);

  let priceHTML = `<div class="detail-price">${price}</div>`;
  let promoHTML = '';

  if (promo && promo.discountPercentage > 0) {
    const discounted = product.price * (1 - promo.discountPercentage / 100);
    priceHTML = `<div class="detail-price">
      <span class="modal-price-original">${price}</span> <span class="price-discounted">${formatLempiras(discounted)}</span>
    </div>`;
    promoHTML = `<div class="modal-promo promo-green">${escapeHtml(promo.name)} — ${parseFloat(promo.discountPercentage)}% de descuento</div>`;
  } else if (promo && promo.label) {
    promoHTML = `<div class="modal-promo promo-green">${escapeHtml(promo.name)} — ${escapeHtml(promo.label)}</div>`;
  }

  const details = [];
  if (product.material) {
    details.push(
      `<div class="modal-detail-item"><span class="detail-label">Material</span><span class="detail-value">${escapeHtml(product.material)}</span></div>`,
    );
  }
  if (product.dimensions) {
    details.push(
      `<div class="modal-detail-item"><span class="detail-label">Dimensiones</span><span class="detail-value">${escapeHtml(product.dimensions)}</span></div>`,
    );
  }
  if (product.stock !== null && product.stock !== undefined) {
    const stockText =
      product.stock > 0
        ? `${product.stock} disponible${product.stock > 1 ? 's' : ''}`
        : 'Agotado';
    details.push(
      `<div class="modal-detail-item"><span class="detail-label">Stock</span><span class="detail-value">${stockText}</span></div>`,
    );
  }

  const detailsHTML =
    details.length > 0
      ? `<div class="modal-details">${details.join('')}</div>`
      : '';

  return `
    <section class="product-detail-view">
      <div class="detail-header">
        <a href="/" data-link class="detail-back">&larr; VOLVER AL INICIO</a>
      </div>
      <div class="detail-body">
        <div class="detail-image">${imageHTML}</div>
        <div class="detail-info">
          <div class="modal-category">${category}</div>
          <h1 class="modal-name">${name}</h1>
          ${promoHTML}
          ${priceHTML}
          <p class="modal-description">${description}</p>
          ${detailsHTML}
          <div class="modal-buttons">
            <a href="${generateWhatsAppLink(product)}" target="_blank" class="btn btn-primary">COMPRAR POR WHATSAPP</a>
            <a href="/productos" data-link class="btn btn-secondary">VER MÁS PIEZAS</a>
          </div>
        </div>
      </div>
    </section>`;
}

// ============================================================================
// NAVEGACIÓN ACTIVA
// ============================================================================
function updateActiveNavLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.navbar .nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    const isActive =
      href === path || (href !== '/' && path.startsWith(href));
    link.classList.toggle('active', isActive);
  });
}

// ============================================================================
// EVENTOS DEL CATÁLOGO
// ============================================================================
function setupCatalogEvents() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', handleFilterClick);
  });
}

function handleFilterClick(e) {
  e.preventDefault();
  const filter = e.target.dataset.filter;
  if (filter) {
    setFilter(filter);
  }
}

// ============================================================================
// FETCH DE DATOS
// ============================================================================
async function fetchProducts() {
  AppState.isLoading = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

    const response = await fetch(`${CONFIG.API_BASE_URL}/products`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  } catch (error) {
    console.error('Error al cargar productos:', error);

    let message = 'Error al cargar los productos.';
    if (error.name === 'AbortError') {
      message =
        'La solicitud tardó demasiado. Por favor, verifica la conexión.';
    } else if (error instanceof TypeError) {
      message =
        'No se pudo conectar al servidor. ¿Está ejecutándose el backend en localhost:3300?';
    }

    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `<div class="skeleton">${escapeHtml(message)}</div>`;
    }
  } finally {
    AppState.isLoading = false;
  }
}

// ============================================================================
// FILTRADO Y RENDERIZADO
// ============================================================================
function setFilter(filter) {
  filter = filter.toLowerCase().trim();
  if (AppState.currentFilter === filter) return;

  AppState.currentFilter = filter;
  updateFilterButtons();
  renderProducts();
}

function updateFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    const isActive = btn.dataset.filter === AppState.currentFilter;
    btn.classList.toggle('active', isActive);
  });
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const filtered = getFilteredProducts();

  if (filtered.length === 0) {
    const msg =
      AppState.currentFilter === 'ofertas'
        ? 'No hay ofertas activas en este momento.'
        : 'No hay productos en esta categoría.';
    grid.innerHTML = `<div class="skeleton">${msg}</div>`;
    return;
  }

  grid.innerHTML = filtered.map((p) => createProductCard(p)).join('');
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
    (p) => p.category && p.category.toLowerCase() === AppState.currentFilter,
  );
}

function attachProductEventListeners() {
  document.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.product-footer a')) {
        const productId = card.dataset.productId;
        router.navigate(`/producto/${productId}`);
      }
    });
  });

  document.querySelectorAll('.product-footer a').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const productId = link.closest('.product-card')?.dataset.productId;
      if (productId) {
        router.navigate(`/producto/${productId}`);
      }
    });
  });
}

// ============================================================================
// CREAR TARJETA DE PRODUCTO
// ============================================================================
function createProductCard(product) {
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
          <a href="/producto/${escapeHtml(product.id)}" data-link>VER DETALLE</a>
        </div>
      </div>
    </div>
  `;
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

  return (
    product.promotions.find((promo) => {
      if (!promo.isActive) return false;
      if (promo.startDate && new Date(promo.startDate) > now) return false;
      if (promo.endDate && new Date(promo.endDate) < now) return false;
      return true;
    }) || null
  );
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
    `Hola, me interesa "${product.name}" (${price}). ¿Está disponible?`,
  );

  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${message}`;
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
  if (imageUrl.startsWith('http')) return imageUrl;
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
// LOGGING
// ============================================================================
console.log('Pearl Glean - SPA v2.0 inicializado');
console.log('API URL:', CONFIG.API_BASE_URL);

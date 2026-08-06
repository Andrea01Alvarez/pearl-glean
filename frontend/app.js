/**
 * Pearl Glean - SPA de Catálogo de Joyería
 * Frontend JavaScript con Router History API
 */

'use strict';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const BACKEND = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL)
  ? BACKEND_URL
  : '';

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
router.add('/catalogo', viewHome);
router.add('/productos', viewProductos);
router.add('/ofertas', viewOfertas);
router.add('/contacto', viewContacto);
router.add('/producto/:id', viewProductoDetalle);

router.onNavigate = updateActiveNavLink;

// ============================================================================
// TEMA — Oscuro / Claro
// ============================================================================
(function initTheme() {
  const saved = localStorage.getItem('pearl-theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  if (isLight) {
    html.removeAttribute('data-theme');
    localStorage.setItem('pearl-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
    localStorage.setItem('pearl-theme', 'light');
  }
}

// ============================================================================
// CARRITO — localStorage guest cart
// ============================================================================
const Cart = {
  items: [],

  load() {
    try {
      this.items = JSON.parse(localStorage.getItem('pearl-cart') || '[]');
    } catch (e) {
      this.items = [];
    }
  },

  save() {
    localStorage.setItem('pearl-cart', JSON.stringify(this.items));
  },

  add(productId, quantity) {
    quantity = quantity || 1;
    const product = AppState.products.find((p) => p.id === productId);
    if (!product) return;

    const maxStock = product.stock || 0;
    const promo = getActivePromotion(product);
    const finalPrice =
      promo && promo.discountPercentage > 0
        ? product.price * (1 - promo.discountPercentage / 100)
        : product.price;

    const existing = this.items.find((i) => i.id === productId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, maxStock);
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        finalPrice: finalPrice,
        imageUrl: product.imageUrl || '',
        quantity: Math.min(quantity, maxStock),
        maxStock: maxStock,
      });
    }
    this.save();
    this.updateBadge();
    showAddedToCartToast(product.name);
  },

  remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    this.save();
    this.updateBadge();
    renderCartPanel();
  },

  changeQty(id, delta) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.remove(id);
      return;
    }
    const maxStock = item.maxStock || Infinity;
    item.quantity = Math.min(newQty, maxStock);
    this.save();
    this.updateBadge();
    renderCartPanel();
  },

  clear() {
    this.items = [];
    this.save();
    this.updateBadge();
    renderCartPanel();
  },

  getTotal() {
    return this.items.reduce((s, i) => s + i.finalPrice * i.quantity, 0);
  },

  getCount() {
    return this.items.reduce((s, i) => s + i.quantity, 0);
  },

  updateBadge() {
    const count = this.getCount();
    const badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
    const fabBadge = document.getElementById('cart-fab-badge');
    if (fabBadge) {
      fabBadge.textContent = count;
      fabBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  whatsappLink() {
    let msg = '¡Hola! Me gustaría hacer un pedido:\n\n';
    this.items.forEach((item) => {
      const subtotal = formatLempiras(item.finalPrice * item.quantity);
      msg += '• ' + item.quantity + 'x ' + item.name;
      if (item.finalPrice !== item.price) {
        msg += ' (con descuento)';
      }
      msg += ' — ' + subtotal + '\n';
    });
    msg += '\n*Total: ' + formatLempiras(this.getTotal()) + '*';
    return 'https://wa.me/' + CONFIG.WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
  },
};

// ============================================================================
// MODAL DE CANTIDAD — "Agregar al carrito"
// ============================================================================
// Cantidad actual del stepper
let _qtyModalValue = 1;
let _qtyModalMax = 1;

function _setStepperVal(val) {
  _qtyModalValue = Math.min(Math.max(1, val), _qtyModalMax);
  document.getElementById('qty-stepper-val').textContent = _qtyModalValue;
  document.getElementById('qty-stepper-minus').disabled = _qtyModalValue <= 1;
  document.getElementById('qty-stepper-plus').disabled = _qtyModalValue >= _qtyModalMax;
  document.getElementById('qty-modal-confirm').disabled = _qtyModalMax === 0;
}

function openQtyModal(productId) {
  const product = AppState.products.find((p) => p.id === productId);
  if (!product) return;

  const maxStock = product.stock || 0;
  const existing = Cart.items.find((i) => i.id === productId);
  const inCart = existing ? existing.quantity : 0;
  const available = Math.max(0, maxStock - inCart);

  const modal = document.getElementById('qty-modal');
  const nameEl = document.getElementById('qty-modal-product-name');
  const stockEl = document.getElementById('qty-modal-stock');
  const errorEl = document.getElementById('qty-modal-error');

  nameEl.textContent = product.name;

  let stockMsg = 'Stock disponible: ' + maxStock + ' unidad' + (maxStock !== 1 ? 'es' : '');
  if (inCart > 0) stockMsg += ' · Ya tienes ' + inCart + ' en el carrito';
  if (available === 0 && maxStock > 0) stockMsg = 'Ya tienes todas las unidades en el carrito (' + maxStock + ')';
  else if (maxStock === 0) stockMsg = 'Sin stock disponible';
  stockEl.textContent = stockMsg;

  errorEl.textContent = '';
  errorEl.style.display = 'none';

  _qtyModalMax = available;
  _setStepperVal(available > 0 ? 1 : 0);

  modal.dataset.productId = productId;
  modal.classList.add('visible');
}

function closeQtyModal() {
  document.getElementById('qty-modal').classList.remove('visible');
}

function initQtyModal() {
  const modal = document.getElementById('qty-modal');
  const errorEl = document.getElementById('qty-modal-error');

  document.getElementById('qty-stepper-minus').addEventListener('click', () => _setStepperVal(_qtyModalValue - 1));
  document.getElementById('qty-stepper-plus').addEventListener('click', () => _setStepperVal(_qtyModalValue + 1));

  document.getElementById('qty-modal-confirm').addEventListener('click', () => {
    const productId = modal.dataset.productId;
    if (_qtyModalValue < 1 || _qtyModalMax === 0) {
      errorEl.textContent = 'No hay unidades disponibles.';
      errorEl.style.display = 'block';
      return;
    }
    closeQtyModal();
    Cart.add(productId, _qtyModalValue);
  });

  document.getElementById('qty-modal-cancel').addEventListener('click', closeQtyModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeQtyModal(); });
}

function showAddedToCartToast(name) {
  const t = document.createElement('div');
  t.className = 'cart-toast';
  t.textContent = '"' + name + '" agregado al carrito';
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

function renderCartPanel() {
  const itemsEl = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');
  const totalEl = document.getElementById('cart-total');
  const waBtn = document.getElementById('cart-whatsapp');
  if (!itemsEl) return;

  if (Cart.items.length === 0) {
    itemsEl.innerHTML = '<div class="cart-empty">Tu carrito está vacío.<br/>Agrega productos desde el catálogo.</div>';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = Cart.items.map((item) => {
    const imgTag = item.imageUrl
      ? '<img src="' + escapeHtml(item.imageUrl) + '" alt="' + escapeHtml(item.name) + '" />'
      : '<div class="cart-item-no-img"></div>';
    const showOriginal = item.finalPrice !== item.price;
    const priceHTML = showOriginal
      ? '<span class="cart-item-original">' + formatLempiras(item.price) + '</span> ' +
        '<span class="cart-item-price">' + formatLempiras(item.finalPrice) + '</span>'
      : '<span class="cart-item-price">' + formatLempiras(item.finalPrice) + '</span>';

    return '<div class="cart-item" data-id="' + escapeHtml(item.id) + '">' +
      '<div class="cart-item-img">' + imgTag + '</div>' +
      '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + escapeHtml(item.name) + '</div>' +
        '<div class="cart-item-prices">' + priceHTML + '</div>' +
        '<div class="cart-item-controls">' +
          '<button class="cart-qty-btn" data-action="minus" data-id="' + escapeHtml(item.id) + '">−</button>' +
          '<span class="cart-qty">' + item.quantity + '</span>' +
          '<button class="cart-qty-btn" data-action="plus" data-id="' + escapeHtml(item.id) + '">+</button>' +
          '<button class="cart-remove-btn" data-id="' + escapeHtml(item.id) + '" aria-label="Eliminar">×</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  if (totalEl) totalEl.textContent = formatLempiras(Cart.getTotal());
  if (waBtn) waBtn.href = Cart.whatsappLink();
  if (footerEl) footerEl.style.display = 'block';
}

function openCart() {
  renderCartPanel();
  document.getElementById('cart-panel').classList.add('open');
  document.getElementById('cart-overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-panel').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('visible');
  document.body.style.overflow = '';
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Carrito
  Cart.load();
  Cart.updateBadge();
  initQtyModal();

  document.getElementById('cart-btn').addEventListener('click', openCart);
  document.getElementById('cart-fab').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);
  document.getElementById('cart-clear').addEventListener('click', () => Cart.clear());

  // Delegación de eventos del panel (qty + remove)
  document.getElementById('cart-items').addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('.cart-qty-btn');
    const removeBtn = e.target.closest('.cart-remove-btn');
    if (qtyBtn) {
      const id = qtyBtn.getAttribute('data-id');
      const action = qtyBtn.getAttribute('data-action');
      Cart.changeQty(id, action === 'plus' ? 1 : -1);
    }
    if (removeBtn) {
      Cart.remove(removeBtn.getAttribute('data-id'));
    }
  });

  // Delegación de eventos del catálogo: botón "Agregar al carrito"
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.btn-add-cart');
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      openQtyModal(addBtn.getAttribute('data-id'));
    }
  });

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
  view.innerHTML = getCatalogHTML('Colección', true, true);
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
  initCarousel();
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
    ? `<a href="/catalogo" data-link class="filter-tag">&larr; Volver al inicio</a>`
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

function initCardCarousels() {
  document.querySelectorAll('.card-carousel').forEach((carousel) => {
    if (carousel._initialized) return;
    carousel._initialized = true;

    const slides = carousel.querySelectorAll('.card-slide');
    const dots = carousel.querySelectorAll('.card-dot');
    let current = 0;
    let timer = null;

    function goTo(index) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    function startAuto() {
      timer = setInterval(() => goTo(current + 1), 3000);
    }

    function stopAuto() {
      clearInterval(timer);
    }

    carousel.querySelector('.card-carousel-prev').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopAuto();
      goTo(current - 1);
      startAuto();
    });

    carousel.querySelector('.card-carousel-next').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopAuto();
      goTo(current + 1);
      startAuto();
    });

    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopAuto();
        goTo(Number(dot.getAttribute('data-index')));
        startAuto();
      });
    });

    // Swipe táctil
    let touchStartX = 0;
    carousel.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        stopAuto();
        goTo(diff > 0 ? current + 1 : current - 1);
        startAuto();
      }
    });

    startAuto();
  });
}

function initCarousel() {
  const carousel = document.getElementById('product-carousel');
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.carousel-slide');
  const dots = carousel.querySelectorAll('.carousel-dot');
  let current = 0;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  carousel.querySelector('.carousel-prev').addEventListener('click', () => goTo(current - 1));
  carousel.querySelector('.carousel-next').addEventListener('click', () => goTo(current + 1));
  dots.forEach((dot) => {
    dot.addEventListener('click', () => goTo(Number(dot.getAttribute('data-index'))));
  });

  // Swipe táctil
  let touchStartX = 0;
  carousel.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
  });
}

function getProductDetailHTML(product) {
  const category = (product.category || 'Sin categoría').toUpperCase();
  const name = escapeHtml(product.name || 'Producto sin nombre');
  const description = escapeHtml(
    product.description || 'Sin descripción disponible',
  );
  const price = formatLempiras(product.price);

  // Armar lista completa de imágenes: principal + adicionales
  const allImages = [];
  if (product.imageUrl) allImages.push(resolveImageUrl(product.imageUrl));
  if (product.additionalImages && product.additionalImages.length > 0) {
    product.additionalImages.forEach((img) => allImages.push(resolveImageUrl(img)));
  }

  let imageHTML;
  if (allImages.length === 0) {
    imageHTML = '<span>FOTO DEL PRODUCTO</span>';
  } else if (allImages.length === 1) {
    imageHTML = `<img src="${escapeHtml(allImages[0])}" alt="${name}" />`;
  } else {
    const slides = allImages.map((src, i) =>
      `<div class="carousel-slide${i === 0 ? ' active' : ''}">
        <img src="${escapeHtml(src)}" alt="${name} ${i + 1}" />
      </div>`
    ).join('');
    const dots = allImages.map((_, i) =>
      `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Imagen ${i + 1}"></button>`
    ).join('');
    imageHTML = `
      <div class="carousel" id="product-carousel">
        <div class="carousel-track">${slides}</div>
        <button class="carousel-btn carousel-prev" aria-label="Anterior">&#8249;</button>
        <button class="carousel-btn carousel-next" aria-label="Siguiente">&#8250;</button>
        <div class="carousel-dots">${dots}</div>
      </div>`;
  }

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
        <a href="/catalogo" data-link class="detail-back">&larr; VOLVER AL CATÁLOGO</a>
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
            <button class="btn btn-primary btn-add-cart" data-id="${escapeHtml(product.id)}">+ AGREGAR AL CARRITO</button>
            <a href="${generateWhatsAppLink(product)}" target="_blank" class="btn btn-secondary">COMPRAR POR WHATSAPP</a>
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
  initCardCarousels();
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
      if (!e.target.closest('.product-footer a') && !e.target.closest('.btn-add-cart')) {
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

  const cardImages = [];
  if (product.imageUrl) cardImages.push(resolveImageUrl(product.imageUrl));
  if (product.additionalImages && product.additionalImages.length > 0) {
    product.additionalImages.forEach((img) => cardImages.push(resolveImageUrl(img)));
  }

  let imageHtml;
  if (cardImages.length === 0) {
    imageHtml = `<span>FOTO<br/>${name}</span>`;
  } else if (cardImages.length === 1) {
    imageHtml = `<img src="${escapeHtml(cardImages[0])}" alt="${name}" loading="lazy" />`;
  } else {
    const slides = cardImages.map((src, i) =>
      `<div class="card-slide${i === 0 ? ' active' : ''}">
        <img src="${escapeHtml(src)}" alt="${name} ${i + 1}" loading="lazy" />
      </div>`
    ).join('');
    const dots = cardImages.map((_, i) =>
      `<button class="card-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Imagen ${i + 1}"></button>`
    ).join('');
    imageHtml = `
      <div class="card-carousel">
        <div class="card-carousel-track">${slides}</div>
        <button class="card-carousel-btn card-carousel-prev" aria-label="Anterior">&#8249;</button>
        <button class="card-carousel-btn card-carousel-next" aria-label="Siguiente">&#8250;</button>
        <div class="card-carousel-dots">${dots}</div>
      </div>`;
  }

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
          <div class="product-footer-actions">
            <a href="/producto/${escapeHtml(product.id)}" data-link>VER DETALLE</a>
            <button class="btn-add-cart" data-id="${escapeHtml(product.id)}" aria-label="Agregar al carrito" title="Agregar al carrito">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            </button>
          </div>
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

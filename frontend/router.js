'use strict';

/**
 * Router SPA con History API (sin hash)
 * Compatible con Live Server y producción
 */
class Router {
  constructor() {
    this.routes = [];
    this.basePath = window.__SPA_BASE || '/';
    this.onNavigate = null;
  }

  add(path, handler) {
    this.routes.push({
      path,
      handler,
      regex: this._pathToRegex(path),
    });
    return this;
  }

  _pathToRegex(path) {
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, '(?<$1>[^/]+)');
    return new RegExp(`^${pattern}$`);
  }

  navigate(path) {
    const fullPath = this._toFullPath(path);
    if (window.location.pathname === fullPath) return;
    window.history.pushState({}, '', fullPath);
    this._resolve();
  }

  _toFullPath(routePath) {
    // /productos → /frontend/productos (Live Server) o /productos (producción)
    const clean = routePath.replace(/^\//, '');
    if (routePath === '/') return this.basePath;
    return this.basePath + clean;
  }

  _toRoutePath(fullPath) {
    // /frontend/productos → /productos
    // /frontend/index.html → /
    let path = fullPath;

    // Quitar base path
    if (path.startsWith(this.basePath)) {
      path = path.substring(this.basePath.length);
    }

    // Quitar index.html
    path = path.replace(/index\.html$/, '');

    // Normalizar
    if (!path.startsWith('/')) path = '/' + path;
    if (path === '/') return '/';

    // Quitar trailing slash
    return path.replace(/\/$/, '');
  }

  _resolve() {
    const routePath = this._toRoutePath(window.location.pathname);

    for (const route of this.routes) {
      const match = routePath.match(route.regex);
      if (match) {
        const params = match.groups || {};
        route.handler(params);
        if (this.onNavigate) this.onNavigate(routePath);
        return;
      }
    }

    // Ruta no encontrada — ir al inicio
    window.history.replaceState({}, '', this.basePath);
    const homeRoute = this.routes.find((r) => r.path === '/');
    if (homeRoute) {
      homeRoute.handler({});
      if (this.onNavigate) this.onNavigate('/');
    }
  }

  init() {
    // Botones atrás/adelante del navegador
    window.addEventListener('popstate', () => this._resolve());

    // Interceptar clicks en enlaces internos (con data-link)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      }
    });

    // Resolver la ruta actual
    this._resolve();
  }
}

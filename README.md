# Pearl Glean - Joyería Fina

Aplicación web elegante para mostrar y vender productos de joyería fina con **Frontend moderno (HTML, CSS, JavaScript)** y **Backend robusto (NestJS)**.

## 📋 Estructura del Proyecto

```
pearl-glean/
├── frontend/
│   ├── index.html         # Página principal
│   ├── styles.css         # Estilos globales
│   └── app.js             # Lógica del frontend
├── backend/
│   ├── src/
│   │   ├── main.ts                      # Punto de entrada
│   │   ├── app.module.ts                # Módulo principal
│   │   └── products/
│   │       ├── product.entity.ts        # Modelo del producto
│   │       ├── products.service.ts      # Lógica de negocio
│   │       ├── products.controller.ts   # Rutas HTTP
│   │       └── products.module.ts       # Módulo de productos
│   ├── package.json       # Dependencias Node
│   ├── tsconfig.json      # Configuración TypeScript
│   └── nest-cli.json      # Configuración NestJS
└── README.md
```

## 🚀 Instalación

### Requisitos Previos
- **Node.js** v16+ (Descargar desde https://nodejs.org/)
- **npm** o **yarn**

### 1. Clonar o descargar el proyecto

```bash
cd pearl-glean
```

### 2. Configurar el Backend (NestJS)

#### a. Instalar dependencias

```bash
cd backend
pnpm install
# o si prefieres yarn
yarn install
```

#### b. Ejecutar el servidor en modo desarrollo

```bash
pnpm run start:dev
```

El backend estará disponible en `http://localhost:3000`

### 3. Ejecutar el Frontend

#### Opción A: Usando Live Server (Recomendado)

1. Abre Visual Studio Code
2. Ve a la carpeta `frontend`
3. Abre el archivo `index.html`
4. Click derecho → "Open with Live Server"
5. Automáticamente se abrirá en `http://localhost:5500`

#### Opción B: Usando un servidor HTTP simple

```bash
cd frontend
# Con Python 3
python -m http.server 8000
# O con Python 2
python -m SimpleHTTPServer 8000
```

Luego abre `http://localhost:8000` en tu navegador

#### Opción C: Usar Node.js con http-server

```bash
pnpm add -g http-server
cd frontend
http-server -p 8000
```

## 🔧 Endpoints de la API

### Base URL: `http://localhost:3000/api`

#### GET `/products`
Obtiene todos los productos.

**Respuesta:**
```json
[
  {
    "id": "p1",
    "name": "Collar Aurora",
    "category": "Collares",
    "price": 3450,
    "description": "Cadena fina en baño de oro con dije de circonia central...",
    "imageUrl": null
  },
  ...
]
```

#### GET `/products?category=Collares`
Obtiene productos filtrados por categoría.

#### GET `/products/:id`
Obtiene un producto específico por ID.

**Ejemplo:** `GET /api/products/p1`

#### POST `/products`
Crea un nuevo producto.

**Body:**
```json
{
  "name": "Nuevo Producto",
  "category": "Collares",
  "price": 2500,
  "description": "Descripción del producto",
  "imageUrl": "https://example.com/image.jpg"
}
```

#### PUT `/products/:id`
Actualiza un producto existente.

**Body:**
```json
{
  "name": "Nombre actualizado",
  "price": 3000
}
```

#### DELETE `/products/:id`
Elimina un producto.

## 🎨 Características del Frontend

- ✅ Diseño elegante y responsivo
- ✅ Navegación intuitiva
- ✅ Filtrado de productos por categoría
- ✅ Modal de detalle de producto
- ✅ Integración con WhatsApp
- ✅ Carga dinámica de datos desde el backend
- ✅ Animaciones suaves

## 📱 Categorías de Productos

- **Collares**
- **Aretes**
- **Pulseras**

## 🔐 CORS

El backend está configurado para aceptar solicitudes desde:
- `http://localhost:3000`
- `http://localhost:5500`
- `http://localhost:8080`
- `http://localhost:3001`

Si necesitas agregar más orígenes, edita `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: ['http://tu-dominio.com', 'http://otro-dominio.com'],
  credentials: true,
});
```

## 🛠️ Tecnologías Utilizadas

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos y animaciones
- **JavaScript vanilla** - Interactividad
- **Fetch API** - Comunicación con backend

### Backend
- **NestJS** - Framework principal
- **TypeScript** - Lenguaje
- **Express** - Servidor HTTP (incluido en NestJS)

## 📖 Scripts del Backend

```bash
# Desarrollo
pnpm run start:dev

# Build para producción
pnpm run build

# Iniciar en producción
pnpm run start:prod

# Linting
pnpm run lint

# Pruebas
pnpm run test
pnpm run test:watch
pnpm run test:cov
```

## 🐛 Troubleshooting

### El frontend no se conecta al backend

1. Verifica que el backend esté ejecutándose en `http://localhost:3000`
2. Abre la consola del navegador (F12) y revisa los errores
3. Asegúrate de que CORS está habilitado correctamente

### Error: "Cannot GET /api/products"

- Confirma que el servidor NestJS está ejecutándose
- Revisa que no haya errores en la consola del servidor

### Puerto 3000 ya está en uso

```bash
# En Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# En Mac/Linux
lsof -ti:3000 | xargs kill -9
```

## 📝 Personalización

### Cambiar el número de WhatsApp

Edita el archivo `backend/src/products/products.service.ts` y busca:

```javascript
// En el frontend (app.js):
const API_URL = 'http://localhost:3000/api'; // Cambia aquí si cambias el puerto

// En el generador de links de WhatsApp:
// Cambia '50499999999' por tu número
```

### Agregar nuevos productos

Puedes hacerlo de dos formas:

**Opción 1: Editar el archivo de datos (backend)**
Edita `backend/src/products/products.service.ts` en el array `PRODUCTS`.

**Opción 2: Usar la API POST**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nuevo Collar",
    "category": "Collares",
    "price": 5000,
    "description": "Descripción"
  }'
```

## 📦 Dependencias Principales

### Backend
- `@nestjs/common` - Decoradores y utilidades
- `@nestjs/core` - Core de NestJS
- `@nestjs/platform-express` - Integración con Express
- `rxjs` - Programación reactiva

## 🚢 Despliegue a Producción

### Frontend (Vercel, Netlify, GitHub Pages)

1. Sube la carpeta `frontend` a tu repositorio de GitHub
2. Conecta tu repositorio con Vercel o Netlify
3. Configura la variable de entorno `API_URL` en el archivo `app.js`

### Backend (Render, Railway, Heroku)

1. Instala dependencias: `pnpm install`
2. Build: `pnpm run build`
3. Configura las variables de entorno necesarias
4. Ejecuta: `pnpm run start:prod`

## 📧 Contacto

Para soporte o preguntas: [tu-email@ejemplo.com]

## 📄 Licencia

MIT

---

¡Disfruta usando Pearl Glean! ✨


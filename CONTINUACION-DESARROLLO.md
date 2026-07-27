# Pearl Glean - Prompt de Continuacion de Desarrollo

Usa este archivo como contexto para retomar el desarrollo del proyecto Pearl Glean.
Copia y pega todo el contenido de abajo como primer mensaje en una nueva conversacion con Claude.

---

## PROMPT PARA COPIAR Y PEGAR:

Estoy trabajando en el proyecto **Pearl Glean**, una tienda online de joyeria (aretes, collares, pulseras) hecha en Honduras. El proyecto esta en `/mnt/c/Users/Senprende/Desktop/pearl-glean`.

### Estructura del proyecto

- `backend/` — NestJS + TypeORM + PostgreSQL (corre en puerto 3300)
- `frontend/` — HTML/CSS/JS vanilla (se sirve con Live Server en puerto 5500)
- La base de datos es PostgreSQL 17, corre en Windows, se conecta desde WSL

### Estado actual - que ya esta hecho

**Backend funcional:**
- Entidad `Product` con: `id` (UUID), `name`, `category` (enum: aretes, collar, pulsera), `price` (decimal), `description`, `imageUrl` (nullable), `isActive`
- CRUD completo: GET, POST, PUT, DELETE
- Subida de imagenes con Multer guardando en disco (`./uploads`)
- CORS configurado para `localhost:5500`
- Prefijo global `/api`
- Puerto 3300 (configurado en `.env`)

**Frontend funcional:**
- Catalogo publico con filtros por categoria (TODOS, COLLARES, ARETES, PULSERAS)
- Los filtros ya coinciden con el enum del backend (collar, aretes, pulsera)
- Tarjetas de producto que muestran imagen real si existe `imageUrl`, o placeholder si no
- Modal de detalle del producto con imagen
- Integracion con WhatsApp para compras
- Funcion `resolveImageUrl()` que resuelve tanto rutas locales (`/uploads/...`) como URLs completas (listo para Cloudinary)
- Apunta a `localhost:3300`

### Lo que falta por hacer (en orden)

**Paso 2 - Campos nuevos + Soft Delete:**
- Agregar campos nuevos a la entidad Product:
  - `imagePublicId` (string, nullable) — ID de Cloudinary para gestionar la imagen
  - `additionalImages` (string[], nullable) — URLs adicionales opcionales
  - `altText` (string, nullable) — texto alternativo para la imagen
  - `stock` (integer, nullable) — cantidad en inventario
  - `material` (string, nullable) — ej: "plata 925", "oro rosa"
  - `dimensions` (string, nullable) — ej: "2cm x 1.5cm"
- Implementar soft delete: `DELETE /products/:id` debe poner `isActive: false` en vez de borrar de la BD
- Mostrar los campos nuevos (material, dimensiones, stock) en el modal de detalle del frontend

**Paso 3 - Migracion a Cloudinary:**
- Reemplazar Multer disk storage por Cloudinary (plan gratuito)
- Crear un `CloudinaryService` para subir/eliminar imagenes
- Instalar SDK `cloudinary`
- Variables de entorno: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Eliminar `multer.config.ts` (almacenamiento en disco)
- Eliminar `useStaticAssets` de `main.ts`
- Multer se mantiene solo para recibir el archivo temporalmente antes de subirlo a Cloudinary
- Al hacer soft delete, NO borrar la imagen de Cloudinary
- Las imagenes solo se reemplazan si se sube una nueva para el mismo producto
- Preguntar si ya tiene cuenta y credenciales de Cloudinary antes de implementar

**Paso 4 - Panel Admin:**
- Vista admin para crear, editar, eliminar productos y subir imagenes (para no depender de Postman)
- Esto puede ser una pagina aparte o una seccion protegida

**Paso 5 - Deploy en Vercel**

### Preferencias de trabajo
- Soy la duena del proyecto, no soy desarrolladora experta
- Prefiero que me consultes antes de tomar decisiones grandes
- Ir paso a paso, no hacer todo de golpe
- Idioma: espanol
- El proyecto corre en WSL (Windows)

### Archivos clave para revisar
- `backend/src/products/entities/product.entity.ts` — entidad principal
- `backend/src/products/products.controller.ts` — endpoints
- `backend/src/products/products.service.ts` — logica de negocio
- `backend/src/products/multer.config.ts` — config actual de imagenes (se va a reemplazar)
- `backend/src/main.ts` — configuracion del servidor
- `backend/.env` — variables de entorno
- `frontend/app.js` — logica del frontend
- `frontend/index.html` — estructura HTML
- `frontend/styles.css` — estilos

Continuemos con el **Paso 2** (o donde nos hayamos quedado).

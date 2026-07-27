# Manual de Instalacion - Pearl Glean

Guia completa para instalar y ejecutar el sistema Pearl Glean desde cero.

---

## 1. Requisitos Previos

Antes de comenzar, asegurate de tener instalado lo siguiente:

| Software       | Version minima | Para que se usa                    |
| -------------- | -------------- | ---------------------------------- |
| Node.js        | v18 o superior | Ejecutar el backend y frontend     |
| pnpm           | v8 o superior  | Gestor de paquetes (NO usar npm)   |
| PostgreSQL     | v15 o superior | Base de datos                      |
| Git            | cualquiera     | Clonar el repositorio              |

### Como verificar que estan instalados

Abri una terminal y ejecuta estos comandos:

```bash
node --version
pnpm --version
psql --version
git --version
```

### Instalar pnpm (si no lo tenes)

```bash
npm install -g pnpm
```

---

## 2. Clonar el Repositorio

```bash
git clone https://github.com/Andrea01Alvarez/pearl-glean.git
cd pearl-glean
```

---

## 3. Configurar la Base de Datos PostgreSQL

### Opcion A: Base de datos local (PostgreSQL instalado en tu maquina)

1. **Abrir PostgreSQL** (pgAdmin o terminal `psql`)

2. **Crear el usuario y la base de datos:**

```sql
-- Conectarse a PostgreSQL como superusuario
psql -U postgres

-- Crear usuario (elige tu propio nombre y contrasena)
CREATE USER tu_usuario WITH PASSWORD 'tu_contrasena_segura';

-- Crear base de datos
CREATE DATABASE pearlglean OWNER tu_usuario;

-- Dar todos los privilegios
GRANT ALL PRIVILEGES ON DATABASE pearlglean TO tu_usuario;

-- Salir
\q
```

3. **Verificar la conexion:**

```bash
psql -U tu_usuario -d pearlglean -h localhost
```

Te pedira la contrasena que elegiste al crear el usuario.

> **Nota para usuarios de WSL:** PostgreSQL puede estar instalado en Windows. En ese caso, `localhost` desde WSL se conecta a Windows directamente. Asegurate de que PostgreSQL este corriendo como servicio en Windows.

### Opcion B: Base de datos en la nube (Neon)

Si prefieres no instalar PostgreSQL localmente, puedes usar [Neon](https://neon.tech):

1. Crear una cuenta gratuita en https://neon.tech
2. Crear un nuevo proyecto
3. Copiar la URL de conexion (formato: `postgresql://usuario:password@host/database?sslmode=require`)
4. Usarla en la variable `DATABASE_URL` del archivo `.env` (siguiente paso)

---

## 4. Configurar Variables de Entorno del Backend

1. **Ir a la carpeta del backend:**

```bash
cd backend
```

2. **Crear el archivo `.env`:**

```bash
touch .env
```

3. **Abrir `.env` con tu editor y pegar lo siguiente:**

```env
PORT=3300
NODE_ENV=development

# PostgreSQL local (se usa si no hay DATABASE_URL)
DB_HOST=localhost
DB_NAME=pearlglean
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_PORT=5432

# Base de datos en la nube (Neon, Supabase, etc.)
# DATABASE_URL=postgresql://usuario:password@host/database?sslmode=require

# CORS
CORS_ORIGIN=http://localhost:8000,http://localhost:5500,http://localhost:3001

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

> **IMPORTANTE:** Reemplaza los valores `tu_usuario`, `tu_password`, `tu_cloud_name`, `tu_api_key` y `tu_api_secret` con tus credenciales reales. Este archivo `.env` NO se sube a Git.

### Configurar Cloudinary (para las imagenes)

Las imagenes de los productos se guardan en Cloudinary (servicio gratuito en la nube).

1. Crear cuenta gratuita en https://cloudinary.com
2. Ir al **Dashboard**
3. Copiar los valores de:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`
4. Pegarlos en el archivo `.env`

> **IMPORTANTE:** Sin Cloudinary configurado, el sistema funciona pero no podras subir imagenes de productos.

---

## 5. Instalar Dependencias del Backend

Desde la carpeta `backend/`:

```bash
pnpm install
```

Esto descarga todas las librerias necesarias (NestJS, TypeORM, Cloudinary, etc.)

---

## 6. Iniciar el Backend

Desde la carpeta `backend/`:

```bash
pnpm start:dev
```

Si todo esta correcto, veras estos mensajes en la terminal:

```
✅ Servidor ejecutandose en: http://localhost:3300
📡 API disponible en: http://localhost:3300/api
📄 Swagger docs en: http://localhost:3300/docs
🔓 CORS habilitado para: http://localhost:5500
```

### Verificar que funciona

Abri tu navegador y visita:

- **API:** http://localhost:3300/api/products → deberia devolver un JSON (array vacio `[]` si no hay productos)
- **Swagger:** http://localhost:3300/docs → documentacion interactiva de la API

> **Nota:** La base de datos se crea automaticamente. TypeORM con `synchronize: true` crea las tablas (products, promotions) la primera vez que se ejecuta el servidor.

---

## 7. Iniciar el Frontend

Hay dos opciones para servir el frontend:

### Opcion A: Servidor Node incluido (recomendado)

Abri **otra terminal** (deja el backend corriendo) y desde la raiz del proyecto:

```bash
node frontend/server.js
```

Veras el mensaje:

```
Pearl Glean frontend: http://localhost:5500/pearl-glean/
Modo SPA activo
```

Abri tu navegador en: **http://localhost:5500/pearl-glean/**

### Opcion B: Extension Live Server (VS Code)

1. Instalar la extension **Live Server** en VS Code
2. Abrir la carpeta `frontend/` en VS Code
3. Click derecho en `index.html` → **Open with Live Server**
4. Se abrira en `http://localhost:5500`

---

## 8. Verificar que Todo Funciona

Una vez que el backend y frontend esten corriendo:

| Que verificar                     | URL                                          | Resultado esperado                        |
| --------------------------------- | -------------------------------------------- | ----------------------------------------- |
| Backend corriendo                 | http://localhost:3300/api/products            | JSON con lista de productos               |
| Swagger (documentacion API)       | http://localhost:3300/docs                    | Pagina interactiva de Swagger             |
| Frontend cargando                 | http://localhost:5500/pearl-glean/            | Pagina principal de la tienda             |
| Filtros de categoria              | Clicks en TODOS, COLLARES, ARETES, PULSERAS  | Filtra los productos en pantalla          |
| Modal de producto                 | Click en una tarjeta de producto              | Abre modal con detalle, material, stock   |

---

## 9. Estructura del Proyecto

```
pearl-glean/
├── backend/                    # Servidor API (NestJS)
│   ├── src/
│   │   ├── main.ts             # Punto de entrada del servidor
│   │   ├── app.module.ts       # Modulo principal
│   │   ├── products/           # Modulo de productos
│   │   │   ├── entities/       # Entidad Product (base de datos)
│   │   │   ├── dto/            # Validacion de datos
│   │   │   ├── products.controller.ts
│   │   │   └── products.service.ts
│   │   ├── promotions/         # Modulo de promociones
│   │   │   ├── entities/       # Entidad Promotion
│   │   │   ├── dto/
│   │   │   ├── promotions.controller.ts
│   │   │   └── promotions.service.ts
│   │   └── cloudinary/         # Servicio de imagenes
│   ├── .env                    # Variables de entorno (NO se sube a Git)
│   └── package.json
├── frontend/                   # Interfaz web
│   ├── index.html              # Pagina principal
│   ├── app.js                  # Logica JavaScript
│   ├── router.js               # Rutas SPA
│   ├── server.js               # Servidor de desarrollo
│   ├── styles.css              # Estilos
│   └── images/                 # Imagenes estaticas
└── MANUAL-INSTALACION.md       # Este archivo
```

---

## 10. Comandos Utiles

| Comando                      | Desde donde | Que hace                              |
| ---------------------------- | ----------- | ------------------------------------- |
| `pnpm start:dev`             | `backend/`  | Inicia backend en modo desarrollo     |
| `pnpm start`                 | `backend/`  | Inicia backend en modo produccion     |
| `pnpm build`                 | `backend/`  | Compila el backend a JavaScript       |
| `pnpm start:prod`            | `backend/`  | Produccion (requiere build previo)    |
| `pnpm lint`                  | `backend/`  | Revisa el codigo con ESLint           |
| `pnpm format`                | `backend/`  | Formatea el codigo con Prettier       |
| `node frontend/server.js`    | raiz        | Inicia el frontend                    |

> **Nota sobre pnpm:** El archivo `pnpm-lock.yaml` esta incluido en el repositorio para que la instalacion reproduzca exactamente las versiones verificadas.

---

## 11. Solucion de Problemas Comunes

### El backend no conecta a la base de datos

- **Error:** `connection refused` o `ECONNREFUSED`
- **Solucion:** Verificar que PostgreSQL este corriendo. En Windows: abrir "Servicios" y buscar "postgresql", asegurarse de que este "Iniciado".

### CORS error en el navegador

- **Error:** `Access-Control-Allow-Origin` en la consola del navegador
- **Solucion:** Verificar que en `.env` la variable `CORS_ORIGIN` incluya la URL del frontend (ej: `http://localhost:5500`).

### pnpm no reconocido

- **Solucion:** Instalar pnpm globalmente: `npm install -g pnpm`

### Puerto 3300 ya esta en uso

- **Solucion:** Cerrar el proceso que lo usa o cambiar el `PORT` en `.env` a otro numero.

### Las imagenes no se suben

- **Solucion:** Verificar que las 3 variables de Cloudinary en `.env` esten correctas (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).

### Error "relation does not exist"

- **Solucion:** Esto no deberia pasar ya que TypeORM crea las tablas automaticamente. Si ocurre, borrar la base de datos y volver a crearla:
  ```sql
  DROP DATABASE pearlglean;
  CREATE DATABASE pearlglean OWNER tu_usuario;
  ```
  Luego reiniciar el backend.

# Pearl Glean — Inicio en 3 pasos (pnpm)

## Requisito: tener pnpm instalado
```bash
npm install -g pnpm
# verificar:
pnpm --version
```

## 1. Instalar dependencias del backend (solo la primera vez)
```bash
cd backend
pnpm install
```

## 2. Iniciar el backend (Terminal 1)
```bash
cd backend
pnpm run start:dev
```
Verás: `✅ Servidor ejecutándose en: http://localhost:3000`

## 3. Iniciar el frontend (Terminal 2)
```bash
cd frontend
python -m http.server 8000
```
(o con Node: `npx http-server -p 8000`)

## Abrir en el navegador
http://localhost:8000

---

## Comandos útiles del backend (pnpm)
```bash
pnpm run start:dev    # desarrollo con auto-reload
pnpm run build        # compilar a dist/
pnpm run start:prod   # producción (requiere build previo)
pnpm run lint         # linting
pnpm run format       # formatear código
```

## Notas técnicas
- `pnpm-workspace.yaml` incluye `allowBuilds` para `@nestjs/core`
  (pnpm 10+ bloquea build scripts por defecto; ya está aprobado).
- `pnpm-lock.yaml` incluido: tu instalación reproduce exactamente
  las versiones verificadas.

---
✅ Proyecto compilado y probado con pnpm v11: 8/8 tests de API pasaron
(GET, POST, PUT, DELETE, filtros, validaciones 400 y 404).

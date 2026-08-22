# QRSafe

Monorepositorio de QRSafe administrado con Turborepo y npm workspaces.

## Aplicaciones

- `apps/app`: landing pública con React 19 y Vite 8.
- `apps/admin`: panel administrativo con React 19 y Vite 8.
- `apps/api`: API Node.js con Express 5.
- `docs`: documentación e investigación del proyecto.

## Desarrollo

Requiere Node.js 24 o superior.

```bash
npm install
npm run dev
```

Servicios locales:

- Landing: <http://localhost:5173>
- Admin: <http://localhost:5174>
- API: <http://localhost:3000>

## Verificación

```bash
npm run lint
npm run check
npm run build
```

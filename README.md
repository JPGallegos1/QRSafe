# QRSafe

QRSafe monorepo managed with Turborepo and npm workspaces.

## Applications

- `apps/app`: public landing page built with React 19 and Vite 8.
- `apps/admin`: administrative dashboard built with React 19 and Vite 8.
- `apps/api`: Node.js API built with Express 5.
- `docs`: project documentation and research.

## Development

Requires Node.js 24 or later.

```bash
npm install
npm run dev
```

Local services:

- Landing page: <http://localhost:5173>
- Admin: <http://localhost:5174>
- API: <http://localhost:3000>

## Verification

```bash
npm run lint
npm run check
npm run build
```

# Campus League: cliente

SPA en React 19 + Vite + Tailwind CSS 4. Consume la API REST del directorio `server/`.

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm run dev            # http://localhost:5173
npm run build          # genera dist/
npm run lint
```

Estructura: `src/pages` (vistas públicas, autenticación y paneles por rol), `src/components` (Navbar, rutas protegidas, modal), `src/context` (AuthContext con JWT) y `src/services/api.js` (instancia de Axios con interceptores).

La documentación general del proyecto está en el [README de la raíz](../README.md).

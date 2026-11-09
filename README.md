# Campus League

Plataforma web para la gestión de torneos deportivos universitarios.
Proyecto Integrador de la asignatura **Tecnologías en Internet**, Universidad Adventista de Bolivia.

## Integrantes

- José Alcozer Martínez
- Samuel Eli Ramírez Mamani
- Roger Huarachi Rojas
- Kevin Abdias Flores Escobar

**Docente:** Lic. Víctor Hugo Sarzuri Flores

## Descripción

Campus League centraliza el ciclo completo de un torneo: registro de estudiantes con correo institucional, creación de equipos, inscripción a torneos, generación automática del calendario, registro de resultados por el árbitro y actualización inmediata de la tabla de posiciones. Incluye un portal público para consultar horarios y resultados sin cuenta.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Frontend | React.js, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Base de datos | MongoDB con Mongoose |
| Seguridad | JWT, bcryptjs, RBAC, Helmet, CORS |
| Documentación | Swagger / OpenAPI 3.0 |

## Estructura del repositorio

```
campus-league/
├── client/   # SPA en React + Tailwind CSS (Vite)
├── server/   # API REST en Node.js + Express
└── docs/     # Diagramas, capturas e informe técnico
```

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior
- Git
- MongoDB local **o** una cuenta gratuita en MongoDB Atlas

## Instalación y ejecución local

### 1. Clonar el repositorio

```bash
git clone https://github.com/<usuario>/campus-league.git
cd campus-league
```

### 2. Instalar dependencias

```bash
npm install
npm run install:all
```

### 3. Configurar variables de entorno

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edita `server/.env` y completa al menos `MONGO_URI` y `JWT_SECRET`.
Para generar un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Cargar datos de prueba (usuarios de los 5 roles)

```bash
npm run seed
```

### 5. Levantar el proyecto

```bash
npm run dev
```

| Servicio | URL |
| --- | --- |
| Frontend (React) | http://localhost:5173 |
| API REST | http://localhost:5000/api |
| Documentación Swagger | http://localhost:5000/api-docs |

También puedes levantar cada parte por separado:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

## Credenciales de prueba

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | (se completa al crear el seed) | |
| Organizador | | |
| Árbitro | | |
| Capitán | | |
| Jugador | | |

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run install:all` | Instala dependencias de client y server |
| `npm run dev` | Levanta cliente y servidor en paralelo |
| `npm run seed` | Carga usuarios de prueba en MongoDB |

## Flujo de trabajo con Git

- `main`: versión estable
- `develop`: integración
- `feature/*`: una rama por funcionalidad (por ejemplo `feature/auth-jwt`)
- Commits siguiendo Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`

## Seguridad

- Nunca se sube el archivo `.env`; solo `.env.example`.
- Contraseñas con bcryptjs (salt factor mayor o igual a 10).
- Tokens JWT firmados con expiración configurable.
- Control de acceso por roles (RBAC) en el backend.

## Licencia

Proyecto académico con fines educativos.
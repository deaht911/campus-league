# Campus League

Plataforma web para la gestión de torneos deportivos universitarios (UAB). Proyecto integrador de Tecnologías en Internet.

Monorepo con tres carpetas:

| Carpeta | Contenido |
|---|---|
| `client/` | Frontend: React 19, Vite, Tailwind CSS 4, React Router y Axios |
| `server/` | Backend: Node.js, Express 5, MongoDB (Mongoose), JWT, bcryptjs y Swagger UI |
| `docs/` | Diagramas, capturas e informe técnico |

## Requisitos

- Node.js 20 o superior
- MongoDB local (`mongod`) o una URI de MongoDB Atlas

## Instalación

```bash
git clone https://github.com/deaht911/campus-league.git
cd campus-league
npm run install:all
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edita `server/.env` con tus valores (ver tabla siguiente).

## Variables de entorno

### `server/.env`

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto de la API | `5000` |
| `NODE_ENV` | `development` o `production` (en producción el OTP no se devuelve en la respuesta) | `development` |
| `MONGO_URI` | Cadena de conexión a MongoDB | `mongodb://127.0.0.1:27017/campus_league` |
| `JWT_SECRET` | Clave para firmar los tokens (usar una larga y aleatoria) | `cambia-esto` |
| `JWT_EXPIRE` | Duración del token | `30m` |
| `BCRYPT_SALT_ROUNDS` | Salt factor de bcrypt (mínimo 10) | `10` |
| `FRONTEND_URL` | Orígenes permitidos por CORS, separados por coma | `http://localhost:5173` |
| `API_PROD_URL` | (Opcional) URL pública de la API para Swagger | `https://mi-api.com` |

### `client/.env`

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base de la API | `http://localhost:5000/api` |

## Scripts

Desde la raíz:

| Comando | Acción |
|---|---|
| `npm run dev` | Levanta API y cliente a la vez |
| `npm run seed` | Borra la base y carga datos de demostración |
| `npm run install:all` | Instala dependencias de `server` y `client` |

El seed **borra todas las colecciones**: úsalo solo en desarrollo.

## Cuentas de demostración

Tras `npm run seed`, todas las cuentas tienen la contraseña `Campus2026!`.

| Rol | Correo |
|---|---|
| Administrador | `admin@uab.edu.bo` |
| Organizador | `organizador@uab.edu.bo` |
| Árbitro | `arbitro@uab.edu.bo` (también `arbitro2@` y `arbitro3@`) |
| Capitán | `capitan@uab.edu.bo` |
| Jugador | `jugador@uab.edu.bo` |

El seed crea además el torneo "Copa UAB 2026" (futsal, liga) con 4 equipos: 3 inscripciones aprobadas y 1 pendiente.

## URLs locales

- Aplicación: http://localhost:5173
- API: http://localhost:5000/api
- Documentación Swagger (OpenAPI 3.0): http://localhost:5000/api-docs
- Salud del servicio: http://localhost:5000/api/health

## Roles y permisos (RBAC)

| Rol | Puede |
|---|---|
| Visitante | Ver torneos, calendario, posiciones y goleadores |
| Jugador | Lo anterior, perfil propio y crear su primer equipo |
| Capitán | Gestionar plantilla e inscribir su equipo en torneos |
| Organizador | Crear torneos, aprobar inscripciones, generar y publicar el calendario, reprogramar partidos y asignar árbitros |
| Árbitro | Registrar el acta digital de sus partidos |
| Administrador | Todo lo anterior y gestión de usuarios y roles |

Autenticación: JWT en el encabezado `Authorization: Bearer <token>` con expiración de 30 minutos. El registro exige correo institucional `@uab.edu.bo` y verificación por código OTP. En desarrollo el código se muestra en la respuesta y en la consola del servidor.

## API

Todas las rutas cuelgan de `/api`. El detalle completo con esquemas y ejemplos está en Swagger.

| Módulo | Ruta base | Resumen |
|---|---|---|
| Auth | `/auth` | Registro, verificación OTP, login, sesión activa |
| Usuarios | `/users` | Listado, perfil propio, roles, estado, árbitros |
| Equipos | `/teams` | CRUD de equipos y plantilla |
| Torneos | `/tournaments` | CRUD, inscripciones, calendario (generar, publicar, descartar) |
| Partidos | `/matches` | Calendario público, acta, reprogramación, posiciones, goleadores |

## Reglas de negocio destacadas

- Un jugador no puede estar en dos equipos activos de la misma disciplina.
- La inscripción exige período abierto, plantilla mínima y jugadores habilitados. Sin cupos, queda en lista de espera.
- El calendario necesita al menos 4 equipos aprobados y evita choques de escenario, equipo y árbitro (los partidos se consideran de unos 90 minutos).
- El acta solo cierra si los goles individuales coinciden con el marcador. Con walkover gana 3-0 el equipo presente.
- La tabla de posiciones se calcula en cada consulta: 3 puntos por victoria, 1 por empate.

## Flujo de trabajo Git

- Ramas `feature/*` creadas desde `develop`.
- Integración con `git merge --ff-only` para conservar los autores originales.
- Mensajes de commit con formato `tipo(ámbito): descripción`.

## Equipo

| Integrante | Usuario |
|---|---|
| Samuel Eli Ramírez (líder) | deaht911 |
| José Alcozer | jose-1 |
| Roger Huarachi | roger69 |
| Kevin Flores | Gn_Abdias |

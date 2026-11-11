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
| `ENCRYPTION_KEY` | Clave AES-256 (64 hex) para cifrar datos personales. Obligatoria en producción | `openssl rand -hex 32` |
| `FRONTEND_URL` | Orígenes permitidos por CORS, separados por coma | `http://localhost:5173` |
| `API_PROD_URL` | (Opcional) URL pública de la API para Swagger | `https://mi-api.com` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | (Opcional) Servidor de correo para OTP y notificaciones. Sin `SMTP_HOST` los correos se simulan en consola | `smtp.gmail.com` |
| `RATE_LIMIT_MAX` | Intentos máximos por IP en `/api/auth` cada 15 min | `100` |

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
| `npm test --prefix server` | Ejecuta las pruebas automáticas del backend |

El seed **borra todas las colecciones**: úsalo solo en desarrollo.

## Cuentas de demostración

Tras `npm run seed`, todas las cuentas tienen la contraseña `Campus2026!`.

| Rol | Correo | Qué permite probar |
|---|---|---|
| Administrador | `admin@uab.edu.bo` | Gestión de usuarios y roles, todos los torneos y reportes |
| Organizador | `organizador@uab.edu.bo` | Futsal, voleibol y fútbol: aprobar inscripciones, publicar el calendario en borrador, reprogramar, asignar árbitros, exportar PDF |
| Organizador 2 | `organizador2@uab.edu.bo` | Baloncesto y tenis de mesa: lista de espera y torneo cancelado |
| Árbitro | `arbitro@uab.edu.bo` (también `arbitro2@` y `arbitro3@`) | Tiene actas pendientes y un borrador en el torneo de voleibol |
| Capitán | `capitan@uab.edu.bo` | Equipo «Los Tornillos» (futsal): plantilla e inscripciones |
| Jugador | `jugador@uab.edu.bo` | Perfil con estadísticas individuales |

Los capitanes de los demás equipos (`capitan2@` … `capitan28@uab.edu.bo`) se listan en la consola al terminar `npm run seed`.

### Datos cargados por el seed

El seed carga 7 torneos en 5 disciplinas, 28 equipos, unos 190 usuarios y más de 60 partidos, para poder probar el historial completo:

| Torneo | Disciplina y formato | Estado | Qué permite ver |
|---|---|---|---|
| Liga Universitaria de Futsal 2025/2026 | Futsal, liga (8 equipos) | **Finalizado** | Tabla final, campeón, goleadores, resultados de 28 partidos |
| Torneo Intercarreras de Baloncesto 2026 | Baloncesto, eliminación directa | **Finalizado** | Cuartos, semifinales, final y tercer puesto, con campeón |
| Liga de Voleibol Apertura 2026 | Voleibol, liga (6 equipos) | En curso | Resultados parciales, actas pendientes y partidos futuros |
| Copa Fútbol 11 Clausura 2026 | Fútbol, liga (6 equipos) | Inscripción cerrada | Calendario en borrador, listo para publicar |
| Copa UAB 2026 | Futsal, liga | Inscripción abierta | 3 inscripciones aprobadas y 1 pendiente |
| Copa Baloncesto 2027 | Baloncesto, liga (4 cupos) | Inscripción abierta | Inscripciones pendientes y lista de espera |
| Torneo Relámpago de Tenis de Mesa | Otra, eliminación | Cancelado | Estado cancelado en el catálogo |

Los resultados son simulados pero deterministas: cada `npm run seed` produce los mismos marcadores y goleadores. Las fechas se calculan respecto al día en que se ejecuta el seed.

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
| Auth | `/auth` | Registro, verificación OTP, login, sesión activa, recuperación de contraseña |
| Usuarios | `/users` | Listado, perfil propio, roles, estado, árbitros |
| Equipos | `/teams` | CRUD de equipos y plantilla |
| Torneos | `/tournaments` | CRUD, inscripciones, calendario (generar, publicar, descartar) |
| Partidos | `/matches` | Calendario público, acta, reprogramación, posiciones, goleadores |
| Reportes | `/reports` | Exportación en PDF de posiciones, calendario y resultados (organizador / administrador) |

## Informe técnico

El informe completo (arquitectura, trazabilidad RF/RNF, modelo de datos, endpoints y pruebas) está en [`docs/informe-tecnico.md`](docs/informe-tecnico.md), en PDF en [`docs/informe-tecnico.pdf`](docs/informe-tecnico.pdf) y en Word en [`docs/informe-tecnico.docx`](docs/informe-tecnico.docx).

## Reglas de negocio destacadas

- Un jugador no puede estar en dos equipos activos de la misma disciplina.
- La inscripción exige período abierto, plantilla mínima y jugadores habilitados. Sin cupos, queda en lista de espera.
- El calendario necesita al menos 4 equipos aprobados y evita choques de escenario, equipo y árbitro (los partidos se consideran de unos 90 minutos).
- El acta solo cierra si los goles individuales coinciden con el marcador. Con walkover gana 3-0 el equipo presente.
- Los cambios de estado de inscripciones y las reprogramaciones se notifican por correo a los capitanes (RF-014).
- La tabla de posiciones se calcula en cada consulta según la disciplina: fútbol y futsal (victoria 3, empate 1), baloncesto (victoria 2, derrota 1) y voleibol por sets (3-0 y 3-1 valen 3, 3-2 vale 2 y 1). Muestra el campeón al finalizar y las posiciones provisionales mientras el torneo está en curso.

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

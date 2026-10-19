# ALIS API

Servicio compartido por TicketsALIS y DashboardALIS.

## Inicio

1. Copia `.env.example` como `.env`. Configura `DIRECT_URL` con la credencial de migración y `JWT_SECRET` con al menos 32 bytes aleatorios.
2. Ejecuta `npm install`.
3. Ejecuta `npm run prisma:generate`.
4. Ejecuta `npx prisma migrate deploy` para aplicar las migraciones existentes.
5. Ejecuta `npm run db:runtime` para configurar la contraseña aleatoria del rol limitado `alis_app` y actualizar `DATABASE_URL` sin mostrar secretos. Este comando rota su credencial; reinicia la API después de ejecutarlo.
6. Ejecuta `npm run db:accounts` para crear las cuentas locales de administrador y miembros. Las contraseñas aleatorias se muestran una sola vez. Ejecutarlo de nuevo conserva las contraseñas existentes.
7. Ejecuta `npm run dev` para iniciar la API en el puerto 4000. Requiere Node.js 22 o posterior; utiliza el observador nativo de Node.

`npm run db:seed` carga los datos de demostración; puede actualizar los tickets de demostración existentes. `npm run db:accounts` únicamente prepara las cuentas de acceso.

## Acceso y permisos

`POST /api/auth/login` recibe `{ "identifier": "usuario o correo", "password": "..." }` y devuelve únicamente el perfil del usuario. También conserva la propiedad `email` para los clientes anteriores. Los nombres de usuario no distinguen mayúsculas y tienen una restricción única normalizada en PostgreSQL. El JWT de ocho horas se envía en la cookie `alis_session`, con `HttpOnly`, `SameSite=Strict`, ruta `/api` y `Secure` cuando `NODE_ENV=production`. No se aceptan tokens Bearer; los frontends eliminan la antigua clave `alis-session` y no almacenan credenciales en Web Storage. Las contraseñas usan scrypt con salt y el hash del JWT se asocia a una sesión revocable en la base de datos.

El cliente utiliza `credentials: include`. Todas las escrituras, incluidos login, logout, aceptación de términos y feedback, requieren un `Origin` configurado y la cabecera `X-ALIS-Request: 1`. Un cliente de pruebas o consola también debe incluir ambos. CORS permite credenciales para los orígenes explícitos, nunca para `*`.

En producción, frontend y API necesitan HTTPS y pertenecer al mismo sitio para conservar `SameSite=Strict`; se puede utilizar un proxy del mismo sitio. Proporciona al proceso web solo su credencial limitada y la clave de firma. La credencial de migración debe gestionarse por separado en despliegues. La configuración local mantiene ambas en `.env` para las herramientas Prisma; ese archivo está excluido del control de versiones.

- `GET /api/auth/me` recupera el usuario autenticado.
- `POST /api/auth/logout` revoca la sesión actual.
- `GET /api/users` lista perfiles sin credenciales.
- `POST /api/users` permite al administrador registrar miembros con contraseñas de 12 a 128 caracteres y `username` opcional de 3 a 32 letras, números o guiones bajos. El rol creado siempre es `MEMBER`.

Los accesos locales configurados son `ALIS` para la cuenta ADMIN de `nestor@alis.dev` y `Ness_ALIS` para la cuenta MEMBER de `ness@alis.dev`. Los correos de contacto y las relaciones de proyectos se conservan. Las contraseñas rotadas no se guardan en este archivo. La cuenta `ana@alis.dev` mantiene acceso por correo. Las cuentas antiguas sin contraseña no permiten iniciar sesión hasta configurar sus credenciales.

## Proyectos

- `GET /api/projects` devuelve únicamente proyectos de los que el usuario forma parte, también para ADMIN. Incluye progreso agregado de tickets públicos y el equipo del proyecto; los tokens del cliente solo se incluyen para administradores autorizados. Sin tickets públicos, el progreso es 0 y el indicador es «Sin hitos públicos».
- `POST /api/projects` es exclusivo de ADMIN. Recibe `name`, `description` y un `clientId` autorizado, o datos de `client` (`name`, `email`, `company`). Puede incluir hasta 50 `initialTickets` con `title`, `assignedToId` e `isVisibleToClient`. Se crea todo en una transacción; un cliente existente solo se reutiliza si pertenece al ámbito del administrador. El creador y los responsables iniciales se incorporan al equipo del proyecto. Los enlaces nuevos usan 32 bytes aleatorios.
- `DELETE /api/projects/:id` es exclusivo de ADMIN. Devuelve 204 y borra en cascada tickets, comentarios, documentos y actividad. Conserva al cliente y a los miembros del equipo. El token del dashboard deja de funcionar.
- `POST /api/clients` es exclusivo de ADMIN.
- `POST /api/projects/:id/members` permite al administrador integrante añadir una persona con `userId`.
- `DELETE /api/projects/:id/members/:userId` permite retirar acceso, dejando sin asignar sus tickets del proyecto. No permite retirar al creador ni el acceso del propio administrador que realiza la petición. La interfaz muestra estas acciones en «Equipo del proyecto».

El proyecto se muestra «Finalizado» únicamente cuando tiene tickets públicos y todos están resueltos. Los tickets internos no afectan este cálculo.

## Tickets

- `POST /api/tickets` permite a ADMIN crear un ticket con `title`, `description`, `priority`, `category`, `assignedToId`, `projectId` e `isVisibleToClient`.
- `GET /api/tickets` devuelve los tickets de proyectos autorizados para ADMIN y únicamente los propios dentro de sus proyectos para MEMBER, independientemente de los filtros solicitados. `?mine=true` también limita a ADMIN a sus tareas.
- `GET /api/tickets/client?clientToken=...` devuelve exclusivamente los tickets públicos del proyecto del token.
- `PATCH /api/tickets/:id/status` acepta `NEW`, `IN_PROGRESS` o `RESOLVED`. MEMBER solo modifica sus propios tickets.
- `PATCH /api/tickets/:id/assignment` permite a ADMIN integrante asignar o reasignar a una persona del mismo proyecto mediante `assignedToId`; `null` deja el ticket sin responsable.
- `POST /api/tickets/:id/comments` agrega feedback. El cliente debe enviar `body` y `clientToken`; la API verifica que el hito sea público y pertenezca al proyecto del token. La identidad del autor se deriva de la sesión o del token, nunca del `clientId` o `userId` recibido.

## Documentación y actividad

Los miembros autenticados únicamente pueden consultar y editar documentos de los proyectos a los que pertenecen:

- `GET /api/projects/:projectId/documents`
- `POST /api/projects/:projectId/documents`: `title` y `content` en Markdown.
- `PATCH /api/projects/:projectId/documents/:documentId`: `title`, `content` y `updatedAt` de la versión leída. Una edición concurrente devuelve 409; la interfaz permite recargar explícitamente antes de reintentar.
- `GET /api/projects/:projectId/documents/export`: descarga todos los documentos guardados del proyecto en un único archivo `.md`.
- `GET /api/activity?projectId=...`: últimas 50 acciones de los proyectos autorizados, registradas al crear proyectos o tickets, asignar responsables, cambiar estados y guardar documentos. El filtro de proyecto es opcional y no permite ampliar permisos.

## Aislamiento PostgreSQL

Las consultas de proyectos, clientes, tickets, comentarios, documentos, actividad y aceptación pasan por `withTenant`. Cada transacción usa `SET LOCAL ROLE alis_tenant` y contexto parametrizado de usuario o token; `SET LOCAL` evita conservar el contexto en el pool. Las tablas tienen RLS habilitado y forzado. `alis_app` no es superusuario, no tiene BYPASSRLS y no puede consultar directamente las tablas de proyectos fuera de ese rol. Las funciones de política tienen `search_path` fijo y ejecución restringida.

Las membresías históricas se reconstruyen con responsables, autores y participantes existentes; los administradores existentes reciben membresía explícita en los proyectos anteriores para conservar el acceso que ya tenían. Los proyectos nuevos no otorgan acceso global a otros administradores.

## Términos y privacidad del cliente

`GET /api/dashboard/:clientToken` devuelve únicamente `requiresTerms` y el texto versionado cuando el cliente aún no ha aceptado. No expone proyecto ni tickets. El endpoint alternativo de tickets y el de comentarios también bloquean el acceso hasta aceptar.

`POST /api/dashboard/:clientToken/terms` recibe `{ "accepted": true, "version": "2026-10-18.1" }`. Registra `Client.termsAccepted`, fecha y versión, además de una fila `TermsAcceptance` con la huella SHA-256 del texto y método de acceso. Las peticiones repetidas son idempotentes. Los registros de aceptación no pueden modificarse ni borrarse con el rol web; al eliminar un proyecto se conserva el registro ligado al cliente, con `projectId` nulo.

La aceptación corresponde al cliente para esa versión de condiciones y puede habilitar sus otros proyectos. Un cambio de `termsVersion` en `src/lib/terms.js` exige una nueva aceptación. El texto incluido es una base para revisión contractual; un enlace compartido no acredita la identidad de la persona ni representa por sí mismo una certificación de cumplimiento.

La interfaz de TicketsALIS incluye Proyectos, Todos los tickets, Mis tareas, Documentación, Actividad y Equipo según el rol. «Eliminar Proyecto» aparece bajo la URL del cliente y requiere confirmación en un modal. El editor conserva los cambios al navegar entre secciones y exige guardarlos o descartarlos antes de cambiar de proyecto o documento.

## Verificación

`npm test` ejecuta pruebas de integración HTTP y RLS con usuarios, clientes y proyectos temporales. El servidor usa `DATABASE_URL` limitado; las herramientas de preparación y limpieza usan `DIRECT_URL`. Las pruebas eliminan sus propios registros al finalizar y no reinician la base existente. Las credenciales de migración deben usarse únicamente en ese entorno de prueba controlado.

`npm audit` verifica las dependencias instaladas. El override de `deepmerge-ts` 8.0.0 corrige el aviso de agotamiento de pila de la dependencia de configuración de Prisma 6. Al actualizar Prisma, revisar si el override continúa siendo necesario.

En cada frontend, `npm run build` verifica la compilación de producción. Para iniciar TicketsALIS: `npm run dev -- --port 5173 --strictPort`; para DashboardALIS: `npm run dev -- --port 5174 --strictPort`. El portal del cliente mantiene su acceso por `/dashboard/:clientToken`.

La API permite solicitudes locales desde TicketsALIS (`http://localhost:5173`) y DashboardALIS (`http://localhost:5174`).

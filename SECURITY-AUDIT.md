# Auditoría de seguridad ALIS

Fecha: 18 de octubre de 2026. Alcance: backend Express/Prisma/PostgreSQL, TicketsALIS y DashboardALIS. Revisión de código, permisos y dependencias, con correcciones y pruebas de integración sobre registros temporales. No se ejecutaron operaciones Git.

## Hallazgos confirmados y correcciones

| Severidad inicial | Hallazgo e impacto | Corrección aplicada | Evidencia |
| --- | --- | --- | --- |
| Alta | Un usuario autenticado podía listar proyectos ajenos; ADMIN tenía acceso global a proyectos y tickets. | `ProjectMember` y filtros obligatorios por membresía, incluyendo administradores. Crear, asignar y eliminar exige acceso al proyecto. | `backend/src/controllers/projectController.js:20`, `backend/src/controllers/ticketController.js:17`, pruebas con dos administradores y dos proyectos distintos. |
| Alta | Los documentos, exportaciones y actividad admitían acceso por un identificador conocido, sin comprobar la pertenencia al proyecto. | `requireProject` en cada operación y feed limitado a proyectos autorizados. El responsable de un ticket debe pertenecer al mismo proyecto. | `backend/src/controllers/documentController.js:10`, `backend/src/routes/activityRoutes.js:6`, `backend/src/lib/tenant.js:8`. |
| Alta | La conexión web usaba un usuario PostgreSQL privilegiado y no había una segunda barrera ante consultas sin filtro. | Roles `alis_app` y `alis_tenant`, sin superusuario ni BYPASSRLS. Tablas con ENABLE y FORCE RLS, contexto parametrizado y local a la transacción. La conexión web no puede leer directamente las tablas de proyectos. | Migraciones `20261019020000_tenant_privacy`, `20261019021000_tenant_insert_policy`, `20261019022000_privacy_timestamp_permission`; pruebas de lecturas y modificaciones deliberadamente sin filtro de tenant. |
| Media | Las credenciales de sesión estaban en `sessionStorage` y eran legibles por JavaScript ante un XSS. | JWT mediante cookie HttpOnly, SameSite=Strict y Secure en producción; eliminación de la antigua clave local. El JWT no se devuelve en JSON ni se admite por Authorization. Se comprueban firma HS256, emisor, audiencia, expiración, identidad y sesión revocable con hash del JWT. | `backend/src/lib/session.js:14`, `backend/src/middlewares/auth.js:5`, `TicketsALIS/src/shared/api/tickets.js:1`. |
| Media | La incorporación de cookies necesitaba controles explícitos contra CSRF. | CORS con lista exacta de orígenes y credenciales. Cada escritura exige Origin permitido y cabecera X-ALIS-Request. | `backend/src/app.js:18`; pruebas de origen ajeno, origen ausente y cabecera ausente, también para DELETE. |
| Media | El endpoint público utilizaba selecciones amplias y exponía identificadores internos y metadatos innecesarios. | Proyección pública explícita, comentarios limitados a feedback de hitos y consultas vinculadas exclusivamente al token. Los enlaces nuevos usan 32 bytes aleatorios. Referrer-Policy en la API y meta no-referrer en el portal. | `backend/src/controllers/dashboardController.js:4`, pruebas de intento de comentar un ticket de otro token y de alterar el filtro projectId. |
| Media | No existía bloqueo de acceso ni evidencia persistente de aceptación de condiciones. | El backend devuelve solo el aviso antes de aceptar. Tickets y comentarios también quedan bloqueados. Client conserva bandera, fecha y versión; TermsAcceptance añade huella SHA-256, fecha y método. | `backend/src/controllers/dashboardController.js:22`, `backend/prisma/schema.prisma:101`, `DashboardALIS/src/features/privacy/TermsModal.jsx:3`. |
| Alta según los avisos de dependencias | npm audit identificó agotamiento de pila en deepmerge-ts y braces, con propagación a Prisma y nodemon. | Override acotado de deepmerge-ts a 8.0.0 para @prisma/config. Sustitución de nodemon por node --watch y eliminación de su árbol vulnerable. | package.json/package-lock.json del backend; npm audit sin avisos en los tres proyectos al finalizar. |

## RLS y alcance de los permisos

La membresía es por proyecto, no una organización comercial independiente. La API global de usuarios sigue siendo el directorio del equipo ALIS; únicamente ADMIN registra nuevos miembros. Los proyectos, clientes vinculados, tickets, documentos, comentarios y actividad están aislados por proyecto.

Las membresías históricas se reconstruyeron desde responsables, autores y participantes existentes. Los administradores que ya existían recibieron membresía explícita en los proyectos anteriores para preservar su acceso. Esto requiere revisión operativa si antes se consideraba que un administrador existente no debía tener acceso a alguno de esos proyectos. Los administradores nuevos no reciben acceso global.

El creador se añade al equipo al crear el proyecto. Un administrador autorizado puede incorporar o retirar integrantes desde «Equipo del proyecto». Al retirar a una persona se dejan sin asignar sus tickets y las peticiones posteriores pierden acceso. El creador y el administrador que realiza la operación no pueden retirarse mediante esa ruta.

Las políticas se aplican con un rol sin BYPASSRLS. Las funciones SECURITY DEFINER tienen consultas estáticas, search_path fijo y ejecución restringida. La función de progreso devuelve solo agregados de proyectos autorizados, permitiendo que MEMBER conozca el porcentaje sin recuperar los tickets privados de sus compañeros. [PostgreSQL explica las excepciones de superusuarios y propietarios a RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Registro de aceptación y límites de compliance

El registro incluye Client.termsAccepted, termsAcceptedAt y termsVersion; TermsAcceptance conserva cliente, proyecto de acceso, fecha del servidor, versión, huella del texto y método PROJECT_ACCESS_LINK. El rol de la aplicación no puede modificar ni borrar estas evidencias. La repetición de una aceptación vigente es idempotente mediante bloqueo transaccional del cliente.

La eliminación del proyecto conserva la evidencia asociada al cliente y deja su projectId nulo. El esquema no establece todavía un calendario jurídico de conservación o supresión; debe definirse según los contratos y requisitos aplicables antes de operar en producción.

La aceptación está asociada al cliente para una versión y puede habilitar otros proyectos de ese cliente. El enlace es una credencial de portador: su posesión no identifica de forma verificada a la persona física ni demuestra representación legal de la empresa. El texto incluido es una base funcional para revisión contractual, no una certificación de cumplimiento ni un reemplazo de un NDA firmado. No se registran IP ni user-agent en esta implementación.

Para publicar otra versión, modificar termsVersion y el contenido en `backend/src/lib/terms.js`. La API exige aceptar la versión vigente y registra su nueva huella; una versión antigua no habilita los hitos en RLS.

## Condiciones de despliegue

- El proceso web usa DATABASE_URL con alis_app. DIRECT_URL es una credencial administrativa para migraciones, cuentas y pruebas; en el entorno local está en el mismo .env, pero debe separarse del entorno del proceso web al desplegar.
- JWT_SECRET debe ser aleatorio y tener al menos 32 bytes. No debe compartirse entre entornos. Su rotación invalida los JWT existentes; cerrar sesión revoca la sesión en PostgreSQL.
- Producción necesita NODE_ENV=production, HTTPS y frontend/API bajo el mismo sitio para SameSite=Strict. CORS no sustituye a la autenticación ni al aislamiento.
- Las escrituras desde herramientas o integraciones deben enviar un Origin permitido y X-ALIS-Request: 1. Estos controles complementan SameSite, conforme al enfoque de defensa en profundidad de [OWASP para CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- El override de deepmerge-ts conserva Prisma 6; se debe revisar al actualizar Prisma. El mantenedor documenta la corrección y los cambios de compatibilidad en [la publicación 8.0.0](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0).
- Las cookies HttpOnly reducen la exposición del token, pero un XSS aún podría ejecutar acciones desde el navegador de la víctima. La revisión no encontró HTML arbitrario, eval ni consultas SQL Unsafe en los directorios de aplicación revisados; esto no equivale a una garantía absoluta de ausencia de vulnerabilidades.

## Verificación

La suite HTTP y PostgreSQL comprueba autenticación, cookies, revocación, CSRF, pertenencia del responsable, lectura y escritura cruzadas entre administradores, aislamiento de documentos y actividad, contexto RLS concurrente, rechazo del acceso directo sin contexto, bloqueo de términos, idempotencia y conservación de evidencia, comentarios públicos y eliminación en cascada.

Se ejecutan además Prisma validate/migrate status, compilaciones de producción de ambos frontends y npm audit en los tres proyectos. Las pruebas crean y eliminan exclusivamente sus propios registros temporales; no aceptan términos en nombre de clientes reales ni borran sus proyectos. No se realizó una prueba visual de navegador en esta sesión.

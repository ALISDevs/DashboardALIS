# Validación de integración ALIS

Fecha: 19 de octubre de 2026. Resultado: sin errores críticos en la integración local revisada.

## Configuración comprobada

- Ambos adaptadores Fetch utilizan `VITE_API_URL` y, por defecto, `http://localhost:4000`, añadiendo `/api` a las rutas. Los archivos `.env.example` coinciden con ese origen.
- Vite fija TicketsALIS en `http://localhost:5173` y DashboardALIS en `http://localhost:5174`, con `strictPort`. Ambos orígenes están configurados en el entorno local del backend.
- CORS responde con el origen autorizado y `Access-Control-Allow-Credentials: true`. Permite `Content-Type`, `X-ALIS-Request` y los métodos utilizados por los frontends.
- Todas las peticiones de los adaptadores incluyen `credentials: 'include'`. Las escrituras envían `X-ALIS-Request: 1`, coherente con la protección CSRF del backend.
- Login recibe usuario o correo y contraseña. La sesión se devuelve mediante `alis_session`, HttpOnly, SameSite=Strict y Path=/api; el perfil se restaura con `/api/auth/me` y logout revoca la sesión. No se devuelve el JWT en JSON.
- El enlace del cliente utiliza `/dashboard/:accessToken`. El frontend envía ese valor como `clientToken` en las rutas de consulta y aceptación, y en el cuerpo del comentario. El backend comprueba el proyecto, los términos y la visibilidad del ticket.

## Verificación ejecutada

- `backend`: `npm test`, 18 pruebas aprobadas y ninguna fallida. Incluye HTTP, cookies, CSRF, permisos, RLS, términos, comentarios y revocación de sesión. Los datos de prueba son temporales y se limpian al finalizar.
- `TicketsALIS`: `npm run build`, aprobado.
- `DashboardALIS`: `npm run build`, aprobado.
- Comprobación HTTP adicional sobre Express con el entorno local: health y respuesta 401 sin sesión desde ambos orígenes; preflight POST, PATCH y DELETE desde ambos puertos; rechazo 403 de un origen no autorizado.
- Las compilaciones muestran avisos de directivas `use client` de dependencias que Vite ignora. No impiden la generación de los bundles.

## Alcance

La revisión cubre código, configuración local, compilación e integración HTTP con PostgreSQL. No se realizó una prueba completa en navegador ni se validó un despliegue remoto. En producción se requiere HTTPS y frontend/API bajo el mismo sitio para conservar SameSite=Strict, además de configurar los orígenes y las variables de Vite para ese entorno.

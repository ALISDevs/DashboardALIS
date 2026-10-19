---
name: security-audit
description: Audita aplicaciones web Node.js, Express, Prisma y React en busca de vulnerabilidades OWASP, fallos de autorización, validación deficiente y configuraciones inseguras. Úsala cuando se solicite una revisión o endurecimiento de seguridad; no para desarrollo rutinario de funcionalidades.
---

# Security Audit

Realiza una auditoría de seguridad práctica para aplicaciones full-stack con Node.js, Express, Prisma, PostgreSQL y React. Prioriza riesgos explotables, exposición de datos y controles de acceso sobre observaciones de estilo.

## Alcance y límites

- Trata una solicitud de auditoría como lectura y análisis. Modifica código únicamente si el usuario pide expresamente correcciones o endurecimiento.
- No ejecutes operaciones Git.
- No expongas secretos, valores de `.env`, tokens, contraseñas o cadenas de conexión en el informe.
- No añadas comentarios de relleno al código ni uses emojis.

## Revisión de backend

Inspecciona rutas, controladores, middlewares y configuración de Express para identificar:

- Autenticación ausente o insuficiente y autorización horizontal o vertical rota.
- Endpoints públicos que devuelven campos internos, datos de otros clientes o recursos no publicados.
- Validación y normalización incompletas de `body`, `params` y `query`.
- Manejo inseguro de errores, enumeración de recursos y falta de límites de tamaño o tasa cuando sea relevante.
- Configuración de CORS: orígenes permitidos, métodos, cabeceras y credenciales. CORS no sustituye autenticación ni autorización.

## Revisión de datos

Verifica que Prisma se use mediante consultas tipadas y que cualquier consulta cruda sea parametrizada. Revisa relaciones, borrados en cascada, índices y restricciones que puedan afectar el aislamiento entre clientes, proyectos y tickets.

## Revisión de frontend

Comprueba que React no confíe en el cliente para controles de seguridad, que no use HTML no confiable sin sanitizar y que formularios o rutas públicas no permitan modificar datos fuera de los permisos del usuario. Evalúa cómo el frontend consume los endpoints públicos y si muestra información innecesaria.

## Informe

Entrega los hallazgos ordenados por severidad: Crítica, Alta, Media o Baja. Para cada uno incluye el archivo y línea relevante, el escenario de impacto, la corrección recomendada y cómo verificarla. Distingue vulnerabilidades confirmadas de mejoras preventivas.

Si se autorizaron correcciones, implementa solo las que correspondan al alcance, mantén compatibilidad con el esquema Prisma y valida con pruebas o comprobaciones proporcionales al cambio.

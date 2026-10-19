# ALIS

La solución se divide en tres unidades desplegables:

- `backend`: API Express y esquema PostgreSQL gestionado con Prisma.
- `TicketsALIS`: interfaz interna del equipo para gestionar tickets.
- `DashboardALIS`: interfaz de solo lectura para el cliente.

Los frontends siguen la misma distribución de módulos: `app`, `features` y `shared`. Cada uno posee un adaptador `shared/api/tickets.js`; el adaptador interno consulta todos los tickets y el adaptador del cliente identifica al consumidor como `dashboard`, por lo que la API entrega únicamente los tickets publicados.

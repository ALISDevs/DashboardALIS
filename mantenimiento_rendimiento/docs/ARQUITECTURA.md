# Diseño técnico

## Separación de responsabilidades

```text
JavaFX / FXML / CSS
        |
Servicios y reglas de negocio
        |
Repositorio JDBC con transacciones
        |
SQLite local + carpeta de documentos
```

- `domain`: entidades, entradas y reglas de cálculo con `BigDecimal`.
- `persistence`: migraciones, consultas y escrituras atómicas con auditoría.
- `service`: revisión de Excel, PDF e instantáneas de respaldo.
- `config`: ubicación de datos, composición de servicios y ejecutor de operaciones.
- `ui`: navegación, formularios, validación de entrada y tablas.

Las operaciones de base de datos, Excel, respaldo y PDF corren en un ejecutor separado del hilo JavaFX. La pantalla conserva un snapshot consistente de los datos. Al terminar una mutación se vuelve a consultar la base.

## Identidad de equipos y cierres

`equipos` usa `(tipo, numero_economico)` como identidad comercial única. Tractor 82 y thermo 82 pueden coexistir. Un cierre pertenece a un solo equipo consumidor. Una futura asignación tractor/thermo describe logística y no sustituye los cierres individuales.

`cierre_operadores` admite varios participantes por cierre. En la interfaz inicial solo se captura el principal. Los nombres no son identificadores únicos de personas ni se fusionan por acentos, separadores o semejanza.

Se permiten varios cierres del mismo equipo en un periodo. La identificación técnica es el ID del cierre. Los futuros registros importados tienen identidad adicional por lote, hoja y fila. Los lotes tienen hash y año confirmado para detectar reimportaciones del mismo contenido.

## Mantenimiento

Un mantenimiento contiene equipo, fecha, falla, trabajo, responsable, lectura y estado. Los importes se almacenan en `mantenimiento_conceptos`, por separado para refacciones, mano de obra y otros. El costo total se consulta sumando conceptos, evitando guardar un total duplicado.

Se puede pasar de pendiente a en proceso, terminado o cancelado, y de en proceso a terminado o cancelado. Los trabajos terminados y cancelados no se reabren en la versión inicial. Cada cambio de estado conserva antes y después en la bitácora.

`adjuntos` reserva el vínculo con documentos, ruta relativa y hash. Aún no hay alta de archivos en la interfaz. No se almacena una ruta absoluta al archivo original del usuario.

## Exactitud y persistencia

- Medición, litros, metas y tasas: texto decimal exacto en SQLite.
- Importes monetarios finales: enteros de 64 bits en centavos.
- Cálculos: Java `BigDecimal`, nunca `double` para dinero.
- El saldo debe coincidir con presupuesto menos gasto mediante una restricción SQL.
- Claves foráneas activadas en cada conexión.
- Escritura y auditoría en la misma transacción, con rollback ante errores.
- Migraciones versionadas en `schema_migrations`, dentro de una transacción.
- Una base de una versión futura no se abre para escritura con una versión anterior.
- Las fechas de eventos son instantes UTC y se muestran en la zona local del equipo.

Los `CAST AS REAL` del esquema se usan únicamente como validaciones de signo. El cálculo monetario y las sumas de costos usan valores exactos.

## Excel y trazabilidad

El lector inicial solo analiza los bloques de combustible y sus valores originales. No guarda cierres ni modifica libros. La siguiente etapa separará extracción, propuestas de normalización, conciliación y confirmación transaccional. Las coincidencias no autorizan eliminar registros automáticamente.

Las metas inferidas de plantillas, las etiquetas de horas en tractores y las identidades ambiguas deben conservar advertencias hasta su confirmación. El año debe confirmarse por lote. Los totales de kilómetros y horas nunca se mezclan.

## Distribución

El empaquetado no requiere convertir toda la aplicación en módulos JPMS. Se usa un lanzador de classpath separado de `Application`, un JAR con manifiesto y dependencias en `lib/`. `jpackage` incluye un runtime con los módulos Java necesarios. JavaFX y las bibliotecas nativas se distribuyen en las dependencias del programa.

La imagen se construye y se prueba en Windows x64. EXE/MSI requieren WiX 3.x con JDK 21. Java y las herramientas de empaquetado no se requieren en la laptop de destino. Los datos operativos se guardan fuera del directorio de instalación.

La validación de esta base no equivale todavía a certificar actualizaciones de una versión productiva ni despliegues multiusuario. Esas verificaciones forman parte de los hitos del plan.

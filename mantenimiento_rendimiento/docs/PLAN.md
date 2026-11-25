# Etapas del proyecto

## Base 0.1.0

- [x] Proyecto Maven Java 21 con herramientas locales.
- [x] Navegación JavaFX con FXML y estilos.
- [x] Catálogos iniciales de equipos y operadores.
- [x] Reglas independientes para tractores y thermos.
- [x] Captura persistente de combustible.
- [x] Alta de mantenimiento, costos y cambios de estado.
- [x] Auditoría transaccional.
- [x] Revisión de Excel sin modificar ni importar datos.
- [x] PDF general y respaldo ZIP verificado.
- [x] Scripts de distribución autónoma y EXE/MSI.

## Hito 1: captura y expediente completos

- Edición de equipos y operadores con auditoría y baja lógica.
- Historial de metas y fechas de vigencia.
- Edición y borradores de cierres, control de versiones y participantes múltiples.
- Expediente de equipo con combustible, trabajos, documentos y acumulados.
- Adjuntos gestionados por la aplicación con nombres internos y hashes.
- Diferenciar presupuesto de mantenimiento, costo realizado y pago si ese alcance se confirma.

Aceptación: capturar y corregir una operación sin perder sus valores anteriores ni afectar cierres históricos por cambios de catálogo.

## Hito 2: migración histórica revisable

- Extracción detallada de ambos formatos, preservando texto y coordenadas originales.
- Año confirmado y previsualización por registro.
- Alias de operadores confirmados, sin fusiones automáticas.
- Metas en conflicto, datos manuales válidos, fórmulas faltantes y datos incompletos.
- Propuestas justificadas de reconstrucción, aprobadas por registro o grupo.
- Conciliación por equipo y periodo con totales antes y después.
- Confirmación de lote, incidencias persistentes y detección de reimportaciones.

Aceptación: reconocer los 118 bloques con datos de tractores y 99 de thermos, permitir resolver o dejar pendientes sus incidencias y evitar duplicados al repetir un lote. No asumir que todos los bloques con datos están completos ni aprobar coincidencias entre equipos como duplicados sin revisión.

## Hito 3: logística y análisis

- Viajes, ubicaciones y rutas.
- Asignaciones de tractor, thermo y operadores por recorrido o periodo.
- Relación opcional entre viajes y cierres sin inventar trayectos históricos.
- Filtros combinados, tasas ponderadas y comparación de equipos compatibles.
- Reportes por equipo, periodo, operador y mantenimiento.
- Tablero con gráficas y PDF de expediente con paginación verificada.
- Seguimiento individual de llantas si se confirma ese nivel de detalle.

Aceptación: consultar el costo de combustible y mantenimiento de un equipo, preservando unidades de medida y las diferencias entre corte y viaje.

## Hito 4: entrega operativa

- Restauración asistida en carpeta nueva y verificación antes de sustituir datos.
- Respaldos programados, retención y selección de un destino externo.
- Respaldo previo a migraciones sobre datos existentes.
- Prueba de instalación limpia en una laptop sin Java.
- Prueba de actualización conservando datos y documentos.
- Prueba de recuperación desde un respaldo.
- Firma del instalador cuando exista un certificado de distribución.
- Manual breve y datos históricos importados solo después de su revisión.

Aceptación: instalar, trabajar sin internet, actualizar y recuperar información sin depender del entorno del desarrollador.

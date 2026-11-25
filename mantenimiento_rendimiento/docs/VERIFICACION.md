# Verificación de la base 0.1.0

Fecha: 5 de noviembre de 2026. Plataforma de construcción: Windows x64, Temurin 21.0.13.

## Pruebas realizadas

- `maven.ps1 '-Dmr.referenceDir=C:\Users\nesso\Downloads' verify`: 20 pruebas ejecutadas, sin fallas ni errores.
- La compilación normal vuelve a ejecutar 19 pruebas y omite la prueba opcional de los archivos originales si no se proporciona `mr.referenceDir`.
- Cálculos de tractores y thermos, importes y redondeos.
- Rechazo de mediciones o litros faltantes, negativos o iguales a cero.
- Conservación de la meta aplicada después de cambiar la meta del catálogo en una prueba aislada.
- Múltiples cortes del mismo equipo y mes.
- Cierre de thermo independiente de un tractor.
- Claves foráneas por conexión y rollback de cierre y auditoría ante un operador inexistente.
- Costos de reparación y transiciones de estado con auditoría.
- Respaldo ZIP y lectura de la base recuperada desde ese archivo en una carpeta temporal.
- PDF legible con base vacía y con registros de prueba.
- Revisión de Excel que distingue estimados manuales de datos faltantes y verifica que un archivo de prueba no cambie.
- Lectura de ambos Excel originales: 174 bloques / 118 con datos en tractores y 133 / 99 en thermos. Sin importación ni corrección de los libros.

## Arranque y presentación

- JavaFX cargó FXML, CSS y SQLite con datos sintéticos en `.run/visual-01`.
- Se revisaron capturas de resumen y mantenimiento, y se generaron además las de equipos, combustible y bitácora.
- Se corrigió el espacio mínimo del detalle de mantenimiento para conservar tres líneas visibles en una pantalla de laptop.
- El ejecutable autónomo se probó con su runtime incluido, una base vacía y una carpeta aislada `.run/packaged-01`.
- La prueba autónoma confirmó el arranque y generó las cinco capturas y `smoke-ok.txt`.
- No se incluyeron datos sintéticos ni datos de los Excel en el instalador.

## Distribuciones generadas

- `dist/windows/app-image/MantenimientoRendimiento/`: imagen autónoma. Debe distribuirse la carpeta completa.
- `dist/windows/exe/MantenimientoRendimiento-0.1.0.exe`: instalador inicial Windows por usuario con Java incluido.

## Pendiente antes de una entrega productiva

- Instalar y desinstalar en un entorno limpio, y verificar una actualización entre dos versiones distintas.
- Completar la captura y edición operativa descrita en `PLAN.md`.
- Confirmación y conciliación de importaciones históricas.
- Adjuntos desde la interfaz, restauración asistida y respaldo programado.
- Pruebas manuales completas de formularios con el usuario operativo y los datos reales.

La verificación de arranque y las pruebas automatizadas cubren esta base inicial. No sustituyen la aceptación de los flujos pendientes.

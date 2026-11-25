# Indicadores y Registros

Aplicación de escritorio para Windows que guarda localmente combustible y reparaciones de tractores y thermos. Proyecto independiente dentro de `ALIS/mantenimiento_rendimiento`.

## Uso de la versión 1.0.0

1. Abre **Equipos registrados**. La vista inicial muestra tractores. Usa **Thermos** o **Todos** para ver los demás equipos.
2. Registra el equipo con su factor de rendimiento. Abre su tarjeta para ver los datos generales y la ficha mensual.
3. Elige un mes y captura la fecha, el operador actual, las horas o kilómetros trabajados, el costo por litro y los litros cargados.
4. Guarda y consulta el resumen de ese mes. Selecciona una fila para editarla o eliminarla. Para recuperar otro mes, abre **Historial por mes** o usa el selector de periodo.
5. En la ficha de un thermo, entra en **Mantenimiento** para capturar trabajos, técnicos, talleres, costos y el estado **Terminado** o **Sin Terminar**. Cada sección tiene su propio PDF del mes y de las filas visibles.
6. En el menú lateral, abre **Resumen mensual**, elige un equipo y usa **PDF mensual de la unidad** para exportar el mes seleccionado. El PDF de un thermo incluye combustible y mantenimiento. En **Resumen total**, usa **PDF general** para exportar el acumulado de la empresa de todos los periodos. Cada ficha también tiene un **Acumulado de la unidad**.

La fila **Totales** suma las cantidades e importes de las filas visibles. La columna de factor real muestra el promedio de los factores de esas filas. En el resumen total, las horas de thermos y los kilómetros de tractores se presentan por separado. Las eliminaciones retiran el registro de las vistas y dejan constancia en la bitácora.

### Historial de Excel

Usa **Importar historial**, selecciona un libro de thermos o tractores y confirma el año al que pertenecen los meses. La vista previa muestra los factores propuestos para equipos nuevos y los bloques que requieren revisión. Al confirmar, los bloques completos se incorporan al historial. Los bloques incompletos se pueden corregir o descartar desde **Excel por revisar** en la ficha del equipo. El libro se abre en modo de lectura.

La app conserva el operador original del Excel, el factor histórico de cada cierre y su referencia de hoja y fila. Las fechas mensuales de origen se muestran sin día.

## Tecnologías

- Java 21 y JavaFX 21: aplicación de escritorio con FXML y CSS.
- Maven: compilación y dependencias fijadas en `pom.xml`.
- SQLite/JDBC: base local, claves foráneas, transacciones y migraciones.
- Apache POI: lectura de Excel sin modificar los originales.
- OpenPDF: exportación PDF.
- JUnit 5: pruebas de negocio, persistencia, respaldo, PDF y lectores.
- `jpackage`: imagen autónoma e instaladores Windows. WiX 3.14.1 portátil para EXE/MSI con JDK 21.

## Preparar y ejecutar desde el código

Requiere Windows x64 y conexión para la primera descarga de herramientas y dependencias. Las herramientas se descargan en `.tools`, sin modificar Java ni Maven globales.

Desde PowerShell, en esta carpeta:

```powershell
.\scripts\bootstrap.ps1
.\scripts\maven.ps1 verify
.\scripts\run.ps1
```

Si PowerShell bloquea un script por la política local, se puede ejecutar únicamente ese proceso así:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

Para usar una carpeta de datos de desarrollo:

```powershell
.\scripts\run.ps1 -DataDirectory .\.run\desarrollo
```

`run.ps1` compila y ejecuta las pruebas antes de abrir la aplicación. El usuario del instalador no necesita estas herramientas ni conexión para utilizar la aplicación.

## Crear la distribución de Windows

Imagen autónoma que puede ejecutarse sin instalar Java:

```powershell
.\scripts\package-windows.ps1 -Type app-image
```

La carpeta completa generada contiene el ejecutable y su runtime. No se debe copiar únicamente el archivo `.exe` de esa imagen.

Instalador EXE o MSI:

```powershell
.\scripts\bootstrap-installer.ps1
.\scripts\package-windows.ps1 -Type exe
# Alternativa:
.\scripts\package-windows.ps1 -Type msi
```

Los paquetes se generan en `dist/windows/`. La instalación es por usuario y agrega accesos directos. El instalador inicial no lleva firma digital. El UUID de actualización es estable y la versión debe incrementarse para cada nueva entrega. La generación del paquete no instala el programa automáticamente en la laptop.

## Datos y respaldos

Por defecto:

```text
%LOCALAPPDATA%/MantenimientoRendimiento/
  mantenimiento-rendimiento.db
  comprobantes/
  respaldos/
  logs/
```

Los datos están separados del programa. Una actualización no debe reemplazar esa carpeta. La base activa debe permanecer en el disco local, fuera de carpetas compartidas o sincronizadas en vivo. La primera versión trabaja con una base local por laptop, sin sincronización entre equipos.

Al pulsar **Respaldar**, elige la carpeta donde guardar el ZIP. El proceso usa `VACUUM INTO`, comprueba la integridad e incluye los comprobantes existentes. La carpeta interna de comprobantes se reserva para archivos adjuntos. Para restaurar, cierra la aplicación, conserva la carpeta de datos actual y extrae el respaldo completo en una carpeta nueva. Puedes abrirla con `-DataDirectory` para verificarla antes de reemplazar datos.

## Reglas de cálculo

| Concepto | Tractor | Thermo |
|---|---|---|
| Medición | km | horas |
| Factor | km/L | L/h |
| Litros estimados | km / factor | horas × factor |
| Rendimiento observado | km / litros | litros / horas |

El presupuesto y gasto se calculan con `BigDecimal`, se redondean a dos decimales con `HALF_UP` y se almacenan como centavos enteros. El saldo es la diferencia de esos importes ya redondeados. El porcentaje de rendimiento divide el saldo entre el costo previsto, igual que en el Excel. El factor, precio y versión de cálculo quedan conservados en el cierre.

Se requieren medición, litros, precio y meta mayores que cero para guardar un cierre en esta versión. Un dato faltante no se transforma en cero. La desviación presupuestal no equivale al rendimiento físico, y los litros cargados no acreditan por sí solos consumo exacto ni responsabilidad del operador. El precio de los Excel originales no se establece como precio obligatorio en nuevas capturas.

Los costos de mantenimiento son importes registrados. Un estado terminado no acredita pago ni sustituye contabilidad. El historial de reparaciones y la bitácora de acciones son registros diferentes. La bitácora identifica al usuario del sistema operativo y no se presenta como un registro inalterable frente a acceso directo al archivo SQLite.

## Verificación

```powershell
.\scripts\maven.ps1 verify
# Opcional: contraste de lectura con los dos Excel proporcionados:
.\scripts\maven.ps1 '-Dmr.referenceDir=C:\ruta\a\los\archivos' verify
```

Las pruebas opcionales esperan los nombres `INDICADORES TRACTORES.xlsx` e `INDICADORES THERMOS.xlsx`. Verifican la lectura y la importación en una base temporal.

Prueba visual sin abrir una ventana de trabajo, usando siempre una carpeta aislada:

```powershell
.\scripts\run.ps1 -DataDirectory .\.run\verificacion -SmokeTest
```

Genera capturas de las pantallas para revisión. No se debe usar la carpeta de datos operativos para pruebas.

Consulta [el diseño técnico](docs/ARQUITECTURA.md) y [las etapas pendientes](docs/PLAN.md).

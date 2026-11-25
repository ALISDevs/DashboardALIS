CREATE TABLE equipos (
    id INTEGER PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('TRACTOR', 'THERMO')),
    numero_economico TEXT NOT NULL CHECK (length(trim(numero_economico)) > 0),
    placas TEXT NOT NULL DEFAULT '',
    marca_modelo TEXT NOT NULL DEFAULT '',
    meta_actual TEXT NOT NULL CHECK (CAST(meta_actual AS REAL) > 0),
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    UNIQUE (tipo, numero_economico)
) STRICT;

CREATE TABLE operadores (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
    licencia TEXT NOT NULL DEFAULT '',
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
) STRICT;
CREATE UNIQUE INDEX operadores_licencia_unica ON operadores(licencia) WHERE licencia <> '';

CREATE TABLE importaciones (
    id INTEGER PRIMARY KEY,
    nombre_archivo TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    anio_confirmado INTEGER NOT NULL CHECK (anio_confirmado BETWEEN 1900 AND 2200),
    tipo TEXT NOT NULL CHECK (tipo IN ('TRACTOR', 'THERMO')),
    fecha TEXT NOT NULL,
    UNIQUE (sha256, anio_confirmado)
) STRICT;

CREATE TABLE cierres_combustible (
    id INTEGER PRIMARY KEY,
    equipo_id INTEGER NOT NULL REFERENCES equipos(id),
    periodo TEXT NOT NULL CHECK (length(periodo) = 7),
    tipo_medicion TEXT NOT NULL CHECK (tipo_medicion IN ('KM', 'HORAS')),
    medicion TEXT NOT NULL CHECK (CAST(medicion AS REAL) > 0),
    litros_cargados TEXT NOT NULL CHECK (CAST(litros_cargados AS REAL) > 0),
    meta_aplicada TEXT NOT NULL CHECK (CAST(meta_aplicada AS REAL) > 0),
    precio_litro TEXT NOT NULL CHECK (CAST(precio_litro AS REAL) > 0),
    litros_estimados TEXT NOT NULL,
    diferencia_litros TEXT NOT NULL,
    presupuesto_centavos INTEGER NOT NULL CHECK (presupuesto_centavos >= 0),
    gasto_centavos INTEGER NOT NULL CHECK (gasto_centavos >= 0),
    saldo_centavos INTEGER NOT NULL,
    desviacion_presupuesto TEXT,
    rendimiento_observado TEXT NOT NULL,
    version_calculo TEXT NOT NULL,
    origen TEXT NOT NULL CHECK (origen IN ('MANUAL', 'EXCEL')),
    importacion_id INTEGER REFERENCES importaciones(id),
    hoja_origen TEXT,
    fila_origen INTEGER,
    operador_original TEXT,
    notas TEXT NOT NULL DEFAULT '',
    creado_en TEXT NOT NULL,
    CHECK (saldo_centavos = presupuesto_centavos - gasto_centavos),
    CHECK ((origen = 'MANUAL' AND importacion_id IS NULL) OR (origen = 'EXCEL' AND importacion_id IS NOT NULL AND hoja_origen IS NOT NULL AND fila_origen IS NOT NULL)),
    UNIQUE (importacion_id, hoja_origen, fila_origen)
) STRICT;
CREATE INDEX cierres_equipo_periodo ON cierres_combustible(equipo_id, periodo);

CREATE TABLE cierre_operadores (
    cierre_id INTEGER NOT NULL REFERENCES cierres_combustible(id),
    operador_id INTEGER NOT NULL REFERENCES operadores(id),
    rol TEXT NOT NULL CHECK (rol IN ('PRINCIPAL', 'RELEVO')),
    PRIMARY KEY (cierre_id, operador_id)
) STRICT;

CREATE TABLE mantenimientos (
    id INTEGER PRIMARY KEY,
    equipo_id INTEGER NOT NULL REFERENCES equipos(id),
    fecha TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (length(trim(categoria)) > 0),
    falla_reportada TEXT NOT NULL DEFAULT '',
    trabajo_realizado TEXT NOT NULL CHECK (length(trim(trabajo_realizado)) > 0),
    tecnico TEXT NOT NULL DEFAULT '',
    taller TEXT NOT NULL DEFAULT '',
    lectura_medidor TEXT CHECK (lectura_medidor IS NULL OR CAST(lectura_medidor AS REAL) >= 0),
    estado TEXT NOT NULL CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'TERMINADO', 'CANCELADO')),
    creado_en TEXT NOT NULL
) STRICT;
CREATE INDEX mantenimientos_equipo_fecha ON mantenimientos(equipo_id, fecha);

CREATE TABLE mantenimiento_conceptos (
    id INTEGER PRIMARY KEY,
    mantenimiento_id INTEGER NOT NULL REFERENCES mantenimientos(id),
    categoria TEXT NOT NULL CHECK (categoria IN ('REFACCIONES', 'MANO_OBRA', 'OTROS')),
    descripcion TEXT NOT NULL,
    importe_centavos INTEGER NOT NULL CHECK (importe_centavos >= 0)
) STRICT;

CREATE TABLE adjuntos (
    id INTEGER PRIMARY KEY,
    mantenimiento_id INTEGER NOT NULL REFERENCES mantenimientos(id),
    nombre_original TEXT NOT NULL,
    ruta_relativa TEXT NOT NULL UNIQUE,
    sha256 TEXT NOT NULL,
    creado_en TEXT NOT NULL
) STRICT;

CREATE TABLE bitacora (
    id INTEGER PRIMARY KEY,
    fecha TEXT NOT NULL,
    actor TEXT NOT NULL,
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    valores_anteriores TEXT,
    valores_nuevos TEXT
) STRICT;

ALTER TABLE cierres_combustible ADD COLUMN fecha_registro TEXT;
ALTER TABLE cierres_combustible ADD COLUMN eliminado_en TEXT;
ALTER TABLE mantenimientos ADD COLUMN eliminado_en TEXT;

CREATE TABLE cargas_combustible (
    cierre_id INTEGER NOT NULL REFERENCES cierres_combustible(id),
    orden INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    litros TEXT NOT NULL CHECK (CAST(litros AS REAL) > 0),
    PRIMARY KEY (cierre_id, orden)
) STRICT;

CREATE TABLE historial_pendiente (
    id INTEGER PRIMARY KEY,
    importacion_id INTEGER NOT NULL REFERENCES importaciones(id),
    equipo_id INTEGER NOT NULL REFERENCES equipos(id),
    hoja TEXT NOT NULL,
    fila INTEGER NOT NULL,
    periodo TEXT,
    mes_original TEXT NOT NULL,
    medicion_original TEXT NOT NULL,
    operador_original TEXT NOT NULL,
    medicion TEXT,
    litros TEXT,
    factor TEXT,
    precio TEXT,
    motivo TEXT NOT NULL,
    resuelto_en TEXT,
    UNIQUE (importacion_id, hoja, fila)
) STRICT;

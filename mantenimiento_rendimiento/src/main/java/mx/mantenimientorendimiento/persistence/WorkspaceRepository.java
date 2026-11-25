package mx.mantenimientorendimiento.persistence;

import mx.mantenimientorendimiento.domain.*;
import mx.mantenimientorendimiento.service.ExcelHistory;

import java.math.BigDecimal;
import java.sql.*;
import java.time.*;
import java.util.*;

public final class WorkspaceRepository {
    private final Database database;
    private final FuelCalculator calculator = new FuelCalculator();
    private final String actor;

    public WorkspaceRepository(Database database, String actor) {
        this.database = Objects.requireNonNull(database);
        this.actor = required(actor, "Falta identificar al usuario del equipo.");
    }

    public long createEquipment(EquipmentType type, String number, String plates, String model, BigDecimal target) throws SQLException {
        Objects.requireNonNull(type, "Selecciona el tipo de equipo.");
        String economic = required(number, "Captura el número económico.").toUpperCase(Locale.ROOT);
        FuelCalculator.positive(target, "La meta");
        return transaction(c -> {
            try (PreparedStatement p = c.prepareStatement("INSERT INTO equipos(tipo,numero_economico,placas,marca_modelo,meta_actual) VALUES (?,?,?,?,?)")) {
                p.setString(1,type.name()); p.setString(2,economic); p.setString(3,clean(plates));
                p.setString(4,clean(model)); p.setString(5,target.toPlainString()); p.executeUpdate();
            }
            long id = lastId(c);
            audit(c,"ALTA_EQUIPO","equipo:"+id,type+" "+economic,null,
                    json("tipo",type.name(),"numero",economic,"placas",clean(plates),"modelo",clean(model),"meta",target.toPlainString()));
            return id;
        });
    }

    public void updateEquipment(long id, String plates, String model, BigDecimal factor) throws SQLException {
        FuelCalculator.positive(factor, "El factor de rendimiento");
        transaction(connection -> {
            Equipment previous = findEquipment(connection, id);
            try (PreparedStatement statement = connection.prepareStatement(
                    "UPDATE equipos SET placas=?, marca_modelo=?, meta_actual=? WHERE id=?")) {
                statement.setString(1, clean(plates));
                statement.setString(2, clean(model));
                statement.setString(3, decimal(factor));
                statement.setLong(4, id);
                statement.executeUpdate();
            }
            audit(connection, "EDITAR_EQUIPO", "equipo:" + id, previous.toString(),
                    json("placas", previous.plates(), "modelo", previous.model(), "factor", decimal(previous.target())),
                    json("placas", clean(plates), "modelo", clean(model), "factor", decimal(factor)));
            return null;
        });
    }

    public void importHistory(ExcelHistory history) throws SQLException {
        transaction(connection -> {
            try (PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO importaciones(nombre_archivo,sha256,anio_confirmado,tipo,fecha) VALUES (?,?,?,?,?)
                    ON CONFLICT (sha256,anio_confirmado) DO NOTHING
                    """)) {
                statement.setString(1, history.filename());
                statement.setString(2, history.hash());
                statement.setInt(3, history.year());
                statement.setString(4, history.type().name());
                statement.setString(5, Instant.now().toString());
                if (statement.executeUpdate() == 0) {
                    throw new IllegalArgumentException("Este archivo ya se importó para " + history.year() + ".");
                }
            }
            long batchId = lastId(connection);
            for (ExcelHistory.Unit unit : history.units()) {
                Equipment equipment = importedEquipment(connection, history.type(), unit);
                for (ExcelHistory.Block block : unit.blocks()) {
                    if (block.pending()) {
                        addPending(connection, batchId, equipment.id(), block);
                    } else {
                        FuelDraft draft = new FuelDraft(equipment.id(), null, block.period(), block.measurement(),
                                block.liters(), block.factor(), block.price(), "");
                        writeFuel(connection, equipment, draft, null,
                                new ImportSource(batchId, block.sheet(), block.row(), block.operator()));
                    }
                }
            }
            audit(connection, "IMPORTAR_HISTORIAL", "importacion:" + batchId,
                    history.filename() + " · " + history.year() + " · " + history.blocks().size() + " registros", null, null);
            return null;
        });
    }

    public long resolvePending(long id, FuelDraft draft) throws SQLException {
        return transaction(connection -> {
            PendingFuel pending = pendingEntry(connection, id, draft.equipmentId());
            if (draft.period() == null || draft.period().getYear() != pending.year()) {
                throw new IllegalArgumentException("Selecciona un periodo del año " + pending.year() + " confirmado para el archivo.");
            }
            long batchId;
            try (PreparedStatement statement = connection.prepareStatement("SELECT importacion_id FROM historial_pendiente WHERE id=?")) {
                statement.setLong(1, id);
                try (ResultSet rows = statement.executeQuery()) {
                    rows.next();
                    batchId = rows.getLong(1);
                }
            }
            long closure = writeFuel(connection, findEquipment(connection, draft.equipmentId()), draft, null,
                    new ImportSource(batchId, pending.sheet(), pending.row(), pending.operator()));
            finishPending(connection, id);
            audit(connection, "RESOLVER_HISTORIAL", "cierre:" + closure,
                    pending.sheet() + " · fila " + pending.row(), null,
                    fuelValues(fuelEntry(connection, closure, draft.equipmentId())));
            return closure;
        });
    }

    public void discardPending(long equipmentId, long id) throws SQLException {
        transaction(connection -> {
            PendingFuel pending = pendingEntry(connection, id, equipmentId);
            finishPending(connection, id);
            audit(connection, "DESCARTAR_HISTORIAL", "pendiente:" + id,
                    pending.sheet() + " · fila " + pending.row(), null, null);
            return null;
        });
    }

    private Equipment importedEquipment(Connection connection, EquipmentType type, ExcelHistory.Unit unit) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT * FROM equipos WHERE tipo=? AND numero_economico=?")) {
            statement.setString(1, type.name());
            statement.setString(2, unit.number());
            try (ResultSet rows = statement.executeQuery()) {
                if (rows.next()) return equipmentRow(rows);
            }
        }
        if (unit.factor() == null) {
            throw new IllegalArgumentException("Registra primero " + type + " " + unit.number() + " con su factor de rendimiento.");
        }
        FuelCalculator.positive(unit.factor(), "El factor de rendimiento");
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO equipos(tipo,numero_economico,placas,marca_modelo,meta_actual) VALUES (?,?,?,?,?)")) {
            statement.setString(1, type.name());
            statement.setString(2, unit.number());
            statement.setString(3, unit.plates());
            statement.setString(4, unit.model());
            statement.setString(5, decimal(unit.factor()));
            statement.executeUpdate();
        }
        return findEquipment(connection, lastId(connection));
    }

    private static void addPending(Connection connection, long batchId, long equipmentId, ExcelHistory.Block block)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO historial_pendiente(importacion_id,equipo_id,hoja,fila,periodo,mes_original,
                medicion_original,operador_original,medicion,litros,factor,precio,motivo)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                """)) {
            statement.setLong(1, batchId);
            statement.setLong(2, equipmentId);
            statement.setString(3, block.sheet());
            statement.setInt(4, block.row());
            statement.setString(5, Objects.toString(block.period(), null));
            statement.setString(6, block.originalMonth());
            statement.setString(7, block.measurementLabel());
            statement.setString(8, block.operator());
            statement.setString(9, decimal(block.measurement()));
            statement.setString(10, decimal(block.liters()));
            statement.setString(11, decimal(block.factor()));
            statement.setString(12, decimal(block.price()));
            statement.setString(13, block.reason());
            statement.executeUpdate();
        }
    }

    private static void finishPending(Connection connection, long id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("UPDATE historial_pendiente SET resuelto_en=? WHERE id=?")) {
            statement.setString(1, Instant.now().toString());
            statement.setLong(2, id);
            statement.executeUpdate();
        }
    }

    public long createOperator(String name, String license) throws SQLException {
        String normalized = required(name,"Captura el nombre del operador.").replaceAll("\\s+", " ");
        return transaction(c -> {
            try (PreparedStatement p=c.prepareStatement("INSERT INTO operadores(nombre,licencia) VALUES (?,?)")) {
                p.setString(1,normalized); p.setString(2,clean(license).toUpperCase(Locale.ROOT)); p.executeUpdate();
            }
            long id=lastId(c);
            audit(c,"ALTA_OPERADOR","operador:"+id,normalized,null,json("nombre",normalized,"licencia",clean(license)));
            return id;
        });
    }

    public long saveFuel(FuelDraft draft) throws SQLException {
        return transaction(connection -> {
            Equipment equipment = findEquipment(connection, draft.equipmentId());
            return writeFuel(connection, equipment, draft, null, null);
        });
    }

    public long updateFuel(long id, FuelDraft draft) throws SQLException {
        return transaction(connection -> {
            FuelEntry previous = fuelEntry(connection, id, draft.equipmentId());
            Equipment equipment = findEquipment(connection, draft.equipmentId());
            FuelDraft historical = new FuelDraft(draft.equipmentId(), draft.operatorId(), draft.period(),
                    draft.measurement(), draft.liters(), previous.target(), draft.price(), draft.notes(),
                    draft.date(), draft.loads());
            return writeFuel(connection, equipment, historical, previous, null);
        });
    }

    public void deleteFuel(long equipmentId, long id) throws SQLException {
        transaction(connection -> {
            FuelEntry previous = fuelEntry(connection, id, equipmentId);
            try (PreparedStatement statement = connection.prepareStatement(
                    "UPDATE cierres_combustible SET eliminado_en=? WHERE id=?")) {
                statement.setString(1, Instant.now().toString());
                statement.setLong(2, id);
                statement.executeUpdate();
            }
            audit(connection, "ELIMINAR_CIERRE", "cierre:" + id,
                    previous.equipment() + " · " + previous.period(), fuelValues(previous), null);
            return null;
        });
    }

    private long writeFuel(Connection connection, Equipment equipment, FuelDraft draft,
                           FuelEntry previous, ImportSource source) throws SQLException {
        validateFuelPeriod(draft);
        FuelCalculation result = calculator.calculate(equipment.type(), draft.measurement(), draft.liters(),
                draft.target(), draft.price());
        String sql = previous == null ? """
                INSERT INTO cierres_combustible(equipo_id,periodo,tipo_medicion,medicion,litros_cargados,
                meta_aplicada,precio_litro,litros_estimados,diferencia_litros,presupuesto_centavos,gasto_centavos,
                saldo_centavos,desviacion_presupuesto,rendimiento_observado,version_calculo,notas,fecha_registro,
                creado_en,origen,importacion_id,hoja_origen,fila_origen,operador_original)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """ : """
                UPDATE cierres_combustible SET equipo_id=?,periodo=?,tipo_medicion=?,medicion=?,litros_cargados=?,
                meta_aplicada=?,precio_litro=?,litros_estimados=?,diferencia_litros=?,presupuesto_centavos=?,
                gasto_centavos=?,saldo_centavos=?,desviacion_presupuesto=?,rendimiento_observado=?,version_calculo=?,
                notas=?,fecha_registro=? WHERE id=?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, equipment.id());
            statement.setString(2, draft.period().toString());
            statement.setString(3, equipment.type() == EquipmentType.TRACTOR ? "KM" : "HORAS");
            statement.setString(4, decimal(draft.measurement()));
            statement.setString(5, decimal(draft.liters()));
            statement.setString(6, decimal(draft.target()));
            statement.setString(7, decimal(draft.price()));
            statement.setString(8, decimal(result.estimatedLiters()));
            statement.setString(9, decimal(result.differenceLiters()));
            statement.setLong(10, result.budgetCents());
            statement.setLong(11, result.expenseCents());
            statement.setLong(12, result.balanceCents());
            statement.setString(13, decimal(result.budgetVariance()));
            statement.setString(14, decimal(result.observedRate()));
            statement.setString(15, FuelCalculator.VERSION);
            statement.setString(16, clean(draft.notes()));
            statement.setString(17, Objects.toString(draft.date(), null));
            if (previous == null) {
                statement.setString(18, Instant.now().toString());
                statement.setString(19, source == null ? "MANUAL" : "EXCEL");
                statement.setObject(20, source == null ? null : source.batchId());
                statement.setString(21, source == null ? null : source.sheet());
                statement.setObject(22, source == null ? null : source.row());
                statement.setString(23, source == null ? null : source.operator());
            } else {
                statement.setLong(18, previous.id());
            }
            statement.executeUpdate();
        }
        long id = previous == null ? lastId(connection) : previous.id();
        replaceFuelDetails(connection, id, draft);
        if (source == null || previous != null) {
            audit(connection, previous == null ? "ALTA_CIERRE" : "EDITAR_CIERRE", "cierre:" + id,
                    equipment + " · " + draft.period(), previous == null ? null : fuelValues(previous),
                    fuelValues(fuelEntry(connection, id, equipment.id())));
        }
        return id;
    }

    private static void validateFuelPeriod(FuelDraft draft) {
        YearMonth period = draft.period();
        if (period == null || period.getYear() < 1900 || period.getYear() > 2200) {
            throw new IllegalArgumentException("Selecciona un periodo entre 1900 y 2200.");
        }
        if (draft.date() != null && !YearMonth.from(draft.date()).equals(period)) {
            throw new IllegalArgumentException("La fecha del registro debe estar dentro del mes elegido.");
        }
        if (draft.loads().stream().anyMatch(load -> !YearMonth.from(load.date()).equals(period))) {
            throw new IllegalArgumentException("Las cargas deben pertenecer al mes del registro.");
        }
    }

    private void replaceFuelDetails(Connection connection, long id, FuelDraft draft) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "DELETE FROM cierre_operadores WHERE cierre_id=? AND rol='PRINCIPAL'")) {
            statement.setLong(1, id);
            statement.executeUpdate();
        }
        if (draft.operatorId() != null) {
            try (PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO cierre_operadores(cierre_id,operador_id,rol) VALUES (?,?,'PRINCIPAL')
                    ON CONFLICT (cierre_id,operador_id) DO UPDATE SET rol='PRINCIPAL'
                    """)) {
                statement.setLong(1, id);
                statement.setLong(2, draft.operatorId());
                statement.executeUpdate();
            }
        }
        try (PreparedStatement statement = connection.prepareStatement("DELETE FROM cargas_combustible WHERE cierre_id=?")) {
            statement.setLong(1, id);
            statement.executeUpdate();
        }
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO cargas_combustible(cierre_id,orden,fecha,litros) VALUES (?,?,?,?)")) {
            int order = 0;
            for (FuelLoad load : draft.loads()) {
                statement.setLong(1, id);
                statement.setInt(2, ++order);
                statement.setString(3, load.date().toString());
                statement.setString(4, decimal(load.liters()));
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private static String fuelValues(FuelEntry entry) {
        return json("equipo_id", Long.toString(entry.equipmentId()), "periodo", entry.period().toString(),
                "fecha", Objects.toString(entry.date(), ""), "operador", entry.operators(),
                "medicion", decimal(entry.measurement()), "litros", decimal(entry.liters()),
                "factor", decimal(entry.target()), "precio", decimal(entry.price()), "notas", entry.notes(),
                "cargas", entry.loads().toString());
    }

    private record ImportSource(long batchId, String sheet, int row, String operator) {}

    public long saveMaintenance(MaintenanceDraft draft) throws SQLException {
        return transaction(connection -> writeMaintenance(connection, draft, null));
    }

    public long updateMaintenance(long id, MaintenanceDraft draft) throws SQLException {
        return transaction(connection -> writeMaintenance(connection, draft,
                maintenanceEntry(connection, draft.equipmentId(), id)));
    }

    public void deleteMaintenance(long equipmentId, long id) throws SQLException {
        transaction(connection -> {
            requireThermo(findEquipment(connection, equipmentId));
            MaintenanceEntry before = maintenanceEntry(connection, equipmentId, id);
            try (PreparedStatement statement = connection.prepareStatement(
                    "UPDATE mantenimientos SET eliminado_en=? WHERE id=?")) {
                statement.setString(1, Instant.now().toString());
                statement.setLong(2, id);
                statement.executeUpdate();
            }
            audit(connection, "ELIMINAR_MANTENIMIENTO", "mantenimiento:" + id,
                    before.equipment() + " · " + before.workDone(), maintenanceValues(before), null);
            return null;
        });
    }

    private long writeMaintenance(Connection connection, MaintenanceDraft draft, MaintenanceEntry previous)
            throws SQLException {
        Objects.requireNonNull(draft.date(), "Selecciona la fecha.");
        Objects.requireNonNull(draft.status(), "Selecciona el estado.");
        Equipment equipment = findEquipment(connection, draft.equipmentId());
        requireThermo(equipment);
        String category = required(draft.category(), "Selecciona una categoría.");
        String work = required(draft.workDone(), "Describe el trabajo realizado o solicitado.");
        if (draft.meter() != null && draft.meter().signum() < 0) {
            throw new IllegalArgumentException("La lectura no puede ser negativa.");
        }
        long parts = nonnegativeCents(draft.parts());
        long labor = nonnegativeCents(draft.labor());
        long other = nonnegativeCents(draft.other());
        Math.addExact(Math.addExact(parts, labor), other);
        String sql = previous == null ? """
                INSERT INTO mantenimientos(equipo_id,fecha,categoria,falla_reportada,trabajo_realizado,
                tecnico,taller,lectura_medidor,estado,creado_en) VALUES (?,?,?,?,?,?,?,?,?,?)
                """ : """
                UPDATE mantenimientos SET equipo_id=?,fecha=?,categoria=?,falla_reportada=?,trabajo_realizado=?,
                tecnico=?,taller=?,lectura_medidor=?,estado=? WHERE id=?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, equipment.id());
            statement.setString(2, draft.date().toString());
            statement.setString(3, category);
            statement.setString(4, clean(draft.reportedFault()));
            statement.setString(5, work);
            statement.setString(6, clean(draft.technician()));
            statement.setString(7, clean(draft.workshop()));
            statement.setString(8, decimal(draft.meter()));
            statement.setString(9, draft.status().name());
            if (previous == null) statement.setString(10, Instant.now().toString());
            else statement.setLong(10, previous.id());
            statement.executeUpdate();
        }
        long id = previous == null ? lastId(connection) : previous.id();
        if (previous != null) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "DELETE FROM mantenimiento_conceptos WHERE mantenimiento_id=?")) {
                statement.setLong(1, id);
                statement.executeUpdate();
            }
        }
        addCost(connection, id, "REFACCIONES", "Refacciones", parts);
        addCost(connection, id, "MANO_OBRA", "Mano de obra", labor);
        addCost(connection, id, "OTROS", "Otros cargos", other);
        audit(connection, previous == null ? "ALTA_MANTENIMIENTO" : "EDITAR_MANTENIMIENTO",
                "mantenimiento:" + id, equipment + " · " + work,
                previous == null ? null : maintenanceValues(previous),
                maintenanceValues(maintenanceEntry(connection, equipment.id(), id)));
        return id;
    }

    private static void requireThermo(Equipment equipment) {
        if (equipment.type() != EquipmentType.THERMO) {
            throw new IllegalArgumentException("El mantenimiento se captura en la ficha de un thermo.");
        }
    }

    private static String maintenanceValues(MaintenanceEntry entry) {
        return json("fecha", entry.date().toString(), "categoria", entry.category(),
                "falla", entry.reportedFault(), "trabajo", entry.workDone(), "tecnico", entry.technician(),
                "taller", entry.workshop(), "medidor", Objects.toString(entry.meter(), ""),
                "estado", entry.status().name(), "refacciones_centavos", Long.toString(entry.partsCents()),
                "mano_obra_centavos", Long.toString(entry.laborCents()), "otros_centavos", Long.toString(entry.otherCents()));
    }

    public void changeMaintenanceStatus(long id, MaintenanceStatus next) throws SQLException {
        Objects.requireNonNull(next,"Selecciona el estado.");
        transaction(c -> {
            MaintenanceStatus before;
            try (PreparedStatement p=c.prepareStatement("""
                    SELECT m.estado FROM mantenimientos m JOIN equipos e ON e.id=m.equipo_id
                    WHERE m.id=? AND m.eliminado_en IS NULL AND e.tipo='THERMO'
                    """)) {
                p.setLong(1,id);
                try (ResultSet r=p.executeQuery()) { if (!r.next()) throw new IllegalArgumentException("No se encontró el mantenimiento."); before=MaintenanceStatus.valueOf(r.getString(1)); }
            }
            if (before==next) return null;
            if (before==MaintenanceStatus.TERMINADO || before==MaintenanceStatus.CANCELADO || next==MaintenanceStatus.PENDIENTE)
                throw new IllegalArgumentException("Ese cambio de estado no está permitido.");
            try (PreparedStatement p=c.prepareStatement("UPDATE mantenimientos SET estado=? WHERE id=?")) {
                p.setString(1,next.name());p.setLong(2,id);p.executeUpdate();
            }
            audit(c,"ESTADO_MANTENIMIENTO","mantenimiento:"+id,before+" → "+next,json("estado",before.name()),json("estado",next.name()));
            return null;
        });
    }

    public WorkspaceSnapshot snapshot() throws SQLException {
        try (Connection c=database.connect()) {
            c.setAutoCommit(false);
            try {
                var snapshot=new WorkspaceSnapshot(equipment(c),operators(c),fuel(c,null),maintenance(c,null),audit(c),pending(c,null));
                c.commit(); return snapshot;
            } catch (SQLException | RuntimeException e) { c.rollback(); throw e; }
        }
    }

    public void recordEvent(String action,String entity,String description) throws SQLException {
        transaction(c -> {audit(c,action,entity,description,null,null);return null;});
    }

    private List<Equipment> equipment(Connection c) throws SQLException {
        List<Equipment> values=new ArrayList<>();
        try (Statement s=c.createStatement();ResultSet r=s.executeQuery("SELECT * FROM equipos WHERE activo=1 ORDER BY tipo,numero_economico")) {
            while(r.next()) values.add(equipmentRow(r));
        }
        return List.copyOf(values);
    }

    private Equipment findEquipment(Connection c,long id) throws SQLException {
        try(PreparedStatement p=c.prepareStatement("SELECT * FROM equipos WHERE id=? AND activo=1")) {
            p.setLong(1,id);try(ResultSet r=p.executeQuery()) {
                if(!r.next())throw new IllegalArgumentException("Selecciona un equipo activo.");return equipmentRow(r);
            }
        }
    }

    private Equipment equipmentRow(ResultSet r)throws SQLException {
        return new Equipment(r.getLong("id"),EquipmentType.valueOf(r.getString("tipo")),r.getString("numero_economico"),
                r.getString("placas"),r.getString("marca_modelo"),new BigDecimal(r.getString("meta_actual")));
    }

    private List<Operator> operators(Connection c)throws SQLException {
        List<Operator> values=new ArrayList<>();
        try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SELECT * FROM operadores WHERE activo=1 ORDER BY nombre,id")) {
            while(r.next())values.add(new Operator(r.getLong("id"),r.getString("nombre"),r.getString("licencia")));
        }return List.copyOf(values);
    }

    private FuelEntry fuelEntry(Connection connection, long id, long equipmentId) throws SQLException {
        return fuel(connection, id).stream().filter(entry -> entry.equipmentId() == equipmentId)
                .findFirst().orElseThrow(() -> new IllegalArgumentException("El registro ya no está disponible."));
    }

    private List<FuelEntry> fuel(Connection connection, Long id) throws SQLException {
        Map<Long, List<FuelLoad>> loads = fuelLoads(connection, id);
        List<FuelEntry> entries = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT f.*, e.tipo, e.numero_economico,
                    (SELECT group_concat(o.nombre, ' / ') FROM cierre_operadores co JOIN operadores o ON o.id=co.operador_id
                    WHERE co.cierre_id=f.id) AS nombres,
                    (SELECT operador_id FROM cierre_operadores WHERE cierre_id=f.id AND rol='PRINCIPAL'
                     ORDER BY operador_id LIMIT 1) AS principal
                FROM cierres_combustible f JOIN equipos e ON e.id=f.equipo_id
                WHERE f.eliminado_en IS NULL AND (? IS NULL OR f.id=?)
                ORDER BY f.periodo DESC,f.fecha_registro DESC,f.id DESC
                """)) {
            statement.setObject(1, id);
            statement.setObject(2, id);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    long closureId = rows.getLong("id");
                    EquipmentType type = EquipmentType.valueOf(rows.getString("tipo"));
                    String operator = rows.getString("nombres");
                    if (operator == null || operator.isBlank()) operator = rows.getString("operador_original");
                    if (operator == null || operator.isBlank()) operator = "Sin asignar";
                    String date = rows.getString("fecha_registro");
                    long principal = rows.getLong("principal");
                    Long principalId = rows.wasNull() ? null : principal;
                    FuelCalculation calculation = new FuelCalculation(decimal(rows, "litros_estimados"),
                            decimal(rows, "diferencia_litros"), rows.getLong("presupuesto_centavos"),
                            rows.getLong("gasto_centavos"), rows.getLong("saldo_centavos"),
                            decimal(rows, "desviacion_presupuesto"), decimal(rows, "rendimiento_observado"));
                    entries.add(new FuelEntry(closureId, rows.getLong("equipo_id"),
                            type + " " + rows.getString("numero_economico"), type,
                            YearMonth.parse(rows.getString("periodo")), operator, decimal(rows, "medicion"),
                            decimal(rows, "litros_cargados"), decimal(rows, "meta_aplicada"), decimal(rows, "precio_litro"),
                            calculation.budgetCents(), calculation.expenseCents(), calculation.balanceCents(),
                            rows.getString("notas"), Instant.parse(rows.getString("creado_en")),
                            date == null ? null : LocalDate.parse(date), principalId, calculation,
                            List.copyOf(loads.getOrDefault(closureId, List.of())), rows.getString("origen")));
                }
            }
        }
        return List.copyOf(entries);
    }

    private static Map<Long, List<FuelLoad>> fuelLoads(Connection connection, Long id) throws SQLException {
        Map<Long, List<FuelLoad>> result = new HashMap<>();
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT l.cierre_id,l.fecha,l.litros FROM cargas_combustible l
                JOIN cierres_combustible f ON f.id=l.cierre_id
                WHERE f.eliminado_en IS NULL AND (? IS NULL OR f.id=?) ORDER BY l.orden
                """)) {
            statement.setObject(1, id);
            statement.setObject(2, id);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    result.computeIfAbsent(rows.getLong("cierre_id"), key -> new ArrayList<>())
                            .add(new FuelLoad(LocalDate.parse(rows.getString("fecha")), decimal(rows, "litros")));
                }
            }
        }
        return result;
    }

    private MaintenanceEntry maintenanceEntry(Connection connection, long equipmentId, long id) throws SQLException {
        return maintenance(connection, id).stream().filter(entry -> entry.equipmentId() == equipmentId)
                .findFirst().orElseThrow(() -> new IllegalArgumentException("El mantenimiento ya no está disponible."));
    }

    private List<MaintenanceEntry> maintenance(Connection connection, Long id) throws SQLException {
        List<MaintenanceEntry> entries = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT m.*,e.numero_economico,
                    COALESCE(SUM(c.importe_centavos),0) AS total,
                    COALESCE(SUM(c.importe_centavos) FILTER (WHERE c.categoria='REFACCIONES'),0) AS parts,
                    COALESCE(SUM(c.importe_centavos) FILTER (WHERE c.categoria='MANO_OBRA'),0) AS labor,
                    COALESCE(SUM(c.importe_centavos) FILTER (WHERE c.categoria='OTROS'),0) AS other
                FROM mantenimientos m JOIN equipos e ON e.id=m.equipo_id
                LEFT JOIN mantenimiento_conceptos c ON c.mantenimiento_id=m.id
                WHERE e.tipo='THERMO' AND m.eliminado_en IS NULL AND (? IS NULL OR m.id=?)
                GROUP BY m.id ORDER BY m.fecha DESC,m.id DESC
                """)) {
            statement.setObject(1, id);
            statement.setObject(2, id);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    entries.add(new MaintenanceEntry(rows.getLong("id"), rows.getLong("equipo_id"),
                            "Thermo " + rows.getString("numero_economico"), LocalDate.parse(rows.getString("fecha")),
                            rows.getString("categoria"), rows.getString("falla_reportada"), rows.getString("trabajo_realizado"),
                            rows.getString("tecnico"), rows.getString("taller"), decimal(rows, "lectura_medidor"),
                            MaintenanceStatus.valueOf(rows.getString("estado")), rows.getLong("total"),
                            rows.getLong("parts"), rows.getLong("labor"), rows.getLong("other")));
                }
            }
        }
        return List.copyOf(entries);
    }

    private PendingFuel pendingEntry(Connection connection, long id, long equipmentId) throws SQLException {
        return pending(connection, id).stream().filter(entry -> entry.equipmentId() == equipmentId)
                .findFirst().orElseThrow(() -> new IllegalArgumentException("El registro pendiente ya no está disponible."));
    }

    private List<PendingFuel> pending(Connection connection, Long id) throws SQLException {
        List<PendingFuel> entries = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT p.*, i.anio_confirmado FROM historial_pendiente p
                JOIN importaciones i ON i.id=p.importacion_id
                WHERE p.resuelto_en IS NULL AND (? IS NULL OR p.id=?) ORDER BY p.id
                """)) {
            statement.setObject(1, id);
            statement.setObject(2, id);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    String period = rows.getString("periodo");
                    entries.add(new PendingFuel(rows.getLong("id"), rows.getLong("equipo_id"),
                            rows.getString("hoja"), rows.getInt("fila"), rows.getInt("anio_confirmado"),
                            period == null ? null : YearMonth.parse(period), rows.getString("mes_original"),
                            rows.getString("medicion_original"), rows.getString("operador_original"),
                            decimal(rows, "medicion"), decimal(rows, "litros"), decimal(rows, "factor"),
                            decimal(rows, "precio"), rows.getString("motivo")));
                }
            }
        }
        return List.copyOf(entries);
    }

    private List<AuditEntry> audit(Connection c)throws SQLException {
        List<AuditEntry> values=new ArrayList<>();
        try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SELECT * FROM bitacora ORDER BY id DESC")) {
            while(r.next())values.add(new AuditEntry(r.getLong("id"),Instant.parse(r.getString("fecha")),r.getString("actor"),
                    r.getString("accion"),r.getString("entidad"),r.getString("descripcion")));
        }return List.copyOf(values);
    }

    private void addCost(Connection c,long id,String category,String description,long amount)throws SQLException {
        try(PreparedStatement p=c.prepareStatement("INSERT INTO mantenimiento_conceptos(mantenimiento_id,categoria,descripcion,importe_centavos) VALUES (?,?,?,?)")) {
            p.setLong(1,id);p.setString(2,category);p.setString(3,description);p.setLong(4,amount);p.executeUpdate();
        }
    }

    private void audit(Connection c,String action,String entity,String description,String before,String after)throws SQLException {
        try(PreparedStatement p=c.prepareStatement("INSERT INTO bitacora(fecha,actor,accion,entidad,descripcion,valores_anteriores,valores_nuevos) VALUES (?,?,?,?,?,?,?)")) {
            p.setString(1,Instant.now().toString());p.setString(2,actor);p.setString(3,action);p.setString(4,entity);
            p.setString(5,description);p.setString(6,before);p.setString(7,after);p.executeUpdate();
        }
    }

    private <T>T transaction(SqlOperation<T> operation)throws SQLException {
        try(Connection c=database.connect()) {
            c.setAutoCommit(false);
            try { T result=operation.run(c);c.commit();return result; }
            catch(SQLException|RuntimeException e) { c.rollback();throw e; }
        }
    }

    private static long lastId(Connection c)throws SQLException {
        try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SELECT last_insert_rowid()")){r.next();return r.getLong(1);}
    }
    private static long nonnegativeCents(BigDecimal amount) {
        if(amount==null || amount.signum()<0)throw new IllegalArgumentException("Captura costos iguales o mayores que cero.");
        return FuelCalculator.cents(amount);
    }
    private static String clean(String s){return s==null?"":s.strip();}
    private static String decimal(BigDecimal value) { return value == null ? null : value.toPlainString(); }
    private static BigDecimal decimal(ResultSet rows, String column) throws SQLException {
        String value = rows.getString(column);
        return value == null ? null : new BigDecimal(value);
    }
    private static String required(String s,String message){String result=clean(s);if(result.isEmpty())throw new IllegalArgumentException(message);return result;}
    private static String json(String... pairs) {
        StringJoiner j=new StringJoiner(",","{","}");
        for(int i=0;i<pairs.length;i+=2)j.add(quote(pairs[i])+":"+quote(pairs[i+1]));return j.toString();
    }
    private static String quote(String value){
        StringBuilder s=new StringBuilder("\"");
        for(char c:value.toCharArray())switch(c){
            case '"'->s.append("\\\"");case '\\'->s.append("\\\\");case '\n'->s.append("\\n");
            case '\r'->s.append("\\r");case '\t'->s.append("\\t");default->{if(c<32)s.append(String.format("\\u%04x",(int)c));else s.append(c);}
        }
        return s.append('"').toString();
    }
    @FunctionalInterface private interface SqlOperation<T>{T run(Connection c)throws SQLException;}
}

package mx.mantenimientorendimiento.persistence;

import mx.mantenimientorendimiento.domain.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.sql.SQLException;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class WorkspaceRepositoryTest {
    @TempDir Path temp;
    private Database database;
    private WorkspaceRepository repository;
    private static BigDecimal d(String s){return new BigDecimal(s);}
    @BeforeEach void setUp()throws Exception{database=new Database(temp.resolve("test.db"));database.initialize();repository=new WorkspaceRepository(database,"pruebas");}
    private long tractor()throws Exception{return repository.createEquipment(EquipmentType.TRACTOR,"70","ABC","Modelo",d("2.5"));}
    private long thermo()throws Exception{return repository.createEquipment(EquipmentType.THERMO,"95","ABC","Modelo",d("1.7"));}
    private FuelDraft fuel(long id,Long operator){return new FuelDraft(id,operator,YearMonth.of(2026,1),d("1000"),d("350"),d("2.5"),d("28.99"),"Cierre de prueba");}

    @Test void migrationsCanRunAgainWithoutDeletingData()throws Exception{tractor();database.initialize();assertEquals(1,repository.snapshot().equipment().size());}
    @Test void differentEquipmentTypesMayShareEconomicNumber()throws Exception{tractor();repository.createEquipment(EquipmentType.THERMO,"70","","",d("1.7"));assertEquals(2,repository.snapshot().equipment().size());assertThrows(SQLException.class,this::tractor);}
    @Test void namesAreNotUsedAsUniquePersonIdentifiers()throws Exception{repository.createOperator("Juan Pérez","LIC1");repository.createOperator("Juan Pérez","LIC2");assertEquals(2,repository.snapshot().operators().size());}
    @Test void createsClosureAndAuditAndPreservesAppliedTarget()throws Exception{
        long id=tractor();long operator=repository.createOperator("Juan Pérez","LIC1");repository.saveFuel(fuel(id,operator));
        try(var c=database.connect();var p=c.prepareStatement("UPDATE equipos SET meta_actual='3.2' WHERE id=?")){p.setLong(1,id);p.executeUpdate();}
        var data=repository.snapshot();assertEquals(1,data.fuel().size());assertEquals(0,d("2.5").compareTo(data.fuel().getFirst().target()));
        assertEquals("Juan Pérez",data.fuel().getFirst().operators());assertEquals("ALTA_CIERRE",data.audit().getFirst().action());
        assertEquals(1,new WorkspaceRepository(database,"otro").snapshot().fuel().size());
    }
    @Test void invalidOperatorRollsBackClosureAndAudit()throws Exception{
        long id=tractor();int events=repository.snapshot().audit().size();
        assertThrows(SQLException.class,()->repository.saveFuel(fuel(id,999L)));
        assertTrue(repository.snapshot().fuel().isEmpty());assertEquals(events,repository.snapshot().audit().size());
    }
    @Test void foreignKeysAreEnabledOnEveryConnection()throws Exception{
        try(var c=database.connect();var p=c.prepareStatement("INSERT INTO cierre_operadores VALUES (999,999,'PRINCIPAL')")){assertThrows(SQLException.class,p::executeUpdate);}
    }
    @Test void multipleCutsWithinOneMonthAreAllowed()throws Exception{long id=tractor();repository.saveFuel(fuel(id,null));repository.saveFuel(fuel(id,null));assertEquals(2,repository.snapshot().fuel().size());}
    @Test void thermoCanHaveClosureWithoutAnyTractor()throws Exception{
        long id=repository.createEquipment(EquipmentType.THERMO,"161","","",d("1.7"));
        repository.saveFuel(new FuelDraft(id,null,YearMonth.of(2026,1),d("100"),d("190"),d("1.7"),d("28.99"),""));
        assertEquals(-57980,repository.snapshot().fuel().getFirst().balanceCents());
    }
    @Test void repairsKeepTheirCostAndAuditedStatusChanges()throws Exception{
        long id=thermo();long repair=repository.saveMaintenance(new MaintenanceDraft(id,LocalDate.of(2026,11,5),"Correctivo","Falla de bomba","Cambio de bomba","Técnico","Taller",d("123456"),MaintenanceStatus.PENDIENTE,d("1000.50"),d("500"),d("0")));
        assertEquals(150050,repository.snapshot().maintenance().getFirst().costCents());
        repository.changeMaintenanceStatus(repair,MaintenanceStatus.EN_PROCESO);repository.changeMaintenanceStatus(repair,MaintenanceStatus.TERMINADO);
        assertEquals(MaintenanceStatus.TERMINADO,repository.snapshot().maintenance().getFirst().status());
        assertThrows(IllegalArgumentException.class,()->repository.changeMaintenanceStatus(repair,MaintenanceStatus.PENDIENTE));
        assertEquals("ESTADO_MANTENIMIENTO",repository.snapshot().audit().getFirst().action());
    }
    @Test void rejectsNegativeMaintenanceCostsWithoutWriting()throws Exception{
        long id=thermo();assertThrows(IllegalArgumentException.class,()->repository.saveMaintenance(new MaintenanceDraft(id,LocalDate.now(),"Correctivo","","Trabajo","","",null,MaintenanceStatus.PENDIENTE,d("-1"),d("0"),d("0"))));
        assertTrue(repository.snapshot().maintenance().isEmpty());
    }

    @Test void keepsDatedLoadsAndHistoricalFactorThroughEditingAndRemoval() throws Exception {
        long id = thermo();
        long previousMonth = repository.saveFuel(fuel(id, null));
        LocalDate first = LocalDate.of(2026, 2, 10);
        YearMonth february = YearMonth.from(first);
        FuelDraft dated = new FuelDraft(id, null, february, d("100"), d("999"), d("1.7"), d("30"), "",
                first.plusDays(1), List.of(new FuelLoad(first, d("80")), new FuelLoad(first.plusDays(1), d("100"))));
        long record = repository.saveFuel(dated);
        var saved = repository.snapshot().fuel().getFirst();
        assertEquals(2, saved.loads().size());
        assertEquals(d("180"), saved.liters());
        assertEquals(-30000, saved.balanceCents());
        repository.updateEquipment(id, "ABC", "Modelo", d("2"));
        repository.updateFuel(record, new FuelDraft(id, null, february, d("100"), d("999"), d("2"),
                d("30"), "", first, List.of(new FuelLoad(first, d("175")))));
        saved = repository.snapshot().fuel().getFirst();
        assertEquals(d("1.7"), saved.target());
        assertEquals(d("175"), saved.liters());
        assertEquals(first, saved.date());
        repository.deleteFuel(id, record);
        assertEquals(List.of(previousMonth), repository.snapshot().fuel().stream().map(FuelEntry::id).toList());
        assertEquals("ELIMINAR_CIERRE", repository.snapshot().audit().getFirst().action());
        try (var connection = database.connect(); var statement = connection.prepareStatement(
                "SELECT eliminado_en FROM cierres_combustible WHERE id=?")) {
            statement.setLong(1, record);
            try (var rows = statement.executeQuery()) {
                assertTrue(rows.next());
                assertNotNull(rows.getString(1));
            }
        }
    }

    @Test void upgradesVersionOneWithoutInventingDatesOrLoadCounts() throws Exception {
        Database legacy = new Database(temp.resolve("version-one.db"));
        try (var connection = legacy.connect(); var statement = connection.createStatement();
             var schema = Database.class.getResourceAsStream("/db/V001__initial.sql")) {
            String sql = new String(schema.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            for (String part : sql.split(";")) if (!part.isBlank()) statement.execute(part);
            statement.execute("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL) STRICT");
            statement.execute("INSERT INTO schema_migrations VALUES (1, '2026-11-05')");
            statement.execute("INSERT INTO equipos (id,tipo,numero_economico,meta_actual) VALUES (1,'TRACTOR','70','2.5')");
            statement.execute("""
                    INSERT INTO cierres_combustible(equipo_id,periodo,tipo_medicion,medicion,litros_cargados,meta_aplicada,
                    precio_litro,litros_estimados,diferencia_litros,presupuesto_centavos,gasto_centavos,saldo_centavos,
                    desviacion_presupuesto,rendimiento_observado,version_calculo,origen,creado_en)
                    VALUES (1,'2026-10','KM','1000','420','2.5','30','400','-20',1200000,1260000,-60000,
                    '-0.05','2.38','1','MANUAL','2026-11-05T00:00:00Z')
                    """);
        }
        legacy.initialize();
        legacy.initialize();
        FuelEntry entry = new WorkspaceRepository(legacy, "pruebas").snapshot().fuel().getFirst();
        assertEquals(YearMonth.of(2026, 10), entry.period());
        assertEquals(-60000, entry.balanceCents());
        assertNull(entry.date());
        assertTrue(entry.loads().isEmpty());
    }
}

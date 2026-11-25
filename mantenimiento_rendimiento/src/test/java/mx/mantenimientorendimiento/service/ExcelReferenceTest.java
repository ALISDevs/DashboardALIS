package mx.mantenimientorendimiento.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import mx.mantenimientorendimiento.domain.EquipmentType;
import mx.mantenimientorendimiento.domain.FuelDraft;
import mx.mantenimientorendimiento.persistence.Database;
import mx.mantenimientorendimiento.persistence.WorkspaceRepository;
import java.math.BigDecimal;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

/** Optional read-only checks against user-provided reference files. */
@EnabledIfSystemProperty(named="mr.referenceDir",matches=".+")
class ExcelReferenceTest {
    @TempDir Path temp;
    @Test void recognizesBothOriginalWorkbooksWithoutImportingThem()throws Exception{
        Path directory=Path.of(System.getProperty("mr.referenceDir"));
        var service=new ExcelPreviewService();
        var tractors=service.inspect(directory.resolve("INDICADORES TRACTORES.xlsx"));
        assertEquals(17,tractors.sheets());assertEquals(174,tractors.blocks());assertEquals(118,tractors.withData());assertEquals(10,tractors.warnings().size());
        var thermos=service.inspect(directory.resolve("INDICADORES THERMOS.xlsx"));
        assertEquals(13,thermos.sheets());assertEquals(133,thermos.blocks());assertEquals(99,thermos.withData());assertEquals(6,thermos.warnings().size());
    }

    @Test void preservesCompleteAndPendingBlocksAndRejectsRepeatedBatch() throws Exception {
        Path directory = Path.of(System.getProperty("mr.referenceDir"));
        var tractors = ExcelHistory.read(directory.resolve("INDICADORES TRACTORES.xlsx"), 2025);
        var thermos = ExcelHistory.read(directory.resolve("INDICADORES THERMOS.xlsx"), 2025);
        assertEquals(118, tractors.blocks().size());
        assertEquals(99, thermos.blocks().size());
        assertEquals(8, tractors.blocks().stream().filter(ExcelHistory.Block::pending).count());
        assertEquals(2, thermos.blocks().stream().filter(ExcelHistory.Block::pending).count());

        Database database = new Database(temp.resolve("import-test.db"));
        database.initialize();
        WorkspaceRepository repository = new WorkspaceRepository(database, "verificación");
        repository.importHistory(tractors);
        repository.importHistory(thermos);
        var snapshot = repository.snapshot();
        assertEquals(207, snapshot.fuel().size());
        assertEquals(10, snapshot.pending().size());
        assertTrue(snapshot.fuel().stream().allMatch(entry -> entry.date() == null && entry.loads().isEmpty()));
        var thermo95 = snapshot.equipment().stream().filter(item -> item.type() == EquipmentType.THERMO
                && item.economicNumber().equals("95")).findFirst().orElseThrow();
        assertEquals(new BigDecimal("1.7"), thermo95.target());
        assertEquals("50-UU-7Y", thermo95.plates());
        assertTrue(snapshot.fuel().stream().anyMatch(entry -> entry.equipmentId() == thermo95.id()
                && entry.period().getMonthValue() == 1 && entry.operators().equals("GUSTAVO ESPINOZA")));
        assertThrows(IllegalArgumentException.class, () -> repository.importHistory(thermos));
        assertEquals(207, repository.snapshot().fuel().size());

        var pending = snapshot.pending().stream().filter(item -> item.sheet().strip().equals("UNIDAD 98"))
                .findFirst().orElseThrow();
        var unit = snapshot.equipment().stream().filter(item -> item.id() == pending.equipmentId()).findFirst().orElseThrow();
        long resolved = repository.resolvePending(pending.id(), new FuelDraft(unit.id(), null, pending.period(),
                pending.measurement(), pending.liters(), unit.target(), pending.price(), "Revisado en prueba"));
        var revised = repository.snapshot();
        assertEquals(9, revised.pending().size());
        assertEquals(208, revised.fuel().size());
        assertEquals("EXCEL", revised.fuel().stream().filter(entry -> entry.id() == resolved).findFirst().orElseThrow().source());
    }
}

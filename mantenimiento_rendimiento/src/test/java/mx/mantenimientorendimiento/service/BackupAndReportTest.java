package mx.mantenimientorendimiento.service;

import mx.mantenimientorendimiento.config.AppPaths;
import mx.mantenimientorendimiento.domain.*;
import mx.mantenimientorendimiento.persistence.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;
import java.math.BigDecimal;
import java.nio.file.*;
import java.sql.DriverManager;
import java.time.YearMonth;
import java.util.List;
import java.util.zip.ZipFile;
import static org.junit.jupiter.api.Assertions.*;

class BackupAndReportTest {
    @TempDir Path temp;

    @Test void backupContainsConsistentDatabaseAndAttachmentsAndCanBeRead()throws Exception{
        AppPaths paths=new AppPaths(temp.resolve("datos"));paths.ensureDirectories();
        Database database=new Database(paths.database());database.initialize();
        var repository=new WorkspaceRepository(database,"test");repository.createEquipment(EquipmentType.TRACTOR,"70","","",new BigDecimal("2.5"));
        Files.writeString(paths.documents().resolve("comprobante.txt"),"Comprobante de prueba");
        Path destination = Files.createDirectory(temp.resolve("destino"));
        Path archive=new BackupService(database,paths).create(destination);
        assertEquals(destination.toRealPath(), archive.getParent());
        try (var files = Files.list(destination)) { assertEquals(List.of(archive), files.toList()); }
        Path recovered=temp.resolve("recuperada.db");
        try(ZipFile zip=new ZipFile(archive.toFile())){
            assertNotNull(zip.getEntry("comprobantes/comprobante.txt"));
            try(var input=zip.getInputStream(zip.getEntry("mantenimiento-rendimiento.db"))){Files.copy(input,recovered);}
        }
        try(var connection=DriverManager.getConnection("jdbc:sqlite:"+recovered);var statement=connection.createStatement();var rows=statement.executeQuery("SELECT numero_economico FROM equipos")){
            assertTrue(rows.next());assertEquals("70",rows.getString(1));
        }
    }

    @Test void reportIsReadableAndSupportsEmptyAndPopulatedDatabase()throws Exception{
        Database db=new Database(temp.resolve("datos.db"));db.initialize();var repository=new WorkspaceRepository(db,"test");
        PdfReportService report=new PdfReportService();Path pdf=temp.resolve("reporte.pdf");
        long id=repository.createEquipment(EquipmentType.THERMO,"161","","",new BigDecimal("1.7"));
        Equipment equipment = repository.snapshot().equipment().getFirst();
        YearMonth period = YearMonth.of(2026,11);
        report.exportMaintenance(equipment,period,List.of(),pdf);
        try(PdfReader reader=new PdfReader(Files.readAllBytes(pdf))){
            assertTrue(reader.getNumberOfPages()>0);
            assertTrue(reader.getInfo().get("Title").startsWith("Reporte de mantenimiento"));
        }
        repository.saveFuel(new FuelDraft(id,null,period,new BigDecimal("100"),new BigDecimal("190"),new BigDecimal("1.7"),new BigDecimal("28.99"),""));
        report.exportFuel(equipment,period,repository.snapshot().fuel(),pdf);
        assertTrue(reportText(pdf).contains("Promedio del factor real: 1.9 L/h."));

        repository.saveFuel(new FuelDraft(id,null,period.minusMonths(1),new BigDecimal("200"),new BigDecimal("300"),new BigDecimal("1.7"),new BigDecimal("30"),""));
        repository.saveMaintenance(new MaintenanceDraft(id, period.atDay(2), "Correctivo", "", "Cambio de bomba",
                "", "", null, MaintenanceStatus.TERMINADO, new BigDecimal("300"), new BigDecimal("200"), BigDecimal.ZERO));
        var snapshot = repository.snapshot();
        report.exportMonthly(snapshot, equipment, period, pdf);
        String monthly = reportText(pdf);
        assertTrue(monthly.contains("Reporte mensual de la unidad"));
        assertTrue(monthly.contains("Cambio de bomba"));
        assertTrue(monthly.contains("Rendimiento sobre saldo: -11.76 %"));
        assertFalse(monthly.contains("$9,000.00"));

        report.exportGeneral(snapshot, pdf);
        String general = reportText(pdf);
        assertTrue(general.contains("Todos los periodos registrados"));
        assertTrue(general.contains("$15,008.10"));
        assertTrue(general.contains("Importes en MXN."));
    }

    private static String reportText(Path pdf) throws Exception {
        try (PdfReader reader = new PdfReader(Files.readAllBytes(pdf))) {
            var extractor = new PdfTextExtractor(reader);
            StringBuilder text = new StringBuilder();
            for (int page = 1; page <= reader.getNumberOfPages(); page++) text.append(extractor.getTextFromPage(page));
            return text.toString();
        }
    }

    @Test void monthlyRowsSumQuantitiesAndAverageTheRealFactors() throws Exception {
        Database database = new Database(temp.resolve("totals.db"));
        database.initialize();
        var repository = new WorkspaceRepository(database, "test");
        var factor = new BigDecimal("1.7");
        var price = new BigDecimal("30");
        var period = YearMonth.of(2026, 11);
        long id = repository.createEquipment(EquipmentType.THERMO, "95", "", "", factor);
        repository.saveFuel(new FuelDraft(id, null, period, new BigDecimal("100"), new BigDecimal("180"), factor, price, ""));
        repository.saveFuel(new FuelDraft(id, null, period, new BigDecimal("50"), new BigDecimal("70"), factor, price, ""));
        List<FuelEntry> entries = repository.snapshot().fuel();
        var totals = FuelTotals.of(entries);
        assertEquals(0, totals.averageObservedRate().compareTo(new BigDecimal("1.6")));
        assertEquals(765000L, totals.budgetCents());
        assertEquals(750000L, totals.expenseCents());
        assertEquals(List.of("Totales", "", "150", "", "1.6", "", "255", "250", "5 L a favor",
                "$7,650.00", "$7,500.00", "$150.00", "1.96 %"), ReportRows.fuelTotal(entries));
        assertTrue(ReportRows.fuel(entries.getLast()).contains("10 L en contra"));
    }
}

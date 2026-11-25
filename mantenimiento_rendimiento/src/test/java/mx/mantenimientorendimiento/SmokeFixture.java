package mx.mantenimientorendimiento;

import mx.mantenimientorendimiento.config.*;
import mx.mantenimientorendimiento.domain.*;
import mx.mantenimientorendimiento.service.PdfReportService;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.*;
import java.util.List;

/** Explicit, disposable data for visual verification only. Not included in the application JAR. */
public final class SmokeFixture {
    public static void main(String[] args)throws Exception{
        if(args.length!=1)throw new IllegalArgumentException("Indica una carpeta de pruebas nueva.");
        AppPaths paths=new AppPaths(Path.of(args[0]));
        if(java.nio.file.Files.exists(paths.database()))throw new IllegalArgumentException("La carpeta ya tiene una base. Usa una carpeta nueva.");
        try(AppServices services=AppServices.open(paths)){
            var repository=services.repository();
            long tractor=repository.createEquipment(EquipmentType.TRACTOR,"PRUEBA-01","DEMO","Tractor de prueba",new BigDecimal("2.5"));
            long thermo=repository.createEquipment(EquipmentType.THERMO,"95","DEMO","Thermo de prueba",new BigDecimal("1.7"));
            long operator=repository.createOperator("Operador de prueba","PRUEBA");
            repository.saveFuel(new FuelDraft(tractor,operator,YearMonth.of(2026,11),new BigDecimal("1000"),new BigDecimal("350"),new BigDecimal("2.5"),new BigDecimal("28.99"),"Registro sintético para verificar la interfaz."));
            LocalDate today = LocalDate.now();
            YearMonth period = YearMonth.from(today);
            repository.saveFuel(new FuelDraft(thermo,operator,period,new BigDecimal("100"),new BigDecimal("190"),new BigDecimal("1.7"),new BigDecimal("28.99"),"Registro sintético para verificar la interfaz.",today,List.of(new FuelLoad(today,new BigDecimal("190")))));
            repository.saveFuel(new FuelDraft(thermo,operator,period.minusMonths(1),new BigDecimal("112"),new BigDecimal("190"),new BigDecimal("1.7"),new BigDecimal("28.99"),"Mes anterior."));
            repository.saveMaintenance(new MaintenanceDraft(thermo,today,"Correctivo","Falla reportada de prueba","Cambio de bomba","Técnico de prueba","Taller de prueba",new BigDecimal("150"),MaintenanceStatus.EN_PROCESO,new BigDecimal("1000.50"),new BigDecimal("500"),BigDecimal.ZERO));
            var snapshot = repository.snapshot();
            var equipment = snapshot.equipment().stream().filter(item -> item.id() == thermo).findFirst().orElseThrow();
            PdfReportService reports = new PdfReportService();
            reports.exportFuel(equipment,period,snapshot.fuel().stream().filter(entry -> entry.equipmentId() == thermo && entry.period().equals(period)).toList(),paths.root().resolve("combustible-prueba.pdf"));
            reports.exportMaintenance(equipment,period,snapshot.maintenance(),paths.root().resolve("mantenimiento-prueba.pdf"));
            reports.exportMonthly(snapshot,equipment,period,paths.root().resolve("mensual-prueba.pdf"));
            reports.exportGeneral(snapshot,paths.root().resolve("general-prueba.pdf"));
        }
    }
}

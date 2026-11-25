package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MaintenanceEntry(long id, long equipmentId, String equipment, LocalDate date,
                               String category, String reportedFault, String workDone,
                               String technician, String workshop, BigDecimal meter,
                               MaintenanceStatus status, long costCents,
                               long partsCents, long laborCents, long otherCents) {}

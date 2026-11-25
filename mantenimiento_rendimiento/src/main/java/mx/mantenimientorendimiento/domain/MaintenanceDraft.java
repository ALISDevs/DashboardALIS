package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MaintenanceDraft(long equipmentId, LocalDate date, String category,
                               String reportedFault, String workDone, String technician,
                               String workshop, BigDecimal meter, MaintenanceStatus status,
                               BigDecimal parts, BigDecimal labor, BigDecimal other) {}

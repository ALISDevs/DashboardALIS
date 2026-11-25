package mx.mantenimientorendimiento.persistence;

import mx.mantenimientorendimiento.domain.*;
import java.util.List;

public record WorkspaceSnapshot(List<Equipment> equipment, List<Operator> operators,
                                List<FuelEntry> fuel, List<MaintenanceEntry> maintenance,
                                List<AuditEntry> audit, List<PendingFuel> pending) {}

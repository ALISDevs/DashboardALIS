package mx.mantenimientorendimiento.domain;

import java.util.List;

public record MaintenanceTotals(long partsCents, long laborCents, long otherCents, long totalCents) {
    public static MaintenanceTotals of(List<MaintenanceEntry> entries) {
        long parts = 0;
        long labor = 0;
        long other = 0;
        long total = 0;
        for (MaintenanceEntry entry : entries) {
            parts = Math.addExact(parts, entry.partsCents());
            labor = Math.addExact(labor, entry.laborCents());
            other = Math.addExact(other, entry.otherCents());
            total = Math.addExact(total, entry.costCents());
        }
        return new MaintenanceTotals(parts, labor, other, total);
    }
}

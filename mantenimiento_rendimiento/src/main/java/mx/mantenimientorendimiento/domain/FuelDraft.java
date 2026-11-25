package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

public record FuelDraft(long equipmentId, Long operatorId, YearMonth period,
                        BigDecimal measurement, BigDecimal liters, BigDecimal target,
                        BigDecimal price, String notes, LocalDate date, List<FuelLoad> loads) {
    public FuelDraft {
        loads = List.copyOf(loads);
        if (!loads.isEmpty()) {
            liters = loads.stream().map(FuelLoad::liters).reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }

    public FuelDraft(long equipmentId, Long operatorId, YearMonth period, BigDecimal measurement,
                     BigDecimal liters, BigDecimal target, BigDecimal price, String notes) {
        this(equipmentId, operatorId, period, measurement, liters, target, price, notes, null, List.of());
    }
}

package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

public record FuelLoad(LocalDate date, BigDecimal liters) {
    public FuelLoad {
        Objects.requireNonNull(date, "Selecciona la fecha de la carga.");
        FuelCalculator.positive(liters, "Los litros de la carga");
    }
}

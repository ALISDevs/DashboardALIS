package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/** A single calculation policy for capture, future imports and reports. */
public final class FuelCalculator {
    public static final String VERSION = "1";
    private static final int SCALE = 12;

    public FuelCalculation calculate(EquipmentType type, BigDecimal measurement,
                                     BigDecimal liters, BigDecimal target, BigDecimal price) {
        Objects.requireNonNull(type, "Selecciona el tipo de equipo.");
        positive(liters, "Los litros cargados");
        positive(price, "El precio por litro");
        BigDecimal estimated = estimatedLiters(type, measurement, target);
        long budget = cents(estimated.multiply(price));
        long expense = cents(liters.multiply(price));
        long balance = Math.subtractExact(budget, expense);
        BigDecimal variance = budget == 0 ? null : BigDecimal.valueOf(balance)
                .divide(BigDecimal.valueOf(budget), SCALE, RoundingMode.HALF_UP);
        BigDecimal rate = type == EquipmentType.TRACTOR
                ? measurement.divide(liters, SCALE, RoundingMode.HALF_UP)
                : liters.divide(measurement, SCALE, RoundingMode.HALF_UP);
        return new FuelCalculation(estimated, estimated.subtract(liters), budget, expense, balance, variance, rate);
    }

    public BigDecimal estimatedLiters(EquipmentType type, BigDecimal measurement, BigDecimal factor) {
        positive(measurement, "Los kilómetros u horas");
        positive(factor, "El factor de rendimiento");
        return type == EquipmentType.TRACTOR
                ? measurement.divide(factor, SCALE, RoundingMode.HALF_UP)
                : measurement.multiply(factor);
    }

    public static long cents(BigDecimal value) {
        Objects.requireNonNull(value, "Falta el importe.");
        return value.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
    }

    public static void positive(BigDecimal value, String label) {
        if (value == null || value.signum() <= 0) throw new IllegalArgumentException(label + " deben ser mayores que cero.");
        if (value.precision() > 20 || Math.abs(value.scale()) > 12)
            throw new IllegalArgumentException(label + " exceden la precisión permitida (20 dígitos, hasta 12 decimales).");
    }
}

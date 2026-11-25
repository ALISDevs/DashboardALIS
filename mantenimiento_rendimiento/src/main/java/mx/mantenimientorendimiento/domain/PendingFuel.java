package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;
import java.time.YearMonth;

public record PendingFuel(long id, long equipmentId, String sheet, int row, int year, YearMonth period,
                          String originalMonth, String originalMeasurement, String operator,
                          BigDecimal measurement, BigDecimal liters, BigDecimal factor,
                          BigDecimal price, String reason) {}

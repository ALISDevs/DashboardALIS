package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

public record FuelEntry(long id, long equipmentId, String equipment, EquipmentType type,
                        YearMonth period, String operators, BigDecimal measurement,
                        BigDecimal liters, BigDecimal target, BigDecimal price,
                        long budgetCents, long expenseCents, long balanceCents,
                        String notes, Instant createdAt, LocalDate date, Long operatorId,
                        FuelCalculation calculation, List<FuelLoad> loads, String source) {}

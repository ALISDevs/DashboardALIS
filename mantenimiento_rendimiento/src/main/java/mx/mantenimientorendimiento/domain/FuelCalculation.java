package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;

public record FuelCalculation(BigDecimal estimatedLiters, BigDecimal differenceLiters,
                              long budgetCents, long expenseCents, long balanceCents,
                              BigDecimal budgetVariance, BigDecimal observedRate) {}

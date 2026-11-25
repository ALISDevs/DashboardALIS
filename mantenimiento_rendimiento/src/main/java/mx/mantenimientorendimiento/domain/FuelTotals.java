package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public record FuelTotals(BigDecimal measurement, BigDecimal expected, BigDecimal actual, long budgetCents,
                         long expenseCents, long balanceCents, BigDecimal variance, BigDecimal averageObservedRate) {
    public static FuelTotals of(List<FuelEntry> entries) {
        BigDecimal measurement = BigDecimal.ZERO;
        BigDecimal expected = BigDecimal.ZERO;
        BigDecimal actual = BigDecimal.ZERO;
        long budget = 0;
        long expense = 0;
        BigDecimal observedRates = BigDecimal.ZERO;
        int rateCount = 0;
        EquipmentType rateType = entries.isEmpty() ? null : entries.getFirst().type();
        boolean comparable = true;
        for (FuelEntry entry : entries) {
            measurement = measurement.add(entry.measurement());
            expected = expected.add(entry.calculation().estimatedLiters());
            actual = actual.add(entry.liters());
            budget = Math.addExact(budget, entry.budgetCents());
            expense = Math.addExact(expense, entry.expenseCents());
            comparable &= entry.type() == rateType;
            if (entry.calculation().observedRate() != null) {
                observedRates = observedRates.add(entry.calculation().observedRate());
                rateCount++;
            }
        }
        long balance = Math.subtractExact(budget, expense);
        BigDecimal variance = budget == 0 ? null : BigDecimal.valueOf(balance)
                .divide(BigDecimal.valueOf(budget), 12, RoundingMode.HALF_UP);
        BigDecimal average = comparable && rateCount > 0
                ? observedRates.divide(BigDecimal.valueOf(rateCount), 12, RoundingMode.HALF_UP) : null;
        return new FuelTotals(comparable ? measurement : null, expected, actual, budget, expense, balance, variance, average);
    }

    public BigDecimal difference() { return expected.subtract(actual); }
}

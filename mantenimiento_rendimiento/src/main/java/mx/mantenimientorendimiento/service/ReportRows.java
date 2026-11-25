package mx.mantenimientorendimiento.service;

import mx.mantenimientorendimiento.domain.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import static mx.mantenimientorendimiento.format.MoneyFormat.money;

/** The monthly ledger and its PDF use the same columns and totals. */
public final class ReportRows {
    private static final Locale MEXICO = Locale.forLanguageTag("es-MX");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/uuuu", MEXICO);

    private ReportRows() {}

    public static List<String> fuelHeadings(EquipmentType type) {
        return List.of("Fecha", "Operador actual", type.measurementLabel(), "Factor de rendimiento (" + type.targetUnit() + ")",
                "Factor real (" + type.targetUnit() + ")", "Costo por litro", "Litros a cargar", "Litros cargados",
                "Diferencia de litros", "Costo presupuestado", "Costo real", "Saldo", "Rendimiento (%)");
    }

    public static List<String> fuel(FuelEntry entry) {
        FuelCalculation calculation = entry.calculation();
        return List.of(date(entry.date()), entry.operators(), quantity(entry.measurement()),
                entry.target().stripTrailingZeros().toPlainString(), quantity(calculation.observedRate()),
                entry.price().stripTrailingZeros().toPlainString(), quantity(calculation.estimatedLiters()), quantity(entry.liters()),
                litersDifference(calculation.differenceLiters()), money(entry.budgetCents()), money(entry.expenseCents()),
                money(entry.balanceCents()), percent(calculation.budgetVariance()));
    }

    public static List<String> fuelTotal(List<FuelEntry> entries) {
        FuelTotals totals = FuelTotals.of(entries);
        return List.of("Totales", "", quantity(totals.measurement()), "", quantity(totals.averageObservedRate()), "",
                quantity(totals.expected()), quantity(totals.actual()), litersDifference(totals.difference()),
                money(totals.budgetCents()), money(totals.expenseCents()), money(totals.balanceCents()), percent(totals.variance()));
    }

    public static List<String> maintenanceHeadings() {
        return List.of("Fecha", "Categoría", "Trabajo", "Técnico / taller", "Estado", "Costo de refacciones",
                "Costo de mano de obra", "Otros cargos", "Costo total");
    }

    public static List<String> maintenance(MaintenanceEntry entry) {
        String people = String.join(" / ", List.of(entry.technician(), entry.workshop()).stream()
                .filter(value -> !value.isBlank()).toList());
        return List.of(date(entry.date()), entry.category(), entry.workDone(), people, entry.status().toString(),
                money(entry.partsCents()), money(entry.laborCents()), money(entry.otherCents()), money(entry.costCents()));
    }

    public static List<String> maintenanceTotal(List<MaintenanceEntry> entries) {
        MaintenanceTotals totals = MaintenanceTotals.of(entries);
        return List.of("Totales", "", "", "", "", money(totals.partsCents()), money(totals.laborCents()),
                money(totals.otherCents()), money(totals.totalCents()));
    }

    public static String litersDifference(BigDecimal delta) {
        String amount = quantity(delta.abs());
        if (amount.equals("0")) return "0 L";
        return amount + (delta.signum() > 0 ? " L a favor" : " L en contra");
    }

    private static String date(LocalDate date) { return date == null ? "Sin día" : DATE.format(date); }
    static String quantity(BigDecimal number) {
        return number == null ? "—" : number.setScale(3, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }
    static String percent(BigDecimal fraction) {
        return fraction == null ? "—" : fraction.movePointRight(2).setScale(2, RoundingMode.HALF_UP).toPlainString() + " %";
    }
}

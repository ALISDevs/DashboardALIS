package mx.mantenimientorendimiento.ui;

import javafx.scene.Node;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.VBox;
import mx.mantenimientorendimiento.domain.*;
import mx.mantenimientorendimiento.persistence.WorkspaceSnapshot;
import mx.mantenimientorendimiento.service.ReportRows;

import java.util.List;

import static mx.mantenimientorendimiento.ui.MainController.card;

final class TotalsView {
    private TotalsView() {}

    static Node company(WorkspaceSnapshot snapshot) {
        FuelTotals fuel = FuelTotals.of(snapshot.fuel());
        MaintenanceTotals maintenance = MaintenanceTotals.of(snapshot.maintenance());
        VBox body = new VBox(16, spending(fuel, maintenance, true));
        for (EquipmentType type : EquipmentType.values()) {
            List<FuelEntry> entries = snapshot.fuel().stream().filter(entry -> entry.type() == type).toList();
            body.getChildren().add(fuel(type == EquipmentType.TRACTOR ? "Combustible · Tractores" : "Combustible · Thermos",
                    type, FuelTotals.of(entries)));
        }
        body.getChildren().add(maintenance(maintenance));
        body.getStyleClass().add("section");
        ScrollPane scroll = new ScrollPane(body);
        scroll.setFitToWidth(true);
        return scroll;
    }

    static Node equipment(EquipmentType type, List<FuelEntry> entries, List<MaintenanceEntry> services) {
        FuelTotals fuel = FuelTotals.of(entries);
        MaintenanceTotals maintenance = MaintenanceTotals.of(services);
        boolean thermo = type == EquipmentType.THERMO;
        VBox spending = spending(fuel, maintenance, thermo);
        spending.getChildren().add(fuelMeasurement(type, fuel));
        VBox totals = new VBox(10, spending);
        if (thermo) totals.getChildren().add(maintenance(maintenance));
        return totals;
    }

    static Node monthlyFuel(FuelTotals totals) {
        return metrics(fact("Litros a cargar", Format.quantity(totals.expected()) + " L"),
                fact("Litros cargados", Format.quantity(totals.actual()) + " L"),
                fact("Diferencia de litros", ReportRows.litersDifference(totals.difference())),
                fact("Costo presupuestado", Format.money(totals.budgetCents())),
                fact("Costo real", Format.money(totals.expenseCents())),
                fact("Saldo", Format.money(totals.balanceCents())));
    }

    private static VBox spending(FuelTotals fuel, MaintenanceTotals maintenance, boolean includesMaintenance) {
        VBox panel = card("Gasto acumulado");
        FlowPane metrics = metrics(fact("Combustible presupuestado", Format.money(fuel.budgetCents())),
                fact("Combustible real", Format.money(fuel.expenseCents())),
                fact("Saldo de combustible", Format.money(fuel.balanceCents())));
        if (includesMaintenance) {
            long total = Math.addExact(fuel.expenseCents(), maintenance.totalCents());
            metrics.getChildren().addAll(fact("Mantenimiento", Format.money(maintenance.totalCents())),
                    fact("Gasto total", Format.money(total)));
        }
        panel.getChildren().addAll(metrics, metrics(fact("Litros a cargar", Format.quantity(fuel.expected()) + " L"),
                fact("Litros cargados", Format.quantity(fuel.actual()) + " L"),
                fact("Diferencia de litros", ReportRows.litersDifference(fuel.difference()))));
        return panel;
    }

    private static VBox fuel(String heading, EquipmentType type, FuelTotals totals) {
        VBox panel = card(heading);
        panel.getChildren().addAll(fuelMeasurement(type, totals), monthlyFuel(totals));
        return panel;
    }

    private static Node fuelMeasurement(EquipmentType type, FuelTotals totals) {
        String rate = totals.averageObservedRate() == null ? "—"
                : Format.quantity(totals.averageObservedRate()) + " " + type.targetUnit();
        return metrics(fact(type.measurementLabel(), Format.quantity(totals.measurement())),
                fact("Promedio del factor real", rate),
                fact("Rendimiento (%)", Format.percent(totals.variance())));
    }

    private static VBox maintenance(MaintenanceTotals totals) {
        VBox panel = card("Mantenimiento acumulado");
        panel.getChildren().add(metrics(fact("Costo de refacciones", Format.money(totals.partsCents())),
                fact("Costo de mano de obra", Format.money(totals.laborCents())),
                fact("Otros cargos", Format.money(totals.otherCents())),
                fact("Costo total", Format.money(totals.totalCents()))));
        return panel;
    }

    private static FlowPane metrics(Node... children) {
        FlowPane panel = new FlowPane(18, 10, children);
        panel.getStyleClass().add("totals-metrics");
        return panel;
    }

    private static VBox fact(String title, String content) {
        Label name = new Label(title);
        name.getStyleClass().add("card-label");
        Label value = new Label(content);
        value.getStyleClass().add("metric-value");
        return new VBox(4, name, value);
    }
}

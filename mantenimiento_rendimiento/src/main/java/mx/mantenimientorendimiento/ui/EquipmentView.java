package mx.mantenimientorendimiento.ui;

import javafx.collections.FXCollections;
import javafx.beans.binding.Bindings;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import mx.mantenimientorendimiento.domain.*;
import mx.mantenimientorendimiento.persistence.WorkspaceSnapshot;
import mx.mantenimientorendimiento.service.ReportRows;

import java.time.YearMonth;
import java.util.List;
import java.util.TreeSet;
import java.util.function.Function;

import static mx.mantenimientorendimiento.ui.MainController.*;

final class EquipmentView extends ScrollPane {
    private final MainController controller;
    private final Equipment equipment;
    private final YearMonth period;
    private final boolean historyOnly;
    private final List<FuelEntry> fuel;
    private final List<MaintenanceEntry> maintenance;
    private final List<PendingFuel> pending;
    private final VBox body = new VBox(12);
    private final FuelEditor editor;

    EquipmentView(MainController controller, WorkspaceSnapshot data, Equipment equipment, YearMonth period,
                  boolean showMaintenance, boolean historyOnly, FuelEntry editing, PendingFuel reviewing) {
        this.controller = controller;
        this.equipment = equipment;
        this.period = period;
        this.historyOnly = historyOnly;
        fuel = data.fuel().stream().filter(entry -> entry.equipmentId() == equipment.id()).toList();
        maintenance = data.maintenance().stream().filter(entry -> entry.equipmentId() == equipment.id()).toList();
        pending = data.pending().stream().filter(entry -> entry.equipmentId() == equipment.id()).toList();
        setFitToWidth(true);
        setContent(body);
        body.getStyleClass().add("section");
        body.getChildren().addAll(general(), controls(showMaintenance));
        TitledPane accumulated = new TitledPane("Acumulado de la unidad · Hasta el momento",
                TotalsView.equipment(equipment.type(), fuel, maintenance));
        accumulated.setId("unit-totals");
        accumulated.setExpanded(false);
        body.getChildren().add(accumulated);
        if (showMaintenance) {
            editor = null;
            body.getChildren().addAll(maintenanceHistory(), archivedMonths(true));
        } else {
            editor = historyOnly ? null : new FuelEditor(equipment, period, data.operators(), editing, reviewing,
                    draft -> controller.saveFuel(draft, editing, reviewing), controller::cancelFuelEdit);
            if (editor != null) body.getChildren().add(editor);
            body.getChildren().addAll(fuelHistory(), archivedMonths(false));
            if (!pending.isEmpty()) body.getChildren().add(pendingHistory());
        }
    }

    boolean isDirty() { return editor != null && editor.isDirty(); }

    private Node general() {
        VBox panel = card("Datos generales");
        panel.getStyleClass().add("identity-card");
        HBox identity = new HBox(26, fact("Número económico", equipment.economicNumber()),
                fact("Placas", empty(equipment.plates())), fact("Marca y modelo", empty(equipment.model())),
                fact("Factor de rendimiento", Format.decimal(equipment.target()) + " " + equipment.type().targetUnit()));
        identity.setAlignment(Pos.CENTER_LEFT);
        if (!historyOnly) {
            HBox heading = toolbar(panel.getChildren().removeFirst(),
                    button("Editar datos", () -> controller.editEquipment(equipment)));
            panel.getChildren().add(heading);
        }
        panel.getChildren().add(identity);
        return panel;
    }

    private Node controls(boolean showMaintenance) {
        Button previous = button("‹ Anterior", () -> controller.selectPeriod(period.minusMonths(1)));
        previous.setDisable(period.equals(YearMonth.of(1900, 1)));
        Button choose = button(Format.month(period), () ->
                FormDialogs.period(controller.window(), period).ifPresent(controller::selectPeriod));
        choose.setId("period-current");
        Button next = button("Siguiente ›", () -> controller.selectPeriod(period.plusMonths(1)));
        next.setId("period-next");
        next.setDisable(period.equals(YearMonth.of(2200, 12)));
        HBox periods = new HBox(7, previous, choose, next);
        periods.setAlignment(Pos.CENTER_LEFT);
        Button fuelButton = button("Combustible", () -> controller.switchMaintenance(false));
        fuelButton.setId("fuel-mode");
        if (!showMaintenance) fuelButton.getStyleClass().add("selected-filter");
        HBox modes = new HBox(7, fuelButton);
        if (equipment.type() == EquipmentType.THERMO) {
            Button maintenanceButton = button("Mantenimiento", () -> controller.switchMaintenance(true));
            maintenanceButton.setId("maintenance-mode");
            if (showMaintenance) maintenanceButton.getStyleClass().add("selected-filter");
            modes.getChildren().add(maintenanceButton);
        }
        return toolbar(modes, periods);
    }

    private VBox fuelHistory() {
        List<FuelEntry> entries = fuel.stream().filter(entry -> entry.period().equals(period)).toList();
        LedgerTable<FuelEntry> ledger = new LedgerTable<>("Aún no hay registros de combustible en este mes.",
                ReportRows.fuelHeadings(equipment.type()), new double[]{85, 105, 69, 89, 75, 82, 77, 78, 100, 101, 94, 94, 83},
                entries, ReportRows::fuel, ReportRows::fuelTotal);
        var table = ledger.view();
        table.setId("monthly-fuel-table");
        TextField search = search("Buscar por operador, fecha u origen");
        Button edit = button("Editar", () -> controller.editFuel(ledger.selectedEntry()));
        Button delete = button("Eliminar", () -> controller.deleteFuel(ledger.selectedEntry()));
        Button report = button("PDF de combustible", () -> controller.exportFuel(equipment, period, ledger.visibleEntries()));
        wireSearch(ledger, search, report, entry -> entry.operators() + " " + Format.date(entry.date())
                + " " + entry.source() + " " + entry.notes());
        bindSelection(ledger, edit, delete);
        Label detail = new Label("Selecciona un registro para ver sus datos.");
        detail.setWrapText(true);
        table.getSelectionModel().selectedItemProperty().addListener((observable, old, row) -> {
            FuelEntry entry = ledger.selectedEntry();
            if (entry == null) {
                detail.setText("Selecciona un registro para ver sus datos.");
                return;
            }
            detail.setText("Registro " + entry.id() + " · " + (entry.source().equals("EXCEL") ? "Historial de Excel" : "Captura manual")
                    + " · " + entry.operators() + (entry.date() == null ? " · Día sin especificar" : " · " + Format.date(entry.date()))
                    + "\nFactor de rendimiento: " + Format.decimal(entry.target()) + " " + entry.type().targetUnit()
                    + " · Factor real: " + Format.quantity(entry.calculation().observedRate()) + " " + entry.type().targetUnit()
                    + (entry.notes().isBlank() ? "" : "\n" + entry.notes()));
        });
        if (!historyOnly) ledger.rowActions(controller::editFuel);
        VBox panel = card("Resumen mensual · " + Format.month(period));
        Node totals = TotalsView.monthlyFuel(FuelTotals.of(entries));
        totals.setId("month-totals");
        Label caption = new Label("La fila Totales y el PDF siguen la búsqueda. Factor real: promedio de los registros visibles.");
        caption.setWrapText(true);
        caption.getStyleClass().add("card-note");
        HBox actions = historyOnly ? toolbar(search, report) : toolbar(search, edit, delete, report);
        panel.getChildren().addAll(totals, actions, table, caption, detail);
        return panel;
    }

    private VBox maintenanceHistory() {
        List<MaintenanceEntry> entries = maintenance.stream().filter(entry -> YearMonth.from(entry.date()).equals(period)).toList();
        LedgerTable<MaintenanceEntry> ledger = new LedgerTable<>("Aún no hay mantenimientos de este thermo en el mes.",
                ReportRows.maintenanceHeadings(), new double[]{85, 93, 144, 125, 98, 100, 103, 86, 89},
                entries, ReportRows::maintenance, ReportRows::maintenanceTotal);
        var table = ledger.view();
        table.setId("monthly-maintenance-table");
        TextField search = search("Buscar trabajo, taller o técnico");
        Button add = primary("Registrar mantenimiento", () -> controller.editMaintenance(equipment, null));
        Button edit = button("Editar", () -> controller.editMaintenance(equipment, ledger.selectedEntry()));
        Button delete = button("Eliminar", () -> controller.deleteMaintenance(ledger.selectedEntry()));
        Button report = button("PDF de mantenimiento", () -> controller.exportMaintenance(equipment, period, ledger.visibleEntries()));
        wireSearch(ledger, search, report, entry -> entry.workDone() + " " + entry.workshop() + " "
                + entry.technician() + " " + entry.category() + " " + entry.status());
        bindSelection(ledger, edit, delete);
        Label detail = new Label("Selecciona un registro para ver los detalles del trabajo.");
        detail.setWrapText(true);
        table.getSelectionModel().selectedItemProperty().addListener((observable, old, row) -> {
            MaintenanceEntry entry = ledger.selectedEntry();
            if (entry == null) {
                detail.setText("Selecciona un registro para ver los detalles del trabajo.");
                return;
            }
            detail.setText(entry.category() + " · Técnico: " + empty(entry.technician())
                    + "\nFalla: " + empty(entry.reportedFault()) + "\nTrabajo: " + entry.workDone());
        });
        VBox panel = card("Resumen de mantenimiento · " + Format.month(period));
        panel.getChildren().addAll(historyOnly ? toolbar(search, report) : toolbar(search, add, report), table);
        if (!historyOnly) panel.getChildren().add(new HBox(8, edit, delete));
        panel.getChildren().add(detail);
        return panel;
    }

    private Node archivedMonths(boolean showMaintenance) {
        TreeSet<YearMonth> months = new TreeSet<>(java.util.Comparator.reverseOrder());
        if (showMaintenance) {
            maintenance.forEach(entry -> months.add(YearMonth.from(entry.date())));
        } else {
            fuel.forEach(entry -> months.add(entry.period()));
            pending.stream().map(PendingFuel::period).filter(java.util.Objects::nonNull).forEach(months::add);
        }
        months.remove(period);
        TilePane periods = new TilePane(8, 8);
        for (YearMonth month : months) {
            long count = showMaintenance
                    ? maintenance.stream().filter(entry -> YearMonth.from(entry.date()).equals(month)).count()
                    : fuel.stream().filter(entry -> entry.period().equals(month)).count();
            long pendingCount = showMaintenance ? 0 : pending.stream().filter(entry -> month.equals(entry.period())).count();
            String label = Format.month(month) + " · " + count + (pendingCount == 0 ? "" : " + " + pendingCount + " por revisar");
            periods.getChildren().add(button(label, () -> controller.selectPeriod(month)));
        }
        if (months.isEmpty()) periods.getChildren().add(new Label("Aquí aparecerán los meses con registros guardados."));
        TitledPane history = new TitledPane("Historial por mes (" + months.size() + ")", periods);
        history.setId("archive-months");
        history.setExpanded(false);
        return history;
    }

    private Node pendingHistory() {
        List<PendingFuel> entries = pending.stream()
                .filter(entry -> entry.period() == null || entry.period().equals(period)).toList();
        TableView<PendingFuel> table = table("No hay registros de Excel por revisar en este mes.");
        table.getColumns().add(column("Hoja / fila", 145, entry -> entry.sheet() + " / " + entry.row()));
        table.getColumns().add(column("Periodo", 108, entry -> entry.period() == null ? "Por confirmar" : entry.period().toString()));
        table.getColumns().add(column("Motivo", 330, PendingFuel::reason));
        table.getColumns().add(column("Operador", 135, PendingFuel::operator));
        table.setItems(FXCollections.observableArrayList(entries));
        Button review = button("Revisar y completar", () -> controller.reviewFuel(table.getSelectionModel().getSelectedItem()));
        Button discard = button("Descartar", () -> controller.discardFuel(table.getSelectionModel().getSelectedItem()));
        review.disableProperty().bind(table.getSelectionModel().selectedItemProperty().isNull());
        discard.disableProperty().bind(review.disableProperty());
        VBox body = new VBox(8, table);
        if (!historyOnly) body.getChildren().add(new HBox(8, review, discard));
        TitledPane pane = new TitledPane("Excel por revisar · " + entries.size() + " en la vista · " + pending.size() + " en el equipo", body);
        pane.setExpanded(!entries.isEmpty());
        return pane;
    }

    private static <T> void wireSearch(LedgerTable<T> ledger, TextField search, Button report,
                                       Function<T, String> searchable) {
        report.setDisable(ledger.visibleEntries().isEmpty());
        search.textProperty().addListener((observable, old, value) -> {
            ledger.filter(value, searchable);
            report.setDisable(ledger.visibleEntries().isEmpty());
        });
    }

    private static <T> void bindSelection(LedgerTable<T> ledger, Button edit, Button delete) {
        edit.disableProperty().bind(Bindings.createBooleanBinding(() -> ledger.selectedEntry() == null,
                ledger.view().getSelectionModel().selectedItemProperty()));
        delete.disableProperty().bind(edit.disableProperty());
    }

    private static VBox fact(String title, String content) {
        Label name = new Label(title);
        name.getStyleClass().add("card-label");
        Label value = new Label(content);
        value.setWrapText(true);
        value.getStyleClass().add("metric-value");
        return new VBox(4, name, value);
    }

    private static String empty(String value) { return value == null || value.isBlank() ? "—" : value; }
}

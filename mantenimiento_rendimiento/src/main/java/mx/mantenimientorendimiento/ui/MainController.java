package mx.mantenimientorendimiento.ui;

import javafx.beans.property.BooleanProperty;
import javafx.beans.property.ReadOnlyStringWrapper;
import javafx.beans.property.SimpleBooleanProperty;
import javafx.collections.FXCollections;
import javafx.collections.transformation.FilteredList;
import javafx.concurrent.Task;
import javafx.fxml.FXML;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.stage.DirectoryChooser;
import javafx.stage.FileChooser;
import javafx.stage.Window;
import mx.mantenimientorendimiento.config.AppServices;
import mx.mantenimientorendimiento.domain.*;
import mx.mantenimientorendimiento.persistence.WorkspaceSnapshot;
import mx.mantenimientorendimiento.service.ExcelHistory;

import java.io.File;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Stream;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.logging.Level;
import java.util.logging.Logger;

public final class MainController {
    private enum Page { EQUIPMENT, MONTHLY, TOTAL, OPERATORS, AUDIT }

    private static final Logger LOG = Logger.getLogger(MainController.class.getName());
    private final AppServices services;
    private final BooleanProperty busy = new SimpleBooleanProperty(false);
    private WorkspaceSnapshot snapshot = new WorkspaceSnapshot(List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
    private Page page = Page.EQUIPMENT;
    private EquipmentType filter = EquipmentType.TRACTOR;
    private EquipmentType monthlyFilter;
    private Equipment selected;
    private YearMonth period = YearMonth.now();
    private boolean maintenance;
    private FuelEntry editing;
    private PendingFuel reviewing;
    private EquipmentView equipmentView;
    private Runnable onReady;

    @FXML private BorderPane root;
    @FXML private BorderPane workspace;
    @FXML private StackPane content;
    @FXML private Label pageTitle, pageSubtitle, statusLabel, storageLabel;
    @FXML private ProgressIndicator progress;
    @FXML private Button equipmentNav, monthlyNav, totalNav, operatorsNav, auditNav;

    public MainController(AppServices services) { this.services = services; }

    @FXML private void initialize() {
        workspace.disableProperty().bind(busy);
        progress.visibleProperty().bind(busy);
        progress.managedProperty().bind(busy);
        for (Button button : List.of(equipmentNav, monthlyNav, totalNav, operatorsNav, auditNav)) button.disableProperty().bind(busy);
        storageLabel.setText("Datos locales");
        storageLabel.setTooltip(new Tooltip(services.paths().root().toString()));
        reload("Selecciona un equipo para abrir su ficha.");
    }

    public boolean canClose() { return !busy.get() && canLeave(); }
    public void onReady(Runnable action) { onReady = action; }

    @FXML public void showEquipment() { navigate(Page.EQUIPMENT); }
    @FXML private void showMonthlySummary() { navigate(Page.MONTHLY); }
    @FXML private void showTotalSummary() { navigate(Page.TOTAL); }
    @FXML private void showOperators() { navigate(Page.OPERATORS); }
    @FXML public void showAudit() {
        if (navigate(Page.AUDIT)) reload("Bitácora actualizada.");
    }

    private boolean navigate(Page destination) {
        if (!canLeave()) return false;
        selected = null;
        clearEdit();
        page = destination;
        render();
        return true;
    }

    void openEquipment(Equipment equipment) {
        if (!canLeave()) return;
        selected = equipment;
        period = YearMonth.now();
        maintenance = false;
        if (page == Page.MONTHLY) {
            long id = equipment.id();
            var fuelMonths = snapshot.fuel().stream().filter(entry -> entry.equipmentId() == id).map(FuelEntry::period);
            var pendingMonths = snapshot.pending().stream().filter(entry -> entry.equipmentId() == id)
                    .map(PendingFuel::period).filter(Objects::nonNull);
            var recentFuel = Stream.concat(fuelMonths, pendingMonths).max(YearMonth::compareTo);
            var recentMaintenance = snapshot.maintenance().stream().filter(entry -> entry.equipmentId() == id)
                    .map(entry -> YearMonth.from(entry.date())).max(YearMonth::compareTo);
            period = recentFuel.or(() -> recentMaintenance).orElse(period);
            maintenance = recentFuel.isEmpty() && recentMaintenance.isPresent();
        } else {
            page = Page.EQUIPMENT;
        }
        clearEdit();
        render();
    }

    void selectPeriod(YearMonth month) {
        if (period.equals(month) || !canLeave()) return;
        period = month;
        clearEdit();
        render();
    }

    void switchMaintenance(boolean requested) {
        if (maintenance == requested || !canLeave()) return;
        if (requested && selected.type() != EquipmentType.THERMO) return;
        maintenance = requested;
        clearEdit();
        render();
    }

    private void render() {
        equipmentView = null;
        active(equipmentNav, page == Page.EQUIPMENT);
        active(monthlyNav, page == Page.MONTHLY);
        active(totalNav, page == Page.TOTAL);
        active(operatorsNav, page == Page.OPERATORS);
        active(auditNav, page == Page.AUDIT);
        Node node = switch (page) {
            case EQUIPMENT, MONTHLY -> selected == null ? equipmentMenu() : equipmentSheet();
            case TOTAL -> totalSummary();
            case OPERATORS -> operators();
            case AUDIT -> audit();
        };
        content.getChildren().setAll(node);
    }

    private Node equipmentMenu() {
        boolean monthly = page == Page.MONTHLY;
        EquipmentType selectedFilter = monthly ? monthlyFilter : filter;
        pageTitle.setText(monthly ? "Resumen mensual" : "Indicadores y Registros");
        pageSubtitle.setText(monthly ? "Selecciona una unidad para consultar su historial mensual."
                : "Equipos registrados · abre una ficha para consultar y capturar sus registros.");
        TextField search = search("Buscar número económico, placas o modelo");
        TilePane tiles = new TilePane(14, 14);
        tiles.setPrefTileWidth(152);
        tiles.setPrefTileHeight(152);
        tiles.setPrefColumns(5);
        tiles.setTileAlignment(Pos.TOP_LEFT);
        Label count = new Label();
        Label empty = new Label("Registra un equipo o importa su historial desde Excel.");
        empty.setWrapText(true);
        empty.getStyleClass().add("notice");
        Runnable refresh = () -> {
            String query = search.getText().strip().toLowerCase(Locale.ROOT);
            List<Equipment> visible = snapshot.equipment().stream()
                    .filter(equipment -> selectedFilter == null || equipment.type() == selectedFilter)
                    .filter(equipment -> (equipment + " " + equipment.plates() + " " + equipment.model())
                            .toLowerCase(Locale.ROOT).contains(query)).toList();
            tiles.getChildren().setAll(visible.stream().map(this::equipmentTile).toList());
            count.setText(visible.size() + (visible.size() == 1 ? " equipo" : " equipos"));
            empty.setText(query.isBlank() ? "Registra un equipo o importa su historial desde Excel."
                    : "No hay equipos que coincidan con la búsqueda.");
            empty.setVisible(visible.isEmpty());
            empty.setManaged(visible.isEmpty());
        };
        HBox filters = new HBox(8, filterButton("Tractores", EquipmentType.TRACTOR, selectedFilter),
                filterButton("Thermos", EquipmentType.THERMO, selectedFilter), filterButton("Todos", null, selectedFilter));
        Button add = primary("Registrar equipo", () -> FormDialogs.equipment(window(),
                filter == null ? EquipmentType.TRACTOR : filter, null).ifPresent(form ->
                mutate("Guardando equipo…", () -> services.repository().createEquipment(form.type(), form.number(),
                        form.plates(), form.model(), form.target()), id -> filter = form.type(), "Equipo registrado.")));
        search.textProperty().addListener((observable, old, value) -> refresh.run());
        refresh.run();
        VBox body = new VBox(16, monthly ? filters : toolbar(filters, add), toolbar(search, count), empty, tiles);
        body.getStyleClass().add("section");
        ScrollPane scroll = new ScrollPane(body);
        scroll.setFitToWidth(true);
        return scroll;
    }

    private Button filterButton(String title, EquipmentType type, EquipmentType selectedFilter) {
        Button button = button(title, () -> {
            if (page == Page.MONTHLY) monthlyFilter = type;
            else filter = type;
            render();
        });
        if (type == EquipmentType.THERMO) button.setId("filter-thermo");
        if (selectedFilter == type) button.getStyleClass().add("selected-filter");
        return button;
    }

    private Button equipmentTile(Equipment equipment) {
        Label type = new Label(equipment.type().toString());
        type.getStyleClass().add("tile-type");
        Label number = new Label(equipment.economicNumber());
        number.getStyleClass().add("tile-number");
        number.setMaxWidth(128);
        Label plates = new Label(equipment.plates().isBlank() ? "Abrir ficha" : equipment.plates());
        plates.getStyleClass().add("tile-detail");
        VBox text = new VBox(8, type, number, plates);
        text.setAlignment(Pos.CENTER_LEFT);
        Button tile = button("", () -> openEquipment(equipment));
        tile.setGraphic(text);
        tile.setAccessibleText("Abrir " + equipment);
        tile.setUserData(equipment);
        tile.setPrefSize(152, 152);
        tile.setMinSize(152, 152);
        tile.getStyleClass().addAll("equipment-tile", equipment.type() == EquipmentType.THERMO ? "thermo-tile" : "tractor-tile");
        return tile;
    }

    private Node equipmentSheet() {
        boolean monthly = page == Page.MONTHLY;
        pageTitle.setText(selected.toString());
        pageSubtitle.setText(monthly ? "Historial mensual de la unidad" : "Ficha del equipo · captura e historial por mes");
        equipmentView = new EquipmentView(this, snapshot, selected, period, maintenance, monthly, editing, reviewing);
        Button back = monthly ? button("‹ Resumen mensual", this::showMonthlySummary)
                : button("‹ Equipos registrados", this::showEquipment);
        Button pdf = button("PDF mensual de la unidad", this::exportMonthly);
        pdf.setId("monthly-pdf");
        HBox navigation = toolbar(back, pdf);
        if (monthly) {
            navigation.getChildren().add(primary("Abrir ficha", () -> {
                page = Page.EQUIPMENT;
                render();
            }));
        }
        VBox body = new VBox(8, navigation, equipmentView);
        body.getStyleClass().add("equipment-sheet");
        VBox.setVgrow(equipmentView, Priority.ALWAYS);
        return body;
    }

    private Node totalSummary() {
        pageTitle.setText("Resumen total");
        pageSubtitle.setText("Todos los periodos registrados · combustible y mantenimiento de la empresa");
        Node totals = TotalsView.company(snapshot);
        Button pdf = button("PDF general", this::exportGeneral);
        pdf.setId("general-pdf");
        VBox body = new VBox(8, toolbar(pdf), totals);
        VBox.setVgrow(totals, Priority.ALWAYS);
        return body;
    }

    void editEquipment(Equipment equipment) {
        if (!canLeave()) return;
        FormDialogs.equipment(window(), equipment.type(), equipment).ifPresent(form ->
                mutate("Actualizando equipo…", () -> {
                    services.repository().updateEquipment(equipment.id(), form.plates(), form.model(), form.target());
                    return null;
                }, ignored -> clearEdit(), "Datos del equipo actualizados."));
    }

    void editFuel(FuelEntry entry) {
        if (entry == null || !canLeave()) return;
        reviewing = null;
        editing = entry;
        render();
    }

    void reviewFuel(PendingFuel entry) {
        if (entry == null || !canLeave()) return;
        editing = null;
        reviewing = entry;
        render();
    }

    void cancelFuelEdit() {
        if (!canLeave()) return;
        clearEdit();
        render();
    }

    void saveFuel(FuelDraft draft, FuelEntry current, PendingFuel pending) {
        if (current == null && pending == null && snapshot.fuel().stream().anyMatch(entry ->
                entry.equipmentId() == draft.equipmentId() && entry.period().equals(draft.period()))
                && !confirm("Agregar otro corte del mes", "Este registro se sumará a los cortes que ya están guardados en el mes.")) return;
        mutate("Guardando combustible…", () -> {
            if (pending != null) return services.repository().resolvePending(pending.id(), draft);
            if (current != null) return services.repository().updateFuel(current.id(), draft);
            return services.repository().saveFuel(draft);
        }, id -> {
            clearEdit();
            period = draft.period();
        }, "Registro de combustible guardado.");
    }

    void deleteFuel(FuelEntry entry) {
        if (entry == null || !canLeave() || !confirm("Eliminar registro de combustible",
                "Se retirará el registro " + entry.id() + " del resumen de " + Format.month(entry.period()) + ".")) return;
        mutate("Eliminando registro…", () -> {
            services.repository().deleteFuel(entry.equipmentId(), entry.id());
            return null;
        }, ignored -> clearEdit(), "Registro eliminado.");
    }

    void discardFuel(PendingFuel entry) {
        if (entry == null || !canLeave() || !confirm("Descartar registro pendiente",
                "Se retirará de la revisión " + entry.sheet() + ", fila " + entry.row() + ".")) return;
        mutate("Descartando registro…", () -> {
            services.repository().discardPending(entry.equipmentId(), entry.id());
            return null;
        }, ignored -> clearEdit(), "Registro descartado.");
    }

    void editMaintenance(Equipment equipment, MaintenanceEntry entry) {
        LocalDate today = LocalDate.now();
        LocalDate defaultDate = period.equals(YearMonth.from(today)) ? today : null;
        FormDialogs.maintenance(window(), equipment, defaultDate, entry).ifPresent(draft ->
                mutate("Guardando mantenimiento…", () -> entry == null ? services.repository().saveMaintenance(draft)
                        : services.repository().updateMaintenance(entry.id(), draft),
                        id -> period = YearMonth.from(draft.date()), "Mantenimiento guardado."));
    }

    void deleteMaintenance(MaintenanceEntry entry) {
        if (entry == null || !confirm("Eliminar mantenimiento", "Se retirará del historial el trabajo «" + entry.workDone() + "».")) return;
        mutate("Eliminando mantenimiento…", () -> {
            services.repository().deleteMaintenance(entry.equipmentId(), entry.id());
            return null;
        }, ignored -> {}, "Mantenimiento eliminado.");
    }

    private Node operators() {
        pageTitle.setText("Operadores");
        pageSubtitle.setText("Operadores disponibles para seleccionar en la captura mensual.");
        TableView<Operator> table = table("Aún no hay operadores registrados.");
        table.getColumns().add(column("Nombre", 270, Operator::name));
        table.getColumns().add(column("Licencia", 170, Operator::license));
        TextField search = search("Buscar por nombre o licencia");
        FilteredList<Operator> operators = new FilteredList<>(FXCollections.observableArrayList(snapshot.operators()));
        table.setItems(operators);
        search.textProperty().addListener((observable, old, value) -> operators.setPredicate(operator ->
                (operator.name() + " " + operator.license()).toLowerCase(Locale.ROOT).contains(value.strip().toLowerCase(Locale.ROOT))));
        Button add = primary("Registrar operador", () -> FormDialogs.operator(window()).ifPresent(form ->
                mutate("Guardando operador…", () -> services.repository().createOperator(form.name(), form.license()),
                        id -> {}, "Operador guardado.")));
        VBox body = new VBox(12, toolbar(search, add), table);
        body.getStyleClass().add("section");
        VBox.setVgrow(table, Priority.ALWAYS);
        return body;
    }

    private Node audit() {
        pageTitle.setText("Bitácora");
        pageSubtitle.setText("Actividad registrada en esta laptop.");
        TableView<AuditEntry> table = table("Aún no hay actividad registrada.");
        DateTimeFormatter date = DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm").withZone(ZoneId.systemDefault());
        table.getColumns().add(column("Fecha y hora", 165, entry -> date.format(entry.at())));
        table.getColumns().add(column("Usuario", 110, AuditEntry::actor));
        table.getColumns().add(column("Acción", 200, AuditEntry::action));
        table.getColumns().add(column("Descripción", 260, AuditEntry::description));
        table.setItems(FXCollections.observableArrayList(snapshot.audit()));
        VBox body = new VBox(table);
        body.getStyleClass().add("section");
        VBox.setVgrow(table, Priority.ALWAYS);
        return body;
    }

    @FXML private void importExcel() {
        if (!canLeave()) return;
        FileChooser chooser = new FileChooser();
        chooser.setTitle("Seleccionar el historial de tractores o thermos");
        chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("Libro de Excel", "*.xlsx"));
        File file = chooser.showOpenDialog(window());
        if (file == null) return;
        FormDialogs.importYear(window(), file.getName()).ifPresent(year -> run("Leyendo historial…",
                () -> ExcelHistory.read(file.toPath(), year), this::confirmImport));
    }

    private void confirmImport(ExcelHistory history) {
        Dialog<ButtonType> dialog = new Dialog<>();
        dialog.initOwner(window());
        dialog.setTitle("Revisar historial de Excel");
        dialog.setResizable(true);
        ButtonType importButton = new ButtonType("Importar historial", ButtonBar.ButtonData.OK_DONE);
        TextArea summary = new TextArea(history.summary());
        summary.setWrapText(true);
        summary.setEditable(false);
        summary.setPrefSize(660, 465);
        dialog.getDialogPane().setContent(summary);
        dialog.getDialogPane().getButtonTypes().addAll(importButton, ButtonType.CANCEL);
        if (dialog.showAndWait().orElse(ButtonType.CANCEL) != importButton) {
            statusLabel.setText("Historial listo para revisar.");
            return;
        }
        mutate("Guardando historial de Excel…", () -> {
            services.repository().importHistory(history);
            return null;
        }, ignored -> {
            selected = null;
            page = Page.EQUIPMENT;
            filter = history.type();
            clearEdit();
        }, "Historial importado. Abre un equipo y consulta sus meses guardados.");
    }

    @FXML private void backup() {
        DirectoryChooser chooser = new DirectoryChooser();
        chooser.setTitle("Elegir carpeta para guardar el respaldo");
        File initial = services.paths().backups().toFile();
        if (initial.isDirectory()) chooser.setInitialDirectory(initial);
        File directory = chooser.showDialog(window());
        if (directory == null) return;
        run("Creando respaldo…", () -> {
            Path path = services.backups().create(directory.toPath());
            services.repository().recordEvent("RESPALDO", "base-local", path.getFileName().toString());
            return path;
        }, path -> {
            statusLabel.setText("Respaldo guardado.");
            info("Respaldo creado en:\n" + path);
        });
    }

    void exportFuel(Equipment equipment, YearMonth month, List<FuelEntry> entries) {
        export("combustible", reportFilename("combustible", equipment, month),
                path -> services.reports().exportFuel(equipment, month, entries, path));
    }

    void exportMaintenance(Equipment equipment, YearMonth month, List<MaintenanceEntry> entries) {
        export("mantenimiento", reportFilename("mantenimiento", equipment, month),
                path -> services.reports().exportMaintenance(equipment, month, entries, path));
    }

    private void exportMonthly() {
        Equipment equipment = selected;
        YearMonth month = period;
        WorkspaceSnapshot data = snapshot;
        export("mensual", reportFilename("mensual", equipment, month),
                path -> services.reports().exportMonthly(data, equipment, month, path));
    }

    private void exportGeneral() {
        WorkspaceSnapshot data = snapshot;
        export("general", "reporte-general.pdf", path -> services.reports().exportGeneral(data, path));
    }

    private static String reportFilename(String type, Equipment equipment, YearMonth month) {
        String number = equipment.economicNumber().replaceAll("[^a-zA-Z0-9_-]", "_");
        return type + "-" + equipment.type() + "-" + number + "-" + month + ".pdf";
    }

    private void export(String type, String filename, Report report) {
        FileChooser chooser = new FileChooser();
        chooser.setTitle("Guardar PDF · " + type);
        chooser.setInitialFileName(filename);
        chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("PDF", "*.pdf"));
        File destination = chooser.showSaveDialog(window());
        if (destination == null) return;
        run("Generando PDF…", () -> {
            Path path = destination.toPath();
            report.write(path);
            services.repository().recordEvent("EXPORTACION_PDF", type, destination.getName());
            return path;
        }, path -> {
            statusLabel.setText("Reporte guardado.");
            info("Reporte guardado en:\n" + path);
        });
    }

    private void clearEdit() {
        editing = null;
        reviewing = null;
    }

    private boolean canLeave() {
        return equipmentView == null || !equipmentView.isDirty()
                || confirm("Descartar cambios sin guardar", "La captura que está abierta tiene cambios sin guardar.");
    }

    private void reload(String message) {
        run("Cargando registros…", () -> services.repository().snapshot(), data -> {
            snapshot = data;
            if (selected != null) {
                long id = selected.id();
                selected = data.equipment().stream().filter(equipment -> equipment.id() == id).findFirst().orElse(null);
            }
            render();
            statusLabel.setText(message);
            if (onReady != null) {
                Runnable action = onReady;
                onReady = null;
                action.run();
            }
        });
    }

    private <T> void mutate(String message, CheckedSupplier<T> operation, Consumer<T> after, String success) {
        run(message, operation, result -> {
            after.accept(result);
            reload(success);
        });
    }

    private <T> void run(String message, CheckedSupplier<T> operation, Consumer<T> success) {
        if (busy.get()) return;
        busy.set(true);
        statusLabel.setText(message);
        Task<T> task = new Task<>() {
            @Override protected T call() throws Exception { return operation.get(); }
        };
        task.setOnSucceeded(event -> {
            busy.set(false);
            try {
                success.accept(task.getValue());
            } catch (RuntimeException ex) {
                error(ex);
            }
        });
        task.setOnFailed(event -> {
            busy.set(false);
            error(task.getException());
        });
        services.executor().execute(task);
    }

    private void error(Throwable exception) {
        LOG.log(Level.SEVERE, "Falló una operación", exception);
        statusLabel.setText("La operación no se completó.");
        String message = Objects.toString(exception.getMessage(), exception.getClass().getSimpleName());
        if (message.contains("UNIQUE constraint failed: equipos")) message = "Ese número económico ya está registrado en ese tipo de equipo.";
        else if (message.contains("operadores.licencia")) message = "Esa licencia pertenece a otro operador.";
        Alert alert = new Alert(Alert.AlertType.ERROR, message, ButtonType.OK);
        alert.initOwner(window());
        alert.setHeaderText("No se pudo completar la operación");
        alert.showAndWait();
    }

    private boolean confirm(String title, String message) {
        ButtonType accept = new ButtonType("Continuar", ButtonBar.ButtonData.OK_DONE);
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION, message, accept, ButtonType.CANCEL);
        alert.initOwner(window());
        alert.setHeaderText(title);
        return alert.showAndWait().orElse(ButtonType.CANCEL) == accept;
    }

    private void info(String message) {
        Alert alert = new Alert(Alert.AlertType.INFORMATION, message, ButtonType.OK);
        alert.initOwner(window());
        alert.setHeaderText(null);
        alert.showAndWait();
    }

    Window window() { return root.getScene().getWindow(); }

    static Button button(String text, Runnable action) {
        Button button = new Button(text);
        button.setOnAction(event -> action.run());
        return button;
    }

    static Button primary(String text, Runnable action) {
        Button button = button(text, action);
        button.getStyleClass().add("primary-button");
        return button;
    }

    static TextField search(String hint) {
        TextField search = new TextField();
        search.setPromptText(hint);
        return search;
    }

    static HBox toolbar(Node first, Node... actions) {
        HBox row = new HBox(8, first);
        row.setAlignment(Pos.CENTER_LEFT);
        if (first instanceof TextField) {
            HBox.setHgrow(first, Priority.ALWAYS);
        } else {
            Region spacer = new Region();
            HBox.setHgrow(spacer, Priority.ALWAYS);
            row.getChildren().add(spacer);
        }
        row.getChildren().addAll(actions);
        return row;
    }

    static VBox card(String title) {
        Label heading = new Label(title);
        heading.getStyleClass().add("section-heading");
        VBox card = new VBox(12, heading);
        card.getStyleClass().add("card");
        return card;
    }

    static <T> TableView<T> table(String placeholder) {
        TableView<T> table = new TableView<>();
        table.setMinHeight(140);
        table.setPrefHeight(240);
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
        table.setPlaceholder(new Label(placeholder));
        return table;
    }

    static <T> TableColumn<T, String> column(String title, double width, Function<T, String> value) {
        TableColumn<T, String> column = new TableColumn<>(title);
        column.setCellValueFactory(cell -> new ReadOnlyStringWrapper(value.apply(cell.getValue())));
        column.setMinWidth(Math.min(width, 68));
        column.setPrefWidth(width);
        return column;
    }

    private static void active(Button button, boolean selected) {
        button.getStyleClass().remove("active");
        if (selected) button.getStyleClass().add("active");
    }

    @FunctionalInterface private interface CheckedSupplier<T> { T get() throws Exception; }
    @FunctionalInterface private interface Report { void write(Path path) throws Exception; }
}

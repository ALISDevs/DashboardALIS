package mx.mantenimientorendimiento.ui;

import javafx.collections.FXCollections;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import mx.mantenimientorendimiento.domain.*;
import mx.mantenimientorendimiento.service.ReportRows;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;

final class FuelEditor extends HBox {
    private final Equipment equipment;
    private final YearMonth selectedPeriod;
    private final FuelEntry entry;
    private final PendingFuel pending;
    private final BigDecimal factor;
    private final DatePicker date;
    private final ComboBox<Operator> operator;
    private final TextField measurement = input("0.000", "measurement-field");
    private final TextField price = input("0.00", "price-field");
    private final TextField liters = input("Total de litros", "liters-field");
    private final TextField notes = input("Opcional", "fuel-notes");
    private final Label error = new Label();
    private final Label expected = value("expected-liters");
    private final Label budget = value("expected-cost");
    private final Label expense = value("actual-cost");
    private final Label difference = value("liter-difference");
    private final Label balance = value("fuel-balance");
    private final Label percent = value("fuel-percent");
    private final Label observed = value("fuel-rate");
    private final FuelCalculator calculator = new FuelCalculator();
    private boolean dirty;

    FuelEditor(Equipment equipment, YearMonth period, List<Operator> operators, FuelEntry entry,
               PendingFuel pending, Consumer<FuelDraft> save, Runnable cancel) {
        super(16);
        this.equipment = equipment;
        this.selectedPeriod = period;
        this.entry = entry;
        this.pending = pending;
        factor = entry != null ? entry.target()
                : pending != null && pending.factor() != null && pending.factor().signum() > 0
                ? pending.factor() : equipment.target();
        LocalDate today = LocalDate.now();
        date = Format.datePicker(entry != null ? entry.date()
                : pending == null && period.equals(YearMonth.from(today)) ? today : null);
        date.setId("fuel-date");
        operator = new ComboBox<>(FXCollections.observableArrayList(operators));
        operator.setPromptText("Seleccionar operador");
        operator.setMaxWidth(Double.MAX_VALUE);
        if (entry != null) {
            operators.stream().filter(item -> Objects.equals(item.id(), entry.operatorId())).findFirst().ifPresent(operator::setValue);
            setValue(measurement, entry.measurement());
            setValue(price, entry.price());
            setValue(liters, entry.liters());
            notes.setText(entry.notes());
        } else if (pending != null) {
            setValue(measurement, pending.measurement());
            setValue(price, pending.price());
            setValue(liters, pending.liters());
        }

        String title = entry != null ? "Editar registro" : pending != null ? "Revisar registro de Excel" : "Captura mensual";
        Button clearOperator = new Button("Quitar");
        clearOperator.setOnAction(event -> operator.setValue(null));
        HBox operatorField = new HBox(6, operator, clearOperator);
        HBox.setHgrow(operator, Priority.ALWAYS);
        Button submit = new Button(entry != null ? "Guardar cambios" : "Guardar registro");
        submit.setId("save-fuel");
        submit.getStyleClass().add("primary-button");
        submit.setOnAction(event -> {
            try {
                FuelDraft draft = draft();
                error.setText("");
                save.accept(draft);
            } catch (IllegalArgumentException | ArithmeticException ex) {
                error.setText(Objects.toString(ex.getMessage(), "Revisa las cifras capturadas."));
            }
        });
        HBox actions = new HBox(8, submit);
        if (entry != null || pending != null) {
            Button cancelButton = new Button("Cancelar");
            cancelButton.setOnAction(event -> cancel.run());
            actions.getChildren().add(cancelButton);
        }
        String measureLabel = equipment.type() == EquipmentType.THERMO ? "Horas trabajadas en el mes" : "Kilómetros trabajados";
        VBox capture = panel(title);
        if (pending != null) {
            Label warning = new Label(pending.reason() + " · " + pending.originalMeasurement()
                    + " · " + pending.sheet() + ", fila " + pending.row()
                    + (pending.factor() == null ? "\nSe aplicará el factor vigente del equipo." : ""));
            warning.setWrapText(true);
            warning.getStyleClass().add("notice");
            capture.getChildren().add(warning);
        }
        String originalOperator = entry != null && entry.operatorId() == null ? entry.operators()
                : pending == null ? "" : pending.operator();
        VBox operatorGroup = field("Operador actual", operatorField);
        if (!originalOperator.isBlank() && !originalOperator.equals("Sin asignar")) {
            Label historical = new Label("Operador registrado: " + originalOperator);
            historical.setWrapText(true);
            operatorGroup.getChildren().add(historical);
        }
        capture.getChildren().addAll(new HBox(12, grow(field("Fecha (día/mes/año)", date)), grow(operatorGroup)),
                new HBox(12, grow(field(measureLabel, measurement)), grow(field("Costo por litro", price))),
                field("Litros cargados", liters),
                actions, error, field("Notas", notes));
        error.setWrapText(true);
        error.getStyleClass().add("negative-result");
        error.managedProperty().bind(error.textProperty().isNotEmpty());

        VBox results = panel("Resultados del cálculo");
        Label applied = new Label("Factor aplicado · " + Format.decimal(factor) + " " + equipment.type().targetUnit());
        applied.getStyleClass().add("card-note");
        results.getChildren().addAll(applied, new Separator(), metric("Litros a cargar", expected),
                metric("Costo presupuestado", budget), metric("Costo real", expense), metric("Diferencia de litros", difference),
                metric("Diferencia en pesos", balance), metric("Rendimiento (%)", percent),
                metric("Rendimiento real (" + equipment.type().targetUnit() + ")", observed));
        capture.setPrefWidth(520);
        results.setPrefWidth(360);
        HBox.setHgrow(capture, Priority.ALWAYS);
        HBox.setHgrow(results, Priority.ALWAYS);
        getChildren().addAll(capture, results);

        for (TextField field : List.of(measurement, price, liters, notes, date.getEditor())) {
            field.textProperty().addListener((observable, old, value) -> changed());
        }
        operator.valueProperty().addListener((observable, old, value) -> changed());
        refresh();
    }

    boolean isDirty() { return dirty; }

    private FuelDraft draft() {
        LocalDate selected = Format.readDate(date);
        YearMonth period = selected == null
                ? (entry != null ? entry.period() : pending != null ? pending.period() : null)
                : YearMonth.from(selected);
        if (period == null) throw new IllegalArgumentException("Selecciona el día, mes y año del registro.");
        if (entry == null && pending == null && !period.equals(selectedPeriod)) {
            throw new IllegalArgumentException("La fecha del registro debe estar en " + Format.month(selectedPeriod) + ".");
        }
        BigDecimal loadedLiters = Format.input(liters.getText(), "los litros cargados");
        List<FuelLoad> originalLoads = entry != null && period.equals(entry.period()) && loadedLiters.compareTo(entry.liters()) == 0
                ? entry.loads() : List.of();
        var draft = new FuelDraft(equipment.id(), operator.getValue() == null ? null : operator.getValue().id(),
                period, Format.input(measurement.getText(), "las horas o kilómetros"),
                loadedLiters, factor, Format.input(price.getText(), "el precio"), notes.getText(), selected, originalLoads);
        calculator.calculate(equipment.type(), draft.measurement(), draft.liters(), draft.target(), draft.price());
        return draft;
    }

    private void changed() {
        dirty = true;
        error.setText("");
        refresh();
    }

    private void refresh() {
        BigDecimal measure = positiveValue(measurement);
        BigDecimal unitPrice = positiveValue(price);
        BigDecimal actual = positiveValue(liters);
        for (Label result : List.of(expected, budget, expense, difference, balance, percent, observed)) {
            result.setText("—");
            result.getStyleClass().removeAll("positive-result", "negative-result");
        }
        try {
            BigDecimal planned = measure == null ? null : calculator.estimatedLiters(equipment.type(), measure, factor);
            if (planned != null) expected.setText(Format.quantity(planned) + " L");
            if (planned != null && unitPrice != null) budget.setText(Format.money(FuelCalculator.cents(planned.multiply(unitPrice))));
            if (actual != null && unitPrice != null) expense.setText(Format.money(FuelCalculator.cents(actual.multiply(unitPrice))));
            if (planned != null && actual != null) {
                BigDecimal delta = planned.subtract(actual);
                difference.setText(ReportRows.litersDifference(delta));
                styleSign(difference, delta.signum());
                if (unitPrice != null) {
                    FuelCalculation result = calculator.calculate(equipment.type(), measure, actual, factor, unitPrice);
                    balance.setText(Format.money(result.balanceCents()));
                    percent.setText(Format.percent(result.budgetVariance()));
                    observed.setText(Format.quantity(result.observedRate()));
                    styleSign(balance, Long.signum(result.balanceCents()));
                    styleSign(percent, Long.signum(result.balanceCents()));
                }
            }
        } catch (IllegalArgumentException | ArithmeticException ex) {
            error.setText("Las cifras exceden el rango del cálculo.");
        }
    }

    private static void styleSign(Label value, int sign) {
        if (sign != 0) value.getStyleClass().add(sign > 0 ? "positive-result" : "negative-result");
    }

    private static BigDecimal positiveValue(TextField field) {
        try {
            BigDecimal value = Format.input(field.getText(), "la cifra");
            return value.signum() > 0 ? value : null;
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static void setValue(TextField field, BigDecimal value) {
        if (value != null) field.setText(Format.decimal(value));
    }

    private static TextField input(String placeholder, String id) {
        TextField field = new TextField();
        field.setPromptText(placeholder);
        field.setId(id);
        return field;
    }

    private static Label value(String id) {
        Label value = new Label("—");
        value.setId(id);
        value.getStyleClass().add("metric-value");
        return value;
    }

    private static VBox panel(String title) {
        Label heading = new Label(title);
        heading.getStyleClass().add("section-heading");
        VBox panel = new VBox(8, heading);
        panel.setMinWidth(0);
        panel.setMaxWidth(Double.MAX_VALUE);
        panel.getStyleClass().addAll("card", "fuel-panel");
        return panel;
    }

    private static VBox field(String title, javafx.scene.Node control) {
        Label label = new Label(title);
        label.setWrapText(true);
        label.setLabelFor(control);
        VBox box = new VBox(5, label, control);
        if (control instanceof Region region) region.setMaxWidth(Double.MAX_VALUE);
        return box;
    }

    private static HBox metric(String title, Label value) {
        Label label = new Label(title);
        label.setWrapText(true);
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        return new HBox(8, label, spacer, value);
    }

    private static VBox grow(VBox node) {
        node.setMinWidth(0);
        node.setPrefWidth(185);
        HBox.setHgrow(node, Priority.ALWAYS);
        return node;
    }
}

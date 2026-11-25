package mx.mantenimientorendimiento.ui;

import javafx.collections.FXCollections;
import javafx.event.ActionEvent;
import javafx.geometry.Insets;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.stage.Window;
import mx.mantenimientorendimiento.domain.*;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

public final class FormDialogs {
    private FormDialogs() {}
    public record EquipmentForm(EquipmentType type,String number,String plates,String model,BigDecimal target) {}
    public record OperatorForm(String name,String license) {}

    public static Optional<EquipmentForm> equipment(Window owner, EquipmentType initialType, Equipment current) {
        GridPane grid = grid();
        ComboBox<EquipmentType> type = new ComboBox<>(FXCollections.observableArrayList(EquipmentType.values()));
        type.setValue(current == null ? initialType : current.type());
        type.setDisable(current != null);
        TextField number = field("Ej. 95");
        TextField plates = field("Opcional");
        TextField model = field("Marca y modelo");
        TextField factor = field("Ej. 1.7");
        Label factorLabel = new Label("Factor de rendimiento (" + type.getValue().targetUnit() + ")");
        factorLabel.setWrapText(true);
        type.valueProperty().addListener((observable, previous, selected) ->
                factorLabel.setText("Factor de rendimiento (" + selected.targetUnit() + ")"));
        if (current != null) {
            number.setText(current.economicNumber());
            number.setEditable(false);
            plates.setText(current.plates());
            model.setText(current.model());
            factor.setText(Format.decimal(current.target()));
        }
        add(grid, 0, "Tipo de equipo", type);
        add(grid, 1, "Número económico", number);
        add(grid, 2, "Placas", plates);
        add(grid, 3, "Marca y modelo", model);
        grid.add(factorLabel, 0, 4);
        grid.add(factor, 1, 4);
        return dialog(owner, current == null ? "Registrar equipo" : "Editar datos del equipo", grid, () -> {
            required(number.getText(), "Captura el número económico.");
            BigDecimal value = Format.input(factor.getText(), "el factor");
            FuelCalculator.positive(value, "El factor de rendimiento");
            return new EquipmentForm(type.getValue(), number.getText(), plates.getText(), model.getText(), value);
        });
    }

    public static Optional<OperatorForm> operator(Window owner) {
        GridPane grid = grid();
        TextField name = field("Nombre completo");
        TextField license = field("Opcional");
        add(grid, 0, "Nombre completo", name);
        add(grid, 1, "Número de licencia", license);
        return dialog(owner, "Nuevo operador", grid, () -> {
            required(name.getText(), "Captura el nombre del operador.");
            return new OperatorForm(name.getText(), license.getText());
        });
    }

    public static Optional<YearMonth> period(Window owner, YearMonth current) {
        GridPane grid = grid();
        ComboBox<Month> month = new ComboBox<>(FXCollections.observableArrayList(Month.values()));
        month.setConverter(new javafx.util.StringConverter<>() {
            @Override public String toString(Month value) {
                return value == null ? "" : value.getDisplayName(java.time.format.TextStyle.FULL, Locale.forLanguageTag("es-MX"));
            }
            @Override public Month fromString(String value) { return Month.valueOf(value); }
        });
        month.setValue(current.getMonth());
        TextField year = field("AAAA");
        year.setText(Integer.toString(current.getYear()));
        add(grid, 0, "Mes", month);
        add(grid, 1, "Año", year);
        return dialog(owner, "Elegir mes de trabajo", grid,
                () -> YearMonth.of(readYear(year.getText()), month.getValue()));
    }

    public static Optional<Integer> importYear(Window owner, String filename) {
        GridPane grid = grid();
        Label description = new Label("Confirma a qué año corresponden los meses de " + filename + ".");
        description.setWrapText(true);
        grid.add(description, 0, 0, 2, 1);
        TextField year = field("AAAA");
        add(grid, 1, "Año de los registros", year);
        return dialog(owner, "Año del historial de Excel", grid, () -> readYear(year.getText()));
    }

    private static int readYear(String value) {
        String text = value.strip();
        if (!text.matches("[0-9]{4}")) throw new IllegalArgumentException("Escribe el año con cuatro dígitos.");
        int year = Integer.parseInt(text);
        if (year < 1900 || year > 2200) throw new IllegalArgumentException("El año debe estar entre 1900 y 2200.");
        return year;
    }


    public static Optional<MaintenanceDraft> maintenance(Window owner, Equipment equipment, LocalDate initialDate,
                                                         MaintenanceEntry current) {
        GridPane grid = grid();
        DatePicker date = Format.datePicker(current == null ? initialDate : current.date());
        ComboBox<String> category = new ComboBox<>(FXCollections.observableArrayList(
                "Preventivo", "Correctivo", "Llantas y rines", "Otro"));
        category.setValue(current == null ? "Correctivo" : current.category());
        ComboBox<MaintenanceStatus> status = new ComboBox<>(FXCollections.observableArrayList(
                MaintenanceStatus.TERMINADO, MaintenanceStatus.PENDIENTE));
        status.setValue(current != null && current.status() == MaintenanceStatus.TERMINADO
                ? MaintenanceStatus.TERMINADO : MaintenanceStatus.PENDIENTE);
        TextField technician = field("Nombre del técnico");
        TextField workshop = field("Nombre del taller");
        TextArea fault = area("Falla o motivo del servicio");
        TextArea work = area("Describe el trabajo solicitado o realizado");
        TextField parts = Format.moneyField(current == null ? 0 : current.partsCents());
        TextField labor = Format.moneyField(current == null ? 0 : current.laborCents());
        TextField other = Format.moneyField(current == null ? 0 : current.otherCents());
        if (current != null) {
            technician.setText(current.technician());
            workshop.setText(current.workshop());
            fault.setText(current.reportedFault());
            work.setText(current.workDone());
        }
        add(grid, 0, "Equipo", new Label(equipment.toString()));
        add(grid, 1, "Fecha (día/mes/año)", date);
        add(grid, 2, "Categoría", category);
        add(grid, 3, "Estado", status);
        add(grid, 4, "Falla o motivo", fault);
        add(grid, 5, "Trabajo solicitado / realizado", work);
        add(grid, 6, "Técnico", technician);
        add(grid, 7, "Taller", workshop);
        add(grid, 8, "Refacciones", parts);
        add(grid, 9, "Mano de obra", labor);
        add(grid, 10, "Otros cargos", other);
        return dialog(owner, current == null ? "Registrar mantenimiento" : "Editar mantenimiento", grid, () -> {
            required(work.getText(), "Describe el trabajo.");
            LocalDate selected = Format.readDate(date);
            if (selected == null) throw new IllegalArgumentException("Selecciona la fecha.");
            BigDecimal partCost = Format.readMoney(parts);
            BigDecimal laborCost = Format.readMoney(labor);
            BigDecimal otherCost = Format.readMoney(other);
            Math.addExact(Math.addExact(FuelCalculator.cents(partCost), FuelCalculator.cents(laborCost)), FuelCalculator.cents(otherCost));
            MaintenanceStatus selectedStatus = status.getValue();
            if (selectedStatus == MaintenanceStatus.PENDIENTE && current != null && current.status() != MaintenanceStatus.TERMINADO) {
                selectedStatus = current.status();
            }
            return new MaintenanceDraft(equipment.id(), selected, category.getValue(), fault.getText(), work.getText(),
                    technician.getText(), workshop.getText(), current == null ? null : current.meter(),
                    selectedStatus, partCost, laborCost, otherCost);
        });
    }

    private static <T>Optional<T> dialog(Window owner,String title,GridPane grid,Supplier<T> read) {
        Dialog<T> dialog=new Dialog<>();dialog.initOwner(owner);dialog.setTitle(title);dialog.setResizable(true);
        ButtonType save=new ButtonType("Guardar",ButtonBar.ButtonData.OK_DONE);dialog.getDialogPane().getButtonTypes().addAll(save,ButtonType.CANCEL);
        ScrollPane scroll=new ScrollPane(grid);scroll.setFitToWidth(true);scroll.setPrefViewportWidth(650);scroll.setPrefViewportHeight(Math.min(540,80+grid.getRowCount()*47));
        dialog.getDialogPane().setContent(scroll);
        var stylesheet=FormDialogs.class.getResource("/ui/application.css");if(stylesheet!=null)dialog.getDialogPane().getStylesheets().add(stylesheet.toExternalForm());
        AtomicReference<T> validated=new AtomicReference<>();
        dialog.getDialogPane().lookupButton(save).addEventFilter(ActionEvent.ACTION,event->{
            try { validated.set(read.get()); }
            catch(RuntimeException ex){event.consume();Alert alert=new Alert(Alert.AlertType.WARNING,ex.getMessage(),ButtonType.OK);alert.initOwner(dialog.getDialogPane().getScene().getWindow());alert.setHeaderText("Revisa los datos");alert.showAndWait();}
        });
        dialog.setResultConverter(button->button==save?validated.get():null);return dialog.showAndWait();
    }
    private static GridPane grid(){GridPane grid=new GridPane();grid.setHgap(16);grid.setVgap(12);grid.setPadding(new Insets(20));ColumnConstraints labels=new ColumnConstraints(185);ColumnConstraints controls=new ColumnConstraints();controls.setHgrow(Priority.ALWAYS);grid.getColumnConstraints().addAll(labels,controls);return grid;}
    private static void add(GridPane grid,int row,String label,Node control){Label l=new Label(label);l.setWrapText(true);grid.add(l,0,row);grid.add(control,1,row);if(control instanceof Region r)r.setMaxWidth(Double.MAX_VALUE);}
    private static TextField field(String hint){TextField f=new TextField();f.setPromptText(hint);return f;}
    private static TextArea area(String hint){TextArea a=new TextArea();a.setPromptText(hint);a.setPrefRowCount(2);a.setWrapText(true);return a;}
    private static void required(String value,String message){if(value==null||value.isBlank())throw new IllegalArgumentException(message);}
}

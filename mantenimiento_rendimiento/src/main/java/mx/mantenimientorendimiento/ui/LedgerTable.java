package mx.mantenimientorendimiento.ui;

import javafx.collections.FXCollections;
import javafx.scene.control.Label;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableRow;
import javafx.scene.control.TableView;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;
import java.util.function.Consumer;

final class LedgerTable<T> {
    record Row<T>(T entry, List<String> cells) {}

    private final TableView<Row<T>> view;
    private final List<T> entries;
    private final Function<T, List<String>> cells;
    private final Function<List<T>, List<String>> totalCells;
    private List<T> visible;

    LedgerTable(String placeholder, List<String> headings, double[] widths, List<T> entries,
                Function<T, List<String>> cells, Function<List<T>, List<String>> totalCells) {
        this.entries = entries;
        this.cells = cells;
        this.totalCells = totalCells;
        view = MainController.table(placeholder);
        view.getStyleClass().add("ledger-table");
        view.setColumnResizePolicy(TableView.UNCONSTRAINED_RESIZE_POLICY);
        for (int index = 0; index < headings.size(); index++) {
            int cellIndex = index;
            TableColumn<Row<T>, String> column = MainController.column(headings.get(index), widths[index],
                    row -> row.cells().get(cellIndex));
            Label header = new Label(column.getText());
            header.setWrapText(true);
            header.setMinWidth(0);
            header.prefWidthProperty().bind(column.widthProperty().subtract(12));
            header.setPrefHeight(49);
            column.setText("");
            column.setGraphic(header);
            column.setCellFactory(ignored -> new TableCell<>() {
                @Override protected void updateItem(String value, boolean empty) {
                    super.updateItem(value, empty);
                    setWrapText(true);
                    setText(empty ? null : value);
                }
            });
            column.setSortable(false);
            column.setReorderable(false);
            view.getColumns().add(column);
        }
        rowActions(entry -> {});
        filter("", entry -> "");
    }

    void rowActions(Consumer<T> open) {
        view.setRowFactory(table -> new TableRow<>() {
            {
                setOnMouseClicked(event -> {
                    if (event.getClickCount() == 2 && getItem() != null && getItem().entry() != null) {
                        open.accept(getItem().entry());
                    }
                });
            }
            @Override protected void updateItem(Row<T> item, boolean empty) {
                super.updateItem(item, empty);
                getStyleClass().remove("ledger-total");
                if (!empty && item != null && item.entry() == null) getStyleClass().add("ledger-total");
            }
        });
    }

    void filter(String query, Function<T, String> searchable) {
        String term = query.strip().toLowerCase(Locale.ROOT);
        visible = term.isEmpty() ? List.copyOf(entries) : entries.stream()
                .filter(entry -> searchable.apply(entry).toLowerCase(Locale.ROOT).contains(term)).toList();
        List<Row<T>> rows = new ArrayList<>();
        for (T entry : visible) rows.add(new Row<>(entry, cells.apply(entry)));
        if (!visible.isEmpty()) rows.add(new Row<>(null, totalCells.apply(visible)));
        view.setItems(FXCollections.observableArrayList(rows));
    }

    TableView<Row<T>> view() { return view; }
    List<T> visibleEntries() { return visible; }

    T selectedEntry() {
        Row<T> row = view.getSelectionModel().getSelectedItem();
        return row == null ? null : row.entry();
    }
}

package mx.mantenimientorendimiento.service;

import mx.mantenimientorendimiento.domain.*;
import mx.mantenimientorendimiento.persistence.WorkspaceSnapshot;
import org.openpdf.text.*;
import org.openpdf.text.pdf.*;

import java.io.IOException;
import java.nio.file.*;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import static mx.mantenimientorendimiento.format.MoneyFormat.money;
import static mx.mantenimientorendimiento.service.ReportRows.*;

public final class PdfReportService {
    private static final Locale MEXICO = Locale.forLanguageTag("es-MX");
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMMM 'de' uuuu", MEXICO);
    private static final int LOGO_HEADER_HEIGHT = 54;

    public void exportFuel(Equipment equipment, YearMonth month, List<FuelEntry> entries, Path destination)
            throws IOException {
        write("Reporte de combustible", periodLabel(equipment, month), equipmentDetails(equipment), destination,
                document -> addFuel(document, equipment.type(), entries));
    }

    public void exportMaintenance(Equipment equipment, YearMonth month, List<MaintenanceEntry> entries, Path destination)
            throws IOException {
        if (equipment.type() != EquipmentType.THERMO) {
            throw new IllegalArgumentException("El reporte de mantenimiento corresponde a un thermo.");
        }
        write("Reporte de mantenimiento", periodLabel(equipment, month), equipmentDetails(equipment), destination,
                document -> addMaintenance(document, entries));
    }

    public void exportMonthly(WorkspaceSnapshot snapshot, Equipment equipment, YearMonth month, Path destination)
            throws IOException {
        var fuel = snapshot.fuel().stream()
                .filter(entry -> entry.equipmentId() == equipment.id() && entry.period().equals(month)).toList();
        var maintenance = snapshot.maintenance().stream()
                .filter(entry -> entry.equipmentId() == equipment.id() && YearMonth.from(entry.date()).equals(month))
                .toList();
        write("Reporte mensual de la unidad", periodLabel(equipment, month), equipmentDetails(equipment), destination, document -> {
            heading(document, "Combustible");
            addFuel(document, equipment.type(), fuel);
            if (equipment.type() == EquipmentType.THERMO) {
                heading(document, "Mantenimiento");
                addMaintenance(document, maintenance);
            }
        });
    }

    public void exportGeneral(WorkspaceSnapshot snapshot, Path destination) throws IOException {
        write("Reporte general", "Todos los periodos registrados", "Combustible y mantenimiento de la empresa",
                destination, document -> {
            FuelTotals fuel = FuelTotals.of(snapshot.fuel());
            MaintenanceTotals maintenance = MaintenanceTotals.of(snapshot.maintenance());
            heading(document, "Combustible acumulado");
            PdfPTable consumption = table(List.of("Equipo", "Actividad", "Factor real promedio", "Litros a cargar",
                    "Litros cargados", "Diferencia de litros", "Costo presupuestado", "Costo real", "Saldo",
                    "Rendimiento (%)"), new float[]{9, 9, 9, 9, 9, 12, 10, 10, 10, 10});
            for (EquipmentType type : List.of(EquipmentType.TRACTOR, EquipmentType.THERMO)) {
                var entries = snapshot.fuel().stream().filter(entry -> entry.type() == type).toList();
                FuelTotals byType = FuelTotals.of(entries);
                String activity = quantity(byType.measurement()) + (type == EquipmentType.TRACTOR ? " km" : " Horas");
                row(consumption, consumption(type == EquipmentType.TRACTOR ? "Tractores" : "Thermos",
                        activity, average(type, byType), byType), false);
            }
            row(consumption, consumption("Totales", "—", "—", fuel), true);
            document.add(consumption);
            addFuelNotes(document, "El promedio del factor real se calcula por tipo de equipo.", fuel);

            heading(document, "Gasto acumulado de la empresa");
            PdfPTable expenses = table(List.of("Combustible real", "Refacciones", "Mano de obra", "Otros cargos",
                    "Mantenimiento total", "Gasto total"), new float[]{1, 1, 1, 1, 1, 1});
            row(expenses, List.of(money(fuel.expenseCents()), money(maintenance.partsCents()),
                    money(maintenance.laborCents()), money(maintenance.otherCents()), money(maintenance.totalCents()),
                    money(Math.addExact(fuel.expenseCents(), maintenance.totalCents()))), true);
            document.add(expenses);
            note(document, "Importes en MXN.");
        });
    }

    private static List<String> consumption(String label, String activity, String average, FuelTotals totals) {
        return List.of(label, activity, average, quantity(totals.expected()), quantity(totals.actual()),
                litersDifference(totals.difference()), money(totals.budgetCents()), money(totals.expenseCents()),
                money(totals.balanceCents()), percent(totals.variance()));
    }

    private static void addFuel(Document document, EquipmentType type, List<FuelEntry> entries) {
        note(document, "Registros incluidos: " + entries.size());
        PdfPTable table = table(fuelHeadings(type), new float[]{10, 16, 8, 11, 9, 10, 9, 9, 12, 12, 10, 10, 10});
        for (FuelEntry entry : entries) row(table, fuel(entry), false);
        row(table, fuelTotal(entries), true);
        document.add(table);
        FuelTotals totals = FuelTotals.of(entries);
        addFuelNotes(document, "Promedio del factor real: " + average(type, totals) + ".", totals);
    }

    private static void addMaintenance(Document document, List<MaintenanceEntry> entries) {
        note(document, "Registros incluidos: " + entries.size());
        PdfPTable table = table(maintenanceHeadings(), new float[]{9, 10, 20, 15, 9, 10, 10, 9, 10});
        for (MaintenanceEntry entry : entries) row(table, maintenance(entry), false);
        row(table, maintenanceTotal(entries), true);
        document.add(table);
        note(document, "Importes en MXN.");
    }

    private static void addFuelNotes(Document document, String averageNote, FuelTotals totals) {
        note(document, averageNote + " Rendimiento sobre saldo: " + percent(totals.variance())
                + " (saldo ÷ costo presupuestado). Saldo: " + money(totals.balanceCents()) + ". Importes en MXN.");
    }

    private static String average(EquipmentType type, FuelTotals totals) {
        return totals.averageObservedRate() == null ? "—" : quantity(totals.averageObservedRate()) + " " + type.targetUnit();
    }

    private static void heading(Document document, String label) {
        Paragraph heading = new Paragraph(label, new Font(Font.HELVETICA, 13, Font.BOLD));
        heading.setSpacingBefore(12);
        heading.setSpacingAfter(4);
        document.add(heading);
    }

    private static void note(Document document, String text) {
        document.add(new Paragraph(text, new Font(Font.HELVETICA, 9)));
    }

    private static String periodLabel(Equipment equipment, YearMonth month) {
        return equipment + " · " + MONTH.format(month);
    }

    private static String equipmentDetails(Equipment equipment) {
        return (equipment.model() + "   " + equipment.plates()).strip();
    }

    private static void write(String title, String subtitle, String details, Path destination, Body body)
            throws IOException {
        Path absolute = destination.toAbsolutePath();
        Path temp = Files.createTempFile(absolute.getParent(), "reporte-", ".pdf");
        try {
            Document document = new Document(PageSize.A4.rotate(), 28, 28, 30 + LOGO_HEADER_HEIGHT, 30);
            try (var output = Files.newOutputStream(temp)) {
                PdfWriter writer = PdfWriter.getInstance(document, output);
                Image logo = Image.getInstance(PdfReportService.class.getResource("/branding/best-trailers-report.png"));
                logo.scaleToFit(126, 46);
                writer.setPageEvent(new PdfPageEventHelper() {
                    @Override public void onEndPage(PdfWriter writer, Document page) {
                        logo.setAbsolutePosition(page.right() - logo.getScaledWidth(),
                                page.top() + LOGO_HEADER_HEIGHT - logo.getScaledHeight());
                        writer.getDirectContent().addImage(logo);
                    }
                });
                document.open();
                try {
                    document.addTitle(title + " · " + subtitle);
                    document.add(new Paragraph(title, new Font(Font.HELVETICA, 20, Font.BOLD)));
                    document.add(new Paragraph(subtitle, new Font(Font.HELVETICA, 13, Font.BOLD)));
                    if (!details.isBlank()) document.add(new Paragraph(details, new Font(Font.HELVETICA, 10)));
                    body.add(document);
                } finally {
                    document.close();
                }
            }
            Files.move(temp, absolute, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    private static PdfPTable table(List<String> headers, float[] widths) {
        PdfPTable table = new PdfPTable(widths);
        table.setWidthPercentage(100);
        table.setHeaderRows(1);
        table.setSpacingBefore(12);
        table.setSpacingAfter(8);
        for (String title : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(title, new Font(Font.HELVETICA, 8, Font.BOLD)));
            cell.setPadding(4);
            cell.setBackgroundColor(new java.awt.Color(228, 235, 255));
            table.addCell(cell);
        }
        return table;
    }

    private static void row(PdfPTable table, List<String> values, boolean total) {
        Font font = new Font(Font.HELVETICA, 8, total ? Font.BOLD : Font.NORMAL);
        for (String value : values) {
            PdfPCell cell = new PdfPCell(new Phrase(value, font));
            cell.setPadding(4);
            if (total) cell.setBackgroundColor(new java.awt.Color(228, 235, 255));
            table.addCell(cell);
        }
    }
    @FunctionalInterface private interface Body { void add(Document document); }
}

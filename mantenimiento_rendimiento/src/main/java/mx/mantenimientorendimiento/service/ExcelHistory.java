package mx.mantenimientorendimiento.service;

import mx.mantenimientorendimiento.domain.EquipmentType;
import org.apache.poi.ss.usermodel.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;
import java.util.regex.Pattern;

/** A read-only interpretation of the numbered sheets in the indicator workbooks. */
public record ExcelHistory(String filename, String hash, int year, EquipmentType type,
                           List<Unit> units) {
    private static final Pattern SHEET = Pattern.compile("(UNIDAD|THERMO)\\s+([0-9]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern FORMULA = Pattern.compile("\\$?A\\$?(\\d+)\\s*([*/])\\s*(\\d+(?:\\.\\d+)?)", Pattern.CASE_INSENSITIVE);
    private static final int FILE_LIMIT = 32 * 1024 * 1024;

    public record Unit(String number, String plates, String model, BigDecimal factor, List<Block> blocks) {}

    public record Block(String sheet, int row, YearMonth period, String originalMonth, String measurementLabel,
                        String operator, BigDecimal measurement, BigDecimal liters, BigDecimal factor,
                        BigDecimal price, String reason) {
        public boolean pending() { return !reason.isBlank(); }
    }

    public static ExcelHistory read(Path file, int year) throws IOException {
        if (year < 1900 || year > 2200) throw new IllegalArgumentException("Confirma un año entre 1900 y 2200.");
        byte[] bytes;
        try (var input = Files.newInputStream(file)) {
            bytes = input.readNBytes(FILE_LIMIT + 1);
        }
        if (bytes.length > FILE_LIMIT) throw new IOException("El libro supera los 32 MB.");

        List<Unit> units = new ArrayList<>();
        EquipmentType type = null;
        Set<String> numbers = new HashSet<>();
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            for (Sheet sheet : workbook) {
                var match = SHEET.matcher(sheet.getSheetName().strip());
                if (!match.matches()) continue;
                EquipmentType sheetType = match.group(1).equalsIgnoreCase("THERMO")
                        ? EquipmentType.THERMO : EquipmentType.TRACTOR;
                if (type != null && type != sheetType) {
                    throw new IOException("Selecciona un libro de tractores o de thermos.");
                }
                type = sheetType;
                String number = match.group(2);
                if (!numbers.add(number)) throw new IOException("El equipo " + number + " aparece en más de una hoja.");
                units.add(readUnit(sheet, sheetType, number, year));
            }
        }
        if (type == null || units.stream().allMatch(unit -> unit.blocks().isEmpty())) {
            throw new IOException("El libro no contiene registros en hojas numeradas de tractores o thermos.");
        }
        return new ExcelHistory(file.getFileName().toString(), sha256(bytes), year, type, List.copyOf(units));
    }

    public List<Block> blocks() {
        return units.stream().flatMap(unit -> unit.blocks().stream()).toList();
    }

    public String summary() {
        List<Block> blocks = blocks();
        long pending = blocks.stream().filter(Block::pending).count();
        StringBuilder summary = new StringBuilder(filename).append(" · ").append(year)
                .append("\nEquipos: ").append(units.size())
                .append("\nRegistros completos: ").append(blocks.size() - pending)
                .append("\nRegistros por revisar: ").append(pending)
                .append("\n\nFactores para equipos nuevos\n");
        for (Unit unit : units) {
            summary.append(type).append(' ').append(unit.number()).append(" · ")
                    .append(unit.factor() == null ? "Requiere alta previa" : unit.factor().toPlainString() + " " + type.targetUnit())
                    .append('\n');
        }
        for (Block block : blocks) {
            if (block.pending()) {
                summary.append('\n').append(block.sheet()).append(", fila ").append(block.row())
                        .append(" · ").append(block.reason());
            }
        }
        return summary.toString();
    }

    private static Unit readUnit(Sheet sheet, EquipmentType type, String number, int year) {
        List<Block> blocks = new ArrayList<>();
        BigDecimal lastFactor = null;
        Set<BigDecimal> templateFactors = new HashSet<>();
        for (Row row : sheet) {
            String monthHeader = text(row.getCell(0));
            if (!monthHeader.toUpperCase(Locale.ROOT).startsWith("MES CALCULADO:")) continue;
            Row measurements = sheet.getRow(row.getRowNum() + 2);
            Cell input = cell(measurements, 0);
            Cell litersCell = cell(measurements, 2);
            BigDecimal measurement = number(input);
            BigDecimal liters = number(litersCell);
            Cell estimate = cell(measurements, 1);
            BigDecimal factor = factor(type, estimate, measurement, row.getRowNum() + 3);
            if (empty(input) && empty(litersCell)) {
                if (positive(factor)) templateFactors.add(factor);
                continue;
            }
            String monthText = afterColon(monthHeader);
            YearMonth period = month(year, monthText);
            String label = text(cell(sheet.getRow(row.getRowNum() + 1), 0));
            String operator = afterColon(text(row.getCell(2)));
            BigDecimal price = number(cell(sheet.getRow(row.getRowNum() + 4), 0));
            List<String> reasons = new ArrayList<>();
            if (period == null) reasons.add("falta confirmar el mes");
            if (!positive(measurement)) reasons.add("falta una medición válida");
            if (!positive(liters)) reasons.add("faltan litros reales");
            if (!positive(price)) reasons.add("falta un precio válido");
            if (!positive(factor)) reasons.add("falta el factor del registro");
            String normalizedLabel = label.toUpperCase(Locale.ROOT);
            boolean expectedUnit = type == EquipmentType.THERMO ? normalizedLabel.contains("HORAS") : normalizedLabel.contains("KM");
            if (!expectedUnit) reasons.add("confirma la unidad de la medición original");
            if (expectedUnit && positive(factor)) lastFactor = factor;
            blocks.add(new Block(sheet.getSheetName(), row.getRowNum() + 1, period, monthText, label,
                    operator, measurement, liters, factor, price, String.join("; ", reasons)));
        }
        if (lastFactor == null && templateFactors.size() == 1) lastFactor = templateFactors.iterator().next();
        String header = text(cell(sheet.getRow(1), 0));
        Pattern identification = Pattern.compile("THERMO\\s+(.*?)\\s+ECO\\s+\\d+\\s+PLACA\\s+(.*)", Pattern.CASE_INSENSITIVE);
        var match = identification.matcher(header);
        return match.matches() ? new Unit(number, match.group(2).strip(), match.group(1).strip(), lastFactor, List.copyOf(blocks))
                : new Unit(number, "", "", lastFactor, List.copyOf(blocks));
    }

    private static BigDecimal factor(EquipmentType type, Cell estimate, BigDecimal measurement, int dataRow) {
        if (estimate == null) return null;
        if (estimate.getCellType() == CellType.FORMULA) {
            var match = FORMULA.matcher(estimate.getCellFormula().strip());
            String operation = type == EquipmentType.TRACTOR ? "/" : "*";
            if (match.matches() && match.group(1).equals(Integer.toString(dataRow)) && match.group(2).equals(operation)) {
                return new BigDecimal(match.group(3)).stripTrailingZeros();
            }
            return null;
        }
        BigDecimal expected = number(estimate);
        if (!positive(expected) || !positive(measurement)) return null;
        return (type == EquipmentType.THERMO ? expected.divide(measurement, 12, RoundingMode.HALF_UP)
                : measurement.divide(expected, 12, RoundingMode.HALF_UP)).stripTrailingZeros();
    }

    private static YearMonth month(int year, String value) {
        for (Month month : Month.values()) {
            if (month.getDisplayName(TextStyle.FULL, Locale.forLanguageTag("es-MX")).equalsIgnoreCase(value)) {
                return YearMonth.of(year, month);
            }
        }
        return null;
    }

    private static String afterColon(String value) {
        int colon = value.indexOf(':');
        return colon < 0 ? value : value.substring(colon + 1).strip();
    }

    private static Cell cell(Row row, int index) { return row == null ? null : row.getCell(index); }
    private static boolean positive(BigDecimal value) { return value != null && value.signum() > 0; }
    private static boolean empty(Cell cell) {
        return cell == null || cell.getCellType() == CellType.BLANK
                || (cell.getCellType() == CellType.STRING && cell.getStringCellValue().isBlank());
    }
    private static String text(Cell cell) {
        return cell != null && cell.getCellType() == CellType.STRING ? cell.getStringCellValue().strip() : "";
    }
    private static BigDecimal number(Cell cell) {
        if (cell == null) return null;
        CellType kind = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
        if (kind != CellType.NUMERIC) return null;
        return BigDecimal.valueOf(cell.getNumericCellValue()).setScale(9, RoundingMode.HALF_UP).stripTrailingZeros();
    }
    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}

package mx.mantenimientorendimiento.ui;

import javafx.scene.control.DatePicker;
import javafx.scene.control.TextField;
import javafx.scene.control.TextFormatter;
import javafx.util.StringConverter;
import mx.mantenimientorendimiento.format.MoneyFormat;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.Locale;

public final class Format {
    private static final Locale MEXICO = Locale.forLanguageTag("es-MX");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/uuuu", MEXICO);
    private static final DateTimeFormatter DATE_INPUT = DateTimeFormatter.ofPattern("d/M/uuuu", MEXICO)
            .withResolverStyle(ResolverStyle.STRICT);
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMMM 'de' uuuu", MEXICO);
    private Format() {}
    public static String money(long cents) { return MoneyFormat.money(cents); }
    public static TextField moneyField(long cents) {
        TextField field = new TextField(money(cents));
        field.setTextFormatter(new TextFormatter<String>(change -> {
            if (!change.isContentChange()) return change;
            String before = change.getControlText();
            int point = before.indexOf('.');
            int start = change.getRangeStart();
            if (change.getRangeEnd() == start && point >= 0) {
                if (change.getText().equals(".") && start <= point) {
                    change.setText("");
                    change.selectRange(point + 1, point + 1);
                    return change;
                }
                if (start > point && start < before.length() && change.getText().matches("[0-9]{1,2}")) {
                    int end = Math.min(start + change.getText().length(), before.length());
                    change.setRange(start, end);
                }
            }
            String next = change.getControlNewText();
            String amount = moneyDigits(next);
            if (!amount.matches("[0-9]{0,17}(\\.[0-9]{0,2})?")) return null;

            int decimal = amount.indexOf('.');
            String rawWhole = decimal < 0 ? amount : amount.substring(0, decimal);
            String whole = rawWhole.replaceFirst("^0+(?!$)", "");
            String formatted = MoneyFormat.money(parseMoney(amount));
            int digitsBeforeCaret = moneyDigits(next.substring(0, Math.min(change.getCaretPosition(), next.length()))).length();
            digitsBeforeCaret = Math.max(0, digitsBeforeCaret - rawWhole.length() + whole.length());
            if (rawWhole.isEmpty() && digitsBeforeCaret > 0) digitsBeforeCaret++;
            int caret = 1;
            while (caret < formatted.length() && digitsBeforeCaret > 0) {
                if (formatted.charAt(caret++) != ',') digitsBeforeCaret--;
            }
            change.setRange(0, change.getControlText().length());
            change.setText(formatted);
            if (rawWhole.isEmpty() && digitsBeforeCaret == 0 && caret == 1) change.selectRange(1, 2);
            else change.selectRange(caret, caret);
            return change;
        }));
        return field;
    }

    public static BigDecimal readMoney(TextField field) {
        return parseMoney(moneyDigits(field.getText()));
    }

    private static BigDecimal parseMoney(String amount) {
        return amount.isEmpty() || amount.equals(".") ? BigDecimal.ZERO : new BigDecimal(amount);
    }
    private static String moneyDigits(String text) { return text.replace("$", "").replace(",", "").strip(); }
    public static String decimal(BigDecimal value){return value==null?"Pendiente":value.stripTrailingZeros().toPlainString();}
    public static String quantity(BigDecimal value) {
        return value == null ? "—" : decimal(value.setScale(3, RoundingMode.HALF_UP));
    }
    public static String percent(BigDecimal value) {
        if (value == null) return "—";
        return value.movePointRight(2).setScale(2, RoundingMode.HALF_UP).toPlainString() + " %";
    }
    public static String date(LocalDate date) { return date == null ? "—" : DATE.format(date); }
    public static String month(YearMonth month) { return MONTH.format(month); }
    public static DatePicker datePicker(LocalDate date) {
        DatePicker picker = new DatePicker(date);
        picker.setConverter(new StringConverter<>() {
            @Override public String toString(LocalDate value) { return value == null ? "" : DATE.format(value); }
            @Override public LocalDate fromString(String value) {
                return value == null || value.isBlank() ? null : LocalDate.parse(value.strip(), DATE_INPUT);
            }
        });
        picker.getEditor().setText(picker.getConverter().toString(date));
        picker.setPromptText("dd/mm/aaaa");
        return picker;
    }
    public static LocalDate readDate(DatePicker picker) {
        try {
            return picker.getConverter().fromString(picker.getEditor().getText());
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("Escribe una fecha válida en formato día/mes/año.");
        }
    }
    public static BigDecimal input(String text,String field){
        String clean=text==null?"":text.strip();
        if(!clean.matches("[0-9]+([.,][0-9]+)?"))throw new IllegalArgumentException("Captura "+field+" como número positivo, sin separadores de miles.");
        BigDecimal result=new BigDecimal(clean.replace(',','.'));
        if(result.precision()>20||result.scale()>12)throw new IllegalArgumentException(field+": usa hasta 20 dígitos y 12 decimales.");
        return result;
    }
}

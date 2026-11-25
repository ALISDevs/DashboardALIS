package mx.mantenimientorendimiento.format;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

public final class MoneyFormat {
    private MoneyFormat() {}

    public static String money(long cents) {
        return money(BigDecimal.valueOf(cents, 2));
    }

    public static String money(BigDecimal amount) {
        return new DecimalFormat("$#,##0.00", DecimalFormatSymbols.getInstance(Locale.US)).format(amount);
    }
}

package mx.mantenimientorendimiento.domain;

import java.math.BigDecimal;

public record Equipment(long id, EquipmentType type, String economicNumber, String plates,
                        String model, BigDecimal target) {
    @Override public String toString() { return type + " " + economicNumber; }
}

package mx.mantenimientorendimiento.domain;

public enum EquipmentType {
    TRACTOR("Tractor", "km", "km/L"), THERMO("Thermo", "h", "L/h");

    private final String label;
    private final String measurementUnit;
    private final String targetUnit;

    EquipmentType(String label, String measurementUnit, String targetUnit) {
        this.label = label;
        this.measurementUnit = measurementUnit;
        this.targetUnit = targetUnit;
    }

    public String measurementUnit() { return measurementUnit; }
    public String measurementLabel() { return this == THERMO ? "Horas" : "Kilómetros"; }
    public String targetUnit() { return targetUnit; }
    @Override public String toString() { return label; }
}

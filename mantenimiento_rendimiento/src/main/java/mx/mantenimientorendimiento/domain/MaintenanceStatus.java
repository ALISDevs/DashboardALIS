package mx.mantenimientorendimiento.domain;

public enum MaintenanceStatus {
    PENDIENTE("Sin Terminar"), EN_PROCESO("Sin Terminar"), TERMINADO("Terminado"), CANCELADO("Sin Terminar");
    private final String label;
    MaintenanceStatus(String label) { this.label = label; }
    @Override public String toString() { return label; }
}

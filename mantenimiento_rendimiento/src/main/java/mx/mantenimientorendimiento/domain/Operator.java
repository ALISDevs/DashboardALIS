package mx.mantenimientorendimiento.domain;

public record Operator(long id, String name, String license) {
    @Override public String toString() { return name; }
}

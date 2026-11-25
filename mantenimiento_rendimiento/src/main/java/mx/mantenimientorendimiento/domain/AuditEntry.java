package mx.mantenimientorendimiento.domain;

import java.time.Instant;

public record AuditEntry(long id, Instant at, String actor, String action, String entity, String description) {}

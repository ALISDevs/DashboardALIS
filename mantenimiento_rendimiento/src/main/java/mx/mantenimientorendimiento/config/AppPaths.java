package mx.mantenimientorendimiento.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public record AppPaths(Path root) {
    public AppPaths { root = root.toAbsolutePath().normalize(); }

    public static AppPaths current() {
        String custom = System.getProperty("mr.dataDir");
        if (custom != null && !custom.isBlank()) return new AppPaths(Path.of(custom));
        String localAppData = System.getenv("LOCALAPPDATA");
        Path base = localAppData == null || localAppData.isBlank()
                ? Path.of(System.getProperty("user.home"), ".local", "share") : Path.of(localAppData);
        return new AppPaths(base.resolve("MantenimientoRendimiento"));
    }

    public Path database() { return root.resolve("mantenimiento-rendimiento.db"); }
    public Path backups() { return root.resolve("respaldos"); }
    public Path documents() { return root.resolve("comprobantes"); }
    public Path logs() { return root.resolve("logs"); }

    public void ensureDirectories() throws IOException {
        for (Path p : new Path[]{root, backups(), documents(), logs()}) Files.createDirectories(p);
    }
}

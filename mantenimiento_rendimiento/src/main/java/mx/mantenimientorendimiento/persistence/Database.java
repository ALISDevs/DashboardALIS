package mx.mantenimientorendimiento.persistence;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.*;
import java.util.Objects;

public final class Database {
    private final Path path;

    public Database(Path path) { this.path = path.toAbsolutePath().normalize(); }
    public Path path() { return path; }

    public Connection connect() throws SQLException {
        Connection connection = DriverManager.getConnection("jdbc:sqlite:" + path);
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            statement.execute("PRAGMA busy_timeout = 5000");
        } catch (SQLException e) { connection.close(); throw e; }
        return connection;
    }

    public void initialize() throws SQLException, IOException {
        try (Connection connection = connect(); Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA journal_mode = WAL");
            statement.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL) STRICT");
            int version;
            try (ResultSet rows = statement.executeQuery("SELECT COALESCE(MAX(version), 0) FROM schema_migrations")) { rows.next(); version = rows.getInt(1); }
            String[] migrations = {"/db/V001__initial.sql", "/db/V002__equipment_history.sql"};
            if (version > migrations.length) throw new SQLException("Esta base fue creada por una versión más reciente. Actualiza la aplicación.");
            if (version < migrations.length) {
                connection.setAutoCommit(false);
                try {
                    for (int index = version; index < migrations.length; index++) {
                        try (var stream = Objects.requireNonNull(Database.class.getResourceAsStream(migrations[index]))) {
                            String sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
                            for (String part : sql.split(";")) {
                                if (!part.isBlank()) statement.execute(part);
                            }
                        }
                        try (PreparedStatement applied = connection.prepareStatement(
                                "INSERT INTO schema_migrations VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))")) {
                            applied.setInt(1, index + 1);
                            applied.executeUpdate();
                        }
                    }
                    connection.commit();
                } catch (SQLException | IOException | RuntimeException e) { connection.rollback(); throw e; }
            }
        }
    }
}

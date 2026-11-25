package mx.mantenimientorendimiento.config;

import mx.mantenimientorendimiento.persistence.*;
import mx.mantenimientorendimiento.service.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.concurrent.*;

public record AppServices(AppPaths paths,WorkspaceRepository repository,BackupService backups,
                           PdfReportService reports,ExecutorService executor) implements AutoCloseable {
    public static AppServices open(AppPaths paths)throws IOException,SQLException {
        paths.ensureDirectories();
        Database database=new Database(paths.database());database.initialize();
        var executor=Executors.newSingleThreadExecutor(Thread.ofPlatform().name("datos-locales-",0).daemon(false).factory());
        return new AppServices(paths,new WorkspaceRepository(database,System.getProperty("user.name","usuario-local")),
                new BackupService(database,paths),new PdfReportService(),executor);
    }
    @Override public void close(){executor.shutdown();}
}

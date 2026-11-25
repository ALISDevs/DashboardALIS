package mx.mantenimientorendimiento.service;

import mx.mantenimientorendimiento.config.AppPaths;
import mx.mantenimientorendimiento.persistence.Database;
import java.io.IOException;
import java.nio.file.*;
import java.sql.*;
import java.time.Instant;
import java.util.UUID;
import java.util.zip.*;

public final class BackupService {
    private final Database database;
    private final AppPaths paths;
    public BackupService(Database database,AppPaths paths){this.database=database;this.paths=paths;}

    public Path create(Path directory) throws SQLException,IOException {
        Path destination = directory.toRealPath();
        if (destination.startsWith(paths.documents().toRealPath())) {
            throw new IOException("Elige una carpeta fuera de Comprobantes para guardar el respaldo.");
        }
        String id=Instant.now().toString().replace(":","-")+"-"+UUID.randomUUID().toString().substring(0,8);
        Path snapshot=paths.backups().resolve("snapshot-"+id+".db");
        Path archive=destination.resolve("respaldo-"+id+".zip");
        Path partial=destination.resolve("respaldo-"+id+".partial");
        try {
            try(Connection c=database.connect();PreparedStatement p=c.prepareStatement("VACUUM INTO ?")) {
                p.setString(1,snapshot.toString());p.execute();
            }
            try(Connection c=DriverManager.getConnection("jdbc:sqlite:"+snapshot);Statement s=c.createStatement();ResultSet r=s.executeQuery("PRAGMA integrity_check")) {
                if(!r.next()||!"ok".equals(r.getString(1)))throw new IOException("El respaldo no pasó la verificación de integridad.");
            }
            try(ZipOutputStream zip=new ZipOutputStream(Files.newOutputStream(partial,StandardOpenOption.CREATE_NEW))) {
                put(zip,snapshot,"mantenimiento-rendimiento.db");
                zip.putNextEntry(new ZipEntry("respaldo.txt"));
                zip.write(("Indicadores y Registros\nVersión: 1.0.0\nFecha UTC: "+Instant.now()+"\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));zip.closeEntry();
                try(var files=Files.walk(paths.documents())) {
                    for(Path file:files.filter(p->Files.isRegularFile(p,LinkOption.NOFOLLOW_LINKS)).toList())
                        put(zip,file,"comprobantes/"+paths.documents().relativize(file).toString().replace('\\','/'));
                }
            }
            Files.move(partial,archive);
            return archive;
        } finally {Files.deleteIfExists(snapshot);Files.deleteIfExists(partial);}
    }

    private static void put(ZipOutputStream zip,Path file,String name)throws IOException {
        zip.putNextEntry(new ZipEntry(name));Files.copy(file,zip);zip.closeEntry();
    }
}

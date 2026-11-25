package mx.mantenimientorendimiento.service;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.security.MessageDigest;
import static org.junit.jupiter.api.Assertions.*;

class ExcelPreviewServiceTest {
    @TempDir Path temp;

    @Test void distinguishesStaticEstimatesFromMissingValuesAndDoesNotModifyInput()throws Exception{
        Path file=temp.resolve("thermos.xlsx");
        try(var book=new XSSFWorkbook()){
            var sheet=book.createSheet("THERMO 445");
            var header=sheet.createRow(2);header.createCell(0).setCellValue("MES CALCULADO: ENERO");header.createCell(2).setCellValue("OPERADOR: JUAN");
            var labels=sheet.createRow(3);labels.createCell(0).setCellValue("HORAS TRABAJADAS");
            var values=sheet.createRow(4);values.createCell(0).setCellValue(100);values.createCell(1).setCellValue(170);values.createCell(2).setCellValue(180);
            var second=sheet.createRow(10);second.createCell(0).setCellValue("MES CALCULADO: ");second.createCell(2).setCellValue("OPERADOR: JUAN");
            var incomplete=sheet.createRow(12);incomplete.createCell(0).setCellValue(49);incomplete.createCell(1).setCellFormula("A13*1.7");
            try(var out=Files.newOutputStream(file)){book.write(out);}
        }
        byte[] before=MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file));
        var preview=new ExcelPreviewService().inspect(file);
        assertEquals(2,preview.blocks());assertEquals(2,preview.withData());assertEquals(2,preview.warnings().size());
        assertTrue(preview.warnings().stream().anyMatch(w->w.contains("faltan litros cargados")));
        assertTrue(preview.warnings().stream().anyMatch(w->w.contains("falta el mes")));
        assertArrayEquals(before,MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file)));
    }
}

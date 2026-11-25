package mx.mantenimientorendimiento.service;

import org.apache.poi.ss.usermodel.*;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.*;

/** Read-only analysis. Committing imports is a separate, future workflow. */
public final class ExcelPreviewService {
    public record Preview(String file, int sheets, int blocks, int withData, List<String> warnings) {
        public String summary() {
            return file+"\n\nHojas: "+sheets+"\nBloques detectados: "+blocks+"\nBloques con datos: "+withData
                    +"\nAdvertencias: "+warnings.size()+"\n\n"+(warnings.isEmpty()?"Sin incidencias detectadas.":String.join("\n",warnings))
                    +"\n\nEsta revisión es de solo lectura. No se guardó ningún cierre ni se modificó el archivo.";
        }
    }

    public Preview inspect(Path file) throws IOException {
        int blocks=0,withData=0;
        List<String> warnings=new ArrayList<>();
        Map<String,String> seen=new HashMap<>();
        try(Workbook workbook=WorkbookFactory.create(file.toFile(),null,true)) {
            for(Sheet sheet:workbook) {
                for(Row row:sheet) {
                    if(!text(row.getCell(0)).startsWith("MES CALCULADO:"))continue;
                    blocks++;
                    Row data=sheet.getRow(row.getRowNum()+2);
                    Cell measurement=at(data,0),liters=at(data,2),estimated=at(data,1);
                    if(empty(measurement)&&empty(liters))continue;
                    withData++;
                    String where=sheet.getSheetName()+" · fila "+(row.getRowNum()+1);
                    String month=text(row.getCell(0)).replaceFirst("MES CALCULADO:","").strip();
                    String operator=text(row.getCell(2)).replaceFirst("OPERADOR:","").strip();
                    if(month.isBlank())warnings.add(where+": falta el mes.");
                    if(operator.isBlank())warnings.add(where+": falta el operador.");
                    if(empty(measurement))warnings.add(where+": falta la medición.");
                    if(empty(liters))warnings.add(where+": faltan litros cargados. No equivalen a cero.");
                    if(empty(estimated))warnings.add(where+": faltan los litros estimados. Requiere revisar la meta.");
                    Row labels=sheet.getRow(row.getRowNum()+1);
                    if(sheet.getSheetName().strip().startsWith("UNIDAD")&&text(at(labels,0)).contains("HORAS"))
                        warnings.add(where+": un tractor está etiquetado con horas. Confirma la medición.");
                    for(Cell cell:new Cell[]{measurement,liters,estimated}) {
                        if(cell!=null&&cell.getCellType()==CellType.ERROR)warnings.add(where+": error en "+cell.getAddress()+".");
                    }
                    String signature=month+"|"+operator+"|"+signature(measurement)+"|"+signature(liters);
                    String previous=seen.putIfAbsent(signature,where);
                    if(previous!=null)warnings.add(where+": coincide en mes, operador, medición y litros con "+previous+". Revisar, sin eliminar automáticamente.");
                }
            }
            if(blocks==0)throw new IOException("No se reconoció el formato de indicadores. No hay bloques MES CALCULADO.");
            return new Preview(file.getFileName().toString(),workbook.getNumberOfSheets(),blocks,withData,List.copyOf(warnings));
        }
    }

    private static Cell at(Row row,int index){return row==null?null:row.getCell(index);}
    private static boolean empty(Cell cell){return cell==null||cell.getCellType()==CellType.BLANK||(cell.getCellType()==CellType.STRING&&cell.getStringCellValue().isBlank());}
    private static String text(Cell cell){return cell!=null&&cell.getCellType()==CellType.STRING?cell.getStringCellValue().strip().toUpperCase(Locale.ROOT):"";}
    private static String signature(Cell cell){
        if(empty(cell))return "<faltante>";
        if(cell.getCellType()==CellType.NUMERIC)return BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
        return cell.toString();
    }
}

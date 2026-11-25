package mx.mantenimientorendimiento;

import javafx.application.Application;

/** Kept separate from Application so the packaged classpath launcher works. */
public final class Launcher {
    private Launcher() {}
    public static void main(String[] args){
        for(int i=0;i<args.length;i++)if(args[i].equals("--data-dir")){
            if(i+1>=args.length||args[i+1].startsWith("--"))throw new IllegalArgumentException("Falta la carpeta después de --data-dir.");
            System.setProperty("mr.dataDir",args[++i]);
        }
        Application.launch(DesktopApplication.class,args);
    }
}

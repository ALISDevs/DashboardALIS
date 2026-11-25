package mx.mantenimientorendimiento;

import javafx.application.*;
import javafx.embed.swing.SwingFXUtils;
import javafx.fxml.FXMLLoader;
import javafx.scene.*;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TableView;
import javafx.scene.control.TextField;
import javafx.scene.control.TitledPane;
import javafx.scene.image.Image;
import javafx.stage.*;
import mx.mantenimientorendimiento.config.*;
import mx.mantenimientorendimiento.ui.MainController;
import mx.mantenimientorendimiento.ui.Format;

import javax.imageio.ImageIO;
import java.io.IOException;
import java.nio.file.*;
import java.util.logging.*;

public final class DesktopApplication extends Application {
    private AppServices services;
    private FileHandler logHandler;
    private boolean smoke;

    @Override public void init()throws Exception {
        smoke=getParameters().getRaw().contains("--smoke-test");
        if(smoke&&System.getProperty("mr.dataDir")==null)throw new IllegalArgumentException("La prueba visual requiere -Dmr.dataDir para usar datos aislados.");
        AppPaths paths=AppPaths.current();paths.ensureDirectories();
        logHandler=new FileHandler(paths.logs().resolve("aplicacion-%g.log").toString(),1_000_000,3,true);
        logHandler.setFormatter(new SimpleFormatter());Logger.getLogger("mx.mantenimientorendimiento").addHandler(logHandler);
        services=AppServices.open(paths);
    }

    @Override public void start(Stage stage)throws IOException {
        FXMLLoader loader=new FXMLLoader(DesktopApplication.class.getResource("/ui/main.fxml"));
        MainController controller=new MainController(services);loader.setControllerFactory(type->controller);
        Parent root=loader.load();
        var bounds=Screen.getPrimary().getVisualBounds();
        Scene scene=new Scene(root,Math.min(1320,bounds.getWidth()*.95),Math.min(850,bounds.getHeight()*.9));
        scene.getStylesheets().add(DesktopApplication.class.getResource("/ui/application.css").toExternalForm());
        stage.setTitle("Indicadores y Registros");stage.setScene(scene);stage.setMinWidth(1024);stage.setMinHeight(640);
        stage.getIcons().add(new Image(DesktopApplication.class.getResource("/branding/best-trailers-icon.png").toExternalForm()));
        stage.setOnCloseRequest(event->{if(!controller.canClose())event.consume();});
        if(smoke){
            controller.onReady(()->{
                try {
                    capture(scene, "equipos");
                    ((Button) root.lookup("#totalNav")).fire();
                    capture(scene, "resumen-total");
                    if (root.lookup("#general-pdf") == null) throw new IllegalStateException("Falta el PDF general.");
                    ((Button) root.lookup("#monthlyNav")).fire();
                    capture(scene, "menu-mensual");
                    Button monthlyThermo = root.lookupAll(".thermo-tile").stream().map(Button.class::cast).findFirst().orElse(null);
                    if (monthlyThermo != null) {
                        monthlyThermo.fire();
                        capture(scene, "resumen-mensual");
                        if (root.lookup("#measurement-field") != null || root.lookup("#monthly-fuel-table") == null
                                || root.lookup("#monthly-pdf") == null) {
                            throw new IllegalStateException("El resumen mensual debe abrir el historial de la unidad.");
                        }
                        TableView<?> monthly = (TableView<?>) root.lookup("#monthly-fuel-table");
                        if (monthly.getItems().size() > 0 && monthly.getItems().size() < 2) {
                            throw new IllegalStateException("El historial debe mostrar una fila de totales.");
                        }
                        ((TitledPane) root.lookup("#unit-totals")).setExpanded(true);
                        capture(scene, "acumulado-unidad");
                    }
                    TextField amount = Format.moneyField(0);
                    amount.selectAll();
                    for (String digit : new String[]{"1", "2", "3", "4", ".", "5", "6"}) amount.replaceSelection(digit);
                    if (!amount.getText().equals("$1,234.56")) {
                        throw new IllegalStateException("Formato de pesos inesperado: " + amount.getText());
                    }
                    ((Button) root.lookup("#equipmentNav")).fire();
                    root.applyCss();
                    root.layout();
                    ((Button) root.lookup("#filter-thermo")).fire();
                    root.applyCss();
                    root.layout();
                    Button thermo = root.lookupAll(".thermo-tile").stream()
                            .map(Button.class::cast).findFirst().orElse(null);
                    if (thermo != null) {
                        thermo.fire();
                        capture(scene, "combustible");
                        ((Button) root.lookup("#maintenance-mode")).fire();
                        capture(scene, "mantenimiento");
                        ((Button) root.lookup("#fuel-mode")).fire();
                        root.applyCss();
                        root.layout();
                        ((Button) root.lookup("#period-next")).fire();
                        root.applyCss();
                        root.layout();
                        TextField measurement = (TextField) root.lookup("#measurement-field");
                        if (!measurement.getText().isBlank()) throw new IllegalStateException("El mes nuevo debe abrir con la captura vacía.");
                        measurement.setText("100");
                        Label expected = (Label) root.lookup("#expected-liters");
                        if (expected.getText().equals("—")) throw new IllegalStateException("El estimado debe mostrarse con solo la medición.");
                        ((TextField) root.lookup("#price-field")).setText("30");
                        ((TextField) root.lookup("#liters-field")).setText("180");
                        capture(scene, "calculo");
                    }
                    Files.writeString(services.paths().root().resolve("smoke-ok.txt"),"JavaFX, FXML, CSS y SQLite verificados.\n");
                    System.out.println("SMOKE_OK: JavaFX, FXML, estilos y SQLite. Capturas en "+services.paths().root());
                }catch(Exception ex){throw new IllegalStateException("Falló la verificación visual",ex);}
                finally{Platform.exit();}
            });
        }else stage.show();
    }

    private void capture(Scene scene, String section) throws IOException {
        scene.getRoot().applyCss();
        scene.getRoot().layout();
        Path image = services.paths().root().resolve("captura-" + section + ".png");
        ImageIO.write(SwingFXUtils.fromFXImage(scene.snapshot(null), null), "png", image.toFile());
    }

    @Override public void stop(){if(services!=null)services.close();if(logHandler!=null)logHandler.close();}
}

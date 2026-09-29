package app.keel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.modulith.Modulithic;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Every direct sub-package of {@code app.keel} is an application module (Spring Modulith, ADR-015).
 * {@code shared} is a shared module: every module may depend on it without listing it.
 */
@SpringBootApplication
@Modulithic(sharedModules = "shared")
@EnableAsync // module listeners (@ApplicationModuleListener) run after the publishing transaction, on their own thread
public class KeelApplication {

    public static void main(String[] args) {
        SpringApplication.run(KeelApplication.class, args);
    }
}

package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.KeelApplication;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTests {

    // The module map agreed in plan/kararlar/ADR-015-modul-haritasi.md. Changing it is a reviewed change (K5).
    private static final List<String> EXPECTED_MODULES = List.of(
            "coach", "consent", "decision", "engine", "identity", "measurement",
            "nutrition", "privacy", "profile", "shared", "subscription", "training");

    private final ApplicationModules modules = ApplicationModules.of(KeelApplication.class);

    @Test
    void verifiesModuleBoundaries() {
        // No cycles, no access to another module's internals, only the dependencies each package-info allows.
        modules.verify();
    }

    @Test
    void moduleListMatchesAgreedMap() {
        List<String> actual = modules.stream()
                .map(module -> module.getIdentifier().toString())
                .toList();

        assertThat(actual).containsExactlyInAnyOrderElementsOf(EXPECTED_MODULES);
    }
}

package app.keel.shared.web;

import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Readiness (contract `GET /health`, K-908): 200 once Spring Boot's ReadinessState is ACCEPTING_TRAFFIC, 503 before.
 * The web server opens before the ApplicationRunners (the FoodData Central import) run; Spring Boot publishes
 * ACCEPTING_TRAFFIC only after they have all returned, and never when one throws (the start fails and the context
 * closes). It goes back to REFUSING_TRAFFIC when the application shuts down.
 */
@RestController
class HealthController {

    record Health(String status) {
    }

    private final ApplicationAvailability availability;

    HealthController(ApplicationAvailability availability) {
        this.availability = availability;
    }

    @GetMapping("/health")
    ResponseEntity<Health> health() {
        if (availability.getReadinessState() == ReadinessState.ACCEPTING_TRAFFIC) {
            return ResponseEntity.ok(new Health("UP"));
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new Health("STARTING"));
    }
}

package app.keel.shared.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Liveness (contract `GET /health`): answers while the process can serve requests. */
@RestController
class HealthController {

    record Health(String status) {
    }

    @GetMapping("/health")
    Health health() {
        return new Health("UP");
    }
}

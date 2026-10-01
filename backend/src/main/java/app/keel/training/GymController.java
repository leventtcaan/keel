package app.keel.training;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/gyms (K-414, ADR-032): the user's gyms, stored under the id the phone made (a gym made offline is
 * sent once it can be) and replaced whole. Equipment, not health data: no consent gate.
 */
@RestController
@EnableConfigurationProperties(GymLimits.class)
class GymController {

    /** Contract GymMachine. */
    record GymMachine(String exerciseId, BigDecimal stepKg) {
    }

    /** Contract GymInput. */
    record GymInput(String name, Boolean current, BigDecimal barKg, List<BigDecimal> platesKg, List<BigDecimal> dumbbellsKg,
            BigDecimal stackStepKg, List<GymMachine> machines) {
    }

    /** Contract Gym. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Gym(UUID id, String name, boolean current, BigDecimal barKg, List<BigDecimal> platesKg, List<BigDecimal> dumbbellsKg,
            BigDecimal stackStepKg, List<GymMachine> machines) {

        static Gym of(GymStore.Gym gym) {
            return new Gym(gym.id(), gym.name(), gym.current(), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(), gym.stackStepKg(),
                    gym.machineStepsKg().entrySet().stream().map(machine -> new GymMachine(machine.getKey(), machine.getValue())).toList());
        }
    }

    private final GymStore store;
    private final GymLimits limits;
    private final ExerciseCatalog catalog;

    GymController(GymStore store, GymLimits limits, ExerciseCatalog catalog) {
        this.store = store;
        this.limits = limits;
        this.catalog = catalog;
    }

    @GetMapping("/v1/gyms")
    List<Gym> gyms(AccountId account) {
        return store.all(account).stream().map(Gym::of).toList();
    }

    @PutMapping("/v1/gyms/{id}")
    Gym put(AccountId account, @PathVariable UUID id, @RequestBody GymInput gym) {
        if (!GymRules.valid(gym, limits, catalog)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        GymStore.Gym stored = new GymStore.Gym(id, gym.name().strip(), gym.current(), gym.barKg(),
                gym.platesKg().stream().sorted(Comparator.reverseOrder()).toList(), gym.dumbbellsKg().stream().sorted().toList(),
                gym.stackStepKg(), gym.machines().stream().sorted(Comparator.comparing(GymMachine::exerciseId))
                        .collect(Collectors.toMap(GymMachine::exerciseId, GymMachine::stepKg, (a, b) -> a, java.util.LinkedHashMap::new)));
        return Gym.of(store.put(account, stored, limits.gyms()));
    }

    @DeleteMapping("/v1/gyms/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(AccountId account, @PathVariable UUID id) {
        store.delete(account, id);
    }
}

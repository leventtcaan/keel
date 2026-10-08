package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * The moves a move can be swapped for (K-964, ADR-073 #6): the catalog's alternatives, then the moves of the same primary
 * muscle and kind (G6 K-35), each one the user's gym has the equipment for (ADR-032), none already on the day. On the
 * repository's catalog.
 */
class SwapOptionsTests {

    private static ExerciseCatalog catalog;

    @BeforeAll
    static void catalog() throws IOException {
        catalog = ExerciseCatalogTestData.catalog();
    }

    @Test
    void withoutAGymTheAlternativesThenTheSameMuscleAndKind() {
        assertThat(SwapOptions.of("squat", List.of("squat"), catalog, Optional.empty())).containsExactly("hack_squat", "leg_press", "bulgarian_split_squat");
        assertThat(SwapOptions.of("bench_press", List.of("bench_press"), catalog, Optional.empty()))
                .containsExactly("dumbbell_bench_press", "machine_chest_press", "push_up", "dip", "incline_dumbbell_press");
    }

    @Test
    void anIsolationMoveIsNotOfferedACompoundOneOfItsMuscle() {
        // G6 K-35: a compound move is kept; leg_extension has no alternative and no other quads isolation move.
        assertThat(SwapOptions.of("leg_extension", List.of("leg_extension"), catalog, Optional.empty())).isEmpty();
        assertThat(SwapOptions.of("lying_leg_curl", List.of(), catalog, Optional.empty())).containsExactly("seated_leg_curl");
    }

    @Test
    void onlyWhatTheGymHasTheEquipmentFor() {
        Optional<GymStore.Gym> dumbbellsOnly = gym(null, List.of(), List.of(kg("10"), kg("12.5")), null, Map.of());

        assertThat(SwapOptions.of("squat", List.of(), catalog, dumbbellsOnly)).containsExactly("bulgarian_split_squat");
        // Bodyweight needs nothing; a cable or machine only where the gym gives a stack step for it.
        assertThat(SwapOptions.of("lat_pulldown", List.of(), catalog, dumbbellsOnly)).containsExactly("pull_up");
        assertThat(SwapOptions.of("lat_pulldown", List.of(), catalog, gym(null, List.of(), List.of(), null, Map.of("close_grip_lat_pulldown", kg("5")))))
                .containsExactly("pull_up", "close_grip_lat_pulldown");
        Optional<GymStore.Gym> full = gym(kg("20"), List.of(kg("20"), kg("10")), List.of(kg("10")), kg("5"), Map.of());
        assertThat(SwapOptions.of("squat", List.of(), catalog, full)).containsExactly("hack_squat", "leg_press", "bulgarian_split_squat");
        // A bar without plates makes no load: no barbell move.
        assertThat(SwapOptions.of("dumbbell_bench_press", List.of(), catalog, gym(kg("20"), List.of(), List.of(kg("10")), kg("5"), Map.of())))
                .containsExactly("machine_chest_press", "dip", "incline_dumbbell_press", "push_up");
    }

    @Test
    void aMoveAlreadyOnTheDayIsNotOffered() {
        assertThat(SwapOptions.of("squat", List.of("squat", "leg_press", "romanian_deadlift"), catalog, Optional.empty()))
                .containsExactly("hack_squat", "bulgarian_split_squat");
    }

    @Test
    void theUsersOwnMoveHasNone() {
        assertThat(SwapOptions.of("custom:sled_push", List.of("custom:sled_push", "squat"), catalog, Optional.empty())).isEmpty();
    }

    private static Optional<GymStore.Gym> gym(BigDecimal bar, List<BigDecimal> plates, List<BigDecimal> dumbbells, BigDecimal stackStep,
            Map<String, BigDecimal> machines) {
        return Optional.of(new GymStore.Gym(UUID.randomUUID(), "Gym", true, bar, plates, dumbbells, stackStep, machines));
    }

    private static BigDecimal kg(String kg) {
        return new BigDecimal(kg);
    }
}

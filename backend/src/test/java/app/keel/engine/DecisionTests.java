package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/** U3 in code: a Decision is action + reasons + confidence + next review + copy key, and an invalid one cannot exist. */
class DecisionTests {

    private static final LocalDate NEXT_REVIEW = LocalDate.of(2026, 10, 13);
    private static final CopyKey COPY_KEY = new CopyKey("decision.adjust_calories");

    // The running example (spec row WC-04): cut, weight flat for three weeks, plan followed → lower calories.
    private static final Reason FLAT_ON_PLAN = new Reason(
            new RuleId("weight_flat_on_plan"),
            new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE));

    @Test
    void holdsAllFourPartsOfADecision() {
        Decision decision = new Decision(
                new Action.AdjustCalories(), List.of(FLAT_ON_PLAN), Confidence.HIGH, NEXT_REVIEW, COPY_KEY);

        assertThat(decision.action()).isEqualTo(new Action.AdjustCalories());
        assertThat(decision.reasons()).containsExactly(FLAT_ON_PLAN);
        assertThat(decision.confidence()).isEqualTo(Confidence.HIGH);
        assertThat(decision.nextReview()).isEqualTo(NEXT_REVIEW);
        assertThat(decision.copyKey()).isEqualTo(COPY_KEY);
    }

    @ParameterizedTest
    @MethodSource("actionsThatChangeSomething")
    void rejectsADecisionWithoutAReason(Action action) {
        assertThatThrownBy(() -> new Decision(action, List.of(), Confidence.HIGH, NEXT_REVIEW, COPY_KEY))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("reason");
    }

    @Test
    void acceptsNoDecisionYetWithoutAReason() {
        assertThatNoException().isThrownBy(() -> new Decision(
                new Action.NoDecisionYet(), List.of(), Confidence.LOW, NEXT_REVIEW, new CopyKey("decision.no_decision_yet")));
    }

    @Test
    void acceptsNoDecisionYetWithAReason() {
        Reason dataInsufficient = new Reason(
                new RuleId("data_insufficient"), new Source("arastirma/ham/H1-olcum.md", SourceTag.LITERATURE));

        Decision decision = new Decision(
                new Action.NoDecisionYet(), List.of(dataInsufficient), Confidence.LOW, NEXT_REVIEW,
                new CopyKey("decision.no_decision_yet"));

        assertThat(decision.reasons()).containsExactly(dataInsufficient);
    }

    @Test
    void rejectsMissingParts() {
        List<Reason> reasons = List.of(FLAT_ON_PLAN);
        Action action = new Action.AdjustCalories();

        assertThatThrownBy(() -> new Decision(null, reasons, Confidence.HIGH, NEXT_REVIEW, COPY_KEY))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("action");
        assertThatThrownBy(() -> new Decision(action, null, Confidence.HIGH, NEXT_REVIEW, COPY_KEY))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("reasons");
        assertThatThrownBy(() -> new Decision(action, reasons, null, NEXT_REVIEW, COPY_KEY))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("confidence");
        assertThatThrownBy(() -> new Decision(action, reasons, Confidence.HIGH, null, COPY_KEY))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("nextReview");
        assertThatThrownBy(() -> new Decision(action, reasons, Confidence.HIGH, NEXT_REVIEW, null))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("copyKey");
    }

    @Test
    void rejectsANullReasonInsideTheList() {
        List<Reason> withNull = new ArrayList<>();
        withNull.add(FLAT_ON_PLAN);
        withNull.add(null);

        assertThatThrownBy(() -> new Decision(
                new Action.AdjustCalories(), withNull, Confidence.HIGH, NEXT_REVIEW, COPY_KEY))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void isNotChangedByLaterEditsToTheCallersList() {
        List<Reason> callersList = new ArrayList<>(List.of(FLAT_ON_PLAN));
        Decision decision = new Decision(
                new Action.AdjustCalories(), callersList, Confidence.HIGH, NEXT_REVIEW, COPY_KEY);

        callersList.clear();

        assertThat(decision.reasons()).containsExactly(FLAT_ON_PLAN);
    }

    @Test
    void exposesReasonsThatCannotBeEditedEvenWhenBuiltFromAMutableList() {
        Decision decision = new Decision(
                new Action.AdjustCalories(), new ArrayList<>(List.of(FLAT_ON_PLAN)), Confidence.HIGH, NEXT_REVIEW, COPY_KEY);

        assertThatThrownBy(() -> decision.reasons().add(FLAT_ON_PLAN))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void exposesReasonsThatCannotBeEdited() {
        Decision decision = new Decision(
                new Action.AdjustCalories(), List.of(FLAT_ON_PLAN), Confidence.HIGH, NEXT_REVIEW, COPY_KEY);

        assertThatThrownBy(() -> decision.reasons().add(FLAT_ON_PLAN))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    static Stream<Action> actionsThatChangeSomething() {
        return Actions.all().stream().filter(action -> !(action instanceof Action.NoDecisionYet));
    }
}

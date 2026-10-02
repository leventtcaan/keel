package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * The coach's own questions between the weekly calls (K-512, ADR-039; Güray's triggers, G5 §2): asked in the app, never
 * pushed (ADR-036); each with its rule and its source; asked once per occurrence; none in a declared week (ADR-038).
 */
class PromptsTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 7);
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);
    private static final int TARGET = 7000;

    // ── T-13 · steps ────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void stepsFallingUnderTheTargetAfterAWeekOnItAsk() {
        Prompts.Prompt prompt = only(facts().withSteps(steps(9000, 5000)));

        assertThat(prompt.rule()).isEqualTo(new RuleId("steps_dropped"));
        assertThat(prompt.source()).isEqualTo(new Source("arastirma/ham/guray/G5-surec-supplement.md#T-13", SourceTag.EXPERIENCE));
        assertThat(prompt.key()).isEqualTo(MONDAY.toString());
        assertThat(prompt.copyKey()).isEqualTo(new CopyKey("prompt.steps_dropped"));
        assertThat(prompt.choices()).containsExactly("BUSY", "LESS");
    }

    @Test
    void stepsUnderTheTargetBothWeeksOrOnItBothAreNoDrop() {
        assertThat(Prompts.today(facts().withSteps(steps(5000, 5000)), MALE)).isEmpty();
        assertThat(Prompts.today(facts().withSteps(steps(9000, 9000)), MALE)).isEmpty();
        assertThat(Prompts.today(facts().withSteps(steps(5000, 9000)), MALE)).isEmpty();
    }

    @Test
    void exactlyOnTheTargetIsOnIt() {
        // The week before at the target was on it; the last week at the target is not under it.
        assertThat(Prompts.today(facts().withSteps(steps(TARGET, TARGET - 1)), MALE)).hasSize(1);
        assertThat(Prompts.today(facts().withSteps(steps(TARGET + 1, TARGET)), MALE)).isEmpty();
    }

    @Test
    void tooFewDaysWithStepsInEitherWeekSayNothing() {
        // The weeks need min_logged_days_per_week days each: three days are not a week's steps.
        int enough = MALE.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        assertThat(Prompts.today(facts().withSteps(steps(9000, 5000, enough - 1, 7)), MALE)).isEmpty();
        assertThat(Prompts.today(facts().withSteps(steps(9000, 5000, 7, enough - 1)), MALE)).isEmpty();
        assertThat(Prompts.today(facts().withSteps(steps(9000, 5000, enough, enough)), MALE)).hasSize(1);
    }

    // ── T-4 · sessions ──────────────────────────────────────────────────────────────────────────────────────

    @Test
    void twoPlannedSessionsInARowWithNoSessionSinceAsk() {
        // Planned Mon/Thu: Thu 1 Oct and Mon 5 Oct passed with nothing since Thursday; the last session was Mon 28 Sep.
        Prompts.Prompt prompt = only(facts().withSessions(List.of(LocalDate.of(2026, 9, 28))));

        assertThat(prompt.rule()).isEqualTo(new RuleId("sessions_missed"));
        assertThat(prompt.source().reference()).isEqualTo("arastirma/ham/guray/G5-surec-supplement.md#T-4");
        assertThat(prompt.key()).as("the first missed day: the same miss keeps its key").isEqualTo("2026-10-01");
        assertThat(prompt.choices()).containsExactly("FIXED_TIME", "LIFE", "NOT_NOW");
    }

    @Test
    void aSessionOnAnyDaySinceTheFirstMissedOneIsNoMiss() {
        // Trained on Saturday instead of Thursday: a session done, whatever the day.
        assertThat(Prompts.today(facts().withSessions(List.of(LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 3))), MALE)).isEmpty();
    }

    @Test
    void oneMissIsNotTwoAndNeverLoggingIsNotMissing() {
        // Only Thu 1 Oct passed since the last session on Thu 1 Oct... Mon 5 Oct: one planned day missed.
        assertThat(Prompts.today(facts().withSessions(List.of(LocalDate.of(2026, 10, 1))), MALE)).isEmpty();
        // Nothing ever logged: not logging is not failing to train (U3, U7).
        assertThat(Prompts.today(facts().withSessions(List.of()), MALE)).isEmpty();
    }

    // ── T-5 · loads ─────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void loadsBelowLastWeekAskWithoutSayingMuscleIsLost() {
        Prompts.Prompt prompt = only(facts().withLoadsBelowLastWeek(true));

        assertThat(prompt.rule()).isEqualTo(new RuleId("loads_dropped"));
        assertThat(prompt.source().reference()).isEqualTo("arastirma/ham/guray/G5-surec-supplement.md#T-5");
        assertThat(prompt.key()).isEqualTo(MONDAY.toString());
        assertThat(prompt.choices()).containsExactly("OK");
    }

    // ── T-2 · hunger ────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void theFirstDaysOfACutAskAboutHunger() {
        int days = MALE.wholeNumber(ParameterKey.HUNGER_QUESTION_DAYS);
        for (int day = 0; day < days; day++) {
            Prompts.Prompt prompt = only(facts().withCutBegan(WEDNESDAY.minusDays(day)));
            assertThat(prompt.rule()).isEqualTo(new RuleId("hunger_first_days"));
            assertThat(prompt.key()).isEqualTo(WEDNESDAY.minusDays(day).toString());
            assertThat(prompt.choices()).containsExactly("HUNGRY", "NOT_HUNGRY");
        }
        assertThat(Prompts.today(facts().withCutBegan(WEDNESDAY.minusDays(days)), MALE)).isEmpty();
        // A cut that begins tomorrow on the user's calendar (a time zone moved west) has no first day yet.
        assertThat(Prompts.today(facts().withCutBegan(WEDNESDAY.plusDays(1)), MALE)).isEmpty();
    }

    // ── all of them ─────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void stepsFirstThenSessionsThenLoadsThenHunger() {
        // T-13 is Güray's highest priority (NEAT); the rest in the order of G5 by how much they change the week.
        Prompts.Facts all = facts().withSteps(steps(9000, 5000)).withSessions(List.of(LocalDate.of(2026, 9, 28)))
                .withLoadsBelowLastWeek(true).withCutBegan(WEDNESDAY);

        assertThat(Prompts.today(all, MALE)).extracting(prompt -> prompt.rule().value())
                .containsExactly("steps_dropped", "sessions_missed", "loads_dropped", "hunger_first_days");
    }

    @Test
    void aDeclaredWeekAsksNothing() {
        Prompts.Facts all = facts().withSteps(steps(9000, 5000)).withSessions(List.of(LocalDate.of(2026, 9, 28)))
                .withLoadsBelowLastWeek(true).withCutBegan(WEDNESDAY).declared();

        assertThat(Prompts.today(all, MALE)).isEmpty();
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    /** Wednesday 7 Oct, training Mondays and Thursdays, the last session today: nothing to ask. */
    private static Prompts.Facts facts() {
        return new Prompts.Facts(WEDNESDAY, Map.of(), TARGET, List.of(DayOfWeek.MONDAY, DayOfWeek.THURSDAY), List.of(WEDNESDAY), false,
                Optional.empty(), false);
    }

    private static Map<LocalDate, Integer> steps(int weekBefore, int lastWeek) {
        return steps(weekBefore, lastWeek, 7, 7);
    }

    /** {@code beforeDays} days of the week before last and {@code lastDays} of the last 7 full days, at those averages. */
    private static Map<LocalDate, Integer> steps(int weekBefore, int lastWeek, int beforeDays, int lastDays) {
        Map<LocalDate, Integer> steps = new HashMap<>();
        for (int day = 0; day < lastDays; day++) {
            steps.put(WEDNESDAY.minusDays(1 + day), lastWeek);
        }
        for (int day = 0; day < beforeDays; day++) {
            steps.put(WEDNESDAY.minusDays(8 + day), weekBefore);
        }
        return steps;
    }

    private static Prompts.Prompt only(Prompts.Facts facts) {
        List<Prompts.Prompt> prompts = Prompts.today(facts, MALE);
        assertThat(prompts).hasSize(1);
        return prompts.getFirst();
    }
}

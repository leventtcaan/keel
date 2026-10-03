package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

/**
 * The coach's own questions between the weekly calls (K-512, ADR-039; the coaching triggers, G5 §2): asked in the app, never
 * pushed (ADR-036); each with its rule and its source; asked once per occurrence, its key the same for as long as the
 * occurrence lasts; none in a declared week, none about a day the user or the ladder paused (ADR-038).
 */
class PromptsTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 7);
    /** The calendar week just over: Mon 28 Sep – Sun 4 Oct. The one before: Mon 21 – Sun 27 Sep. */
    private static final LocalDate LAST_MONDAY = LocalDate.of(2026, 9, 28);
    private static final LocalDate MONDAY_BEFORE = LocalDate.of(2026, 9, 21);
    private static final int TARGET = 7000;

    // ── T-13 · steps ────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void stepsFallingUnderTheTargetAfterAWeekOnItAsk() {
        Prompts.Prompt prompt = only(facts().steps(weeks(9000, 5000)));

        assertThat(prompt.rule()).isEqualTo(new RuleId("steps_dropped"));
        assertThat(prompt.source()).isEqualTo(new Source("arastirma/ham/guray/G5-surec-supplement.md#T-13", SourceTag.EXPERIENCE));
        assertThat(prompt.key()).as("the week the steps fell in").isEqualTo(LAST_MONDAY.toString());
        assertThat(prompt.copyKey()).isEqualTo(new CopyKey("prompt.steps_dropped"));
        assertThat(prompt.choices()).containsExactly("BUSY", "LESS");
    }

    @Test
    void stepsUnderTheTargetBothWeeksOrOnItBothAreNoDrop() {
        assertThat(Prompts.today(facts().steps(weeks(5000, 5000)).build(), MALE)).isEmpty();
        assertThat(Prompts.today(facts().steps(weeks(9000, 9000)).build(), MALE)).isEmpty();
        assertThat(Prompts.today(facts().steps(weeks(5000, 9000)).build(), MALE)).isEmpty();
    }

    @Test
    void exactlyOnTheTargetIsOnIt() {
        // The week before at the target was on it; the last week at the target is not under it.
        assertThat(Prompts.today(facts().steps(weeks(TARGET, TARGET - 1)).build(), MALE)).hasSize(1);
        assertThat(Prompts.today(facts().steps(weeks(TARGET + 1, TARGET)).build(), MALE)).isEmpty();
    }

    @Test
    void eachWeekIsJudgedAgainstTheTargetItHad() {
        // The target rose from 7,000 to 9,000 on Monday 5 Oct (a call applied): both weeks were on their own 7,000.
        Function<LocalDate, Integer> raisedThisWeek = day -> day.isBefore(LocalDate.of(2026, 10, 5)) ? TARGET : 9000;
        assertThat(Prompts.today(facts().steps(weeks(9500, 8000)).stepTarget(raisedThisWeek).build(), MALE)).isEmpty();
        // Raised on Monday 28 Sep: the week before on its 7,000, the last one under its 9,000 — a drop.
        Function<LocalDate, Integer> raisedLastWeek = day -> day.isBefore(LAST_MONDAY) ? TARGET : 9000;
        assertThat(Prompts.today(facts().steps(weeks(7500, 8000)).stepTarget(raisedLastWeek).build(), MALE)).hasSize(1);
    }

    @Test
    void tooFewDaysWithStepsInEitherWeekSayNothing() {
        // The weeks need min_logged_days_per_week days each: three days are not a week's steps.
        int enough = MALE.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        assertThat(Prompts.today(facts().steps(weeks(9000, 5000, enough - 1, 7)).build(), MALE)).isEmpty();
        assertThat(Prompts.today(facts().steps(weeks(9000, 5000, 7, enough - 1)).build(), MALE)).isEmpty();
        assertThat(Prompts.today(facts().steps(weeks(9000, 5000, enough, enough)).build(), MALE)).hasSize(1);
    }

    @Test
    void theWeeksAreCalendarWeeksSoOneDropIsOneQuestionWithOneKey() {
        Map<LocalDate, Integer> steps = weeks(9000, 5000);
        // From the Monday after the drop to the Sunday: the same week fell, the same key — answered once, asked no more.
        for (LocalDate day = LAST_MONDAY.plusWeeks(1); day.isBefore(LAST_MONDAY.plusWeeks(2)); day = day.plusDays(1)) {
            assertThat(only(facts().on(day).steps(steps)).key()).as(day.toString()).isEqualTo(LAST_MONDAY.toString());
        }
        // On the Sunday the falling week was still going: no week under the target is over yet.
        assertThat(Prompts.today(facts().on(LAST_MONDAY.plusDays(6)).steps(steps).build(), MALE)).isEmpty();
        // The Monday after: the low week is the one before — under then, under now is no new drop.
        Map<LocalDate, Integer> stillLow = new HashMap<>(steps);
        daysOf(LAST_MONDAY.plusWeeks(1), 7).forEach(day -> stillLow.put(day, 5000));
        assertThat(Prompts.today(facts().on(LAST_MONDAY.plusWeeks(2)).steps(stillLow).build(), MALE)).isEmpty();
    }

    @Test
    void thisWeeksDaysSoFarAreNotAWeek() {
        Map<LocalDate, Integer> steps = weeks(9000, 9000);
        steps.put(WEDNESDAY.minusDays(1), 1000);
        steps.put(WEDNESDAY.minusDays(2), 1000);
        assertThat(Prompts.today(facts().steps(steps).build(), MALE)).isEmpty();
    }

    @Test
    void pausedDaysAreNotCountedSoASickWeekIsNoDrop() {
        // Sick Monday to Thursday last week (declared): the three days left are not enough to say the week fell.
        Prompts.Facts sick = facts().steps(weeks(9000, 5000)).paused(daysOf(LAST_MONDAY, 4)).build();
        assertThat(Prompts.today(sick, MALE)).isEmpty();
        // Sick two days of it: the five days left still fell.
        assertThat(Prompts.today(facts().steps(weeks(9000, 5000)).paused(daysOf(LAST_MONDAY, 2)).build(), MALE)).hasSize(1);
    }

    // ── T-4 · sessions ──────────────────────────────────────────────────────────────────────────────────────

    @Test
    void twoPlannedDaysPassedSinceTheLastSessionAsk() {
        // Planned Mon/Thu; the last session Mon 28 Sep; Thu 1 Oct and Mon 5 Oct passed with none.
        Prompts.Prompt prompt = only(facts().sessions(LAST_MONDAY));

        assertThat(prompt.rule()).isEqualTo(new RuleId("sessions_missed"));
        assertThat(prompt.source().reference()).isEqualTo("arastirma/ham/guray/G5-surec-supplement.md#T-4");
        assertThat(prompt.key()).as("the first planned day missed").isEqualTo("2026-10-01");
        assertThat(prompt.choices()).containsExactly("FIXED_TIME", "LIFE", "NOT_NOW");
    }

    @Test
    void theSameMissKeepsItsKeyForAsLongAsItLasts() {
        // Thursday 8 Oct (a planned day, today: not missed yet), Friday 9 (three missed), Tuesday 13 (four): one miss, one key.
        for (LocalDate day : List.of(LocalDate.of(2026, 10, 8), LocalDate.of(2026, 10, 9), LocalDate.of(2026, 10, 13))) {
            assertThat(only(facts().on(day).sessions(LAST_MONDAY)).key()).as(day.toString()).isEqualTo("2026-10-01");
        }
    }

    @Test
    void aSessionOnAnyDayAfterTheFirstMissedOneStartsAgain() {
        // Trained Saturday 3 Oct instead of Thursday: only Monday 5 passed since — one, not two.
        assertThat(Prompts.today(facts().sessions(LAST_MONDAY, LocalDate.of(2026, 10, 3)).build(), MALE)).isEmpty();
    }

    @Test
    void todayIsNotMissedYet() {
        // Monday 5 Oct, last session Mon 28 Sep: only Thursday 1 passed; today's session can still happen.
        assertThat(Prompts.today(facts().on(LocalDate.of(2026, 10, 5)).sessions(LAST_MONDAY).build(), MALE)).isEmpty();
    }

    @Test
    void oneMissIsNotTwoAndNeverLoggingIsNotMissing() {
        assertThat(Prompts.today(facts().sessions(LocalDate.of(2026, 10, 1)).build(), MALE)).isEmpty();
        // Nothing ever logged: not logging is not failing to train (U3, U7).
        assertThat(Prompts.today(facts().sessions().build(), MALE)).isEmpty();
    }

    @Test
    void aWeekOffTheLadderGaveIsNoMiss() {
        // The engine's rest week from Thu 1 to Wed 7 Oct: nothing was planned to be done.
        assertThat(Prompts.today(facts().sessions(LAST_MONDAY).paused(daysOf(LocalDate.of(2026, 10, 1), 7)).build(), MALE)).isEmpty();
        // Over: the planned days after it count — Thu 8 and Mon 12 passed by Tuesday 13, the miss starting Thursday 8.
        Prompts.Facts after = facts().on(LocalDate.of(2026, 10, 13)).sessions(LAST_MONDAY).paused(daysOf(LocalDate.of(2026, 10, 1), 7)).build();
        assertThat(Prompts.today(after, MALE)).singleElement().extracting(Prompts.Prompt::key).isEqualTo("2026-10-08");
    }

    @Test
    void daysDeclaredAreNoMissEvenOnceTheStateIsOver() {
        // Sick Thu 1 – Sun 4 Oct, back since: Monday 5 alone has passed.
        assertThat(Prompts.today(facts().sessions(LAST_MONDAY).paused(daysOf(LocalDate.of(2026, 10, 1), 4)).build(), MALE)).isEmpty();
    }

    @Test
    void theDaysCountFromWhenTheProgramAskedForThem() {
        // Training days set on Saturday 3 Oct: Thursday 1 was not one yet; Monday 5 alone has passed.
        assertThat(Prompts.today(facts().sessions(LAST_MONDAY).trainingDaysSince(LocalDate.of(2026, 10, 3)).build(), MALE)).isEmpty();
        // A week later, Mon 5 and Thu 8 passed: the miss starts on the first day the new days asked for.
        Prompts.Facts later = facts().on(LocalDate.of(2026, 10, 9)).sessions(LAST_MONDAY).trainingDaysSince(LocalDate.of(2026, 10, 3)).build();
        assertThat(only(later).key()).isEqualTo("2026-10-05");
    }

    // ── T-5 · loads ─────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void loadsDownOnACutAskWithoutSayingMuscleIsLost() {
        Prompts.Prompt prompt = only(facts().loadsDroppedLastWeek());

        assertThat(prompt.rule()).isEqualTo(new RuleId("loads_dropped"));
        assertThat(prompt.source().reference()).isEqualTo("arastirma/ham/guray/G5-surec-supplement.md#T-5");
        assertThat(prompt.key()).as("the week the loads fell in").isEqualTo(LAST_MONDAY.toString());
        assertThat(prompt.choices()).containsExactly("OK");
    }

    @Test
    void onlyOnACutWhereGurayCallsItNormal() {
        // Building, the engine reads falling loads as recovery to fix (G7 K-73): the question would contradict the call.
        assertThat(Prompts.today(facts().phase(Phase.BULK).loadsDroppedLastWeek().build(), MALE)).isEmpty();
        assertThat(Prompts.today(facts().noPlan().loadsDroppedLastWeek().build(), MALE)).isEmpty();
    }

    @Test
    void aLighterOrPausedWeekExplainsLowerLoads() {
        assertThat(Prompts.today(facts().loadsDroppedLastWeek().lighter(daysOf(LAST_MONDAY, 7)).build(), MALE)).isEmpty();
        assertThat(Prompts.today(facts().loadsDroppedLastWeek().paused(Set.of(LAST_MONDAY.plusDays(3))).build(), MALE)).isEmpty();
        // The week before compared: a lighter week then and back to work now is no drop either way — still silent.
        assertThat(Prompts.today(facts().loadsDroppedLastWeek().lighter(daysOf(MONDAY_BEFORE, 7)).build(), MALE)).isEmpty();
    }

    // ── T-2 · hunger ────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void theFirstDaysOfTheDeficitAskAboutHunger() {
        int days = MALE.wholeNumber(ParameterKey.HUNGER_QUESTION_DAYS);
        for (int day = 0; day < days; day++) {
            Prompts.Prompt prompt = only(facts().deficitBegan(WEDNESDAY.minusDays(day)));
            assertThat(prompt.rule()).isEqualTo(new RuleId("hunger_first_days"));
            assertThat(prompt.key()).isEqualTo(WEDNESDAY.minusDays(day).toString());
            assertThat(prompt.choices()).containsExactly("HUNGRY", "NOT_HUNGRY");
        }
        assertThat(Prompts.today(facts().deficitBegan(WEDNESDAY.minusDays(days)).build(), MALE)).isEmpty();
        // A deficit that begins tomorrow on the user's calendar (a time zone moved west) has no first day yet.
        assertThat(Prompts.today(facts().deficitBegan(WEDNESDAY.plusDays(1)).build(), MALE)).isEmpty();
    }

    @Test
    void noDeficitYetIsNoHunger() {
        // A cut still watched at the maintenance estimate (K-114) has not begun to eat less.
        assertThat(Prompts.today(facts().build(), MALE)).isEmpty();
        assertThat(Prompts.today(facts().phase(Phase.BULK).deficitBegan(WEDNESDAY).build(), MALE)).isEmpty();
    }

    // ── all of them ─────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void stepsFirstThenSessionsThenLoadsThenHunger() {
        // T-13 is the coaching highest priority (NEAT); the rest in the order of G5 by how much they change the week.
        Prompts.Facts all = facts().steps(weeks(9000, 5000)).sessions(LAST_MONDAY).loadsDroppedLastWeek().deficitBegan(WEDNESDAY).build();

        assertThat(Prompts.today(all, MALE)).extracting(prompt -> prompt.rule().value())
                .containsExactly("steps_dropped", "sessions_missed", "loads_dropped", "hunger_first_days");
    }

    @Test
    void aStateInForceAsksNothing() {
        Prompts.Facts all = facts().steps(weeks(9000, 5000)).sessions(LAST_MONDAY).loadsDroppedLastWeek().deficitBegan(WEDNESDAY)
                .declaredNow().build();

        assertThat(Prompts.today(all, MALE)).isEmpty();
    }

    // ── words ───────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void everyQuestionItsAnswersAndTheirRepliesHaveWords() {
        // The phone builds its keys from these (K-520 review): a choice or reply added here without words would show a key.
        for (RuleId rule : List.of(Prompts.STEPS_DROPPED, Prompts.SESSIONS_MISSED, Prompts.LOADS_DROPPED, Prompts.HUNGER_FIRST_DAYS)) {
            Map<String, Object> words = EngineFixtures.copyGroup(new CopyKey("prompt." + rule.value()));
            assertThat(words).as(rule.value()).containsKeys("title", "body");
            Map<String, Object> choices = (Map<String, Object>) words.get("choice");
            for (String choice : Prompts.choices(rule).orElseThrow()) {
                assertThat(choices).as(rule.value()).containsKey(choice.toLowerCase(java.util.Locale.ROOT));
                Prompts.reply(rule, choice).ifPresent(reply -> assertThat(EngineFixtures.copyTree()).as(reply.value())
                        .satisfies(tree -> assertThat(text(tree, reply.value())).isNotBlank()));
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static String text(Map<String, Object> tree, String key) {
        Object node = tree;
        for (String part : key.split("\\.")) {
            node = node instanceof Map<?, ?> map ? ((Map<String, Object>) map).get(part) : null;
        }
        return node instanceof String words ? words : null;
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    /** Wednesday 7 Oct, on a cut, training Mondays and Thursdays since long ago, a session today: nothing to ask. */
    private static FactsBuilder facts() {
        return new FactsBuilder();
    }

    private static final class FactsBuilder {
        private LocalDate today = WEDNESDAY;
        private Optional<Phase> phase = Optional.of(Phase.CUT);
        private Map<LocalDate, Integer> steps = Map.of();
        private Function<LocalDate, Integer> stepTarget = day -> TARGET;
        private LocalDate trainingDaysSince = LocalDate.of(2026, 1, 5);
        private List<LocalDate> sessions = List.of(WEDNESDAY);
        private final Set<LocalDate> paused = new HashSet<>();
        private final Set<LocalDate> lighter = new HashSet<>();
        private boolean loadsDropped;
        private Optional<LocalDate> deficitBegan = Optional.empty();
        private boolean declaredNow;

        FactsBuilder on(LocalDate day) {
            today = day;
            return this;
        }

        FactsBuilder phase(Phase value) {
            phase = Optional.of(value);
            return this;
        }

        FactsBuilder noPlan() {
            phase = Optional.empty();
            return this;
        }

        FactsBuilder steps(Map<LocalDate, Integer> days) {
            steps = days;
            return this;
        }

        FactsBuilder stepTarget(Function<LocalDate, Integer> onDay) {
            stepTarget = onDay;
            return this;
        }

        FactsBuilder trainingDaysSince(LocalDate day) {
            trainingDaysSince = day;
            return this;
        }

        FactsBuilder sessions(LocalDate... days) {
            sessions = List.of(days);
            return this;
        }

        FactsBuilder paused(Set<LocalDate> days) {
            paused.addAll(days);
            return this;
        }

        FactsBuilder lighter(Set<LocalDate> days) {
            lighter.addAll(days);
            return this;
        }

        FactsBuilder loadsDroppedLastWeek() {
            loadsDropped = true;
            return this;
        }

        FactsBuilder deficitBegan(LocalDate day) {
            deficitBegan = Optional.of(day);
            return this;
        }

        FactsBuilder declaredNow() {
            declaredNow = true;
            return this;
        }

        Prompts.Facts build() {
            return new Prompts.Facts(today, phase, steps, stepTarget, List.of(DayOfWeek.MONDAY, DayOfWeek.THURSDAY), trainingDaysSince, sessions,
                    Set.copyOf(paused), Set.copyOf(lighter), loadsDropped, deficitBegan, declaredNow);
        }
    }

    private static Set<LocalDate> daysOf(LocalDate first, int count) {
        Set<LocalDate> days = new HashSet<>();
        for (int day = 0; day < count; day++) {
            days.add(first.plusDays(day));
        }
        return days;
    }

    private static Map<LocalDate, Integer> weeks(int weekBefore, int lastWeek) {
        return weeks(weekBefore, lastWeek, 7, 7);
    }

    /** The first {@code beforeDays} days of the calendar week before last and {@code lastDays} of last week, at those counts. */
    private static Map<LocalDate, Integer> weeks(int weekBefore, int lastWeek, int beforeDays, int lastDays) {
        Map<LocalDate, Integer> steps = new HashMap<>();
        daysOf(LAST_MONDAY, lastDays).forEach(day -> steps.put(day, lastWeek));
        daysOf(MONDAY_BEFORE, beforeDays).forEach(day -> steps.put(day, weekBefore));
        return steps;
    }

    private static Prompts.Prompt only(FactsBuilder facts) {
        return only(facts.build());
    }

    private static Prompts.Prompt only(Prompts.Facts facts) {
        List<Prompts.Prompt> prompts = Prompts.today(facts, MALE);
        assertThat(prompts).hasSize(1);
        return prompts.getFirst();
    }
}

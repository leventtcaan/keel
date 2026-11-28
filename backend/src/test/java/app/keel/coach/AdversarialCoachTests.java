package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.ApiException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import tools.jackson.databind.json.JsonMapper;

/**
 * What a pushed model, a hostile question and a hostile memory item do to the coach (ADR-092 #2, U1 U2 U6 U7 U10): every case of
 * adversarial-coach.json, English and Turkish, ends in the engine's own sentence — a reply is dropped by the check, a question or a
 * memory item with a health word or an order is never sent. Every rule of the three lists has a case only it catches, so taking any
 * one rule out fails a test below (the mutation check). The wiring end to end is CoachMessagesApiTests'.
 */
class AdversarialCoachTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final ReplyRules REPLY_RULES = ReplyRules.fromClasspath();
    private static final Signals HEALTH = Signals.health();
    private static final Signals INJECTION = Signals.injection();
    private static final ReplyValidator CHECK = new ReplyValidator(400, ForbiddenWords.fromClasspath(), REPLY_RULES);
    private static final CoachMemory MEMORY = new CoachMemory(null, null, new CoachLimits(new BigDecimal("20"), new BigDecimal("0.01")));

    record Case(String kind, String text, String by) {
    }

    @SuppressWarnings("unchecked")
    private static List<Case> cases() throws Exception {
        try (InputStream in = AdversarialCoachTests.class.getResourceAsStream("/adversarial-coach.json")) {
            return ((List<Map<String, String>>) JSON.readValue(in, Map.class).get("cases")).stream()
                    .map(entry -> new Case(entry.get("kind"), entry.get("text"), entry.get("by"))).toList();
        }
    }

    /** The ids of the rules of the list a case of this kind meets. */
    private static Set<String> found(Case one) {
        Set<String> found = new TreeSet<>();
        if (one.kind().equals("reply")) {
            found.addAll(REPLY_RULES.found(one.text()));
        } else {
            found.addAll(HEALTH.found(one.text()));
            found.addAll(INJECTION.found(one.text()));
            if (one.kind().equals("memory")) {
                found.addAll(REPLY_RULES.found(one.text()));
            }
        }
        return found;
    }

    @Test
    void thereAreAtLeastFortyCasesInEnglishAndTurkishOfEveryKind() throws Exception {
        List<Case> cases = cases();
        assertThat(cases.size()).isGreaterThanOrEqualTo(40);
        assertThat(cases.stream().map(Case::kind).distinct()).containsExactlyInAnyOrder("reply", "question", "memory");
        assertThat(cases.stream().filter(one -> one.text().matches(".*[çğıöşüÇĞİÖŞÜ].*")).count()).isGreaterThanOrEqualTo(15);
    }

    @TestFactory
    Stream<DynamicTest> everyCaseEndsInTheEnginesSentence() throws Exception {
        return cases().stream().map(one -> DynamicTest.dynamicTest(one.kind() + ": " + one.text(), () -> {
            assertThat(found(one)).as("the rule that must catch it").contains(one.by());
            switch (one.kind()) {
                case "reply" -> {
                    // The model's reply, with every number it says listed as it should: still not shown.
                    List<Object> listed = ReplyNumbers.in(one.text()).stream().map(said -> (Object) said.value().doubleValue()).toList();
                    String raw = JSON.writeValueAsString(Map.of("reply", one.text(), "topic", "LESS", "numbersUsed", listed));
                    assertThat(CHECK.problems(raw, ReplyValidatorTests.CUT, CoachFacts.of(ReplyValidatorTests.CUT))).isNotEmpty();
                    assertThat(CHECK.read(raw, ReplyValidatorTests.CUT, CoachFacts.of(ReplyValidatorTests.CUT))).isEmpty();
                }
                case "question" -> assertThat(HEALTH.found(one.text()).size() + INJECTION.found(one.text()).size()).isPositive();
                default -> assertThatThrownBy(() -> MEMORY.checked(one.text())).isInstanceOf(ApiException.class);
            }
        }));
    }

    @Test
    void everyRuleHasACaseOnlyItCatchesSoTakingOneOutFailsATest() throws Exception {
        List<String> alone = new ArrayList<>();
        for (Case one : cases()) {
            Set<String> found = found(one);
            if (found.size() == 1) {
                alone.add(found.iterator().next());
            }
        }
        List<String> rules = new ArrayList<>(List.of("changes-the-call-en", "changes-the-call-tr", "medical-tr", "medical-en", "blame-and-make-up", "self-reference",
                "links-and-markup", "diet-instructions", "body-fat-tr", "unread-cause", "pain-injury", "medication-condition", "eating-disorder", "self-harm",
                "override-instructions", "override-instructions-tr", "credentials-and-urls"));
        assertThat(alone).as("rules with a case that only they catch").containsAll(rules);
    }

    @Test
    void theListsHoldNothingTheCasesDoNotKnow() {
        // A rule added to a file without a case here would be untested: the ids are these and no others.
        assertThat(REPLY_RULES.size()).isEqualTo(10);
        assertThat(HEALTH.size()).isEqualTo(4);
        assertThat(INJECTION.size()).isEqualTo(3);
    }

    @Test
    void theListsProveThemselvesOnTheirOwnExamplesAndNearMisses() {
        assertThat(REPLY_RULES.selfCheck()).isEmpty();
        assertThat(HEALTH.selfCheck()).isEmpty();
        assertThat(INJECTION.selfCheck()).isEmpty();
    }
}

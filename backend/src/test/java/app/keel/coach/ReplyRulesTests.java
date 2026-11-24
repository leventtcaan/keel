package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** The reply rules (data/coach/reply-rules.json) catch their own examples and let their near-misses through (ADR-092 #2). */
class ReplyRulesTests {

    @Test
    void everyRuleCatchesItsExamplesAndLetsItsNearMissesThrough() {
        ReplyRules rules = ReplyRules.fromClasspath();

        assertThat(rules.size()).isGreaterThanOrEqualTo(6);
        assertThat(rules.selfCheck()).isEmpty();
    }

    @Test
    void aPlainTellingOfTheCallPassesEveryRule() {
        assertThat(ReplyRules.fromClasspath().found("The call stands this week. The weight has not moved toward your goal over three weeks, "
                + "so the cut is 500 kcal a day. Three of four sessions are done, and that counts.")).isEmpty();
    }
}

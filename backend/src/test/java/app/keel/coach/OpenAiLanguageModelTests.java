package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.privacy.AiChannel;
import app.keel.privacy.AiResponse;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * OpenAI's chat completions as the coach's model (ADR-092 #4): what is asked (no storing, the strict schema, the cap, the
 * key only in a header), what is read back (the text and the tokens), and what a failure is (one more try for a 429, a 5xx or
 * no answer; then the engine's words). No network: a stand-in channel answers.
 */
class OpenAiLanguageModelTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String KEY = "sk-test-not-a-real-key";
    private static final String OK = "{\"choices\":[{\"message\":{\"content\":\"{\\\"reply\\\":\\\"x\\\"}\",\"refusal\":null},\"finish_reason\":\"stop\"}],"
            + "\"usage\":{\"prompt_tokens\":288,\"completion_tokens\":65}}";

    /** Answers in order what it is told, remembers what was posted. */
    private static final class Channel implements AiChannel {
        final Deque<Supplier<AiResponse>> answers = new ArrayDeque<>();
        final List<URI> uris = new ArrayList<>();
        final List<Map<String, String>> headers = new ArrayList<>();
        final List<String> bodies = new ArrayList<>();
        final List<Duration> timeouts = new ArrayList<>();

        Channel then(AiResponse answer) {
            answers.add(() -> answer);
            return this;
        }

        Channel thenFail(RuntimeException failure) {
            answers.add(() -> {
                throw failure;
            });
            return this;
        }

        @Override
        public AiResponse post(URI uri, Map<String, String> headers, String json, Duration timeout) {
            uris.add(uri);
            this.headers.add(headers);
            bodies.add(json);
            timeouts.add(timeout);
            return answers.removeFirst().get();
        }
    }

    private static OpenAiLanguageModel model(Double temperature, String effort) {
        return new OpenAiLanguageModel(new OpenAiProperties(KEY, null, Duration.ofSeconds(7), temperature, effort));
    }

    private static ModelRequest request(Channel channel, ModelRequest.Schema schema) {
        return new ModelRequest(Purpose.EXPLAIN, "gpt-5-nano-2025-08-07", 600, "system words", List.of(Turn.user("why?")), schema, channel);
    }

    private static final ModelRequest.Schema SCHEMA = new ModelRequest.Schema("coach_reply", Map.of("type", "object", "additionalProperties", false));

    @Test
    void theRequestIsStoredNowhereStrictlyShapedAndCappedAndTheKeyIsOnlyAHeader() {
        Channel channel = new Channel().then(new AiResponse(200, OK));

        model(null, "minimal").complete(request(channel, SCHEMA));

        assertThat(channel.uris).containsExactly(URI.create("https://api.openai.com/v1/chat/completions"));
        assertThat(channel.headers.getFirst()).containsExactly(Map.entry("Authorization", "Bearer " + KEY));
        assertThat(channel.timeouts).containsExactly(Duration.ofSeconds(7));
        assertThat(channel.bodies.getFirst()).doesNotContain(KEY);
        JsonNode body = JSON.readTree(channel.bodies.getFirst());
        assertThat(body.path("model").asString()).isEqualTo("gpt-5-nano-2025-08-07");
        assertThat(body.path("store").asBoolean(true)).isFalse();
        assertThat(body.path("max_completion_tokens").asInt()).isEqualTo(600);
        assertThat(body.path("reasoning_effort").asString()).isEqualTo("minimal");
        assertThat(body.has("temperature")).as("a reasoning model refuses a temperature").isFalse();
        assertThat(body.path("response_format").path("type").asString()).isEqualTo("json_schema");
        assertThat(body.path("response_format").path("json_schema").path("strict").asBoolean()).isTrue();
        assertThat(body.path("response_format").path("json_schema").path("name").asString()).isEqualTo("coach_reply");
        assertThat(body.path("messages").path(0).path("role").asString()).isEqualTo("system");
        assertThat(body.path("messages").path(0).path("content").asString()).isEqualTo("system words");
        assertThat(body.path("messages").path(1).path("role").asString()).isEqualTo("user");
        assertThat(body.path("messages").path(1).path("content").asString()).isEqualTo("why?");
    }

    @Test
    void aModelWithATemperatureAndNoEffortGetsOnlyThat() {
        Channel channel = new Channel().then(new AiResponse(200, OK));

        model(0.2, null).complete(request(channel, null));

        JsonNode body = JSON.readTree(channel.bodies.getFirst());
        assertThat(body.path("temperature").asDouble()).isEqualTo(0.2);
        assertThat(body.has("reasoning_effort")).isFalse();
        assertThat(body.path("response_format").path("type").asString()).as("no schema: a JSON object").isEqualTo("json_object");
    }

    @Test
    void aPictureGoesAsADataUrlInTheUsersTurn() {
        Channel channel = new Channel().then(new AiResponse(200, OK));
        Turn turn = Turn.userWithPicture("what is this", new Picture("image/jpeg", new byte[] {1, 2, 3}));

        model(null, null).complete(new ModelRequest(Purpose.PHOTO_MEAL, "m", 100, "s", List.of(turn), null, channel));

        JsonNode content = JSON.readTree(channel.bodies.getFirst()).path("messages").path(1).path("content");
        assertThat(content.path(0).path("text").asString()).isEqualTo("what is this");
        assertThat(content.path(1).path("image_url").path("url").asString()).isEqualTo("data:image/jpeg;base64,AQID");
    }

    @Test
    void theTextAndTheTokensComeBack() {
        ModelReply reply = model(null, null).complete(request(new Channel().then(new AiResponse(200, OK)), SCHEMA));

        assertThat(reply.text()).isEqualTo("{\"reply\":\"x\"}");
        assertThat(reply.inputTokens()).isEqualTo(288);
        assertThat(reply.outputTokens()).isEqualTo(65);
    }

    @Test
    void aRefusalOrAnEmptyAnswerIsEmptyTextWhichNoSchemaReads() {
        String refusal = "{\"choices\":[{\"message\":{\"content\":null,\"refusal\":\"I can't help with that\"}}],\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":3}}";

        ModelReply reply = model(null, null).complete(request(new Channel().then(new AiResponse(200, refusal)), SCHEMA));

        assertThat(reply.text()).isEmpty();
        assertThat(reply.inputTokens()).isEqualTo(10);
    }

    @Test
    void aRateLimitOrAServerErrorIsTriedOnceMore() {
        Channel limited = new Channel().then(new AiResponse(429, "{\"error\":{}}")).then(new AiResponse(200, OK));
        Channel broken = new Channel().then(new AiResponse(503, "")).then(new AiResponse(200, OK));
        Channel silent = new Channel().thenFail(new ApiException(ErrorCode.SERVICE_UNAVAILABLE)).then(new AiResponse(200, OK));

        for (Channel channel : List.of(limited, broken, silent)) {
            assertThat(model(null, null).complete(request(channel, SCHEMA)).text()).isNotEmpty();
            assertThat(channel.bodies).hasSize(2);
        }
    }

    @Test
    void afterTheSecondFailureTheModelIsUnavailableAndNothingIsTriedAgain() {
        Channel channel = new Channel().then(new AiResponse(500, "oops")).then(new AiResponse(429, "slow down"));

        assertThatThrownBy(() -> model(null, null).complete(request(channel, SCHEMA))).isInstanceOf(ModelUnavailable.class)
                .hasMessageNotContaining("oops").hasMessageNotContaining("slow down");
        assertThat(channel.bodies).hasSize(2);
    }

    @Test
    void aRefusedKeyOrRequestIsNotRetried() {
        for (int status : new int[] {400, 401, 403, 404}) {
            Channel channel = new Channel().then(new AiResponse(status, "{\"error\":\"bad key " + KEY + "\"}"));

            assertThatThrownBy(() -> model(null, null).complete(request(channel, SCHEMA))).isInstanceOf(ModelUnavailable.class)
                    .hasMessageNotContaining(KEY).hasMessageContaining(String.valueOf(status));
            assertThat(channel.bodies).as("status " + status).hasSize(1);
        }
    }

    @Test
    void noConsentIsNotAProviderFailureAndIsNeverRetried() {
        Channel channel = new Channel().thenFail(new ApiException(ErrorCode.CONSENT_REQUIRED));

        assertThatThrownBy(() -> model(null, null).complete(request(channel, SCHEMA))).isInstanceOfSatisfying(ApiException.class,
                refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(channel.bodies).hasSize(1);
    }

    @Test
    void anAnswerThatIsNotJsonIsUnavailable() {
        assertThatThrownBy(() -> model(null, null).complete(request(new Channel().then(new AiResponse(200, "<html>")), SCHEMA)))
                .isInstanceOf(ModelUnavailable.class);
    }

    @Test
    void withoutTheChannelOfThePrivacyModuleItDoesNotRun() {
        assertThatIllegalStateException().isThrownBy(() -> model(null, null).complete(new ModelRequest(Purpose.EXPLAIN, "m", 1, "s", List.of())))
                .withMessageContaining("channel");
    }

    @Test
    void itDoesNotStartWithoutAKeyAndTheKeyIsInNoPrintedForm() {
        assertThatIllegalStateException().isThrownBy(() -> new OpenAiLanguageModel(new OpenAiProperties(" ", null, null, null, null)))
                .withMessageContaining("KEEL_OPENAI_API_KEY");
        assertThatIllegalStateException().isThrownBy(() -> new OpenAiLanguageModel(new OpenAiProperties(null, null, null, null, null)));
        assertThat(new OpenAiProperties(KEY, null, null, null, null).toString()).doesNotContain(KEY).contains("set");
        assertThatIllegalStateException().isThrownBy(() -> new OpenAiProperties(KEY, null, Duration.ZERO, null, null));
        assertThatIllegalStateException().isThrownBy(() -> new OpenAiProperties(KEY, null, null, 3.0, null));
    }
}

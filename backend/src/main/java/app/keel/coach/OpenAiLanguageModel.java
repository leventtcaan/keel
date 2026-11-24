package app.keel.coach;

import app.keel.privacy.AiChannel;
import app.keel.privacy.AiResponse;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.net.URI;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * OpenAI's chat completions as the coach's language model (ADR-092 #4, ADR-091 Ek 5): {@code store: false}, a reply cap, the
 * strict JSON schema the request names, and nothing else of the account — the call goes through the channel the privacy
 * module gave the request, never past it (EgressRuleTests). A 429, a 5xx or no answer is tried once more; after that, or for
 * any other refusal, {@link ModelUnavailable}: the coach then says what the engine wrote. A refusal or a cut-off reply comes
 * back as the text it is — the reply check drops it.
 */
final class OpenAiLanguageModel implements LanguageModel {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final int TRIES = 2;

    private final OpenAiProperties properties;
    private final URI endpoint;

    OpenAiLanguageModel(OpenAiProperties properties) {
        if (!properties.hasKey()) {
            throw new IllegalStateException("keel.coach.provider 'openai' needs keel.coach.openai.api-key (KEEL_OPENAI_API_KEY)");
        }
        this.properties = properties;
        this.endpoint = properties.baseUri().resolve("chat/completions");
    }

    @Override
    public ModelReply complete(ModelRequest request) {
        AiChannel channel = request.channel();
        if (channel == null) {
            throw new IllegalStateException("a call to OpenAI goes through the privacy module's channel");
        }
        String body = JSON.writeValueAsString(body(request));
        Map<String, String> headers = Map.of("Authorization", "Bearer " + properties.apiKey());
        ModelUnavailable last = null;
        for (int attempt = 1; attempt <= TRIES; attempt++) {
            AiResponse answer;
            try {
                answer = channel.post(endpoint, headers, body, properties.timeout());
            } catch (ApiException unreachable) {
                if (unreachable.code() != ErrorCode.SERVICE_UNAVAILABLE) {
                    throw unreachable; // no consent, a setup of ours: not the provider's to retry
                }
                last = new ModelUnavailable("OpenAI did not answer", unreachable);
                continue;
            }
            if (answer.status() == 429 || answer.status() >= 500) {
                last = new ModelUnavailable("OpenAI answered " + answer.status());
                continue;
            }
            if (!answer.ok()) {
                throw new ModelUnavailable("OpenAI refused the request with " + answer.status()); // our key or our request: not for a retry
            }
            return read(answer.body());
        }
        throw last;
    }

    private Map<String, Object> body(ModelRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", request.model());
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", request.system()));
        request.turns().forEach(turn -> messages.add(message(turn)));
        body.put("messages", messages);
        body.put("max_completion_tokens", request.maxOutputTokens());
        body.put("store", false);
        if (properties.temperature() != null) {
            body.put("temperature", properties.temperature());
        }
        if (properties.reasoningEffort() != null && !properties.reasoningEffort().isBlank()) {
            body.put("reasoning_effort", properties.reasoningEffort());
        }
        body.put("response_format", request.schema() == null ? Map.of("type", "json_object")
                : Map.of("type", "json_schema", "json_schema", Map.of("name", request.schema().name(), "strict", true, "schema", request.schema().definition())));
        return body;
    }

    private static Map<String, Object> message(Turn turn) {
        String role = turn.role() == Turn.Role.USER ? "user" : "assistant";
        if (turn.picture() == null) {
            return Map.of("role", role, "content", turn.text());
        }
        String url = "data:" + turn.picture().mediaType() + ";base64," + Base64.getEncoder().encodeToString(turn.picture().bytes());
        return Map.of("role", role, "content", List.of(Map.of("type", "text", "text", turn.text()),
                Map.of("type", "image_url", "image_url", Map.of("url", url))));
    }

    private static ModelReply read(String raw) {
        try {
            JsonNode answer = JSON.readTree(raw);
            JsonNode content = answer.path("choices").path(0).path("message").path("content");
            JsonNode usage = answer.path("usage");
            // A refusal or an empty answer has no content: empty text, which no schema reads (the engine's words are shown).
            return new ModelReply(content.isString() ? content.asString() : "", usage.path("prompt_tokens").asInt(0), usage.path("completion_tokens").asInt(0));
        } catch (JacksonException notJson) {
            throw new ModelUnavailable("OpenAI's answer was not JSON");
        }
    }
}

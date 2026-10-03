"""The language model check at launch (K-511, ADR-044): the same objections (data/coach/pushback-scenarios.json) and meals
(data/coach/meal-scenarios.json) to each candidate provider, read the way the server reads them — then the share that kept
the schema, the share with the expected topic or foods, latency and cost per request.

Not run before launch (ADR-041: no real call, no spending, no key). At launch, in Levent's terminal, with his key in an
environment variable — never in the repository, a prompt or a log (V5):

    OPENAI_API_KEY=… python3 tools/llm_eval.py --provider openai --model gpt-6-luna --set objections --price-in 0.10 --price-out 0.50
    python3 tools/llm_eval.py --provider openai --model gpt-6-luna --set meals --dry-run   # shows the requests, sends nothing

Endpoints and request shapes are as the providers documented them; **verify each against its official page before the first
run** [doğrulanmadı — not checked against a live API: no key]. The base URL can be given (--base-url): OpenAI's EU host, a
Vertex region. Results print as one JSON line per run, to paste into ADR-044.
"""
import argparse
import json
import os
import pathlib
import re
import statistics
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

try:  # JavaScript's look-behinds of any width, as the app's phrases use them; the standard re takes only fixed ones.
    import regex as pattern_engine
except ImportError:
    pattern_engine = re

sys.dont_write_bytecode = True

ROOT = pathlib.Path(__file__).resolve().parent.parent

# The closed list of topics (backend coach.Topic; the contract's CoachAnswer.topic) and those that name no rule.
TOPICS = ["LESS", "MORE", "LATER", "HUNGER", "DOUBTS_DATA", "FEELS_FINE", "WORRY", "FRUSTRATED", "HEALTH", "WHY", "OFF_TOPIC"]
NOT_ABOUT_THE_CALL = {"HEALTH", "OFF_TOPIC"}

# A rule the engine gives for each kind of call, for the objections' FACTS (the set holds the call's kind only). Rule ids
# the engine has (engine RuleId constants); what matters to the check is that the model picks one of these, or none.
REASONS_BY_KIND = {
    "ADJUST_CALORIES": ["not_toward_goal", "stall_window", "cut_step"],
    "INCREASE_CALORIES": ["loss_rate_cap", "rapid_loss"],
    "CONTINUE": ["toward_goal"],
    "NO_DECISION_YET": ["data_insufficient"],
    "DELOAD": ["long_stagnation"],
    "FULL_REST_WEEK": ["plan_missed", "full_rest_week"],
    "MINI_CUT": ["appetite_gone"],
    "CHANGE_PHASE": ["bulk_ceiling", "fat_first"],
    "FIX_ADHERENCE": ["adherence_low"],
    "FIX_RECOVERY": ["recovery_poor"],
    "FIX_TRAINING": ["training_first"],
    "STOP_LOAD_INCREASE": ["plateau"],
    "CHANGE_MOVEMENT": ["bmr_floor"],
}

def _settings():
    """application.yml's keys by their dotted path (keel.coach.max-output): the few plain values the check needs, no YAML library."""
    found, path = {}, []
    for line in (ROOT / "backend/src/main/resources/application.yml").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith(("#", "-")) or ":" not in line:
            continue
        depth = (len(line) - len(line.lstrip())) // 2
        key, _, value = line.strip().partition(":")
        path = path[:depth] + [key]
        found[".".join(path)] = value.split(" #")[0].strip()
    return found


def _limits():
    """The server's own limits (application.yml, K2): read here so the check reads replies exactly as the server does."""
    at = _settings()
    whole = lambda key: int(at[key])  # noqa: E731
    return {"reply_chars": whole("keel.coach.max-reply-chars"), "max_output": whole("keel.coach.max-output"),
            "items": min(whole("keel.coach.meal.max-items"), whole("keel.nutrition.max-items")),
            "food_chars": whole("keel.coach.meal.max-food-chars"), "quantity": whole("keel.nutrition.max-grams")}


LIMITS = _limits()
# A measure as MealReplyCheck takes it: letters and spaces, 1-30, after the same normalizing.
UNIT = re.compile(r"[^\W\d_]+(?: [^\W\d_]+)*|[^\W\d_ ]")
APOSTROPHES = re.compile("[\u2019\u2018\u02bc\u2032`]")
SPACES = re.compile(r"[\s\u00a0\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+")


def _forbidden():
    """The phrases no food name may carry (ForbiddenWords): the rules, person names, the quota's currency words. Without the
    regex module a phrase the standard re cannot read is named in MISSING, and a real run stops (its schema share would read high)."""
    phrases = json.loads((ROOT / "data/copy/forbidden-phrases.json").read_text(encoding="utf-8"))
    entries = [(rule["id"], rule["pattern"], re.IGNORECASE) for rule in phrases["rules"]]
    entries += [("personNames", phrases["personNames"]["pattern"], 0), ("quotaWords", phrases["quotaWords"]["pattern"], re.IGNORECASE)]
    compiled, missing = [], []
    for name, pattern, flags in entries:
        try:
            compiled.append(pattern_engine.compile(pattern, flags))
        except re.error:
            missing.append(name)
    return compiled, missing


FORBIDDEN, MISSING = _forbidden()


def normalize(text):
    """As Words.normalize: NFKC, one apostrophe, one kind of space."""
    return SPACES.sub(" ", APOSTROPHES.sub("'", unicodedata.normalize("NFKC", text)))

PROVIDERS = {
    # Chat completions with a JSON object reply (OpenAI; Mistral's API has the same shape).
    "openai": {"url": "https://api.openai.com/v1/chat/completions", "key": "OPENAI_API_KEY"},
    "mistral": {"url": "https://api.mistral.ai/v1/chat/completions", "key": "MISTRAL_API_KEY"},
    "anthropic": {"url": "https://api.anthropic.com/v1/messages", "key": "ANTHROPIC_API_KEY"},
    # Vertex: the model's generateContent URL is given with --base-url (project, region — "eu" for the EU multi-region);
    # the key is an access token (gcloud auth print-access-token).
    "vertex": {"url": "https://aiplatform.googleapis.com/v1/{model}:generateContent", "key": "VERTEX_ACCESS_TOKEN"},
}


def objections():
    return json.loads((ROOT / "data/coach/pushback-scenarios.json").read_text(encoding="utf-8"))["scenarios"]


def meals():
    return json.loads((ROOT / "data/coach/meal-scenarios.json").read_text(encoding="utf-8"))["cases"]


def reasons_for(scenario):
    return REASONS_BY_KIND.get(scenario["call"]["type"], [])


def read_topic(raw, reasons):
    """As TopicReply: within the reply's length; exactly {"topic"} or {"topic","rule"}; the topic by its exact name; the rule
    one of the call's or none."""
    if not isinstance(raw, str) or len(raw) > LIMITS["reply_chars"]:
        return None
    try:
        reply = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(reply, dict) or not set(reply) <= {"topic", "rule"} or not isinstance(reply.get("topic"), str):
        return None
    topic, rule = reply["topic"], reply.get("rule")
    if topic not in TOPICS or (rule is not None and rule not in reasons):
        return None
    if topic in NOT_ABOUT_THE_CALL:
        return topic, None
    return topic, rule if rule is not None else (reasons[0] if reasons else None)


def read_meal(raw):
    """As MealReplyCheck: {"items": [{"food","quantity","unit"}]} — at most the items a meal takes; a food normalized, within
    its length, no digit, no forbidden phrase; a measure of letters and spaces; the quantity rounded half up to 2 decimals,
    then over 0 and at most the grams an item may be. Anything else drops the reply."""
    if not isinstance(raw, str):
        return None
    try:
        reply = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(reply, dict) or set(reply) != {"items"} or not isinstance(reply["items"], list) or len(reply["items"]) > LIMITS["items"]:
        return None
    read = []
    for item in reply["items"]:
        if not isinstance(item, dict) or set(item) != {"food", "quantity", "unit"}:
            return None
        food, quantity, unit = item["food"], item["quantity"], item["unit"]
        if not isinstance(food, str) or not isinstance(unit, str) or isinstance(quantity, bool) or not isinstance(quantity, (int, float)):
            return None
        words, measure = normalize(food).strip(), normalize(unit).strip().lower()
        if not words or len(words) > LIMITS["food_chars"] or any(c.isdigit() for c in words) or any(p.search(words) for p in FORBIDDEN):
            return None
        if not 1 <= len(measure) <= 30 or not UNIT.fullmatch(measure):
            return None
        try:
            rounded = Decimal(str(quantity)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except InvalidOperation:
            return None
        if rounded <= 0 or rounded > LIMITS["quantity"]:
            return None
        read.append((words, float(rounded), measure))
    return read


def meal_matches(read, expected):
    """Every expected food read once: its word in the food, the same quantity, the same measure (singular, any case)."""
    if len(read) != len(expected):
        return False
    left = list(read)
    for want in expected:
        hit = next((r for r in left if want["food"].lower() in r[0].lower() and r[1] == float(want["quantity"])
                    and r[2].lower().rstrip("s") == want["unit"].lower().rstrip("s")), None)
        if hit is None:
            return False
        left.remove(hit)
    return True


class Result:
    def __init__(self, case_id, schema_ok, correct, ms, tokens_in, tokens_out):
        self.case_id, self.schema_ok, self.correct, self.ms, self.tokens_in, self.tokens_out = case_id, schema_ok, correct, ms, tokens_in, tokens_out


def summarize(results, price_in, price_out):
    n = len(results)
    latencies = sorted(r.ms for r in results)
    cost = sum(r.tokens_in * price_in + r.tokens_out * price_out for r in results) / 1_000_000
    return {
        "n": n,
        "schema": sum(r.schema_ok for r in results) / n,
        "correct": sum(r.correct for r in results) / n,
        "p50_ms": statistics.median(latencies),
        "p95_ms": latencies[min(n - 1, round(0.95 * (n - 1)))],
        "usd_per_request": cost / n,
        "wrong": [r.case_id for r in results if not r.correct],
    }


def request(provider, model, system, user, key):
    """URL, headers (the key goes only here), body — the same instructions and words to each."""
    spec = PROVIDERS[provider]
    if provider in ("openai", "mistral"):
        # The output limit the server sends (keel.coach.max-output): OpenAI names it max_completion_tokens, Mistral max_tokens.
        limit = "max_completion_tokens" if provider == "openai" else "max_tokens"
        body = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "response_format": {"type": "json_object"}, limit: LIMITS["max_output"]}
        return spec["url"], {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, body
    if provider == "anthropic":
        body = {"model": model, "max_tokens": LIMITS["max_output"], "system": system, "messages": [{"role": "user", "content": user}]}
        return spec["url"], {"x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}, body
    body = {"systemInstruction": {"parts": [{"text": system}]}, "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"responseMimeType": "application/json", "maxOutputTokens": LIMITS["max_output"]}}
    return spec["url"].format(model=model), {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, body


def reply_of(provider, answer):
    """The reply's text and its input and output tokens, from each provider's answer."""
    if provider in ("openai", "mistral"):
        return answer["choices"][0]["message"]["content"], answer["usage"]["prompt_tokens"], answer["usage"]["completion_tokens"]
    if provider == "anthropic":
        text = "".join(part.get("text", "") for part in answer["content"] if part.get("type") == "text")
        return text, answer["usage"]["input_tokens"], answer["usage"]["output_tokens"]
    usage = answer.get("usageMetadata", {})
    return answer["candidates"][0]["content"]["parts"][0]["text"], usage.get("promptTokenCount", 0), usage.get("candidatesTokenCount", 0)


def http(url, headers, body):
    call = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(call, timeout=60) as answer:
        return json.loads(answer.read().decode("utf-8"))


def cases(which):
    instructions = (ROOT / "data/coach" / ("explain.md" if which == "objections" else "parse-meal.md")).read_text(encoding="utf-8")
    if which == "meals":
        return [(case["id"], instructions, case["text"], lambda raw, c=case: (r := read_meal(raw)) is not None and meal_matches(r, c["expected"]),
                 lambda raw: read_meal(raw) is not None) for case in meals()]
    out = []
    for scenario in objections():
        reasons = reasons_for(scenario)
        facts = {"action": scenario["call"]["type"], "reasons": [{"rule": rule, "source": "EXPERIENCE"} for rule in reasons]}
        system = instructions + "\n\nFACTS: " + json.dumps(facts)
        out.append((scenario["id"], system, scenario["objection"],
                    lambda raw, s=scenario, rs=reasons: (r := read_topic(raw, rs)) is not None and r[0] == s["expectedTopic"],
                    lambda raw, rs=reasons: read_topic(raw, rs) is not None))
    return out


def run(provider, model, which, key, dry_run=False, transport=http, limit=None, price_in=0.0, price_out=0.0, base_url=None):
    chosen = cases(which)[:limit]
    if dry_run:
        for case_id, system, user, _, _ in chosen:
            url, _, body = request(provider, model, system, user, key="<key>")
            print(json.dumps({"case": case_id, "url": base_url or url, "body": body})[:300])
        return {"dry_run": len(chosen)}
    results = []
    for case_id, system, user, correct, schema in chosen:
        url, headers, body = request(provider, model, system, user, key)
        started = time.monotonic()
        try:
            text, tokens_in, tokens_out = reply_of(provider, transport(base_url or url, headers, body))
        except (urllib.error.URLError, OSError, KeyError, IndexError, TypeError, ValueError) as failed:
            # A refusal, a blocked or empty answer, a 429/500: the server would have used the engine's words — dropped, and
            # the run goes on with what it has paid for.
            print(json.dumps({"case": case_id, "failed": type(failed).__name__}), file=sys.stderr)
            text, tokens_in, tokens_out = None, 0, 0
        ms = round((time.monotonic() - started) * 1000)
        results.append(Result(case_id, text is not None and schema(text), text is not None and correct(text), ms, tokens_in, tokens_out))
    return {"provider": provider, "model": model, "set": which, **summarize(results, price_in, price_out)}


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--provider", choices=sorted(PROVIDERS), required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--set", choices=["objections", "meals"], required=True)
    parser.add_argument("--price-in", type=float, default=0.0, help="$ per million input tokens (ADR-044)")
    parser.add_argument("--price-out", type=float, default=0.0, help="$ per million output tokens (ADR-044)")
    parser.add_argument("--base-url", help="the provider's URL when not the default (EU host, Vertex model URL)")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--dry-run", action="store_true", help="print the requests, send nothing")
    args = parser.parse_args()
    if MISSING and not args.dry_run:
        sys.exit(f"phrases the standard re cannot read: {MISSING} — pip install regex, then run again")
    key = None if args.dry_run else os.environ.get(PROVIDERS[args.provider]["key"])
    if not args.dry_run and not key:
        sys.exit(f"{PROVIDERS[args.provider]['key']} is not set (the key stays in the environment, V5)")
    print(json.dumps(run(args.provider, args.model, args.set, key, args.dry_run, limit=args.limit, price_in=args.price_in,
                         price_out=args.price_out, base_url=args.base_url)))


if __name__ == "__main__":
    main()

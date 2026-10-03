"""Tests for tools/llm_eval.py (K-511, ADR-044): reading a reply as the server reads it (TopicReply, MealReplyCheck's
schema), scoring the objection and meal sets, building each provider's request — with a fake transport: no network, no key.

Run: python3 tools/test_llm_eval.py
"""
import json
import pathlib
import sys
import unittest

sys.dont_write_bytecode = True  # no __pycache__ in tools/
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import llm_eval  # noqa: E402

REASONS = ["not_toward_goal", "cut_step"]


class TopicReading(unittest.TestCase):
    def test_a_topic_and_one_of_the_calls_rules(self):
        self.assertEqual(llm_eval.read_topic('{"topic":"HUNGER","rule":"cut_step"}', REASONS), ("HUNGER", "cut_step"))

    def test_no_rule_is_the_leading_one_and_off_topic_names_none(self):
        self.assertEqual(llm_eval.read_topic('{"topic":"LESS","rule":null}', REASONS), ("LESS", "not_toward_goal"))
        self.assertEqual(llm_eval.read_topic('{"topic":"OFF_TOPIC","rule":"cut_step"}', REASONS), ("OFF_TOPIC", None))

    def test_anything_else_is_dropped(self):
        for raw in ["no", "[]", "{}", '{"topic":"hunger"}', '{"topic":"HUNGER","rule":"x"}', '{"topic":"HUNGER","rule":"null"}',
                    '{"topic":"LESS","text":"Sure, 250"}', '{"topic":7}']:
            self.assertIsNone(llm_eval.read_topic(raw, REASONS), raw)

    def test_the_topics_are_the_contracts(self):
        contract = (llm_eval.ROOT / "contracts/openapi.yaml").read_text(encoding="utf-8")
        for topic in llm_eval.TOPICS:
            self.assertIn(topic, contract)


class MealReading(unittest.TestCase):
    def test_items_of_food_quantity_unit(self):
        raw = '{"items":[{"food":"eggs","quantity":2,"unit":"piece"}]}'
        self.assertEqual(llm_eval.read_meal(raw), [("eggs", 2.0, "piece")])
        # No food in the words: no items (parse-meal.md), a valid read.
        self.assertEqual(llm_eval.read_meal('{"items":[]}'), [])

    def test_a_calorie_a_digit_in_a_food_or_an_impossible_amount_drops_the_reply(self):
        for raw in ['{"items":[{"food":"eggs","quantity":2,"unit":"piece","kcal":140}]}',
                    '{"items":[{"food":"2 eggs","quantity":2,"unit":"piece"}]}',
                    '{"items":[{"food":"eggs","quantity":0,"unit":"piece"}]}',
                    '{"items":[{"food":"eggs","quantity":6000,"unit":"g"}]}', "nope"]:
            self.assertIsNone(llm_eval.read_meal(raw), raw)


class Scoring(unittest.TestCase):
    def test_objections_count_schema_topic_and_cost(self):
        results = [llm_eval.Result("a", True, True, 120, 600, 20), llm_eval.Result("b", True, False, 300, 600, 20),
                   llm_eval.Result("c", False, False, 900, 600, 40)]
        summary = llm_eval.summarize(results, price_in=0.10, price_out=0.50)
        self.assertEqual(summary["n"], 3)
        self.assertAlmostEqual(summary["schema"], 2 / 3)
        self.assertAlmostEqual(summary["correct"], 1 / 3)
        self.assertEqual(summary["p50_ms"], 300)
        self.assertAlmostEqual(summary["usd_per_request"], (1800 * 0.10 + 80 * 0.50) / 1_000_000 / 3)

    def test_every_objection_has_a_topic_the_list_knows(self):
        for scenario in llm_eval.objections():
            self.assertIn(scenario["expectedTopic"], llm_eval.TOPICS, scenario["id"])
            self.assertTrue(llm_eval.reasons_for(scenario), scenario["id"])

    def test_every_meal_case_reads_as_its_own_expectation(self):
        for case in llm_eval.meals():
            expected = [(item["food"], float(item["quantity"]), item["unit"]) for item in case["expected"]]
            raw = json.dumps({"items": [{"food": f, "quantity": q, "unit": u} for f, q, u in expected]})
            self.assertEqual(llm_eval.read_meal(raw), expected, case["id"])
            self.assertTrue(llm_eval.meal_matches(expected, case["expected"]), case["id"])


class Requests(unittest.TestCase):
    def test_each_provider_gets_the_instructions_and_the_message_and_no_key_in_the_body(self):
        for provider in llm_eval.PROVIDERS:
            url, headers, body = llm_eval.request(provider, "a-model", "SYSTEM", "the user's words", key="sk-test")
            self.assertTrue(url.startswith("https://"), provider)
            text = json.dumps(body)
            self.assertIn("SYSTEM", text, provider)
            self.assertIn("the user's words", text, provider)
            self.assertNotIn("sk-test", text, provider)
            self.assertIn("sk-test", json.dumps(headers), provider)

    def test_the_reply_and_its_tokens_are_read_from_each_providers_answer(self):
        answers = {
            "openai": {"choices": [{"message": {"content": "X"}}], "usage": {"prompt_tokens": 5, "completion_tokens": 2}},
            "mistral": {"choices": [{"message": {"content": "X"}}], "usage": {"prompt_tokens": 5, "completion_tokens": 2}},
            "anthropic": {"content": [{"type": "text", "text": "X"}], "usage": {"input_tokens": 5, "output_tokens": 2}},
            "vertex": {"candidates": [{"content": {"parts": [{"text": "X"}]}}], "usageMetadata": {"promptTokenCount": 5, "candidatesTokenCount": 2}},
        }
        for provider, answer in answers.items():
            self.assertEqual(llm_eval.reply_of(provider, answer), ("X", 5, 2), provider)

    def test_a_dry_run_sends_nothing(self):
        sent = []
        out = llm_eval.run("openai", "m", "objections", key=None, dry_run=True, transport=lambda *a: sent.append(a), limit=2)
        self.assertEqual(sent, [])
        self.assertEqual(out["dry_run"], 2)


if __name__ == "__main__":
    unittest.main(verbosity=1)

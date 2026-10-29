#!/usr/bin/env python3
"""Open Food Facts' nightly JSONL on stdin → the products the app imports, one JSON line each, on stdout (ADR-088).

Kept: sold in Turkey (countries_tags en:turkey / en:turkiye) or a GS1 Turkey barcode (869…), with a name and kcal, protein,
carbohydrate and fat per 100 g. Only the fields the import reads are written. Counts go to stderr at the end.
"""
import json
import sys

TURKEY = {"en:turkey", "en:turkiye"}
NUTRIENTS = ("energy-kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g")


def number(value):
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n >= 0 else None


def main():
    seen = kept = turkish = 0
    for line in sys.stdin:
        seen += 1
        try:
            p = json.loads(line)
        except ValueError:
            continue
        code = str(p.get("code") or "").strip()
        if not code.isdigit() or not 8 <= len(code) <= 14:
            continue
        tags = set(p.get("countries_tags") or [])
        if not (tags & TURKEY or code.startswith("869")):
            continue
        turkish += 1
        nut = p.get("nutriments") or {}
        values = [number(nut.get(k)) for k in NUTRIENTS]
        if any(v is None for v in values):
            continue
        name = (p.get("product_name_tr") or p.get("product_name") or p.get("product_name_en") or "").strip()
        if not name:
            continue
        kcal, protein, carbs, fat = values
        # Per 100 g: more than 100 g of a nutrient, or more than 900 kcal (pure fat), is a typing error in the source.
        if kcal > 900 or protein > 100 or carbs > 100 or fat > 100:
            continue
        kept += 1
        out = {
            "code": code,
            "name": name,
            "name_en": (p.get("product_name_en") or "").strip() or None,
            # OFF lists brands comma-separated, the maker first.
            "brand": (p.get("brands") or "").split(",")[0].strip() or None,
            "kcal": kcal, "protein": protein, "carbs": carbs, "fat": fat,
            "serving_g": number(p.get("serving_quantity")),
            "serving": (p.get("serving_size") or "").strip() or None,
        }
        sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
    sys.stderr.write(f"seen={seen} turkey={turkish} kept={kept}\n")


if __name__ == "__main__":
    main()

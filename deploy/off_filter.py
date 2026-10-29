#!/usr/bin/env python3
"""Open Food Facts' nightly JSONL on stdin -> the products the app imports, one file per region (ADR-088, ADR-090 #1).

    off_filter.py OUT_DIR [REGION ...]        (default regions: TR US)

Writes OUT_DIR/off-<region>.jsonl, one JSON line a product, each line tagged with the region it was kept for. One pass over the
dump serves every region; a product sold in two regions is in both files.

Kept: sold in the region, with a name and kcal, protein, carbohydrate and fat per 100 g.
  TR  countries_tags en:turkey / en:turkiye, or a GS1 Turkey barcode (869...); the name in Turkish first.
  US  countries_tags en:united-states; the name in English first. (The barcode prefix says where a brand registered, not where it
      is sold, so it is not used for the United States.)
Only the fields the import reads are written. Counts go to stderr at the end.
"""
import json
import os
import sys

NUTRIENTS = ("energy-kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g")

# region -> (country tags, GS1 barcode prefix or None, product name fields in order of preference)
REGIONS = {
    "TR": ({"en:turkey", "en:turkiye"}, "869", ("product_name_tr", "product_name", "product_name_en")),
    "US": ({"en:united-states"}, None, ("product_name_en", "product_name")),
}


def number(value):
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n >= 0 else None


def sold_in(region, code, tags):
    countries, prefix, _ = REGIONS[region]
    return bool(tags & countries) or (prefix is not None and code.startswith(prefix))


def main(argv):
    if len(argv) < 2:
        sys.stderr.write(__doc__)
        return 2
    out_dir = argv[1]
    regions = argv[2:] or ["TR", "US"]
    unknown = [r for r in regions if r not in REGIONS]
    if unknown:
        sys.stderr.write("unknown region: " + ", ".join(unknown) + " (known: " + ", ".join(sorted(REGIONS)) + ")\n")
        return 2
    os.makedirs(out_dir, exist_ok=True)
    files = {r: open(os.path.join(out_dir, "off-" + r.lower() + ".jsonl"), "w", encoding="utf-8") for r in regions}
    matched = {r: 0 for r in regions}
    kept = {r: 0 for r in regions}
    seen = 0
    try:
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
            nut = p.get("nutriments") or {}
            values = [number(nut.get(k)) for k in NUTRIENTS]
            for region in regions:
                if not sold_in(region, code, tags):
                    continue
                matched[region] += 1
                if any(v is None for v in values):
                    continue
                name = next((str(p.get(f) or "").strip() for f in REGIONS[region][2] if str(p.get(f) or "").strip()), "")
                if not name:
                    continue
                kcal, protein, carbs, fat = values
                # Per 100 g: more than 100 g of a nutrient, or more than 900 kcal (pure fat), is a typing error in the source.
                if kcal > 900 or protein > 100 or carbs > 100 or fat > 100:
                    continue
                kept[region] += 1
                out = {
                    "code": code,
                    "region": region,
                    "name": name,
                    "name_en": (p.get("product_name_en") or "").strip() or None,
                    # OFF lists brands comma-separated, the maker first.
                    "brand": (p.get("brands") or "").split(",")[0].strip() or None,
                    "kcal": kcal, "protein": protein, "carbs": carbs, "fat": fat,
                    "serving_g": number(p.get("serving_quantity")),
                    "serving": (p.get("serving_size") or "").strip() or None,
                }
                files[region].write(json.dumps(out, ensure_ascii=False) + "\n")
    finally:
        for f in files.values():
            f.close()
    sys.stderr.write(f"seen={seen} " + " ".join(f"{r}:matched={matched[r]},kept={kept[r]}" for r in regions) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

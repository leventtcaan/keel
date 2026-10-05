#!/usr/bin/env bash
# Puts FoodData Central's releases (ADR-008) in /opt/keel/fdc on the VPS, where the backend imports them at start.
# As keel on the VPS: /opt/keel/deploy/fetch-fdc.sh. USDA's public-domain files; not in the repository.
set -euo pipefail
cd /opt/keel/fdc
for release in FoodData_Central_foundation_food_csv_2025-12-18 FoodData_Central_sr_legacy_food_csv_2018-04; do
  [[ -d $release ]] && continue
  curl -fsSL -o "$release.zip" "https://fdc.nal.usda.gov/fdc-datasets/$release.zip"
  unzip -q "$release.zip" && rm "$release.zip"
done
ls -d FoodData_Central_*

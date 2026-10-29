#!/usr/bin/env bash
# Puts FoodData Central's releases (ADR-008, ADR-088 Ek 2, ADR-090 #1) in /opt/keel/fdc on the VPS, where the backend imports them
# at start. As keel on the VPS:
#   /opt/keel/deploy/fetch-fdc.sh          downloads and unzips what is not there yet
#   /opt/keel/deploy/fetch-fdc.sh prune    after the backend has imported Branded (nutrition.food_import has the release): deletes
#                                          its CSV files (2.8 GB) and leaves a marker folder, so a fetch does not bring them back
# USDA's public-domain files (CC0); not in the repository. A release is named as FDC names it on
# https://fdc.nal.usda.gov/download-datasets ; to move to a newer one change it here or set FDC_RELEASES in the environment (the
# backend imports the newest release folder of each dataset, an older one beside it is ignored). Free space is checked first.
set -euo pipefail
cd /opt/keel/fdc

# <dataset>_csv_<release>: Foundation Foods, SR Legacy (last release 2018-04), Survey (FNDDS) and Branded Foods. Checked 2026-10-29 (HTTP 200).
releases=${FDC_RELEASES:-"foundation_food_csv_2025-12-18 sr_legacy_food_csv_2018-04 survey_food_csv_2024-10-31 branded_food_csv_2026-04-30"}
# Branded needs room for its zip (0.45 GB) and the three files the import reads (2.8 GB): in GB.
min_free_gb=${FDC_MIN_FREE_GB:-5}

if [[ ${1:-} == prune ]]; then
  for folder in FoodData_Central_branded_food_csv_*; do
    [[ -d $folder ]] || continue
    rm -f "$folder/food.csv" "$folder/branded_food.csv" "$folder/food_nutrient.csv"
    : > "$folder/.fetched"
    echo "pruned $folder"
  done
  df -h .
  exit 0
fi

for release in $releases; do
  folder=FoodData_Central_$release
  # A folder that is there (also a pruned one with its marker) is a release already fetched.
  [[ -d $folder ]] && continue
  if [[ $release == branded_food_csv_* ]]; then
    free_gb=$(df -Pk . | awk 'NR==2 { print int($4 / 1048576) }')
    if (( free_gb < min_free_gb )); then
      echo "only ${free_gb} GB free in /opt/keel/fdc, $release needs ${min_free_gb} GB: nothing downloaded for it" >&2
      exit 1
    fi
  fi
  curl -fSL --retry 3 -o "$folder.zip.part" "https://fdc.nal.usda.gov/fdc-datasets/$folder.zip"
  mv "$folder.zip.part" "$folder.zip"
  if [[ $release == branded_food_csv_* ]]; then
    # Only what the import reads: not the 130 MB food_attribute.csv or the 130 MB update log.
    unzip -q "$folder.zip" "$folder/food.csv" "$folder/branded_food.csv" "$folder/food_nutrient.csv"
  else
    unzip -q "$folder.zip"
  fi
  rm "$folder.zip"
done
ls -d FoodData_Central_*
df -h .

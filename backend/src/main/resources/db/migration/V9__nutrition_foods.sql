-- The food database (K-208, ADR-008): USDA FoodData Central foods — Foundation and SR Legacy (laboratory analysis means)
-- and Branded (a product's label, with its barcode) — per 100 g, with the servings FDC gives (e.g. 1 cup = 158 g).
-- Filled by the FDC bulk import (DURUM question 16: the download needs approval); until then it is empty and a search
-- finds nothing. Not user data: no account_id.
create schema if not exists nutrition;

create table nutrition.food
(
    id           text primary key,
    name         text          not null,
    brand        text,
    source       text          not null check (source in ('FOUNDATION', 'SR_LEGACY', 'BRANDED')),
    kcal         numeric(7, 2) not null check (kcal >= 0),
    protein_g    numeric(6, 2) not null check (protein_g >= 0),
    carbs_g      numeric(6, 2) not null check (carbs_g >= 0),
    fat_g        numeric(6, 2) not null check (fat_g >= 0),
    -- The barcode as GTIN-14 (a 12-digit UPC-A or 13-digit EAN left-padded with zeros).
    gtin         text unique check (gtin ~ '^[0-9]{14}$'),
    -- Grams per millilitre, for foods logged by volume; absent when FDC gives none.
    grams_per_ml numeric(5, 3) check (grams_per_ml > 0)
);

create table nutrition.food_serving
(
    food_id text          not null references nutrition.food (id) on delete cascade,
    seq     int           not null,
    name    text          not null,
    grams   numeric(7, 2) not null check (grams > 0),
    primary key (food_id, seq)
);

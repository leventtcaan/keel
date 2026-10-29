-- US food data and a search that scales to it (K-1061, ADR-088 Ek 2, ADR-090 #1): USDA Branded Foods (barcodes, brands,
-- label servings) and Survey (FNDDS) join Foundation and SR Legacy; Open Food Facts comes by region (Turkey, the United
-- States). About half a million foods instead of ten thousand: the name search needs a trigram index, and the tables a few columns.

-- Trigram matching (prefix, any part of a word, typos). A trusted extension: the database owner creates it; the functions
-- and operators live in public, the tables stay in nutrition.
create extension if not exists pg_trgm;

-- Survey (FNDDS) is a source of generic foods, beside Foundation and SR Legacy.
alter table nutrition.food
    drop constraint food_source_check;
alter table nutrition.food
    add constraint food_source_check check (source in ('FOUNDATION', 'SR_LEGACY', 'FNDDS', 'BRANDED'));

-- The region a food is for (ISO 3166 alpha-2): the USDA foods are American, an Open Food Facts product belongs to the region
-- file it came in (each region's import owns its rows and removes only them). Every food there is today is USDA's, except
-- the Open Food Facts Turkey subset (K-1042).
alter table nutrition.food
    add column region text not null default 'US' check (region ~ '^[A-Z]{2}$');
update nutrition.food
set region = 'TR'
where dataset = 'OFF';

-- Which release (USDA) or file hash (Open Food Facts) last wrote the row: a big import is written in batches and stamps each
-- food, and only at its end removes the foods another release left (a stopped import can be run again).
alter table nutrition.food
    add column import_release text;
create index food_by_import on nutrition.food (dataset, region, import_release);

-- A barcode is no longer unique in the table: a product may be in USDA's Branded Foods and in Open Food Facts, or in the files of
-- two regions. The barcode lookup picks one (USDA first, then the user's region).
alter table nutrition.food
    drop constraint food_gtin_key;
create index food_by_gtin on nutrition.food (gtin) where gtin is not null;

-- What the name search matches: the name and the brand, in lower case, the Turkish dotless and dotted i as i (the keyboard
-- finds chicken, ADR-085 #7). Stored, so one trigram index can serve LIKE '%word%' and the typo operator.
alter table nutrition.food
    add column search_text text generated always as (lower(translate(name || ' ' || coalesce(brand, ''), 'ıİ', 'ii'))) stored;
create index food_search_trgm on nutrition.food using gin (search_text gin_trgm_ops);

-- How often a food is logged (the search ranks the foods people log first): by food, and for one account's own.
create index meal_item_by_food on nutrition.meal_item (food_id, account_id);

-- Each release or file recorded: the new USDA datasets and a region of Open Food Facts (OFF is Turkey's since K-1042, OFF_US the United States).
alter table nutrition.food_import
    drop constraint food_import_dataset_check;
alter table nutrition.food_import
    add constraint food_import_dataset_check check (dataset in ('FOUNDATION', 'SR_LEGACY', 'FNDDS', 'BRANDED', 'OFF') or dataset ~ '^OFF_[A-Z]{2}$');

-- Turkish home dishes and a search that finds them by their plain letters (K-1213, ADR-088 Ek 2): a dish is a recipe of USDA
-- ingredients worked out into one row (source RECIPE, dataset RECIPE, region TR; the importer owns the rows with an id starting tr:).

-- A dish is a source of generic foods beside Foundation, SR Legacy and Survey, and a dataset of its own (an FDC or Open Food
-- Facts import never touches it). Its English names, searched but not shown.
alter table nutrition.food
    drop constraint food_source_check;
alter table nutrition.food
    add constraint food_source_check check (source in ('FOUNDATION', 'SR_LEGACY', 'FNDDS', 'BRANDED', 'RECIPE'));
alter table nutrition.food
    drop constraint food_dataset_check;
alter table nutrition.food
    add constraint food_dataset_check check (dataset in ('FDC', 'OFF', 'RECIPE'));
alter table nutrition.food
    add column aliases text;

-- The dishes file recorded as the other imports are (release = its version; foods = dishes written, skipped = dishes left out).
alter table nutrition.food_import
    drop constraint food_import_dataset_check;
alter table nutrition.food_import
    add constraint food_import_dataset_check check (dataset in ('FOUNDATION', 'SR_LEGACY', 'FNDDS', 'BRANDED', 'RECIPE') or dataset ~ '^OFF(_[A-Z]{2})?$');

-- What the name search matches (V52), now with every Turkish letter as its plain one (ı İ ş ğ ç ö ü as i s g c o u, then lower
-- case) and the dish's English names: mercimek corbasi finds Mercimek çorbası. The code folds a query the same way
-- (FoodSearchTerms). The column is rebuilt with its trigram index.
alter table nutrition.food
    drop column search_text;
alter table nutrition.food
    add column search_text text generated always as (
        lower(translate(name || ' ' || coalesce(brand, '') || ' ' || coalesce(aliases, ''), 'ıİşŞğĞçÇöÖüÜ', 'iisSgGcCoOuU'))) stored;
create index food_search_trgm on nutrition.food using gin (search_text gin_trgm_ops);

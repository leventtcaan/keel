-- Where a food came from (K-1042, ADR-088): FDC (USDA FoodData Central, ADR-008) or OFF (the Open Food Facts Turkey subset, ODbL),
-- for attribution and so that each import replaces only its own rows. Every food there is today came from FDC.
alter table nutrition.food
    add column dataset text not null default 'FDC' check (dataset in ('FDC', 'OFF'));

-- The release record (V15) holds the Open Food Facts file too: one row, the file's date and hash and how many products came in or were skipped.
alter table nutrition.food_import
    drop constraint food_import_dataset_check;
alter table nutrition.food_import
    add constraint food_import_dataset_check check (dataset in ('FOUNDATION', 'SR_LEGACY', 'OFF'));

-- Which FoodData Central release is in nutrition.food (K-226, ADR-008: USDA FDC, CC0): each dataset's release, the hash
-- of its food file, when it was imported and how many foods came in or were skipped (a value missing, never guessed).
-- The raw files stay out of the repository.
create table nutrition.food_import
(
    dataset     text                     not null check (dataset in ('FOUNDATION', 'SR_LEGACY')),
    release     text                     not null,
    sha256      text                     not null check (sha256 ~ '^[0-9a-f]{64}$'),
    imported_at timestamp with time zone not null,
    foods       int                      not null check (foods >= 0),
    skipped     int                      not null check (skipped >= 0),
    primary key (dataset, release)
);

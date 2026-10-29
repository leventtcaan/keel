-- The user's own foods and favorites (K-1063, ADR-090 Ek 3). An own food is a label's numbers typed in for a product the database
-- does not have; it is stored per 100 g (the server divides the serving's numbers by the serving's weight) and is seen only by its
-- account. A favorite is a star on a food, database or own. Both are health data as meals are: deleted with the account and when
-- the HEALTH_DATA consent is withdrawn. No foreign key to nutrition.food: a food reloaded from an import must not be blocked by a star,
-- and a food gone is left out of the list.
create table nutrition.own_food
(
    id            uuid primary key,
    account_id    uuid                     not null,
    name          text                     not null check (char_length(name) between 1 and 80),
    brand         text check (char_length(brand) between 1 and 80),
    gtin          text check (gtin ~ '^[0-9]{14}$'),
    serving_grams numeric(7, 2)            not null check (serving_grams > 0),
    kcal          numeric(7, 2)            not null check (kcal >= 0),
    protein_g     numeric(6, 2)            not null check (protein_g >= 0),
    carbs_g       numeric(6, 2)            not null check (carbs_g >= 0),
    fat_g         numeric(6, 2)            not null check (fat_g >= 0),
    created_at    timestamp with time zone not null
);
create index own_food_by_account on nutrition.own_food (account_id, created_at);
create index own_food_by_gtin on nutrition.own_food (account_id, gtin) where gtin is not null;

create table nutrition.food_favorite
(
    account_id uuid                     not null,
    food_id    text                     not null,
    created_at timestamp with time zone not null,
    primary key (account_id, food_id)
);
create index food_favorite_by_time on nutrition.food_favorite (account_id, created_at);

-- Recipe memory (K-413, ADR-034): a recipe is its name, how many portions it makes and its ingredients. No number is
-- kept: the ranges are estimated from the food database whenever the recipe is read or logged (U1). Health data, as
-- meals are: deleted with the account and when the HEALTH_DATA consent is withdrawn.
create table nutrition.recipe
(
    id         uuid primary key,
    account_id uuid                     not null,
    client_id  uuid                     not null,
    name       text                     not null check (char_length(name) between 1 and 80),
    portions   int                      not null check (portions between 1 and 50),
    created_at timestamp with time zone not null,
    unique (account_id, client_id)
);

-- The ingredients, in the order given; database foods only (no recipe in a recipe). No foreign key to nutrition.food:
-- a food reloaded from FDC must not be blocked by a recipe, and a missing food is refused when the recipe is estimated.
create table nutrition.recipe_item
(
    recipe_id  uuid          not null references nutrition.recipe (id) on delete cascade,
    account_id uuid          not null,
    seq        int           not null,
    food_id    text          not null check (food_id not like 'recipe:%'),
    quantity   numeric(9, 2) not null check (quantity > 0),
    unit       text          not null,
    certainty  text check (certainty in ('WEIGHED', 'ESTIMATED')),
    primary key (recipe_id, seq)
);

create index recipe_item_by_account on nutrition.recipe_item (account_id);

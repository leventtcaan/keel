-- Meals (K-209): what the user ate, stored with the ranges as they were estimated then (a later parameter or food row
-- does not rewrite history) and on the local day of the moment they were logged (a later trip does not move them).
-- Records the phone made are stored once per clientId (ADR-024). Health data: behind HEALTH_DATA consent (ADR-026).
create table nutrition.meal
(
    id         uuid primary key,
    account_id uuid                     not null,
    client_id  uuid                     not null,
    eaten_at   timestamp with time zone not null,
    day        date                     not null,
    slot       text                     not null check (slot in ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
    unique (account_id, client_id)
);
create index meal_by_day on nutrition.meal (account_id, day, eaten_at);

create table nutrition.meal_item
(
    meal_id      uuid          not null references nutrition.meal (id) on delete cascade,
    account_id   uuid          not null,
    seq          int           not null,
    food_id      text          not null,
    name         text          not null,
    quantity     numeric(9, 2) not null check (quantity > 0),
    unit         text          not null,
    certainty    text check (certainty in ('WEIGHED', 'ESTIMATED')),
    kcal_low     int           not null,
    kcal_high    int           not null,
    protein_low  int           not null,
    protein_high int           not null,
    carbs_low    int           not null,
    carbs_high   int           not null,
    fat_low      int           not null,
    fat_high     int           not null,
    check (kcal_low <= kcal_high and protein_low <= protein_high and carbs_low <= carbs_high and fat_low <= fat_high),
    primary key (meal_id, seq)
);

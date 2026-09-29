-- The profile (K-205): one row per account, replaced whole on every save (onboarding, settings). The engine's inputs
-- (sex, height, birth year, activity) and when the week turns for this user (check-in day, time zone). No foreign key
-- to identity (ADR-023).
create schema if not exists profile;

create table profile.profile
(
    account_id          uuid primary key,
    goal                text                     not null,
    sex                 text                     not null,
    height_cm           int                      not null check (height_cm between 100 and 250),
    birth_year          int                      not null,
    activity_level      text,
    program_choice      text                     not null,
    units               text                     not null,
    training_days       text[]                   not null,
    usual_training_time text,
    sessions_last_month text,
    check_in_day        text                     not null,
    time_zone           text                     not null,
    food_avoid          text[],
    budget_note         text,
    updated_at          timestamp with time zone not null
);

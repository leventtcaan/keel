-- Supersets and the user's own moves (K-424, ADR-035).
-- A superset is an id on its sets, made by the phone: the sets of moves done back to back carry the same one.
alter table training.workout_set add column superset_id uuid;

-- A move the catalog does not have, with what the engine needs of a move asked of the user (L3 §1 #10). A set names it by
-- custom:<id>. Training data (ADR-026): no consent; exported, and deleted with the account.
create table training.custom_exercise
(
    id         uuid primary key,
    account_id uuid                     not null,
    client_id  uuid                     not null,
    name       text                     not null check (char_length(name) between 1 and 60),
    kind       text                     not null check (kind in ('COMPOUND', 'ISOLATION')),
    load       text                     not null check (load in ('EXTERNAL', 'BODYWEIGHT', 'BODYWEIGHT_PLUS_EXTERNAL')),
    equipment  text                     not null check (equipment in ('BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'PLATE_LOADED', 'BODYWEIGHT')),
    unilateral boolean                  not null,
    created_at timestamp with time zone not null,
    -- As in the catalog: bodyweight equipment goes with a bodyweight load, and only with one.
    check ((equipment = 'BODYWEIGHT') = (load <> 'EXTERNAL')),
    unique (account_id, client_id)
);

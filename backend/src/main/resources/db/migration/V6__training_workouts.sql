-- Workouts and sets (K-210): a session and its sets as logged — load, reps, reps in reserve, set type, side. The move
-- is the catalog's id (data/exercises), whatever the plan said: a swap is just a set of another move. Records the phone
-- made are stored once per clientId (ADR-024). No foreign key to identity (ADR-023).
create schema if not exists training;

create table training.workout
(
    id             uuid primary key,
    account_id     uuid                     not null,
    client_id      uuid                     not null,
    started_at     timestamp with time zone not null,
    ended_at       timestamp with time zone check (ended_at >= started_at),
    program_day_id uuid,
    unique (account_id, client_id)
);
create index workout_by_time on training.workout (account_id, started_at);

create table training.workout_set
(
    id          uuid primary key,
    workout_id  uuid          not null references training.workout (id) on delete cascade,
    account_id  uuid          not null,
    client_id   uuid          not null,
    seq         bigint generated always as identity,
    exercise_id text          not null,
    set_type    text          not null check (set_type in ('WARM_UP', 'WORKING', 'DROP', 'FAILURE')),
    load_kg     numeric(6, 2) not null check (load_kg >= 0),
    reps        int           not null check (reps >= 0),
    rir         int check (rir >= 0),
    side        text check (side in ('BOTH', 'LEFT', 'RIGHT')),
    unique (account_id, client_id)
);
create index workout_set_by_workout on training.workout_set (workout_id, seq);

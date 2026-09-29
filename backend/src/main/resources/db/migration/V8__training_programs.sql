-- The program (K-211): one current program per account — generated from a template (data/programs) or the user's own —
-- as days of planned moves with their sets, rep range and RIR target. A new program replaces the old one (delete and
-- insert; workouts keep the day id they named, without a foreign key). No foreign key to identity (ADR-023).
create table training.program
(
    id         uuid primary key,
    account_id uuid                     not null unique,
    source     text                     not null check (source in ('GENERATED', 'OWN')),
    created_at timestamp with time zone not null
);

-- A generated day names itself by a copy key (programDays.<day>.name); a day of the user's own program by their text.
create table training.program_day
(
    id         uuid primary key,
    program_id uuid not null references training.program (id) on delete cascade,
    account_id uuid not null,
    seq        int  not null,
    name_key   text,
    name       text,
    weekday    text check (weekday in ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    check ((name_key is null) <> (name is null)),
    unique (program_id, seq)
);

create table training.planned_exercise
(
    id          uuid primary key,
    day_id      uuid not null references training.program_day (id) on delete cascade,
    account_id  uuid not null,
    seq         int  not null,
    exercise_id text not null,
    sets        int  not null check (sets >= 1),
    rep_min     int  not null check (rep_min >= 1),
    rep_max     int  not null check (rep_max > rep_min),
    target_rir  int  not null check (target_rir >= 0),
    unique (day_id, seq)
);

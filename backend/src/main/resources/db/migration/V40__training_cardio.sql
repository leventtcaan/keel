-- Cardio (K-959, ADR-074). The engine's default is not stored: it is worked out from the phase in force and the program's
-- days each time the program is read, so a new phase or a new program changes it. The user's own is stored (#4), one per
-- account and apart from the program, so neither a new program nor a new phase touches it: its length, and its sessions,
-- one a weekday at most, after the weights or on an off day (never before the weights, G2 K-35). None is cardio off.
create table training.cardio_plan
(
    account_id uuid primary key,
    minutes    int not null check (minutes >= 1)
);

create table training.cardio_plan_session
(
    account_id uuid not null references training.cardio_plan (account_id) on delete cascade,
    weekday    text not null check (weekday in ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    place      text not null check (place in ('AFTER_LIFT', 'OFF_DAY_LOW_INTENSITY')),
    primary key (account_id, weekday)
);

-- A cardio session done (#6), typed or read from an Apple Health workout, on the user's calendar day. Its clientId is
-- unique per account: sent again, it is stored once (ADR-024). The active energy only as an Apple Watch measured it,
-- read from Apple Health (#5): health data, behind the health data consent and cleared when it is withdrawn; the
-- session itself is training data and stays (ADR-007).
create table training.cardio_session
(
    id                 uuid primary key,
    account_id         uuid not null,
    client_id          uuid not null,
    day                date not null,
    minutes            int  not null check (minutes >= 1),
    source             text not null check (source in ('MANUAL', 'APPLE_HEALTH')),
    active_energy_kcal int check (active_energy_kcal >= 0),
    check (active_energy_kcal is null or source = 'APPLE_HEALTH'),
    unique (account_id, client_id)
);
create index cardio_session_by_day on training.cardio_session (account_id, day);

-- The engine's main time series (K-206, ADR-005): weigh-ins, waist, what the phone concluded from a progress photo (the
-- photo itself never leaves the phone, V1), and a day's activity from Apple Health. A record the phone made carries its
-- clientId, unique per account: sent again, it is stored once (ADR-024). Health data (V3): every row is behind the
-- health-data consent (ADR-026). No foreign key to identity (ADR-023).
create schema if not exists measurement;

create table measurement.weigh_in
(
    id          uuid primary key,
    account_id  uuid                     not null,
    client_id   uuid                     not null,
    measured_at timestamp with time zone not null,
    kg          numeric(6, 2)            not null check (kg > 0),
    source      text                     not null check (source in ('MANUAL', 'APPLE_HEALTH', 'IMPORT')),
    unique (account_id, client_id)
);
create index weigh_in_by_time on measurement.weigh_in (account_id, measured_at);

create table measurement.waist
(
    id          uuid primary key,
    account_id  uuid          not null,
    client_id   uuid          not null,
    measured_on date          not null,
    cm          numeric(5, 1) not null check (cm > 0),
    unique (account_id, client_id)
);
create index waist_by_day on measurement.waist (account_id, measured_on);

create table measurement.photo_check
(
    id         uuid primary key,
    account_id uuid not null,
    client_id  uuid not null,
    taken_on   date not null,
    look       text not null check (look in ('BETTER', 'SAME', 'WORSE')),
    unique (account_id, client_id)
);
create index photo_check_by_day on measurement.photo_check (account_id, taken_on);

create table measurement.activity_day
(
    account_id         uuid not null,
    day                date not null,
    steps              int check (steps >= 0),
    sleep_minutes      int check (sleep_minutes >= 0),
    active_energy_kcal int check (active_energy_kcal >= 0),
    primary key (account_id, day)
);

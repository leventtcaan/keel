-- The weekly call (K-212, ADR-003 §6): the plan the engine judges — its direction, when it and its phase began, the
-- daily target, whether the target is still the starting estimate being watched (K-114) — and every call kept with the
-- Snapshot it was made from and the hash of the parameters it read, so it can be made again and must come out the same.
-- The Snapshot leaves the cycle answer out (ADR-020 L-1). One call per account and check-in week; a clientId is stored
-- once (ADR-024).
create schema if not exists decision;

create table decision.plan
(
    account_id            uuid primary key,
    phase                 text    not null check (phase in ('CUT', 'BULK')),
    phase_start           date    not null,
    plan_start            date    not null,
    target_kcal           int check (target_kcal > 0),
    observing_maintenance boolean not null,
    check (phase_start <= plan_start)
);

create table decision.weekly_call
(
    id              uuid primary key,
    account_id      uuid                     not null,
    client_id       uuid                     not null,
    week_of         date                     not null,
    made_on         date                     not null,
    decided_at      timestamp with time zone not null,
    parameters_hash text                     not null,
    snapshot        jsonb                    not null,
    decision        jsonb                    not null,
    application     text                     not null check (application in ('NOT_NEEDED', 'PENDING', 'APPLIED', 'UNDONE')),
    unique (account_id, client_id),
    unique (account_id, week_of)
);
create index weekly_call_by_time on decision.weekly_call (account_id, decided_at desc, id desc);

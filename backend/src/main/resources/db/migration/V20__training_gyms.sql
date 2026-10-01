-- The user's gyms (K-414, ADR-032): the equipment the next session's load is rounded to. Stored under the id the phone
-- made, replaced whole; at most one is the gym in use. Plates are sizes (each in enough pairs), dumbbells every one on
-- the rack, a machine a catalog move with its own stack step. No foreign key to identity (ADR-023).
create table training.gym
(
    id            uuid primary key,
    account_id    uuid          not null,
    name          text          not null,
    current       boolean       not null,
    bar_kg        numeric(6, 2) check (bar_kg > 0),
    stack_step_kg numeric(6, 2) check (stack_step_kg > 0)
);
create index gym_by_account on training.gym (account_id);
create unique index gym_one_current on training.gym (account_id) where current;

create table training.gym_weight
(
    gym_id     uuid          not null references training.gym (id) on delete cascade,
    account_id uuid          not null,
    kind       text          not null check (kind in ('PLATE', 'DUMBBELL')),
    kg         numeric(6, 2) not null check (kg > 0),
    primary key (gym_id, kind, kg)
);
create index gym_weight_by_account on training.gym_weight (account_id);

create table training.gym_machine
(
    gym_id      uuid          not null references training.gym (id) on delete cascade,
    account_id  uuid          not null,
    exercise_id text          not null,
    step_kg     numeric(6, 2) not null check (step_kg > 0),
    primary key (gym_id, exercise_id)
);
create index gym_machine_by_account on training.gym_machine (account_id);

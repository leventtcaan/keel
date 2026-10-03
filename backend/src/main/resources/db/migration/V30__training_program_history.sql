-- K-535 (ADR-045 #79): every program the account has had, by the sessions a week it asked (one a program day) and from
-- when, so a week gone by is judged by the program it had, not today's (U7). A row is added each time the program is
-- replaced; none is changed. An existing program starts its history at the time it was made: what came before it is
-- not known, and those weeks keep the profile's training days.
create table training.program_history
(
    id                uuid primary key,
    account_id        uuid                     not null,
    sessions_per_week int                      not null check (sessions_per_week >= 0),
    effective_from    timestamp with time zone not null
);
create index program_history_by_time on training.program_history (account_id, effective_from);

insert into training.program_history (id, account_id, sessions_per_week, effective_from)
select gen_random_uuid(), p.account_id, (select count(*) from training.program_day d where d.program_id = p.id), p.created_at
from training.program p;

-- The deload ladder's calls on the program (K-217, K-110): hold the load, a lighter week, a week off, each with its days.
-- One row per applied call (the decision's call id); undoing the call deletes it. A hold has no last day of its own: the
-- next rung ends it and is recorded (ended_by), so undoing that rung opens the hold again.
create table training.program_change
(
    id          uuid primary key,
    account_id  uuid not null,
    call_id     uuid not null,
    kind        text not null check (kind in ('HOLD_LOAD', 'LIGHTER_WEEK', 'REST_WEEK')),
    starts_on   date not null,
    ends_on     date check (ends_on >= starts_on - 1),
    sets_factor numeric(3, 2) check (sets_factor > 0 and sets_factor <= 1),
    ended_by    uuid,
    check ((ended_by is null) or (kind = 'HOLD_LOAD' and ends_on is not null)),
    check ((kind = 'LIGHTER_WEEK') = (sets_factor is not null)),
    check ((kind = 'HOLD_LOAD') or (ends_on is not null)),
    unique (account_id, call_id)
);
create index program_change_by_day on training.program_change (account_id, starts_on);

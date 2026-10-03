-- K-508 (ADR-004, ADR-012): what an account used of a daily quota, on the user's own day. A count, no content: which
-- use (a coach message, a photo analysis), how many that day. Deleted with the account; exported to the user.
create schema if not exists subscription;

create table subscription.daily_use
(
    account_id uuid    not null,
    day        date    not null,
    use        text    not null check (use in ('COACH_MESSAGE', 'PHOTO_ANALYSIS')),
    used       integer not null check (used >= 0),
    primary key (account_id, day, use)
);

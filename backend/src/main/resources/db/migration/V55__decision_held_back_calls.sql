-- Logging free, the call paid (ADR-091 Ek 1, K-1201): a weekly call made on a read decision window is a full call and counts
-- against the free allowance; one made past it for an account without the subscription is kept but held back — not applied,
-- shown as its week only — until the account subscribes. Rows made before this are neither (false).
alter table decision.weekly_call
    add column full_call  boolean not null default false,
    add column held_back  boolean not null default false,
    add constraint weekly_call_held_back_is_full_check check (not held_back or full_call);

create index weekly_call_held_back_idx on decision.weekly_call (account_id) where held_back;

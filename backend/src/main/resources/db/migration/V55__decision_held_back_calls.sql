-- Logging free, the call paid (ADR-091 Ek 1, K-1201): a full weekly call made past the free allowance for an account without the
-- subscription is kept but held back: not applied, shown as its week only, until the account subscribes. Rows made before this are not held.
alter table decision.weekly_call
    add column held_back boolean not null default false;

create index weekly_call_held_back_idx on decision.weekly_call (account_id) where held_back;

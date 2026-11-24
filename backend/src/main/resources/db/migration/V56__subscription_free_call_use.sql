-- The free full calls an account has spent (ADR-091 Ek 1, K-1201). Not health data: a count, kept with the subscription so that
-- wiping the calls (withdrawing the health consent) does not renew the free allowance; deleted only with the account.
create table subscription.free_call_use
(
    account_id uuid primary key,
    used       integer not null check (used >= 0)
);

-- An account that has used a phone that shows locked calls (ADR-091 Ek 1, K-1201): the lock is then on for it whatever a later
-- request says, so leaving the header off does not get the free call back. Not health data; deleted with the account.
create table subscription.locked_calls_client
(
    account_id uuid primary key,
    since      timestamptz not null
);

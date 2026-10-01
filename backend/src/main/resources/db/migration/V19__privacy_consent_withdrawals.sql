-- Consent withdrawals awaiting their second pass (K-231, ADR-028 #21). Withdrawing a consent deletes the data it covered
-- in the withdrawal's own transaction; a few minutes later the sweep deletes again — for a write that was already past
-- the consent check when the withdrawal committed — unless the consent was given again by then, and removes the row.
-- Only which account withdrew which consent and when: no health data. Not called account_id, as privacy.deletion.
create table privacy.consent_withdrawal
(
    withdrawn_account_id uuid                     not null,
    kind                 text                     not null,
    withdrawn_at         timestamp with time zone not null,
    primary key (withdrawn_account_id, kind)
);
create index consent_withdrawal_by_time on privacy.consent_withdrawal (withdrawn_at);

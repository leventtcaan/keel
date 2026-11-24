-- The free introductory questions an account has asked the coach (ADR-092 #7): a count, no content. Kept with the subscription, as
-- subscription.free_call_use is, and not with the conversation: clearing it or withdrawing a consent must not give the allowance
-- back; deleted only with the account.
create table subscription.coach_trial_use
(
    account_id uuid primary key,
    used       integer not null check (used >= 0)
);

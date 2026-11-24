-- What the coach's language model has cost for one account in a month (ADR-092 #4): money only, no text. It keeps one account from
-- using the whole month's budget. Kept with the subscription, as the other counts are; deleted with the account.
create table subscription.coach_account_spend
(
    account_id uuid           not null,
    month      date           not null,
    cost_usd   numeric(14, 6) not null check (cost_usd >= 0),
    primary key (account_id, month)
);

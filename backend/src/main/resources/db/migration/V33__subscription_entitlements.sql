-- K-701 (ADR-012, ADR-056): an account's subscription as RevenueCat's webhook events say it is. Access is read from
-- access_until alone; the status says what kind of state it is; last_event_at is the moment of the event it comes from
-- (an older event never takes it back). No price, country or store data. Deleted with the account; exported to the user.
create table subscription.subscription
(
    account_id    uuid        primary key,
    status        text        not null check (status in ('TRIAL', 'ACTIVE', 'CANCELLED', 'BILLING_ISSUE', 'PAUSED', 'EXPIRED', 'REFUNDED')),
    access_until  timestamptz not null,
    last_event_at timestamptz not null
);

-- Every event that changed, or was weighed against, an account's state: RevenueCat may send one twice (same id), and a
-- second one is not applied again. A TRANSFER touches several accounts, so the key is the event and the account.
create table subscription.webhook_event
(
    event_id   text        not null,
    account_id uuid        not null,
    type       text        not null,
    event_at   timestamptz not null,
    primary key (event_id, account_id)
);

create index webhook_event_account_event_at on subscription.webhook_event (account_id, event_at);

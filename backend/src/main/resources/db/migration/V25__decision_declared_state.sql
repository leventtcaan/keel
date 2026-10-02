-- K-516 (ADR-038): what life brought, as the user declared it — on their calendar, first and last day included; an open
-- state has no last day. Sickness and pain are health data (GDPR Art. 9): the table is the health data consent's, deleted
-- with it and with the account. Kept after it ends: past weeks are paused by it.
create table decision.declared_state
(
    id         uuid primary key,
    account_id uuid                     not null,
    kind       text                     not null check (kind in ('TRAVELING', 'SICK', 'PAIN', 'BUSY', 'NEW_GYM')),
    starts_on  date                     not null,
    ends_on    date check (ends_on >= starts_on),
    created_at timestamp with time zone not null
);

create index declared_state_by_account on decision.declared_state (account_id, starts_on);

-- Consents (K-204, ADR-007): every grant and withdrawal is a row, never updated or deleted while the account exists —
-- the evidence of what the user agreed to, in which text, and when (GDPR Art. 7(1)). The current state is the latest
-- row per account and kind — by write order (seq), never by wall-clock time, which can step back. No foreign key to
-- identity (ADR-023): the account id is a value.
create schema if not exists consent;

create table consent.consent_event
(
    id           uuid primary key,
    seq          bigint generated always as identity,
    account_id   uuid                     not null,
    kind         text                     not null check (kind in ('HEALTH_DATA', 'APPLE_HEALTH', 'THIRD_PARTY_AI')),
    action       text                     not null check (action in ('GRANTED', 'WITHDRAWN')),
    text_version text                     not null,
    provider     text,
    data_types   text[],
    occurred_at  timestamp with time zone not null
);
create index consent_event_latest on consent.consent_event (account_id, kind, seq desc);

-- The reference look the user picks as closest to their own (K-224, ADR-027 #11, Ö-4): a level, never a percent — the
-- engine turns it into its internal estimate (U4). One per client id (ADR-024).
create table measurement.body_look
(
    id         uuid primary key,
    account_id uuid not null,
    client_id  uuid not null,
    taken_on   date not null,
    level      int  not null check (level >= 1),
    unique (account_id, client_id)
);
create index body_look_by_day on measurement.body_look (account_id, taken_on);

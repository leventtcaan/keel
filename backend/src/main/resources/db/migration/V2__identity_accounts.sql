-- Accounts and sessions (K-203, ADR-011, ADR-023). An account is known only by Apple's stable user id for our team
-- (the identity token's sub); no name, no email is kept (data minimisation). Refresh tokens are stored as SHA-256
-- hashes only: a database copy cannot be used to sign in. A family is one sign-in's chain of rotated tokens.
create schema if not exists identity;

create table identity.account
(
    id            uuid primary key,
    apple_subject text                     not null unique,
    created_at    timestamp with time zone not null
);

create table identity.refresh_token
(
    id         uuid primary key,
    account_id uuid                     not null references identity.account (id) on delete cascade,
    family_id  uuid                     not null,
    token_hash text                     not null unique,
    expires_at timestamp with time zone not null,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone not null
);
create index refresh_token_by_account on identity.refresh_token (account_id);
create index refresh_token_by_family on identity.refresh_token (family_id);

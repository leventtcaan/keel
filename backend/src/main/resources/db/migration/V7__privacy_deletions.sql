-- Account deletions awaiting their second pass (K-214, V6). DELETE /v1/account writes one row in its own transaction;
-- a few minutes later the sweep publishes the deletion again — for a write that was already past the token check when
-- the deletion committed — and removes the row. Only the id of an account that no longer exists and when it was asked;
-- the column is not called account_id because this row is the deletion itself, not the account's data.
create schema if not exists privacy;

create table privacy.deletion
(
    deleted_account_id uuid primary key,
    requested_at       timestamp with time zone not null
);
create index deletion_by_time on privacy.deletion (requested_at);

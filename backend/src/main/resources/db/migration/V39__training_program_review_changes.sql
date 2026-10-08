-- K-956 (ADR-073 #3-#4): the program review's changes applied to the account's program, in order (seq), each with the
-- suggestion as it was shown and the program before and after it (days, moves and their targets, as JSON): the log an undo
-- reads back. An undone change stays, with when it was undone. A program replaced whole starts with none.
create table training.program_review_change
(
    id             uuid primary key,
    account_id     uuid                     not null,
    seq            int                      not null check (seq >= 1),
    suggestion     jsonb                    not null,
    program_before jsonb                    not null,
    program_after  jsonb                    not null,
    applied_at     timestamp with time zone not null,
    undone_at      timestamp with time zone check (undone_at >= applied_at),
    unique (account_id, seq)
);

-- The coach's conversation and what the user asked it to remember (ADR-092 #3): the user's words and the coach's checked
-- replies, kept coach_history_days (data/parameters/coach.yaml); memory items only through the user's own remember-this
-- (an item is the user's sentence, nothing the model wrote). Health-adjacent, so both go with the account, with the AI
-- consent and with the health data consent, and are in the export. No foreign key to another module's table (ADR-023).
create table coach.message
(
    id          uuid primary key,
    seq         bigint generated always as identity,
    account_id  uuid        not null,
    role        text        not null check (role in ('USER', 'COACH')),
    spoken      text,
    copy_key    text,
    topic       text,
    decision_id uuid,
    created_at  timestamptz not null,
    check (spoken is not null or copy_key is not null)
);
create index coach_message_account_time on coach.message (account_id, created_at);
create index coach_message_time on coach.message (created_at);

create table coach.memory_item
(
    id         uuid primary key,
    account_id uuid        not null,
    sentence   text        not null,
    created_at timestamptz not null
);
create index coach_memory_item_account_time on coach.memory_item (account_id, created_at);

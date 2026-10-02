-- K-512 (ADR-039): the answers to the coach's own questions, each once per occurrence (rule + key). Health data (hunger,
-- why sessions were missed): the health data consent's, deleted with it and with the account.
create table decision.prompt_answer
(
    id          uuid primary key,
    account_id  uuid                     not null,
    rule        text                     not null,
    key         text                     not null,
    choice      text                     not null,
    answered_at timestamp with time zone not null,
    unique (account_id, rule, key)
);

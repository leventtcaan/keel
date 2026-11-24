-- What the language model has cost, by month (ADR-092 #4): one row a month, the whole server's — no account, no text, no health
-- data, so it is kept (not deleted with an account) and the monthly budget (data/parameters/coach.yaml) reads it.
create schema if not exists coach;

create table coach.model_spend
(
    month         date primary key,
    calls         integer        not null check (calls >= 0),
    input_tokens  bigint         not null check (input_tokens >= 0),
    output_tokens bigint         not null check (output_tokens >= 0),
    cost_usd      numeric(14, 6) not null check (cost_usd >= 0)
);

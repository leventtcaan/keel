-- A question the server stopped before it could be sent (a health word, an order: ADR-092 #2) stays in the user's own conversation and
-- export, but is marked, and is never part of what goes to the model with a later question.
alter table coach.message add column blocked boolean not null default false;

-- Spring Modulith's event publication registry (K-202, ADR-023): an event is kept here until every listener in the
-- other modules has handled it, so a module event (account deletion, K-214) survives a restart. Copied from
-- spring-modulith-events-jdbc 2.1.1, schemas/v2/schema-postgresql.sql; Modulith does not create it itself
-- (spring.modulith.events.jdbc.schema-initialization.enabled is false). The archive table is left out: completed
-- publications are updated in place (spring.modulith.events.completion-mode: update, the default).
create table if not exists event_publication
(
    id                     uuid                     not null,
    listener_id            text                     not null,
    event_type             text                     not null,
    serialized_event       text                     not null,
    publication_date       timestamp with time zone not null,
    completion_date        timestamp with time zone,
    status                 text,
    completion_attempts    int,
    last_resubmission_date timestamp with time zone,
    primary key (id)
);
create index if not exists event_publication_serialized_event_hash_idx on event_publication using hash (serialized_event);
create index if not exists event_publication_by_completion_date_idx on event_publication (completion_date);

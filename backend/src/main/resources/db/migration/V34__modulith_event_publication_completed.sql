-- Completed publications are deleted from now on (spring.modulith.events.completion-mode: delete, K-802); the ones the
-- update mode kept until now go too. Each held a deleted account's random id (V1).
delete from event_publication where completion_date is not null;

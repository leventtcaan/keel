-- K-227 (G7 K-102): a plan on a mini cut keeps the day it ends; the engine turns the plan back to building on that day.
-- Null on any other plan, and on every plan kept before this.
alter table decision.plan add column mini_cut_until date;

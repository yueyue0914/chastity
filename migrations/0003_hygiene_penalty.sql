-- Hygiene overtime penalty: fixed add-back or overtime × multiplier.

alter table locks
  add column if not exists hygiene_penalty_mode text not null default 'multiplier';

alter table locks
  add column if not exists hygiene_penalty_fixed_ms bigint not null default 900000;

alter table locks
  add column if not exists hygiene_penalty_multiplier double precision not null default 1;

-- Emergency limits, end-phrase, append-only penalty history.

alter table locks
  add column if not exists emergency_limit_mode text not null default 'cooldown_24h';

alter table locks
  add column if not exists emergency_penalty_ms bigint not null default 86400000;

alter table locks
  add column if not exists emergency_last_used_at timestamptz;

alter table locks
  add column if not exists emergency_use_count integer not null default 0;

alter table locks
  add column if not exists end_phrase text not null default '';

create table if not exists lock_events (
  id text primary key,
  lock_id text not null,
  wearer_token text not null,
  kind text not null,
  amount_ms bigint not null default 0,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists lock_events_lock_id_idx on lock_events (lock_id);
create index if not exists lock_events_wearer_token_idx on lock_events (wearer_token);
create index if not exists lock_events_created_at_idx on lock_events (created_at desc);

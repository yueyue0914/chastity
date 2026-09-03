-- Keyholder controls, tasks, photo verify, obedience, integrity.

alter table locks add column if not exists frozen_at timestamptz;
alter table locks add column if not exists min_lock_ms bigint not null default 0;
alter table locks add column if not exists photo_request_active boolean not null default false;
alter table locks add column if not exists photo_submitted_at timestamptz;
alter table locks add column if not exists photo_thumb text;
alter table locks add column if not exists obedience_enabled boolean not null default true;
alter table locks add column if not exists obedience_interval_ms bigint not null default 1800000;
alter table locks add column if not exists obedience_phrase text not null default '服从主人';
alter table locks add column if not exists last_client_now bigint;
alter table locks add column if not exists integrity_penalty_count integer not null default 0;
alter table locks add column if not exists session_nonce text not null default '';

create table if not exists lock_tasks (
  id text primary key,
  lock_id text not null,
  title text not null,
  reward_type text not null,
  reward_ms bigint not null default 0,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists lock_tasks_lock_id_idx on lock_tasks (lock_id);

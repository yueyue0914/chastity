-- Shared lock sessions for wearer + keyholder remote control.
-- Access is gated by unguessable tokens (not world-browsable listings).

create table if not exists locks (
  id text primary key,
  wearer_token text not null unique,
  keyholder_token text not null unique,
  started_at timestamptz not null,
  duration_ms bigint not null,
  ends_at timestamptz not null,
  allow_emergency boolean not null default true,
  allow_hygiene boolean not null default false,
  hygiene_max_ms bigint not null default 900000,
  notify_expiry boolean not null default true,
  hygiene_started_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locks_status_check check (status in ('active', 'ended', 'emergency_ended'))
);

create index if not exists locks_wearer_token_idx on locks (wearer_token);
create index if not exists locks_keyholder_token_idx on locks (keyholder_token);
create index if not exists locks_status_idx on locks (status);

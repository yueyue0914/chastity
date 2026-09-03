-- User profiles (role preference) + lock ownership by account.

create table if not exists user_profiles (
  user_id text primary key,
  display_name text not null default '',
  role text not null default 'both',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table locks add column if not exists wearer_user_id text;
alter table locks add column if not exists keyholder_user_id text;

create index if not exists locks_wearer_user_id_idx on locks (wearer_user_id);
create index if not exists locks_keyholder_user_id_idx on locks (keyholder_user_id);

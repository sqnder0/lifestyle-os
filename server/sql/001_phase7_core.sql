-- Phase 7 core schema for PostgreSQL-backed Lifestyle OS

create extension if not exists pgcrypto;

create table if not exists auth_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth_users(id) on delete cascade,
  first_name text,
  username text,
  settings jsonb not null default '{}'::jsonb,
  google_email text,
  google_access_token text,
  google_refresh_token text,
  google_token_expires_at timestamptz,
  google_last_synced_at timestamptz,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles
  add column if not exists google_access_token text,
  add column if not exists google_refresh_token text,
  add column if not exists onboarded boolean default false,
  add column if not exists first_name text;

create table if not exists capture_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'processed'))
);
create index if not exists capture_inbox_user_created_idx on capture_inbox(user_id, created_at desc);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  title text not null,
  status text not null default 'Active' check (status in ('Active', 'Paused', 'Completed', 'Archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_status_idx on projects(user_id, status);

create table if not exists metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  date date not null,
  energy int,
  sleep numeric(4,1),
  mood int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);
create index if not exists metrics_user_date_idx on metrics(user_id, date desc);

create table if not exists cycle_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  week_type char(1) not null check (week_type in ('A', 'B', 'C')),
  day_of_week text not null check (day_of_week in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')),
  workout_id text,
  meal_protocol_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_type, day_of_week)
);
create index if not exists cycle_templates_user_week_idx on cycle_templates(user_id, week_type);

create table if not exists synced_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  google_event_id text not null,
  calendar_id text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  summary text not null default '',
  raw_rrule text,
  source_status text,
  created_by_email text,
  attendee_emails jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, google_event_id)
);
create index if not exists synced_events_user_start_idx on synced_events(user_id, start_time asc);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  name text not null,
  emoji text,
  color text,
  logs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists habits_user_created_idx on habits(user_id, created_at asc);

create table if not exists principles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth_users(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'General',
  principle_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists principles_user_order_idx on principles(user_id, principle_order asc, created_at asc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at before update on profiles
for each row execute procedure set_updated_at();

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects
for each row execute procedure set_updated_at();

drop trigger if exists metrics_set_updated_at on metrics;
create trigger metrics_set_updated_at before update on metrics
for each row execute procedure set_updated_at();

drop trigger if exists cycle_templates_set_updated_at on cycle_templates;
create trigger cycle_templates_set_updated_at before update on cycle_templates
for each row execute procedure set_updated_at();

drop trigger if exists synced_events_set_updated_at on synced_events;
create trigger synced_events_set_updated_at before update on synced_events
for each row execute procedure set_updated_at();

drop trigger if exists habits_set_updated_at on habits;
create trigger habits_set_updated_at before update on habits
for each row execute procedure set_updated_at();

drop trigger if exists principles_set_updated_at on principles;
create trigger principles_set_updated_at before update on principles
for each row execute procedure set_updated_at();

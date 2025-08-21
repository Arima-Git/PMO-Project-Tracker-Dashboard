-- Supabase/Postgres schema for PMO Project Tracker
-- Run this in Supabase SQL Editor

-- Projects table
create table if not exists public.projects (
	id bigserial primary key,
	customer_name text,
	project_name text not null,
	account_manager text,
	status text,
	current_phase text,
	priority text,
	end_month text,
	status2 text,
	pmo_comments text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_projects_project_name on public.projects (project_name);
create index if not exists idx_projects_status on public.projects (status);
create index if not exists idx_projects_status2 on public.projects (status2);
create index if not exists idx_projects_end_month on public.projects (end_month);
create index if not exists idx_projects_account_manager on public.projects (account_manager);
create index if not exists idx_projects_priority on public.projects (priority);
create index if not exists idx_projects_created_at on public.projects (created_at);
create index if not exists idx_projects_updated_at on public.projects (updated_at);

-- Simple projects table
create table if not exists public.simple_projects (
	id bigserial primary key,
	project text not null,
	month text,
	status text,
	comments text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_simple_projects_project on public.simple_projects (project);
create index if not exists idx_simple_projects_status on public.simple_projects (status);
create index if not exists idx_simple_projects_month on public.simple_projects (month);
create index if not exists idx_simple_projects_created_at on public.simple_projects (created_at);
create index if not exists idx_simple_projects_updated_at on public.simple_projects (updated_at);

-- PMO comments table
create table if not exists public.pmo_comments (
	id bigserial primary key,
	project_id bigint not null references public.projects(id) on delete cascade,
	comment_text text not null,
	added_by text not null,
	added_at timestamptz not null default now()
);

create index if not exists idx_pmo_comments_project_id on public.pmo_comments (project_id);
create index if not exists idx_pmo_comments_added_at on public.pmo_comments (added_at);
create index if not exists idx_pmo_comments_added_by on public.pmo_comments (added_by);

-- Dropdown options
create table if not exists public.dropdown_options (
	id bigserial primary key,
	type text not null,
	value text not null,
	description text,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint dropdown_options_type_value_uniq unique (type, value)
);

create index if not exists idx_dropdown_options_type on public.dropdown_options (type);
create index if not exists idx_dropdown_options_value on public.dropdown_options (value);
create index if not exists idx_dropdown_options_active on public.dropdown_options (is_active);

-- Admin activity log
create table if not exists public.admin_activity_log (
	id bigserial primary key,
	action text not null,
	details text,
	user_id text,
	ip_address text,
	timestamp timestamptz not null default now()
);

create index if not exists idx_admin_activity_action on public.admin_activity_log (action);
create index if not exists idx_admin_activity_user_id on public.admin_activity_log (user_id);
create index if not exists idx_admin_activity_timestamp on public.admin_activity_log (timestamp);

-- System settings
create table if not exists public.system_settings (
	id bigserial primary key,
	setting_key text not null unique,
	setting_value text,
	updated_at timestamptz not null default now()
);

create index if not exists idx_system_settings_key on public.system_settings (setting_key);

-- Users
create table if not exists public.users (
	id bigserial primary key,
	username text not null unique,
	email text not null unique,
	password_hash text not null,
	role text not null default 'viewer',
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint users_role_check check (role in ('admin','manager','viewer'))
);

create index if not exists idx_users_username on public.users (username);
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_role on public.users (role);

-- Optional: triggers to auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
	new.updated_at = now();
	return new;
end;
$$ language plpgsql;

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_simple_projects_updated_at
before update on public.simple_projects
for each row execute function public.set_updated_at();

create trigger set_dropdown_options_updated_at
before update on public.dropdown_options
for each row execute function public.set_updated_at();

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at(); 
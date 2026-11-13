-- 貼到 Supabase SQL Editor 執行。第一次設定請先備份重要資料。
create extension if not exists pgcrypto;
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  source text not null default '' check (char_length(source) <= 100),
  notes text not null default '' check (char_length(notes) <= 3000),
  due text not null default '',
  priority text not null default 'normal' check(priority in ('urgent','high','normal','low')),
  status text not null default 'todo' check(status in ('todo','doing','waiting','reply','done')),
  updated bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_updated_idx on public.tasks(user_id, updated desc);
alter table public.tasks enable row level security;
revoke all on public.tasks from anon, authenticated;
grant select,insert,update,delete on public.tasks to authenticated;
drop policy if exists tasks_select_own on public.tasks;
drop policy if exists tasks_insert_own on public.tasks;
drop policy if exists tasks_update_own on public.tasks;
drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_select_own on public.tasks for select to authenticated using (user_id = (select auth.uid()));
create policy tasks_insert_own on public.tasks for insert to authenticated with check (user_id = (select auth.uid()));
create policy tasks_update_own on public.tasks for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tasks_delete_own on public.tasks for delete to authenticated using (user_id = (select auth.uid()));

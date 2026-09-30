-- 在 Supabase 的 SQL Editor 貼上執行
create table groups (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,         -- 同事用的分享代碼
  admin_token text unique not null,  -- 團主後台的私密代碼
  name text not null,
  deadline timestamptz,
  created_at timestamptz default now()
);
create table items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  name text not null,
  price int not null,
  sort int default 0
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  person text not null,
  note text default '',
  qty jsonb not null default '{}',   -- { "品項id": 數量 }
  paid boolean default false,
  updated_at timestamptz default now(),
  unique (group_id, person)          -- 同名再送出 = 修改自己的單
);
alter table groups enable row level security;
alter table items enable row level security;
alter table orders enable row level security;
create policy "all" on groups for all using (true) with check (true);
create policy "all" on items for all using (true) with check (true);
create policy "all" on orders for all using (true) with check (true);

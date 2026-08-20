-- 在 Supabase Dashboard → SQL Editor 執行一次（可重複執行）。
-- 一筆審核結果：三個法規必填 + 送出當下的全部欄位快照（fields jsonb）。

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  document_id text,
  filename text not null,
  product_name text not null,
  expiry_date text not null,
  vendor_name text not null,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 舊表沒有 fields 時補上；已存在就跳過
alter table public.reviews
  add column if not exists fields jsonb not null default '[]'::jsonb;

alter table public.reviews enable row level security;

drop policy if exists "anon can insert reviews" on public.reviews;
drop policy if exists "anon can select reviews" on public.reviews;
drop policy if exists "anon can update reviews" on public.reviews;

create policy "anon can insert reviews"
  on public.reviews
  for insert
  to anon, authenticated
  with check (true);

create policy "anon can select reviews"
  on public.reviews
  for select
  to anon, authenticated
  using (true);

create policy "anon can update reviews"
  on public.reviews
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.reviews to anon, authenticated;

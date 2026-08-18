-- 在 Supabase Dashboard → SQL Editor 執行一次。
-- 一筆審核結果存三個法規必填：品名、有效日期、廠商名稱。

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  document_id text,
  filename text not null,
  product_name text not null,
  expiry_date text not null,
  vendor_name text not null,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "anon can insert reviews" on public.reviews;
drop policy if exists "anon can select reviews" on public.reviews;

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

grant select, insert on public.reviews to anon, authenticated;

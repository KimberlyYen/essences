-- 在 Supabase Dashboard → SQL Editor 執行一次。
-- 一筆審核結果存三個法規必填：品名、有效日期、廠商名稱。

-- 主表。id / created_at 由資料庫自己填。
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  document_id text,
  filename text not null,
  product_name text not null,
  expiry_date text not null,
  vendor_name text not null,
  created_at timestamptz not null default now()
);

-- 打開 RLS 之後，沒有 policy 就誰都讀寫不了
alter table public.reviews enable row level security;

-- 重複執行這份 SQL 時，先拿掉舊政策再重建
drop policy if exists "anon can insert reviews" on public.reviews;
drop policy if exists "anon can select reviews" on public.reviews;

-- 這個作業用瀏覽器 publishable key 直寫，所以開放 anon insert
create policy "anon can insert reviews"
  on public.reviews
  for insert
  to anon, authenticated
  with check (true);

-- 已儲存紀錄頁需要能 select
create policy "anon can select reviews"
  on public.reviews
  for select
  to anon, authenticated
  using (true);

grant select, insert on public.reviews to anon, authenticated;

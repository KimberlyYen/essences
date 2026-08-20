/**
 * 瀏覽器端 Supabase client。
 * 這個專案是 Vite，不是 Next.js，所以只用 createBrowserClient，沒有 server / middleware。
 * key 必須是 VITE_ 開頭，Vite 才會打進前端 bundle。
 */
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      '缺少 Supabase URL 或 key。本機放 web/.env.local；Vercel 請在 Project Settings → Environment Variables 加上 VITE_SUPABASE_URL 與 VITE_SUPABASE_PUBLISHABLE_KEY（或 Dashboard 預設的 NEXT_PUBLIC_ 同名變數），存檔後要 Redeploy。',
    )
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}

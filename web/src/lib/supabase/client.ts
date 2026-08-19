/**
 * 瀏覽器端 Supabase client。
 * 這個專案是 Vite，不是 Next.js，所以只用 createBrowserClient，沒有 server / middleware。
 * key 必須是 VITE_ 開頭，Vite 才會打進前端 bundle。
 */
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}

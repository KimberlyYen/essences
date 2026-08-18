import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY')
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}

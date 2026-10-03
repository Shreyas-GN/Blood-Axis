import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';

if (typeof window !== 'undefined') {
  throw new Error('Supabase server client must only be used on the server side.')
}

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not defined. Server client will not bypass RLS.')
}

/**
 * Server-side Supabase client using Service Role Key.
 * DANGER: This bypasses Row Level Security (RLS) entirely.
 * Use strictly for server-side logic like webhooks, cron jobs, etc.
 */
export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! // fallback prevents hard crashes in local dev if not set immediately, though warn is issued
)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ||
  'https://qfclthshdqngpjixzjlz.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmY2x0aHNoZHFuZ3BqaXh6amx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDkyNzIsImV4cCI6MjA4NzU4NTI3Mn0.eauPhAsfm3sbnW6uj_opQPxBy6fN4szJIXpJV-tRq4g'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const supabaseProblem = (!SUPABASE_URL || !SUPABASE_ANON_KEY)
  ? 'Supabase URL or anon key missing. Check your environment variables.'
  : null

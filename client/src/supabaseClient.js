import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://swffwjjveghovalezabk.supabase.co'
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZmZ3amp2ZWdob3ZhbGV6YWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MzgzNTAsImV4cCI6MjA4NzMxNDM1MH0.CNqC6V41b1y8mVfiyww9JfImwdzT4BvycMhyDIgjN74"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jlsknoavpckqyjcxsomt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsc2tub2F2cGNrcXlqY3hzb210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzIxMjMsImV4cCI6MjA5MDY0ODEyM30.Gv_JuxMrV39VEkDs46kWi9rzvb-_vVNhHGEruYni_-0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

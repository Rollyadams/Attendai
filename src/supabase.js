import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zwxgyyebrxfljvxosnuu.supabase.co'
const supabaseAnonKey = 'sb_publishable_PJ7DK6Rq8hyqgxIFgCED9w_w1LYzeEf'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


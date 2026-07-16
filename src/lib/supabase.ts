import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing. Database operations will fail.");
}

// Create a single supabase client for interacting with your database using the service role key
// Service role key bypasses RLS, so this should ONLY be used on the server side.
export const getSupabase = () => createClient(supabaseUrl, supabaseKey);

import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Supabase credentials are now read from environment variables for security.
// The execution environment should provide SUPABASE_URL and SUPABASE_ANON_KEY.
// -----------------------------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Fallback to placeholder credentials if environment variables are not set.
// This allows the app to load, but Supabase features will fail until configured correctly.
const finalSupabaseUrl = supabaseUrl || 'https://garwqlsnbwzyubltbyit.supabase.co';
const finalSupabaseAnonKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcndxbHNuYnd6eXVibHRieWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTAzOTMsImV4cCI6MjA3ODk4NjM5M30.vbXcljSvlWoTDBeHd2lActodceFU-H27029Aw9R8KRw';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        "Supabase credentials are not configured in environment variables (SUPABASE_URL, SUPABASE_ANON_KEY). The app will load with placeholder values, but Supabase features will not work until they are provided."
    );
}

export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey);
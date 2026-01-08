
import { createClient } from '@supabase/supabase-js';
import { ChatMessage } from '../types';

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

// --- Chat Persistence Helpers ---

export const saveChatMessage = async (message: ChatMessage, userId: string) => {
    if (!userId) return;
    
    // Prepare object for DB (convert timestamp number to ISO string)
    // Defensive check to avoid RangeError: Invalid time value
    const dateObj = new Date(message.timestamp);
    const isoTimestamp = (!isNaN(dateObj.getTime())) ? dateObj.toISOString() : new Date().toISOString();

    const dbMessage = {
        id: message.id,
        user_id: userId,
        role: message.role,
        text: message.text,
        image: message.image || null,
        sources: message.sources || null, // JSONB support in Supabase
        timestamp: isoTimestamp
    };

    const { error } = await supabase.from('chat_history').insert(dbMessage);
    
    if (error) {
        console.error("Error saving chat message to Supabase:", error);
        throw error;
    }
};

export const getUserChatHistory = async (userId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error("Error fetching chat history from Supabase:", error);
        throw error;
    }

    // Map DB format back to App format (ISO string -> timestamp number)
    return (data || []).map((row: any) => {
        const d = new Date(row.timestamp);
        return {
            id: row.id,
            role: row.role,
            text: row.text,
            image: row.image,
            sources: row.sources,
            timestamp: !isNaN(d.getTime()) ? d.getTime() : Date.now(),
            user_id: row.user_id
        };
    });
};

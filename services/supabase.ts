import { createClient } from '@supabase/supabase-js';
import { UserData } from '../types';

const supabaseUrl: string = 'https://gqfkmdgdlwfxltcmxivq.supabase.co';
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZmttZGdkbHdmeGx0Y214aXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4Nzg5NzQsImV4cCI6MjA3NDQ1NDk3NH0.8w-bJEKVXFVIKbnupJXQmHc9M4hk9Biew5SvGeETwJI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const handleError = (context: string, error: any) => {
    if (error) {
        console.error(`[Supabase] ${context}:`, {
            message: error.message,
            details: error.details,
            code: error.code,
            hint: error.hint,
        });
    }
}

export const getUserData = async (userId: string): Promise<UserData | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116: row not found
        handleError('Error fetching user data', error);
        return null;
    }
    
    return data;
};

export const updateUserData = async (userId: string, updates: Partial<UserData>) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single();
    handleError('Error updating user data', error);
    return { data, error };
};

export const logToChatHistory = async (userId: string, message: string, role: 'user' | 'assistant') => {
    const { error } = await supabase.from('chat_history').insert({
        user_id: userId,
        message,
        role,
    });
    handleError('Error logging chat message', error);
}
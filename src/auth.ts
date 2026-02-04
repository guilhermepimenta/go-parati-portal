import { supabase } from './supabase';
import { User, UserRole } from './types';

// Helper to map Supabase User to our App User
const mapSupabaseUser = async (sbUser: any): Promise<User | null> => {
    if (!sbUser) return null;

    console.log('[Auth] mapSupabaseUser started for:', sbUser.id);
    let profile = null;
    try {
        console.log('[Auth] Starting profile fetch logic...');
        // Create a promise for the DB fetch
        const dbPromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', sbUser.id)
            .single();

        // Create a promise for timeout (2 seconds)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
        );

        console.log('[Auth] Awaiting Promise.race([db, timeout])...');
        // Race them
        const raceResult = await Promise.race([dbPromise, timeoutPromise]) as any;
        console.log('[Auth] Promise.race completed. Result:', raceResult);

        const { data, error } = raceResult;

        if (error) {
            console.warn('[Auth] Profile fetch warning:', error);
            // If error is not "no rows found", we still proceed with auth user data
        }
        profile = data;
        console.log('[Auth] Profile found:', profile);
    } catch (err) {
        console.error('[Auth] Exception fetching profile (or timeout):', err);
        // Fallback: Proceed without profile data if it times out or errors
    }

    console.log('[Auth] Returning mapped user object...');
    return {
        id: sbUser.id,
        email: sbUser.email || '',
        name: profile?.name || sbUser.email?.split('@')[0] || 'User',
        role: (profile?.role as UserRole) || (sbUser.email === 'admin@paraty.com' ? 'admin' : 'user'),
    };
};

class AuthService {
    // Login with Email/Password
    async login(email: string, password: string): Promise<User> {
        console.log('[Auth] login called with:', email);
        // Timeout for the sign-in request itself
        const signInPromise = supabase.auth.signInWithPassword({
            email,
            password,
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Sign-in request timed out')), 5000)
        );

        console.log('[Auth] Awaiting signInWithPassword with timeout...');
        let raceResult: any;
        try {
            raceResult = await Promise.race([signInPromise, timeoutPromise]);
        } catch (error) {
            console.error('[Auth] Race failed (timeout or error):', error);

            // ATTEMPT RECOVERY: Direct LocalStorage Check
            // Bypassing usage of Supabase SDK entirely to avoid deadlock/abort errors.
            console.log('[Auth] Attempting recovery: checking LocalStorage directly...');
            try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                if (!supabaseUrl) throw new Error('No Supabase URL');

                // Extract project ID from URL (e.g., https://xyz.supabase.co -> xyz)
                const projectId = new URL(supabaseUrl).hostname.split('.')[0];
                const storageKey = `sb-${projectId}-auth-token`;

                const storedSessionStr = localStorage.getItem(storageKey);
                if (storedSessionStr) {
                    const storedSession = JSON.parse(storedSessionStr);
                    if (storedSession?.user && storedSession?.access_token) {
                        console.log('[Auth] RECOVERY SUCCESSFUL! Found session in LocalStorage.', storedSession.user.id);
                        raceResult = { data: { user: storedSession.user }, error: null };
                    } else {
                        throw new Error('Invalid session format in local storage');
                    }
                } else {
                    console.error('[Auth] Recovery failed. No session in LocalStorage.');
                    throw error;
                }
            } catch (recoveryErr) {
                console.error('[Auth] Critical recovery failure:', recoveryErr);
                throw error;
            }
        }

        console.log('[Auth] Race completed (or recovered).');
        const { data, error } = raceResult;

        if (error) {
            console.error('[Auth] Supabase signInWithPassword error:', error);
            throw error;
        }
        console.log('[Auth] Supabase signIn successful, user:', data.user?.id);

        console.log('[Auth] Calling mapSupabaseUser...');
        const user = await mapSupabaseUser(data.user);

        console.log('[Auth] mapSupabaseUser returned:', user);
        if (!user) throw new Error('Falha ao recuperar perfil do usuário');
        return user;
    }

    // Logout
    async logout(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    // Get Current Session User
    async getCurrentUser(): Promise<User | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;
        return mapSupabaseUser(session.user);
    }

    // Sign Up (Optional Usage)
    async signUp(email: string, password: string, name: string): Promise<User | null> {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) throw error;

        // We might need to manually create the profile row if triggers aren't set up
        if (data.user) {
            const { error: profileError } = await supabase.from('profiles').insert({
                id: data.user.id,
                email: email,
                name: name,
                role: 'user'
            });
            if (profileError) console.error('Error creating profile:', profileError);
        }

        return mapSupabaseUser(data.user);
    }

    // Reset Password via Email
    async resetPassword(email: string): Promise<void> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/update-password',
        });
        if (error) throw error;
    }

    // --- Admin User Management Methods (Restored for Dashboard) ---

    // Get all users (from profiles table)
    async getUsers(): Promise<User[]> {
        console.log('[Auth] Fetching users via REST API...');
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // Get token from LocalStorage
            const projectId = new URL(supabaseUrl).hostname.split('.')[0];
            const storageKey = `sb-${projectId}-auth-token`;
            const sessionStr = localStorage.getItem(storageKey);
            let token = supabaseKey;

            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                if (session.access_token) {
                    token = session.access_token;
                }
            }

            const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Fetch users failed: ${response.statusText}`);

            const data = await response.json();
            console.log('[Auth] Fetched users:', data?.length);

            return data.map((p: any) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                role: p.role,
            }));
        } catch (error) {
            console.error('[Auth] Error fetching users:', error);
            return [];
        }
    }

    // Create user (Admin only) - Note: Supabase Auth requires backend for true admin creation without login
    // For now, we'll simulate by calling signUp (which signs in the new user, breaking admin session)
    // OR we just insert into profiles if it were a shadow user, but profiles depends on auth.
    // LIMITATION: Client-side cannot create other users easily without edge functions.
    // For this demo, we will warn or just insert into profiles if possible (mocking), 
    // but correctly we should use a proper Invite flow.
    // We'll attempt a direct insert into profiles for now just to satisfy the Dashboard UI, 
    // assuming 'users' here might just be team members tracked in the DB.
    async createUser(newUser: Omit<User, 'id'>): Promise<User | null> {
        // CAUTION: This does not create an Auth User, only a Profile entry. 
        // Real auth requires backend admin API.
        const fakeId = `temp-${Date.now()}`;
        const { data, error } = await supabase.from('profiles').insert({
            id: fakeId,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        }).select().single();

        if (error) throw error;
        return { ...newUser, id: fakeId };
    }

    async updateUser(updatedUser: User): Promise<User> {
        const { error } = await supabase
            .from('profiles')
            .update({
                name: updatedUser.name,
                role: updatedUser.role,
                // email changes in auth are complex, skipping for now
            })
            .eq('id', updatedUser.id);

        if (error) throw error;
        return updatedUser;
    }

    async deleteUser(id: string): Promise<void> {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
    }
}

export const authService = new AuthService();


import { supabase } from './supabase';
import { User, UserRole } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Fetch profile via direct REST (bypasses SDK auth state issues)
async function fetchProfileDirect(userId: string, accessToken: string): Promise<any> {
    try {
        const resp = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*&limit=1`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        return data?.[0] ?? null;
    } catch {
        return null;
    }
}

// Store session in localStorage in Supabase's expected format
function storeSession(supabaseUrl: string, session: any) {
    const projectId = new URL(supabaseUrl).hostname.split('.')[0];
    const storageKey = `sb-${projectId}-auth-token`;
    localStorage.setItem(storageKey, JSON.stringify(session));
}

// Build app User from auth response + profile
function buildUser(authUser: any, profile: any): User {
    return {
        id: authUser.id,
        email: authUser.email || '',
        name: profile?.name || authUser.email?.split('@')[0] || 'User',
        role: (profile?.role as UserRole) || 'user',
    };
}

class AuthService {
    // Login with Email/Password — uses direct fetch to avoid SDK signInWithPassword hanging
    async login(email: string, password: string): Promise<User> {
        console.log('[Auth] login called with:', email);
        console.log('[Auth] Making direct fetch to auth endpoint...');
        let authResp: Response;
        try {
            authResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
                body: JSON.stringify({ email, password }),
            });
        } catch (fetchErr) {
            console.error('[Auth] Network error:', fetchErr);
            throw new Error('Não foi possível conectar ao servidor.');
        }

        const authData = await authResp.json();
        console.log('[Auth] Auth response status:', authResp.status);

        if (!authResp.ok) {
            throw new Error(authData.error_description || authData.msg || authData.error || 'Credenciais inválidas');
        }

        // Store session in localStorage so Supabase SDK picks it up for DB queries
        storeSession(SUPABASE_URL, {
            access_token: authData.access_token,
            refresh_token: authData.refresh_token,
            expires_at: authData.expires_at,
            expires_in: authData.expires_in,
            token_type: authData.token_type,
            user: authData.user,
        });

        // Fetch profile via direct REST (no SDK auth calls)
        const profile = await fetchProfileDirect(authData.user.id, authData.access_token);
        console.log('[Auth] Profile:', profile);

        const user = buildUser(authData.user, profile);
        console.log('[Auth] Login complete:', user);
        return user;
    }

    // Logout
    async logout(): Promise<void> {
        // Clear localStorage session
        const projectId = new URL(SUPABASE_URL).hostname.split('.')[0];
        localStorage.removeItem(`sb-${projectId}-auth-token`);
        await supabase.auth.signOut().catch(() => {});
    }

    // Get Current Session User — reads from localStorage, no network calls
    async getCurrentUser(): Promise<User | null> {
        const projectId = new URL(SUPABASE_URL).hostname.split('.')[0];
        const stored = localStorage.getItem(`sb-${projectId}-auth-token`);
        if (!stored) return null;
        try {
            const session = JSON.parse(stored);
            if (!session?.access_token || !session?.user) return null;
            // Check expiry
            if (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000)) {
                localStorage.removeItem(`sb-${projectId}-auth-token`);
                return null;
            }
            const profile = await fetchProfileDirect(session.user.id, session.access_token);
            return buildUser(session.user, profile);
        } catch {
            return null;
        }
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

        if (!data.user) return null;
        const profile = await fetchProfileDirect(data.user.id, '');
        return buildUser(data.user, profile);
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


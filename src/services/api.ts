import { Business, FeaturedEvent, SiteSettings } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
};

export const api = {
    getBusinesses: async (): Promise<Business[]> => {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/businesses?select=*`, { headers });
            if (!res.ok) return [];
            return await res.json();
        } catch {
            return [];
        }
    },

    getFeaturedEvent: async (): Promise<FeaturedEvent | null> => {
        const events = await api.getFeaturedEvents();
        return events[0] ?? null;
    },

    getFeaturedEvents: async (): Promise<FeaturedEvent[]> => {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&is_active=eq.true&order=created_at.desc&limit=10`, { headers });
            if (res.ok) {
                const data = await res.json();
                return (data ?? []).map((raw: any) => ({
                    id: raw.id,
                    title: raw.title,
                    description: raw.description,
                    imageUrl: raw.image_url,
                    buttonText: 'Quero Ir',
                    buttonLink: raw.button_link,
                    isActive: raw.is_active,
                    schedule: raw.schedule,
                    startDate: new Date(Date.now() + 86400000).toISOString(),
                    endDate: new Date(Date.now() + 86400000 + 7200000).toISOString(),
                }));
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        }
        return [];
    },

    getSiteSettings: async (): Promise<SiteSettings | null> => {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=*&order=updated_at.desc&limit=1`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    return data[0];
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
        return null;
    }
};
